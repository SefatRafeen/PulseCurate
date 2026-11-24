import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  Check,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Flame,
  Headphones,
  Heart,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA.ts';
import type { AppSettings, FeedItem, PlatformId, SourceStatus } from '../types.ts';
import {
  getEditorialImage,
  getEngagementStats,
  getEstimatedReadTime,
} from '../utils/editorialImages.ts';
import { formatCountdown, formatRelativeTime, formatScheduledLabel } from '../utils/scheduleMath.ts';
import { ArticleReaderView } from './ArticleReaderView.tsx';
import { PlatformIcon, PulseLogoMark } from './PlatformIcon.tsx';
import { StoryPreviewModal } from './StoryPreviewModal.tsx';

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

type NavTab = 'home' | 'search' | 'saved' | 'settings';

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
  // Navigation & Filtering State
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('home');
  const [filterPlatform, setFilterPlatform] = useState<'all' | PlatformId>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterCreator, setFilterCreator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  // Modal / Reader State
  const [previewStory, setPreviewStory] = useState<FeedItem | null>(null);
  const [readerStory, setReaderStory] = useState<FeedItem | null>(null);

  // Bookmarked / Saved Stories State (persisted to localStorage)
  const [savedStoryIds, setSavedStoryIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pulsecurate_saved_story_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Save bookmarked IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pulsecurate_saved_story_ids', JSON.stringify(savedStoryIds));
    } catch {
      // storage unavailable
    }
  }, [savedStoryIds]);

  const toggleSaveStory = (item: FeedItem) => {
    setSavedStoryIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  const isStorySaved = (id: string) => savedStoryIds.includes(id);

  // Extract unique active creators from sources & items
  const trackedCreators = useMemo(() => {
    const map = new Map<string, { handle: string; name: string; platform: PlatformId }>();

    // From settings sources
    settings.sources.forEach((s) => {
      map.set(s.handle.toLowerCase(), {
        handle: s.handle,
        name: s.displayName || s.handle,
        platform: s.platform,
      });
    });

    // From fetched feed items
    items.forEach((item) => {
      const key = (item.handle || item.accountName).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          handle: item.handle || item.accountName,
          name: item.accountName,
          platform: item.platform,
        });
      }
    });

    return Array.from(map.values());
  }, [settings.sources, items]);

  const activePlatforms = useMemo(() => {
    const set = new Set<PlatformId>();
    settings.sources.forEach((s) => set.add(s.platform));
    items.forEach((i) => set.add(i.platform));
    return Array.from(set);
  }, [settings.sources, items]);

  // Filtered Items for Main Feed
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (filterTopic !== 'all' && item.topicTag.toLowerCase() !== filterTopic.toLowerCase()) {
        return false;
      }
      if (filterCreator && (item.handle || item.accountName).toLowerCase() !== filterCreator.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inHeadline = item.headline.toLowerCase().includes(q);
        const inTakeaways = item.takeaways.some((t) => t.toLowerCase().includes(q));
        const inAccount = item.accountName.toLowerCase().includes(q);
        const inTopic = item.topicTag.toLowerCase().includes(q);
        if (!inHeadline && !inTakeaways && !inAccount && !inTopic) return false;
      }
      return true;
    });
  }, [items, filterPlatform, filterTopic, filterCreator, searchQuery]);

  // Top Stories / Curated Picks (top 6 items sorted by relevance)
  const topStories = useMemo(() => {
    return [...items]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 6);
  }, [items]);

  // Saved Stories List
  const savedStories = useMemo(() => {
    return items.filter((item) => savedStoryIds.includes(item.id));
  }, [items, savedStoryIds]);

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
    <div className="min-h-dvh bg-transparent text-[var(--pc-text)] flex flex-col pb-28">
      {/* =========================================================================
          1. Header (Left Screen Style)
          - Bold left-aligned PulseCurate title with decorative organic corner accent shape
          - Circular quick-refresh/shuffle icon button on top right
          ========================================================================= */}
      <header className="sticky top-0 z-30 liquid-glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Bold Left-Aligned Title with Organic Corner Accent Shape */}
          <div className="flex items-center gap-3">
            {/* Organic corner accent shape */}
            <div className="relative flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-2xl liquid-glass flex items-center justify-center shadow-lg relative overflow-hidden group"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, var(--pc-accent-soft), var(--glass-tint))',
                  border: '1px solid var(--glass-border-top)',
                }}
              >
                {/* Organic curved shape background highlight */}
                <div className="absolute -top-2 -left-2 w-7 h-7 bg-[var(--pc-accent)]/30 rounded-full blur-sm" />
                <PulseLogoMark className="w-5 h-5 text-[var(--pc-accent)] relative z-10" />
              </div>
              {/* Organic corner accent decoration tag */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--pc-accent)] border-2 border-[var(--pc-bg)] shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[var(--pc-text)]">
                  PulseCurate
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full liquid-pill text-[var(--pc-accent)]">
                  visionOS
                </span>
              </div>
              <p className="text-[11px] text-[var(--pc-text-muted)] font-medium hidden sm:block">
                AI Social Intelligence &amp; Editorial Digest
              </p>
            </div>
          </div>

          {/* Top Right Actions: Countdown Badge + Circular Quick-Refresh Button + Settings */}
          <div className="flex items-center gap-2.5">
            {/* Next Scheduled Countdown Pill */}
            <div className="hidden md:flex items-center gap-2 text-xs text-[var(--pc-text-muted)] liquid-pill px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
              <span>Next: {nextScheduleLabel}</span>
              <span className="font-mono-tabular text-[var(--pc-text)] font-semibold">
                ({countdownStr})
              </span>
            </div>

            {/* Circular Quick-Refresh / Shuffle Icon Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => onRefreshNow()}
              disabled={isLoading || !isOnline}
              className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-[var(--pc-text)] hover:text-[var(--pc-accent)] hover:border-[var(--pc-accent)] transition-all shadow-md disabled:opacity-50 cursor-pointer"
              title="Quick Refresh & Summarize Feed"
              aria-label="Refresh and summarize news feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[var(--pc-accent)]' : ''}`} />
            </motion.button>

            {/* Top-Right Settings Gear */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Settings"
              className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-[var(--pc-text)] hover:border-[var(--pc-accent)] transition-all shadow-md cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-7">
        {/* Offline Banner */}
        {!isOnline && (
          <div
            className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-[var(--pc-text)] border-[var(--pc-warning)]/50"
            role="status"
          >
            <WifiOff className="w-4 h-4 text-[var(--pc-warning)] shrink-0" />
            <span>
              You are offline. Showing cached stories. Auto-Sync will fetch fresh digest when connection restores.
            </span>
          </div>
        )}

        {/* Retry / Status Banner */}
        {isLoading && retryStatus && (
          <div
            className="liquid-glass rounded-2xl px-4 py-3 text-xs text-[var(--pc-text-muted)] flex items-center gap-2.5"
            role="status"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--pc-accent)] shrink-0" />
            <span>{retryStatus}</span>
          </div>
        )}

        {/* Error Alert */}
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
              className="liquid-pill px-3 py-1.5 text-xs font-semibold text-[var(--pc-text)]"
            >
              Retry
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW: HOME TAB
            ========================================================================= */}
        {activeNavTab === 'home' && (
          <>
            {/* Top Stories Carousel ("Top Stories" / "Curated Picks") */}
            {topStories.length > 0 && !isLoading && (
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--pc-accent)]" />
                    <h2 className="font-display text-base sm:text-lg font-bold text-[var(--pc-text)]">
                      Top Stories
                    </h2>
                    <span className="text-xs text-[var(--pc-text-muted)] font-normal hidden sm:inline">
                      • Curated Picks
                    </span>
                  </div>
                  <span className="text-xs text-[var(--pc-text-muted)] font-mono-tabular">
                    {topStories.length} picks
                  </span>
                </div>

                {/* Horizontal Scrollable Carousel Container */}
                <div className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x">
                  {topStories.map((story) => {
                    const coverImg = getEditorialImage(story);
                    const readTime = getEstimatedReadTime(story);
                    const pInfo = getPlatformInfo(story.platform);

                    return (
                      <motion.div
                        key={`top-${story.id}`}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPreviewStory(story)}
                        className="w-64 sm:w-72 shrink-0 snap-start liquid-glass-card rounded-[22px] overflow-hidden p-3 cursor-pointer flex flex-col justify-between group shadow-lg"
                      >
                        {/* Rounded-Square (22px) Illustrated / Thumbnail Card */}
                        <div className="relative h-36 w-full rounded-[18px] overflow-hidden mb-3 bg-black/30">
                          <img
                            src={coverImg}
                            alt={story.headline}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                          {/* Platform badge on corner */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-md"
                               style={{ backgroundColor: `${pInfo.brandColor}d0` }}>
                            <PlatformIcon platform={story.platform} className="w-3 h-3" />
                            <span>{pInfo.shortName}</span>
                          </div>

                          <div className="absolute bottom-2 right-2.5 text-[10px] font-medium text-white/90 backdrop-blur-md px-2 py-0.5 rounded-full bg-black/40">
                            {readTime}
                          </div>
                        </div>

                        {/* Bold 1-Line Headline */}
                        <h3 className="font-display font-bold text-sm text-[var(--pc-text)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--pc-accent)] transition-colors">
                          {story.headline}
                        </h3>

                        {/* Subtle Source / Read-Time Subtitles Underneath */}
                        <div className="flex items-center justify-between text-[11px] text-[var(--pc-text-muted)] pt-1 border-t border-white/5">
                          <span className="truncate font-medium">@{story.accountName}</span>
                          <span className="shrink-0 text-[var(--pc-accent)] font-semibold">
                            {story.topicTag}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tracked Creators Row ("Top Channels") */}
            {trackedCreators.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[var(--pc-accent)]" />
                    <h2 className="font-display text-base font-bold text-[var(--pc-text)]">
                      Top Channels
                    </h2>
                    {filterCreator && (
                      <button
                        onClick={() => setFilterCreator(null)}
                        className="text-xs text-[var(--pc-accent)] hover:underline ml-2 flex items-center gap-1"
                      >
                        (Clear: @{filterCreator} <X className="w-3 h-3" />)
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-[var(--pc-text-muted)]">
                    Filter by creator
                  </span>
                </div>

                {/* Horizontal Avatar Row with Colorful Background Rings */}
                <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar">
                  {trackedCreators.map((creator) => {
                    const pInfo = getPlatformInfo(creator.platform);
                    const isSelected = filterCreator?.toLowerCase() === creator.handle.toLowerCase();

                    return (
                      <button
                        key={creator.handle}
                        onClick={() =>
                          setFilterCreator(isSelected ? null : creator.handle)
                        }
                        className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                      >
                        {/* Circular Avatar with Colorful Background Ring */}
                        <div
                          className={`relative w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${
                            isSelected
                              ? 'ring-3 ring-[var(--pc-accent)] ring-offset-2 ring-offset-[var(--pc-bg)] scale-105'
                              : 'hover:scale-105'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${pInfo.brandColor}, var(--pc-accent))`,
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-[var(--pc-surface)] flex items-center justify-center font-bold text-white text-sm shadow-inner overflow-hidden border border-white/20">
                            {creator.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Corner Platform Badge */}
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-md border border-[var(--pc-bg)]"
                            style={{ backgroundColor: pInfo.brandColor }}
                          >
                            <PlatformIcon platform={creator.platform} className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        {/* Creator Name Underneath */}
                        <span
                          className={`text-[11px] font-medium max-w-[70px] truncate text-center ${
                            isSelected
                              ? 'text-[var(--pc-accent)] font-bold'
                              : 'text-[var(--pc-text-muted)] group-hover:text-[var(--pc-text)]'
                          }`}
                        >
                          {creator.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Topic Filter Pills (Horizontal Pill Bar) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterTopic('all')}
                  className={`min-h-[36px] px-4 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    filterTopic === 'all'
                      ? 'liquid-pill-active'
                      : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                >
                  All Topics ({items.length})
                </button>

                {settings.topics.map((topic) => {
                  const active = filterTopic.toLowerCase() === topic.label.toLowerCase();
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() =>
                        setFilterTopic(active ? 'all' : topic.label)
                      }
                      className={`min-h-[36px] px-4 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        active
                          ? 'liquid-pill-active'
                          : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                      }`}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Platform Filter Chips & Search Bar */}
            <section className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Platform chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterPlatform('all')}
                  className={`min-h-[32px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    filterPlatform === 'all'
                      ? 'liquid-pill-active'
                      : 'liquid-pill text-[var(--pc-text-muted)]'
                  }`}
                >
                  All Platforms
                </button>
                {activePlatforms.map((pid) => {
                  const pInfo = getPlatformInfo(pid);
                  const active = filterPlatform === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setFilterPlatform(active ? 'all' : pid)}
                      className={`min-h-[32px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                        active
                          ? 'liquid-pill-active'
                          : 'liquid-pill text-[var(--pc-text-muted)]'
                      }`}
                    >
                      <PlatformIcon platform={pid} className="w-3 h-3" />
                      <span>{pInfo.shortName}</span>
                    </button>
                  );
                })}
              </div>

              {/* In-feed search */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-[var(--pc-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headlines..."
                  className="liquid-input w-full min-h-[36px] pl-9 pr-3 text-xs text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60"
                />
              </div>
            </section>

            {/* Loading Skeletons */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="liquid-glass-card rounded-3xl p-5 space-y-4 animate-pulse"
                  >
                    <div className="h-40 w-full rounded-2xl bg-[var(--pc-surface-elevated)]" />
                    <div className="h-5 w-4/5 rounded bg-[var(--pc-surface-elevated)]" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-[var(--pc-surface-elevated)]" />
                      <div className="h-3 w-5/6 rounded bg-[var(--pc-surface-elevated)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main Editorial Feed Cards */}
            {!isLoading && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item, idx) => {
                  const pInfo = getPlatformInfo(item.platform);
                  const coverImg = getEditorialImage(item);
                  const readTime = getEstimatedReadTime(item);
                  const stats = getEngagementStats(item);
                  const isSaved = isStorySaved(item.id);

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.25) }}
                      className="liquid-glass-card rounded-[28px] overflow-hidden flex flex-col justify-between group shadow-xl border border-white/10"
                    >
                      {/* Card Cover Image with Gradient */}
                      <div
                        className="relative h-44 w-full overflow-hidden bg-black/30 cursor-pointer"
                        onClick={() => setPreviewStory(item)}
                      >
                        <img
                          src={coverImg}
                          alt={item.headline}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--glass-tint)] via-transparent to-black/30" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-md backdrop-blur-md"
                            style={{ backgroundColor: `${pInfo.brandColor}d5` }}
                          >
                            <PlatformIcon platform={item.platform} className="w-3 h-3" />
                            {pInfo.shortName}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveStory(item);
                            }}
                            className={`p-2 rounded-full liquid-glass backdrop-blur-md transition-all ${
                              isSaved ? 'text-[var(--pc-accent)]' : 'text-white/80 hover:text-white'
                            }`}
                            title={isSaved ? 'Saved' : 'Save Story'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Read Time on Bottom Right of Cover */}
                        <div className="absolute bottom-2.5 right-3 text-[11px] font-medium text-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full bg-black/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{readTime}</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          {/* Channel Attribution & Date */}
                          <div className="flex items-center justify-between text-xs text-[var(--pc-text-muted)]">
                            <span className="font-semibold text-[var(--pc-text)] truncate">
                              @{item.accountName}
                            </span>
                            <span className="font-mono-tabular shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>

                          {/* Bold Headline */}
                          <h2
                            onClick={() => setPreviewStory(item)}
                            className="font-display text-base sm:text-lg font-bold leading-snug text-[var(--pc-text)] group-hover:text-[var(--pc-accent)] transition-colors cursor-pointer line-clamp-2"
                          >
                            {item.headline}
                          </h2>

                          {/* Concise Takeaways Bullets */}
                          <ul className="space-y-1.5 text-xs sm:text-sm text-[var(--pc-text-muted)] leading-relaxed list-disc pl-4">
                            {item.takeaways.slice(0, 2).map((bullet, bIdx) => (
                              <li key={bIdx} className="line-clamp-2">
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-3 border-t border-[var(--pc-border)] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-400" />
                              {stats.likes}
                            </span>
                            <span>•</span>
                            <span className="text-[var(--pc-accent)] font-medium">
                              {item.topicTag}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPreviewStory(item)}
                              className="px-3 py-1.5 rounded-full liquid-pill text-xs font-semibold hover:border-[var(--pc-accent)] transition-all cursor-pointer"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => setReaderStory(item)}
                              className="px-3 py-1.5 rounded-full liquid-btn-primary text-xs font-semibold cursor-pointer"
                            >
                              Read
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredItems.length === 0 && (
              <div className="liquid-glass rounded-3xl p-8 sm:p-12 text-center space-y-4">
                <h3 className="font-display text-lg font-semibold text-[var(--pc-text)]">
                  No summarized stories match this view
                </h3>
                <p className="text-sm text-[var(--pc-text-muted)] max-w-md mx-auto">
                  {items.length === 0
                    ? 'Click the top refresh button to fetch real updates from your active channels and generate your AI editorial digest.'
                    : 'Try clearing your creator/topic filters or search query.'}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {(filterTopic !== 'all' || filterCreator || searchQuery || filterPlatform !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterPlatform('all');
                        setFilterTopic('all');
                        setFilterCreator(null);
                        setSearchQuery('');
                      }}
                      className="liquid-pill min-h-[40px] px-4 py-2 text-xs font-semibold text-[var(--pc-text)] cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRefreshNow()}
                    disabled={!isOnline}
                    className="liquid-btn-primary min-h-[40px] px-5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Refresh &amp; Summarize Now
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* =========================================================================
            VIEW: SEARCH TAB
            ========================================================================= */}
        {activeNavTab === 'search' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center space-y-2 py-4">
              <h2 className="font-display text-2xl font-black text-[var(--pc-text)]">
                Search &amp; Discover
              </h2>
              <p className="text-xs sm:text-sm text-[var(--pc-text-muted)]">
                Query stories, explore tracked creators, and filter intelligence across social networks.
              </p>
            </div>

            {/* Large Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-[var(--pc-accent)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any topic, creator (@handle), or keyword..."
                className="liquid-input w-full min-h-[52px] pl-12 pr-4 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)] shadow-xl"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="space-y-4 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--pc-text-muted)]">
                Matching Stories ({filteredItems.length})
              </div>

              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPreviewStory(item)}
                  className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-[var(--pc-accent)] transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                      <span className="font-semibold text-[var(--pc-accent)]">@{item.accountName}</span>
                      <span>•</span>
                      <span>{item.topicTag}</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--pc-text)] truncate">
                      {item.headline}
                    </h3>
                  </div>

                  <button className="liquid-btn-primary px-3.5 py-1.5 text-xs font-semibold shrink-0">
                    Read
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW: SAVED STORIES TAB
            ========================================================================= */}
        {activeNavTab === 'saved' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[var(--pc-accent)] fill-current" />
                <h2 className="font-display text-xl sm:text-2xl font-black text-[var(--pc-text)]">
                  Saved Stories
                </h2>
              </div>
              <span className="liquid-pill px-3 py-1 text-xs font-mono font-bold">
                {savedStories.length} Bookmarked
              </span>
            </div>

            {savedStories.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-10 text-center space-y-3">
                <Bookmark className="w-8 h-8 text-[var(--pc-text-muted)] mx-auto" />
                <h3 className="font-bold text-base text-[var(--pc-text)]">No Saved Stories Yet</h3>
                <p className="text-xs sm:text-sm text-[var(--pc-text-muted)] max-w-sm mx-auto">
                  Bookmark key articles from your Home Feed to read offline or review anytime.
                </p>
                <button
                  onClick={() => setActiveNavTab('home')}
                  className="liquid-btn-primary px-5 py-2 text-xs font-semibold"
                >
                  Browse Home Feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedStories.map((item) => (
                  <div
                    key={item.id}
                    className="liquid-glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                        <span className="font-semibold text-[var(--pc-accent)]">@{item.accountName}</span>
                        <span>•</span>
                        <span>{item.topicTag}</span>
                        <span>•</span>
                        <span>{getEstimatedReadTime(item)}</span>
                      </div>
                      <h3
                        onClick={() => setPreviewStory(item)}
                        className="font-bold text-base text-[var(--pc-text)] hover:text-[var(--pc-accent)] cursor-pointer"
                      >
                        {item.headline}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setReaderStory(item)}
                        className="liquid-btn-primary px-4 py-2 text-xs font-semibold"
                      >
                        Read
                      </button>
                      <button
                        onClick={() => toggleSaveStory(item)}
                        className="p-2 rounded-full liquid-glass text-red-400 hover:scale-105"
                        title="Remove bookmark"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          2. Story Preview / Detail View Modal (Middle Screen Style)
          ========================================================================= */}
      <StoryPreviewModal
        item={previewStory}
        isOpen={Boolean(previewStory)}
        isSaved={previewStory ? isStorySaved(previewStory.id) : false}
        onClose={() => setPreviewStory(null)}
        onOpenReader={(item) => {
          setPreviewStory(null);
          setReaderStory(item);
        }}
        onToggleSave={toggleSaveStory}
      />

      {/* =========================================================================
          3. Full Article Reader View & Liquid Glass Control Sheet (Right Screen Style)
          ========================================================================= */}
      <ArticleReaderView
        item={readerStory}
        isOpen={Boolean(readerStory)}
        isSaved={readerStory ? isStorySaved(readerStory.id) : false}
        onBack={() => setReaderStory(null)}
        onOpenGlobalSettings={onOpenSettings}
        onToggleSave={toggleSaveStory}
      />

      {/* =========================================================================
          Bottom Navigation Bar (Clean 4-Tab Bar: Home, Search, Saved, Settings)
          ========================================================================= */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 liquid-glass rounded-full px-5 py-2.5 z-40 shadow-2xl flex items-center gap-4 sm:gap-8 border border-white/20 backdrop-blur-3xl"
      >
        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveNavTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeNavTab === 'home'
              ? 'text-[var(--pc-accent)] scale-105 font-bold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* Tab 2: Search */}
        <button
          onClick={() => setActiveNavTab('search')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeNavTab === 'search'
              ? 'text-[var(--pc-accent)] scale-105 font-bold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Search</span>
        </button>

        {/* Tab 3: Saved */}
        <button
          onClick={() => setActiveNavTab('saved')}
          className={`relative flex flex-col items-center gap-1 transition-all ${
            activeNavTab === 'saved'
              ? 'text-[var(--pc-accent)] scale-105 font-bold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Saved</span>
          {savedStoryIds.length > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[var(--pc-accent)] text-[var(--pc-accent-fg)] font-bold text-[9px] flex items-center justify-center">
              {savedStoryIds.length}
            </span>
          )}
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => onOpenSettings()}
          className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </nav>

      {/* iOS Safari Install Guide Modal */}
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
