import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Clock,
  Download,
  ExternalLink,
  Mail,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA.ts';
import type { AppSettings, FeedItem, PlatformId, SourceStatus } from '../types.ts';
import { formatCountdown, formatRelativeTime, formatScheduledLabel } from '../utils/scheduleMath.ts';
import { PlatformIcon, PulseLogoMark } from './PlatformIcon.tsx';

interface DashboardProps {
  settings: AppSettings;
  items: FeedItem[];
  sourceStatuses: SourceStatus[];
  filteredOutCount: number;
  isLoading: boolean;
  retryStatus?: string | null;
  error: string | null;
  nowMs: number;
  serverResendConfigured?: boolean;
  onRefreshNow: () => Promise<void>;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  items,
  sourceStatuses,
  filteredOutCount,
  isLoading,
  retryStatus = null,
  error,
  nowMs,
  serverResendConfigured = false,
  onRefreshNow,
  onOpenSettings,
}) => {
  const [filterPlatform, setFilterPlatform] = useState<'all' | PlatformId>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const activePlatforms = useMemo(() => {
    const set = new Set<PlatformId>();
    settings.sources.forEach((s) => set.add(s.platform));
    items.forEach((i) => set.add(i.platform));
    return Array.from(set);
  }, [settings.sources, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (filterTopic !== 'all' && item.topicTag.toLowerCase() !== filterTopic.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inHeadline = item.headline.toLowerCase().includes(q);
        const inTakeaways = item.takeaways.some((t) => t.toLowerCase().includes(q));
        const inAccount = item.accountName.toLowerCase().includes(q);
        if (!inHeadline && !inTakeaways && !inAccount) return false;
      }
      return true;
    });
  }, [items, filterPlatform, filterTopic, searchQuery]);

  const emptyOrErrorSources = useMemo(
    () => sourceStatuses.filter((s) => s.status !== 'ok'),
    [sourceStatuses]
  );

  const pushReady =
    settings.schedule.pushEnabled &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted';
  const emailConfigured = Boolean(settings.schedule.webhookUrl.trim() || serverResendConfigured);
  const emailReady =
    settings.schedule.emailEnabled &&
    Boolean(settings.schedule.emailAddress.trim()) &&
    emailConfigured;
  const autoSyncReady = settings.schedule.autoSyncOnOpen;

  const nextScheduleLabel = formatScheduledLabel(settings.nextScheduledTimestamp);
  const countdownStr = formatCountdown(settings.nextScheduledTimestamp, nowMs);

  return (
    <div className="min-h-dvh bg-transparent text-[var(--pc-text)] flex flex-col">
      {/* Top Status & Navigation Bar (Apple Liquid Glass) */}
      <header className="sticky top-0 z-30 liquid-glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Brand Zone (single line) */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="p-1.5 rounded-full liquid-glass flex items-center justify-center">
              <PulseLogoMark className="w-5 h-5 text-[var(--pc-accent)]" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">PulseCurate</span>
          </div>

          {/* Active Topic Quick Filters (Desktop center - Liquid Pills) */}
          <nav
            aria-label="Active topics"
            className="hidden lg:flex items-center gap-2 text-xs font-medium overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              onClick={() => setFilterTopic('all')}
              className={`min-h-[34px] px-3.5 py-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                filterTopic === 'all'
                  ? 'liquid-pill-active'
                  : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
              }`}
            >
              All Topics
            </button>
            {settings.topics.slice(0, 5).map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() =>
                  setFilterTopic((curr) => (curr === topic.label ? 'all' : topic.label))
                }
                className={`min-h-[34px] px-3.5 py-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  filterTopic.toLowerCase() === topic.label.toLowerCase()
                    ? 'liquid-pill-active'
                    : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </nav>

          {/* Primary Actions Zone (Liquid Controls) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs text-[var(--pc-text-muted)] whitespace-nowrap mr-1 liquid-pill px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
              <span>Next: {nextScheduleLabel}</span>
              <span className="font-mono-tabular text-[var(--pc-text)]">({countdownStr})</span>
            </div>

            <button
              type="button"
              onClick={() => onRefreshNow()}
              disabled={isLoading || !isOnline}
              className="liquid-btn-primary min-h-[40px] px-4 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isLoading ? 'Summarizing...' : 'Refresh & Summarize Now'}
              </span>
              <span className="sm:hidden">{isLoading ? 'Syncing' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Settings"
              className="liquid-pill min-w-[42px] min-h-[42px] flex items-center justify-center text-[var(--pc-text)] hover:border-[var(--pc-accent)] transition-colors shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Offline Indicator */}
        {!isOnline && (
          <div
            className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-[var(--pc-text)] border-[var(--pc-warning)]/50"
            role="status"
          >
            <WifiOff className="w-4 h-4 text-[var(--pc-warning)] shrink-0" />
            <span>
              You are currently offline. Viewing your locally cached PulseCurate digest. Auto-Sync will fetch fresh stories when connectivity returns.
            </span>
          </div>
        )}

        {/* Workspace Status & 3-Layer Delivery Summary Strip (Liquid Glass) */}
        <section className="liquid-glass rounded-3xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Bell
                className="w-3.5 h-3.5"
                style={{ color: pushReady ? 'var(--pc-success)' : 'var(--pc-text-muted)' }}
              />
              <span className="text-[var(--pc-text)] font-medium">
                {pushReady ? 'Push Active' : 'Push Standby'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Mail
                className="w-3.5 h-3.5"
                style={{ color: emailReady ? 'var(--pc-success)' : 'var(--pc-text-muted)' }}
              />
              <span className="text-[var(--pc-text)] font-medium">
                {emailReady
                  ? 'Email Ready'
                  : emailConfigured
                  ? 'Email Unset'
                  : 'Email digest not configured'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <ShieldCheck
                className="w-3.5 h-3.5"
                style={{ color: autoSyncReady ? 'var(--pc-success)' : 'var(--pc-text-muted)' }}
              />
              <span className="text-[var(--pc-text)] font-medium">
                {autoSyncReady ? 'Auto-Sync On' : 'Auto-Sync Off'}
              </span>
            </div>

            <span className="hidden md:inline text-[var(--pc-text-muted)]" aria-hidden="true">
              &middot;
            </span>

            <div className="text-[var(--pc-text-muted)] font-mono-tabular">
              Updated:{' '}
              {settings.lastUpdatedTimestamp
                ? formatRelativeTime(new Date(settings.lastUpdatedTimestamp).toISOString())
                : 'Just now'}
            </div>

            <div className="md:hidden text-[var(--pc-text-muted)] font-mono-tabular">
              Next: {nextScheduleLabel} ({countdownStr})
            </div>
          </div>

          <div className="flex items-center gap-3">
            {filteredOutCount > 0 && (
              <span className="text-xs text-[var(--pc-text-muted)] font-mono-tabular">
                {filteredOutCount} low-signal items filtered
              </span>
            )}

            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="liquid-pill min-h-[36px] px-3.5 py-1.5 text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                Install App
              </button>
            )}

            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSInstall(true)}
                className="liquid-pill min-h-[36px] px-3.5 py-1.5 text-xs font-medium text-[var(--pc-text)] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                Install on iOS
              </button>
            )}
          </div>
        </section>

        {/* Filter Bar: Platform Tabs + Topic Tabs + Search (Liquid Pills & Inputs) */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Platform Filter Segmented Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterPlatform('all')}
                className={`min-h-[38px] px-4 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  filterPlatform === 'all'
                    ? 'liquid-pill-active'
                    : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                All ({items.length})
              </button>

              {activePlatforms.map((pid) => {
                const pInfo = getPlatformInfo(pid);
                const count = items.filter((i) => i.platform === pid).length;
                const active = filterPlatform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setFilterPlatform(pid)}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'liquid-pill-active'
                        : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                    }`}
                  >
                    <span style={{ color: pInfo.accentHex }}>
                      <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                    </span>
                    <span>{pInfo.shortName}</span>
                    <span className="font-mono-tabular opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Tactile Liquid Search Input */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-[var(--pc-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter headlines or accounts..."
                className="liquid-input w-full min-h-[42px] pl-10 pr-4 text-xs text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60"
              />
            </div>
          </div>

          {/* Mobile & Tablet Topic Filter Strip */}
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterTopic('all')}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                filterTopic === 'all'
                  ? 'liquid-pill-active'
                  : 'liquid-pill text-[var(--pc-text-muted)]'
              }`}
            >
              All Topics
            </button>
            {settings.topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() =>
                  setFilterTopic((curr) => (curr === topic.label ? 'all' : topic.label))
                }
                className={`min-h-[34px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  filterTopic.toLowerCase() === topic.label.toLowerCase()
                    ? 'liquid-pill-active'
                    : 'liquid-pill text-[var(--pc-text-muted)]'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </section>

        {/* Source Fallback Diagnostics Notice (Liquid Glass) */}
        {emptyOrErrorSources.length > 0 && !isLoading && (
          <div className="liquid-glass rounded-2xl px-4 py-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--pc-text-muted)]">
                <AlertCircle className="w-4 h-4 text-[var(--pc-warning)] shrink-0" />
                <span>
                  {emptyOrErrorSources.length}{' '}
                  {emptyOrErrorSources.length === 1 ? 'source had' : 'sources had'} no recent public posts indexed in this window.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnostics((v) => !v)}
                className="text-[var(--pc-accent)] font-medium hover:underline whitespace-nowrap cursor-pointer"
              >
                {showDiagnostics ? 'Hide details' : 'View details'}
              </button>
            </div>
            {showDiagnostics && (
              <ul className="mt-2.5 pt-2.5 border-t border-[var(--pc-border)] space-y-1.5 text-[var(--pc-text-muted)]">
                {emptyOrErrorSources.map((s) => (
                  <li key={s.sourceId}>
                    <strong className="text-[var(--pc-text)]">
                      {getPlatformInfo(s.platform).shortName} ({s.handle}):
                    </strong>{' '}
                    {s.message || 'No recent public posts returned.'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Subtle Retry / Fallback Status Banner (Liquid Glass) */}
        {isLoading && retryStatus && (
          <div
            className="liquid-glass rounded-2xl px-4 py-3 text-xs text-[var(--pc-text-muted)] flex items-center gap-2.5"
            role="status"
            aria-live="polite"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--pc-accent)] shrink-0" />
            <span>{retryStatus}</span>
          </div>
        )}

        {/* API Error Alert (Liquid Glass) */}
        {error && (
          <div
            className="liquid-glass rounded-2xl px-4 py-3 text-xs sm:text-sm text-[var(--pc-text)] border-[var(--pc-warning)]/45 flex items-center justify-between gap-4"
            role="alert"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-[var(--pc-warning)] shrink-0" />
              <span className="truncate sm:whitespace-normal">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => onRefreshNow()}
              className="liquid-pill min-h-[36px] px-3.5 py-1.5 text-xs font-semibold text-[var(--pc-text)] hover:border-[var(--pc-accent)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Skeleton Loading UI (Liquid Glass Cards) */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" aria-busy="true">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="liquid-glass-card rounded-3xl p-5 space-y-4 animate-pulse"
              >
                <div className="h-3.5 w-2/3 rounded-full bg-[var(--pc-surface-elevated)]" />
                <div className="space-y-2">
                  <div className="h-5 w-full rounded-lg bg-[var(--pc-surface-elevated)]" />
                  <div className="h-5 w-4/5 rounded-lg bg-[var(--pc-surface-elevated)]" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full rounded bg-[var(--pc-surface-elevated)]" />
                  <div className="h-3 w-5/6 rounded bg-[var(--pc-surface-elevated)]" />
                  <div className="h-3 w-4/6 rounded bg-[var(--pc-surface-elevated)]" />
                </div>
                <div className="h-4 w-1/2 rounded-full bg-[var(--pc-surface-elevated)] pt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Summarized News Feed Grid (Apple Liquid Glass Cards) */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredItems.map((item, idx) => {
              const pInfo = getPlatformInfo(item.platform);
              const urgencyColor =
                item.urgency === 'High'
                  ? 'var(--pc-danger)'
                  : item.urgency === 'Medium'
                  ? 'var(--pc-warning)'
                  : 'var(--pc-success)';

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.25) }}
                  className="liquid-glass-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4 cursor-default"
                >
                  <div className="space-y-3">
                    {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--pc-text-muted)]">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold text-[var(--pc-text)]"
                      >
                        <span style={{ color: pInfo.accentHex }}>
                          <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                        </span>
                        <span>{item.accountName}</span>
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="font-mono-tabular">{formatRelativeTime(item.timestamp)}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="text-[var(--pc-accent)] font-medium">{item.topicTag}</span>
                    </div>

                    {/* AI Headline */}
                    <h2 className="font-display text-lg font-semibold leading-snug text-[var(--pc-text)] text-balance">
                      {item.headline}
                    </h2>

                    {/* 2-3 Concise Bullet Takeaways */}
                    <ul className="space-y-1.5 text-sm text-[var(--pc-text-muted)] leading-relaxed list-disc pl-4">
                      {item.takeaways.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Footer: Urgency/Sentiment + View Source Link */}
                  <div className="pt-3 border-t border-[var(--pc-border)]/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 font-medium text-[var(--pc-text-muted)]">
                      <span className="inline-flex items-center gap-1" style={{ color: urgencyColor }}>
                        {item.urgency === 'High' ? (
                          <Zap className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5" />
                        )}
                        <span>{item.urgency} Urgency</span>
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{item.sentiment}</span>
                    </div>

                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[var(--pc-accent)] hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>View Source Post</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Empty State (Liquid Glass) */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="liquid-glass rounded-3xl p-8 sm:p-12 text-center space-y-4">
            <h3 className="font-display text-lg font-semibold text-[var(--pc-text)]">
              No summarized stories match this view
            </h3>
            <p className="text-sm text-[var(--pc-text-muted)] max-w-md mx-auto">
              {items.length === 0
                ? 'Click "Refresh & Summarize Now" to fetch real posts from your active channels and filter out noise with Gemini.'
                : 'Try clearing your platform/topic filters or search query, or add more active sources in Settings.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPlatform('all');
                    setFilterTopic('all');
                    setSearchQuery('');
                  }}
                  className="liquid-pill min-h-[42px] px-4 py-2 text-xs font-semibold text-[var(--pc-text)] cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => onRefreshNow()}
                disabled={!isOnline}
                className="liquid-btn-primary min-h-[42px] px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Refresh &amp; Summarize Now
              </button>
            </div>
          </div>
        )}
      </main>

      {/* iOS Safari Install Guide Modal (Apple Liquid Glass Modal) */}
      {showIOSInstall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl liquid-glass-modal p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[var(--pc-text)]">
              Install PulseCurate on iOS
            </h3>
            <p className="text-sm text-[var(--pc-text-muted)] leading-relaxed">
              1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
              <br />
              2. Scroll down and select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSInstall(false)}
              className="liquid-btn-primary w-full min-h-[44px] text-sm font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
