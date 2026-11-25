import { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientBackdrop } from './components/AmbientBackdrop.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { OnboardingWizard } from './components/OnboardingWizard.tsx';
import { applyThemeToDocument, getAdaptiveThemeId, getThemeById } from './data/themes.ts';
import type {
  AppSettings,
  FeedItem,
  FeedRefreshResponse,
  ScheduleConfig,
  SocialSource,
  SourceStatus,
  TopicItem,
  TopicMood,
} from './types.ts';
import { postWithRetryStatus, sanitizeClientError } from './utils/apiClient.ts';
import { computeNextScheduledTimestamp } from './utils/scheduleMath.ts';
import {
  DEFAULT_SETTINGS,
  loadCachedFeed,
  loadSettings,
  saveCachedFeed,
  saveSettings,
} from './utils/storage.ts';

function computeDominantMoodFromTopics(topics: TopicItem[]): TopicMood {
  const counts: Record<TopicMood, number> = { Serious: 0, Analytical: 0, Entertaining: 0 };
  topics.forEach((t) => {
    counts[t.mood] = (counts[t.mood] || 0) + 1;
  });
  if (counts.Serious >= counts.Analytical && counts.Serious >= counts.Entertaining && counts.Serious > 0) {
    return 'Serious';
  }
  if (counts.Entertaining > counts.Analytical && counts.Entertaining > counts.Serious) {
    return 'Entertaining';
  }
  return 'Analytical';
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [cachedFeed, setCachedFeed] = useState(() => loadCachedFeed());
  const [items, setItems] = useState<FeedItem[]>(() => cachedFeed?.items || []);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>(
    () => cachedFeed?.sourceStatuses || []
  );
  const [filteredOutCount, setFilteredOutCount] = useState<number>(
    () => cachedFeed?.filteredOutCount || 0
  );
  const [isLoading, setIsLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refreshLockRef = useRef(false);

  // Apply active or live-previewed theme CSS variables immediately
  useEffect(() => {
    applyThemeToDocument(getThemeById(previewThemeId || settings.themeId));
  }, [previewThemeId, settings.themeId]);

  // Persist settings to localStorage whenever updated
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const syncScheduleToServer = useCallback(async (target: AppSettings) => {
    try {
      await fetch('/api/schedule/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: target.topics,
          sources: target.sources,
          email: target.schedule.emailAddress,
          webhookUrl: target.schedule.webhookUrl,
        }),
      });
    } catch {
      // Non-blocking sync
    }
  }, []);

  const triggerLayer1Notification = useCallback(async (newItems: FeedItem[]) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const topItem = newItems[0];
    const title = topItem ? `PulseCurate: ${topItem.headline}` : 'PulseCurate Digest Updated';
    const body = topItem
      ? `${topItem.accountName} · ${newItems.length} curated stories ready.`
      : 'Your scheduled social news summary is ready.';

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: 'pulsecurate-digest',
          });
          return;
        }
      }
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    } catch {
      // Fallback safely if notification blocked by browser context
    }
  }, []);

  const refreshFeed = useCallback(
    async (targetSettings: AppSettings, options: { isScheduled?: boolean } = {}) => {
      if (refreshLockRef.current) return;
      if (targetSettings.topics.length === 0 || targetSettings.sources.length === 0) return;

      refreshLockRef.current = true;
      setIsLoading(true);
      setRetryStatus(null);
      setError(null);

      try {
        const payload = await postWithRetryStatus<FeedRefreshResponse>(
          '/api/feed/refresh',
          {
            topics: targetSettings.topics,
            sources: targetSettings.sources,
          },
          (statusMessage) => {
            setRetryStatus(statusMessage);
          }
        );

        setItems(payload.items);
        setSourceStatuses(payload.sourceStatuses);
        setFilteredOutCount(payload.filteredOutCount);

        const nextCache = {
          items: payload.items,
          sourceStatuses: payload.sourceStatuses,
          filteredOutCount: payload.filteredOutCount,
          fetchedAt: payload.fetchedAt,
        };
        saveCachedFeed(nextCache);
        setCachedFeed(nextCache);

        const nextTs = computeNextScheduledTimestamp(targetSettings.schedule, Date.now());
        const nextThemeId = targetSettings.autoAdaptiveTheme
          ? getAdaptiveThemeId(payload.dominantMood)
          : targetSettings.themeId;

        setSettings((prev) => ({
          ...prev,
          themeId: nextThemeId,
          lastUpdatedTimestamp: payload.fetchedAt,
          nextScheduledTimestamp: nextTs,
        }));

        if (options.isScheduled) {
          if (targetSettings.schedule.pushEnabled) {
            await triggerLayer1Notification(payload.items);
          }
          if (
            targetSettings.schedule.emailEnabled &&
            targetSettings.schedule.emailAddress.trim()
          ) {
            fetch('/api/email/send-digest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: targetSettings.schedule.emailAddress.trim(),
                webhookUrl: targetSettings.schedule.webhookUrl.trim(),
                items: payload.items,
                topics: targetSettings.topics.map((t) => t.label),
                isTest: false,
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        setError(
          sanitizeClientError(
            err,
            'AI service is temporarily busy. Your existing stories remain available — please try again shortly.'
          )
        );
      } finally {
        setIsLoading(false);
        setRetryStatus(null);
        refreshLockRef.current = false;
      }
    },
    [triggerLayer1Notification]
  );

  // Live 1-second countdown + Layer 1 & Layer 3 fail-safe schedule check
  useEffect(() => {
    if (!settings.onboardingComplete) return;

    const checkSchedule = () => {
      const current = Date.now();
      setNowMs(current);

      if (
        settings.nextScheduledTimestamp &&
        current >= settings.nextScheduledTimestamp &&
        settings.schedule.autoSyncOnOpen &&
        navigator.onLine &&
        !refreshLockRef.current
      ) {
        void refreshFeed(settings, { isScheduled: true });
      }
    };

    checkSchedule();
    const timer = window.setInterval(checkSchedule, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSchedule();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkSchedule);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkSchedule);
    };
  }, [settings, refreshFeed]);

  const handleOnboardingComplete = async (data: {
    topics: TopicItem[];
    sources: SocialSource[];
    schedule: ScheduleConfig;
  }) => {
    const nextScheduled = computeNextScheduledTimestamp(data.schedule, Date.now());
    const completedSettings: AppSettings = {
      ...settings,
      onboardingComplete: true,
      topics: data.topics,
      sources: data.sources,
      schedule: data.schedule,
      nextScheduledTimestamp: nextScheduled,
    };

    setSettings(completedSettings);
    await syncScheduleToServer(completedSettings);
    await refreshFeed(completedSettings);
  };

  const handleThemeChange = useCallback((themeId: string) => {
    setSettings((prev) => ({
      ...prev,
      themeId,
      autoAdaptiveTheme: false,
    }));
  }, []);

  const handleAutoAdaptiveToggle = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const nextThemeId = enabled
        ? getAdaptiveThemeId(computeDominantMoodFromTopics(prev.topics))
        : prev.themeId;
      return {
        ...prev,
        autoAdaptiveTheme: enabled,
        themeId: nextThemeId,
      };
    });
  }, []);

  const handleTopicsChange = useCallback((topics: TopicItem[]) => {
    setSettings((prev) => {
      const updated = { ...prev, topics };
      void syncScheduleToServer(updated);
      return updated;
    });
  }, [syncScheduleToServer]);

  const handleSourcesChange = useCallback((sources: SocialSource[]) => {
    setSettings((prev) => {
      const updated = { ...prev, sources };
      void syncScheduleToServer(updated);
      return updated;
    });
  }, [syncScheduleToServer]);

  const handleSavePreferences = useCallback(
    async (schedule: ScheduleConfig) => {
      const nextScheduled = computeNextScheduledTimestamp(schedule, Date.now());
      const updated: AppSettings = {
        ...settings,
        schedule,
        nextScheduledTimestamp: nextScheduled,
      };
      setSettings(updated);
      await syncScheduleToServer(updated);
    },
    [settings, syncScheduleToServer]
  );

  const handleEnrichFeedItem = useCallback((itemId: string, patch: Partial<FeedItem>) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
      setCachedFeed((prevCache) => {
        const updatedCache = {
          items: next,
          sourceStatuses: prevCache?.sourceStatuses || [],
          filteredOutCount: prevCache?.filteredOutCount || 0,
          fetchedAt: prevCache?.fetchedAt || Date.now(),
        };
        saveCachedFeed(updatedCache);
        return updatedCache;
      });
      return next;
    });
  }, []);

  const handleClearCachedFeed = useCallback(() => {
    try {
      localStorage.removeItem('pulsecurate_feed_v1');
    } catch {
      // ignore
    }
    setItems([]);
    setSourceStatuses([]);
    setFilteredOutCount(0);
    setCachedFeed(null);
  }, []);

  const handleResetAllSettings = useCallback(() => {
    try {
      localStorage.removeItem('pulsecurate_settings_v1');
      localStorage.removeItem('pulsecurate_feed_v1');
      localStorage.removeItem('pulsecurate_saved_story_ids');
    } catch {
      // ignore
    }
    setItems([]);
    setSourceStatuses([]);
    setFilteredOutCount(0);
    setCachedFeed(null);
    setPreviewThemeId(null);
    setSettings({ ...DEFAULT_SETTINGS, onboardingComplete: false });
  }, []);

  if (!settings.onboardingComplete) {
    return (
      <div className="relative min-h-dvh">
        <AmbientBackdrop />
        <div className="relative z-10">
          <OnboardingWizard
            initialTopics={settings.topics}
            initialSources={settings.sources}
            initialSchedule={settings.schedule}
            onComplete={handleOnboardingComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <AmbientBackdrop />
      <div className="relative z-10">
        <Dashboard
          settings={settings}
          items={items}
          isLoading={isLoading}
          retryStatus={retryStatus}
          error={error}
          nowMs={nowMs}
          onRefreshNow={() => refreshFeed(settings)}
          onTopicsChange={handleTopicsChange}
          onSourcesChange={handleSourcesChange}
          onPreviewTheme={setPreviewThemeId}
          onApplyTheme={handleThemeChange}
          onAutoAdaptiveToggle={handleAutoAdaptiveToggle}
          onSavePreferences={handleSavePreferences}
          onClearCachedFeed={handleClearCachedFeed}
          onResetAllSettings={handleResetAllSettings}
          onEnrichFeedItem={handleEnrichFeedItem}
        />
      </div>
    </div>
  );
}
