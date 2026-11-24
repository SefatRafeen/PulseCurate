import { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientBackdrop } from './components/AmbientBackdrop.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { OnboardingWizard } from './components/OnboardingWizard.tsx';
import { SettingsDrawer } from './components/SettingsDrawer.tsx';
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
import { loadCachedFeed, loadSettings, saveCachedFeed, saveSettings } from './utils/storage.ts';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [serverResendConfigured, setServerResendConfigured] = useState(false);

  const refreshLockRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/email/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) {
          setServerResendConfigured(Boolean(data.serverResendConfigured));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Apply active theme CSS variables immediately
  useEffect(() => {
    applyThemeToDocument(getThemeById(settings.themeId));
  }, [settings.themeId]);

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

        saveCachedFeed({
          items: payload.items,
          sourceStatuses: payload.sourceStatuses,
          filteredOutCount: payload.filteredOutCount,
          fetchedAt: payload.fetchedAt,
        });
        setCachedFeed({
          items: payload.items,
          sourceStatuses: payload.sourceStatuses,
          filteredOutCount: payload.filteredOutCount,
          fetchedAt: payload.fetchedAt,
        });

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
            targetSettings.schedule.emailAddress.trim() &&
            targetSettings.schedule.webhookUrl.trim()
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

  const handleThemeChange = (themeId: string) => {
    setSettings((prev) => ({
      ...prev,
      themeId,
      autoAdaptiveTheme: false,
    }));
  };

  const handleAutoAdaptiveToggle = (enabled: boolean) => {
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
  };

  const handleSaveAndRefresh = async (updates: {
    topics: TopicItem[];
    sources: SocialSource[];
    schedule: ScheduleConfig;
  }) => {
    const nextScheduled = computeNextScheduledTimestamp(updates.schedule, Date.now());
    const updated: AppSettings = {
      ...settings,
      topics: updates.topics,
      sources: updates.sources,
      schedule: updates.schedule,
      nextScheduledTimestamp: nextScheduled,
    };
    setSettings(updated);
    await syncScheduleToServer(updated);
    await refreshFeed(updated);
  };

  const handleRestartOnboarding = () => {
    setSettingsOpen(false);
    setSettings((prev) => ({ ...prev, onboardingComplete: false }));
  };

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
          sourceStatuses={sourceStatuses}
          filteredOutCount={filteredOutCount}
          isLoading={isLoading}
          retryStatus={retryStatus}
          error={error}
          nowMs={nowMs}
          serverResendConfigured={serverResendConfigured}
          onRefreshNow={() => refreshFeed(settings)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <SettingsDrawer
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          feedItems={items}
          onThemeChange={handleThemeChange}
          onAutoAdaptiveToggle={handleAutoAdaptiveToggle}
          onSaveAndRefresh={handleSaveAndRefresh}
          onRestartOnboarding={handleRestartOnboarding}
        />
      </div>
    </div>
  );
}
