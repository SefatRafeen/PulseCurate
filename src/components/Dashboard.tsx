import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Clock,
  Heart,
  Home,
  Layers,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  Settings,
  WifiOff,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA.ts';
import type {
  AppSettings,
  FeedItem,
  PlatformId,
  ScheduleConfig,
  SocialSource,
  TopicItem,
} from '../types.ts';
import {
  getEditorialImage,
  getEngagementStats,
  getEstimatedReadTime,
} from '../utils/editorialImages.ts';
import { formatRelativeTime } from '../utils/scheduleMath.ts';
import { ArticleReaderView } from './ArticleReaderView.tsx';
import { CurateModal } from './CurateModal.tsx';
import { DepthFocusCarousel } from './DepthFocusCarousel.tsx';
import { PlatformIcon, PulseLogoMark } from './PlatformIcon.tsx';
import { SettingsModal } from './SettingsModal.tsx';
import { StoryPreviewModal } from './StoryPreviewModal.tsx';

interface DashboardProps {
  settings: AppSettings;
  items: FeedItem[];
  isLoading: boolean;
  retryStatus?: string | null;
  error: string | null;
  nowMs?: number;
  onRefreshNow: () => Promise<void>;
  onTopicsChange: (topics: TopicItem[]) => void;
  onSourcesChange: (sources: SocialSource[]) => void;
  onPreviewTheme: (themeId: string | null) => void;
  onApplyTheme: (themeId: string) => void;
  onAutoAdaptiveToggle: (enabled: boolean) => void;
  onSavePreferences: (schedule: ScheduleConfig) => Promise<void>;
  onClearCachedFeed: () => void;
  onResetAllSettings: () => void;
  onEnrichFeedItem: (itemId: string, patch: Partial<FeedItem>) => void;
}

type BaseViewTab = 'home' | 'search' | 'saved';
type NavHighlightTab = 'home' | 'curate' | 'search' | 'saved' | 'settings';

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  items,
  isLoading,
  retryStatus = null,
  error,
  onRefreshNow,
  onTopicsChange,
  onSourcesChange,
  onPreviewTheme,
  onApplyTheme,
  onAutoAdaptiveToggle,
  onSavePreferences,
  onClearCachedFeed,
  onResetAllSettings,
  onEnrichFeedItem,
}) => {
  // Navigation & Filtering State
  const [activeBaseTab, setActiveBaseTab] = useState<BaseViewTab>('home');
  const [curateOpen, setCurateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [filterPlatform, setFilterPlatform] = useState<'all' | PlatformId>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterCreator, setFilterCreator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [topStoryIndex, setTopStoryIndex] = useState<number>(0);
  const [brandPulseFeedback, setBrandPulseFeedback] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  // Modal / Reader State
  const [previewStoryId, setPreviewStoryId] = useState<string | null>(null);
  const [readerStoryId, setReaderStoryId] = useState<string | null>(null);
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({});
  const thumbAttemptedRef = useRef<Set<string>>(new Set());

  const markImageFailed = (url: string) => {
    setFailedImageUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

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
  usePWAInstall();

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

  // Resolve live item references so background AI enrichment reflects immediately
  const previewStory = useMemo(
    () => (previewStoryId ? items.find((i) => i.id === previewStoryId) || null : null),
    [items, previewStoryId]
  );

  const readerStory = useMemo(
    () => (readerStoryId ? items.find((i) => i.id === readerStoryId) || null : null),
    [items, readerStoryId]
  );

  // Extract unique active creators from sources & items
  const trackedCreators = useMemo(() => {
    const map = new Map<string, { handle: string; name: string; platform: PlatformId }>();

    settings.sources.forEach((s) => {
      map.set(s.handle.toLowerCase(), {
        handle: s.handle,
        name: s.displayName || s.handle,
        platform: s.platform,
      });
    });

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
      if (
        filterCreator &&
        (item.handle || item.accountName).toLowerCase() !== filterCreator.toLowerCase()
      ) {
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

  // Top Stories / AI Picks sorted by relevance
  const topStories = useMemo(() => {
    return [...items].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 6);
  }, [items]);

  // Clamp carousel index if topStories length changes
  useEffect(() => {
    if (topStories.length === 0) {
      setTopStoryIndex(0);
    } else if (topStoryIndex >= topStories.length) {
      setTopStoryIndex(topStories.length - 1);
    }
  }, [topStories.length, topStoryIndex]);

  // Backfill original source thumbnails for any cached items missing imageUrl
  useEffect(() => {
    if (!isOnline || items.length === 0) return;
    const missing = items
      .filter((it) => !it.imageUrl && it.sourceUrl && !thumbAttemptedRef.current.has(it.id))
      .slice(0, 12);
    if (missing.length === 0) return;

    let cancelled = false;
    missing.forEach((it) => thumbAttemptedRef.current.add(it.id));

    Promise.allSettled(
      missing.map(async (it) => {
        const res = await fetch('/api/article/thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: it.sourceUrl }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { imageUrl?: string | null };
        if (!cancelled && data.imageUrl) {
          onEnrichFeedItem(it.id, { imageUrl: data.imageUrl });
        }
      })
    ).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [items, isOnline, onEnrichFeedItem]);

  // Saved Stories List
  const savedStories = useMemo(() => {
    return items.filter((item) => savedStoryIds.includes(item.id));
  }, [items, savedStoryIds]);

  // Unified interactive brand tap: navigate to default Home feed, scroll to top, and refresh
  const handleBrandTap = () => {
    setCurateOpen(false);
    setSettingsOpen(false);
    setPreviewStoryId(null);
    setReaderStoryId(null);
    setActiveBaseTab('home');
    setFilterPlatform('all');
    setFilterTopic('all');
    setFilterCreator(null);
    setSearchQuery('');
    setTopStoryIndex(0);
    setBrandPulseFeedback(true);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.setTimeout(() => setBrandPulseFeedback(false), 950);

    if (isOnline && !isLoading) {
      void onRefreshNow();
    }
  };

  const activeNavHighlight: NavHighlightTab = curateOpen
    ? 'curate'
    : settingsOpen
    ? 'settings'
    : activeBaseTab;

  const isOverlayOpen = Boolean(
    previewStory || readerStory || curateOpen || settingsOpen || showIOSInstall
  );

  const navItems: Array<{
    id: NavHighlightTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'curate', label: 'Curate', icon: Layers },
    { id: 'search', label: 'Search', icon: Search },
    {
      id: 'saved',
      label: 'Saved',
      icon: Bookmark,
      badge: savedStoryIds.length > 0 ? savedStoryIds.length : undefined,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tabId: NavHighlightTab) => {
    if (tabId === 'curate') {
      setSettingsOpen(false);
      setCurateOpen((prev) => !prev);
      return;
    }
    if (tabId === 'settings') {
      setCurateOpen(false);
      setSettingsOpen((prev) => !prev);
      return;
    }
    setCurateOpen(false);
    setSettingsOpen(false);
    setActiveBaseTab(tabId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-dvh bg-transparent text-[var(--pc-text)] flex flex-col pb-28">
      {/* Main Content Area (scrolls naturally; inert when modal/reader overlay is active) */}
      <main
        inert={isOverlayOpen ? true : undefined}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-6 space-y-6"
      >
        {/* =========================================================================
            1. Centered Top Branding ONLY (Normal Scroll Flow — Not Fixed/Sticky)
               Interactive unified button: navigates to Home + scrolls top + refreshes
            ========================================================================= */}
        <div className="flex flex-col items-center justify-center pt-1 pb-2 gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBrandTap}
            aria-label="PulseCurate — Return to Home feed and refresh"
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--pc-accent)] focus-visible:outline-offset-4 group"
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`w-10 h-10 rounded-2xl liquid-glass flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 ${
                  brandPulseFeedback || isLoading ? 'scale-105 ring-2 ring-[var(--pc-accent)]/60' : ''
                }`}
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, var(--pc-accent-soft), var(--glass-tint))',
                  border: '1px solid var(--glass-border-top)',
                }}
              >
                <div className="absolute -top-2 -left-2 w-7 h-7 bg-[var(--pc-accent)]/30 rounded-full blur-sm" />
                <PulseLogoMark
                  className={`w-5 h-5 text-[var(--pc-accent)] relative z-10 transition-transform ${
                    isLoading || brandPulseFeedback ? 'animate-pulse scale-110' : ''
                  }`}
                />
              </div>
              {(isLoading || brandPulseFeedback) && (
                <span className="absolute -inset-1 rounded-2xl border border-[var(--pc-accent)]/50 animate-ping pointer-events-none" />
              )}
            </div>

            <span className="font-display text-2xl sm:text-[26px] font-black tracking-tight text-[var(--pc-text)] group-hover:text-[var(--pc-accent)] transition-colors">
              PulseCurate
            </span>
          </motion.button>

          {/* Clean Visual Refresh Feedback Chip */}
          {(isLoading || brandPulseFeedback) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-pill text-[11px] font-medium text-[var(--pc-accent)]"
              role="status"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{retryStatus || 'Refreshing curated feed...'}</span>
            </motion.div>
          )}
        </div>

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
              className="liquid-pill px-3 py-1.5 text-xs font-semibold text-[var(--pc-text)] shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW: HOME TAB
            ========================================================================= */}
        {activeBaseTab === 'home' && (
          <>
            {/* Top Stories Depth-Focus Carousel */}
            {topStories.length > 0 && !isLoading && (
              <section className="space-y-3">
                {/* Clean Editorial Header: Newspaper Icon + "Top Stories" Only (No "6 picks" counter) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-[var(--pc-accent)]" aria-hidden="true" />
                    <h2 className="font-display text-base sm:text-lg font-bold text-[var(--pc-text)]">
                      Top Stories
                    </h2>
                  </div>
                </div>

                {/* Focused Center Card + Blurred Scaled Side Cards + Strict 1-Card Stepping + Dynamic Dots */}
                <DepthFocusCarousel
                  items={topStories}
                  activeIndex={topStoryIndex}
                  onIndexChange={setTopStoryIndex}
                  getKey={(story) => `top-${story.id}`}
                  ariaLabel="Top Stories"
                  itemLabel={(story, idx, total) => `${story.headline} (${idx + 1} of ${total})`}
                  maxCardWidth={380}
                  cardWidthRatio={0.74}
                  gap={14}
                  showPaginationDots={true}
                  className="-mx-4 sm:mx-auto sm:max-w-[680px]"
                  onActiveItemClick={(story) => setPreviewStoryId(story.id)}
                  renderCard={(story, { isActive }) => {
                    const coverImg = getEditorialImage(story);
                    const hasThumb = Boolean(coverImg && !failedImageUrls[coverImg]);
                    const readTime = getEstimatedReadTime(story);
                    const pInfo = getPlatformInfo(story.platform);

                    return (
                      <article
                        className={`liquid-glass-card rounded-[26px] overflow-hidden p-3.5 flex flex-col justify-between group shadow-2xl transition-shadow ${
                          isActive
                            ? 'ring-1 ring-[var(--pc-accent)]/45 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.58)]'
                            : ''
                        }`}
                      >
                        {hasThumb && coverImg ? (
                          <div className="relative h-40 sm:h-44 w-full rounded-[20px] overflow-hidden mb-3 bg-black/30">
                            <img
                              src={coverImg}
                              alt={story.headline}
                              draggable={false}
                              onError={() => markImageFailed(coverImg)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                            <div
                              className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-md shadow-sm"
                              style={{ backgroundColor: `${pInfo.brandColor}d0` }}
                            >
                              <PlatformIcon platform={story.platform} className="w-3 h-3" />
                              <span>{pInfo.shortName}</span>
                            </div>

                            <div className="absolute bottom-2.5 right-2.5 text-[10px] font-medium text-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full bg-black/45">
                              {readTime}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: pInfo.brandColor }}
                            >
                              <PlatformIcon platform={story.platform} className="w-3 h-3" />
                              <span>{pInfo.shortName}</span>
                            </div>
                            <span className="text-[10px] font-medium text-[var(--pc-text-muted)] liquid-pill px-2.5 py-0.5">
                              {readTime}
                            </span>
                          </div>
                        )}

                        <h3 className="font-display font-bold text-sm sm:text-base text-[var(--pc-text)] leading-snug line-clamp-2 mb-2.5 group-hover:text-[var(--pc-accent)] transition-colors">
                          {story.headline}
                        </h3>

                        <div className="flex items-center justify-between text-[11px] text-[var(--pc-text-muted)] pt-2 border-t border-[var(--pc-border)]">
                          <span className="truncate font-medium">@{story.accountName}</span>
                          <span className="shrink-0 text-[var(--pc-accent)] font-semibold">
                            {story.topicTag}
                          </span>
                        </div>
                      </article>
                    );
                  }}
                />
              </section>
            )}

            {/* Tracked Creators Row ("Top Channels") — Smooth & Responsive */}
            {trackedCreators.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[var(--pc-accent)]" />
                    <h2 className="font-display text-base font-bold text-[var(--pc-text)]">
                      Top Channels
                    </h2>
                    {filterCreator && (
                      <button
                        type="button"
                        onClick={() => setFilterCreator(null)}
                        className="text-xs text-[var(--pc-accent)] hover:underline ml-2 flex items-center gap-1 cursor-pointer"
                      >
                        (Clear: @{filterCreator} <X className="w-3 h-3" />)
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-[var(--pc-text-muted)]">
                    Filter by creator
                  </span>
                </div>

                <div
                  className="flex items-center gap-4 overflow-x-auto pb-3 pt-2 px-1 no-scrollbar scroll-smooth snap-x snap-proximity"
                  style={{
                    overscrollBehaviorX: 'contain',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {trackedCreators.map((creator) => {
                    const pInfo = getPlatformInfo(creator.platform);
                    const isSelected =
                      filterCreator?.toLowerCase() === creator.handle.toLowerCase();

                    return (
                      <motion.button
                        key={creator.handle}
                        type="button"
                        whileHover={{ y: -2, scale: 1.04 }}
                        whileTap={{ scale: 0.93 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                        onClick={() =>
                          setFilterCreator(isSelected ? null : creator.handle)
                        }
                        className="flex flex-col items-center gap-1.5 shrink-0 snap-start group focus:outline-none cursor-pointer"
                      >
                        <div
                          className={`relative w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${
                            isSelected
                              ? 'ring-3 ring-[var(--pc-accent)] ring-offset-2 ring-offset-[var(--pc-bg)] scale-105 shadow-lg'
                              : 'shadow-md'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${pInfo.brandColor}, var(--pc-accent))`,
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-[var(--pc-surface)] flex items-center justify-center font-bold text-[var(--pc-text)] text-sm shadow-inner overflow-hidden border border-white/20">
                            {creator.name.charAt(0).toUpperCase()}
                          </div>

                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-md border border-[var(--pc-bg)]"
                            style={{ backgroundColor: pInfo.brandColor }}
                          >
                            <PlatformIcon platform={creator.platform} className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-medium max-w-[74px] truncate text-center transition-colors ${
                            isSelected
                              ? 'text-[var(--pc-accent)] font-bold'
                              : 'text-[var(--pc-text-muted)] group-hover:text-[var(--pc-text)]'
                          }`}
                        >
                          {creator.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Topic Filter Pills */}
            <section className="space-y-3">
              <div
                className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
                style={{ overscrollBehaviorX: 'contain' }}
              >
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
                      onClick={() => setFilterTopic(active ? 'all' : topic.label)}
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
              <div
                className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto no-scrollbar"
                style={{ overscrollBehaviorX: 'contain' }}
              >
                <button
                  type="button"
                  onClick={() => setFilterPlatform('all')}
                  className={`min-h-[32px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
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
                      className={`min-h-[32px] px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="tactile-pillow-card p-5 space-y-4 animate-pulse"
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

            {/* Main Tactile 3D Floating / Pillowy Editorial Feed Cards */}
            {!isLoading && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {filteredItems.map((item, idx) => {
                  const pInfo = getPlatformInfo(item.platform);
                  const coverImg = getEditorialImage(item);
                  const hasThumb = Boolean(coverImg && !failedImageUrls[coverImg]);
                  const readTime = getEstimatedReadTime(item);
                  const stats = getEngagementStats(item);
                  const isSaved = isStorySaved(item.id);

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.22) }}
                      className="tactile-pillow-card overflow-hidden flex flex-col justify-between group"
                    >
                      {hasThumb && coverImg ? (
                        /* Original Source Cover Image */
                        <div
                          className="relative h-44 w-full overflow-hidden bg-black/30 cursor-pointer"
                          onClick={() => setPreviewStoryId(item.id)}
                        >
                          <img
                            src={coverImg}
                            alt={item.headline}
                            onError={() => markImageFailed(coverImg)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--glass-tint)] via-transparent to-black/30" />

                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-md backdrop-blur-md"
                              style={{ backgroundColor: `${pInfo.brandColor}d5` }}
                            >
                              <PlatformIcon platform={item.platform} className="w-3 h-3" />
                              {pInfo.shortName}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveStory(item);
                              }}
                              className={`p-2 rounded-full liquid-glass backdrop-blur-md transition-all cursor-pointer ${
                                isSaved
                                  ? 'text-[var(--pc-accent)]'
                                  : 'text-white/85 hover:text-white'
                              }`}
                              title={isSaved ? 'Saved' : 'Save Story'}
                              aria-label={isSaved ? 'Remove saved story' : 'Save story'}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          <div className="absolute bottom-2.5 right-3 text-[11px] font-medium text-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full bg-black/45 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{readTime}</span>
                          </div>
                        </div>
                      ) : (
                        /* Clean Source Header when post has no original thumbnail */
                        <div className="px-5 sm:px-6 pt-5 flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                            style={{ backgroundColor: pInfo.brandColor }}
                          >
                            <PlatformIcon platform={item.platform} className="w-3 h-3" />
                            {pInfo.shortName}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-[var(--pc-text-muted)] liquid-pill px-2.5 py-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{readTime}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveStory(item);
                              }}
                              className={`p-2 rounded-full liquid-glass transition-all cursor-pointer ${
                                isSaved
                                  ? 'text-[var(--pc-accent)]'
                                  : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                              }`}
                              title={isSaved ? 'Saved' : 'Save Story'}
                              aria-label={isSaved ? 'Remove saved story' : 'Save story'}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-[var(--pc-text-muted)]">
                            <span className="font-semibold text-[var(--pc-text)] truncate">
                              @{item.accountName}
                            </span>
                            <span className="font-mono-tabular shrink-0">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>

                          <h2
                            onClick={() => setPreviewStoryId(item.id)}
                            className="font-display text-base sm:text-lg font-bold leading-snug text-[var(--pc-text)] group-hover:text-[var(--pc-accent)] transition-colors cursor-pointer line-clamp-2"
                          >
                            {item.headline}
                          </h2>

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
                          <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)] min-w-0">
                            <span className="flex items-center gap-1 shrink-0">
                              <Heart className="w-3 h-3 text-red-400" />
                              {stats.likes}
                            </span>
                            <span>•</span>
                            <span className="text-[var(--pc-accent)] font-medium truncate">
                              {item.topicTag}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewStoryId(item.id)}
                              className="px-3 py-1.5 rounded-full liquid-pill text-xs font-semibold text-[var(--pc-text)] hover:border-[var(--pc-accent)] transition-all cursor-pointer"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setReaderStoryId(item.id)}
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
                    ? 'Tap PulseCurate above or Refresh & Summarize Now below to fetch real updates from your active channels.'
                    : 'Try clearing your creator/topic filters or search query.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {(filterTopic !== 'all' ||
                    filterCreator ||
                    searchQuery ||
                    filterPlatform !== 'all') && (
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
        {activeBaseTab === 'search' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center space-y-2 py-2">
              <h2 className="font-display text-2xl font-black text-[var(--pc-text)]">
                Search &amp; Discover
              </h2>
              <p className="text-xs sm:text-sm text-[var(--pc-text-muted)]">
                Query stories, explore tracked creators, and filter intelligence across social networks.
              </p>
            </div>

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

            <div className="space-y-4 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--pc-text-muted)]">
                Matching Stories ({filteredItems.length})
              </div>

              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPreviewStoryId(item.id)}
                  className="tactile-pillow-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                      <span className="font-semibold text-[var(--pc-accent)]">
                        @{item.accountName}
                      </span>
                      <span>•</span>
                      <span>{item.topicTag}</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--pc-text)] truncate">
                      {item.headline}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReaderStoryId(item.id);
                    }}
                    className="liquid-btn-primary px-3.5 py-1.5 text-xs font-semibold shrink-0 cursor-pointer"
                  >
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
        {activeBaseTab === 'saved' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pc-border)]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[var(--pc-accent)] fill-current" />
                <h2 className="font-display text-xl sm:text-2xl font-black text-[var(--pc-text)]">
                  Saved Stories
                </h2>
              </div>
              <span className="liquid-pill px-3 py-1 text-xs font-mono font-bold text-[var(--pc-text)]">
                {savedStories.length} Bookmarked
              </span>
            </div>

            {savedStories.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-10 text-center space-y-3">
                <Bookmark className="w-8 h-8 text-[var(--pc-text-muted)] mx-auto" />
                <h3 className="font-bold text-base text-[var(--pc-text)]">
                  No Saved Stories Yet
                </h3>
                <p className="text-xs sm:text-sm text-[var(--pc-text-muted)] max-w-sm mx-auto">
                  Bookmark key articles from your Home Feed to read offline or review anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveBaseTab('home')}
                  className="liquid-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
                >
                  Browse Home Feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedStories.map((item) => (
                  <div
                    key={item.id}
                    className="tactile-pillow-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                        <span className="font-semibold text-[var(--pc-accent)]">
                          @{item.accountName}
                        </span>
                        <span>•</span>
                        <span>{item.topicTag}</span>
                        <span>•</span>
                        <span>{getEstimatedReadTime(item)}</span>
                      </div>
                      <h3
                        onClick={() => setPreviewStoryId(item.id)}
                        className="font-bold text-base text-[var(--pc-text)] hover:text-[var(--pc-accent)] cursor-pointer"
                      >
                        {item.headline}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setReaderStoryId(item.id)}
                        className="liquid-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer"
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSaveStory(item)}
                        className="p-2 rounded-full liquid-glass text-red-400 hover:scale-105 cursor-pointer"
                        title="Remove bookmark"
                        aria-label="Remove bookmark"
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
          Story Preview Modal (Tier 1 Medium Summary)
          ========================================================================= */}
      <StoryPreviewModal
        item={previewStory}
        isOpen={Boolean(previewStory)}
        isSaved={previewStory ? isStorySaved(previewStory.id) : false}
        onClose={() => setPreviewStoryId(null)}
        onOpenReader={(item) => {
          setPreviewStoryId(null);
          setReaderStoryId(item.id);
        }}
        onToggleSave={toggleSaveStory}
      />

      {/* =========================================================================
          Full Article Reader View (Tier 2 Executive Analysis & Appearance Sheet)
          ========================================================================= */}
      <ArticleReaderView
        item={readerStory}
        isOpen={Boolean(readerStory)}
        isSaved={readerStory ? isStorySaved(readerStory.id) : false}
        onBack={() => setReaderStoryId(null)}
        onToggleSave={toggleSaveStory}
        onEnrichItem={onEnrichFeedItem}
      />

      {/* =========================================================================
          2nd Tab: Levitating Curate Modal (Topics & Sources)
          ========================================================================= */}
      <CurateModal
        isOpen={curateOpen}
        onClose={() => setCurateOpen(false)}
        topics={settings.topics}
        sources={settings.sources}
        onTopicsChange={onTopicsChange}
        onSourcesChange={onSourcesChange}
        onRefreshFeed={onRefreshNow}
        isRefreshing={isLoading}
      />

      {/* =========================================================================
          5th Tab: Levitating Settings Modal (Profile, Preferences, Themes, Your Data)
          ========================================================================= */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        feedItems={items}
        savedStoryCount={savedStoryIds.length}
        onPreviewTheme={onPreviewTheme}
        onApplyTheme={onApplyTheme}
        onAutoAdaptiveToggle={onAutoAdaptiveToggle}
        onSavePreferences={onSavePreferences}
        onClearCachedFeed={onClearCachedFeed}
        onResetAllSettings={onResetAllSettings}
      />

      {/* =========================================================================
          Apple Liquid Glass 5-Tab Bottom Navigation Bar
          Order: Home -> Curate -> Search -> Saved -> Settings
          Includes dynamic theme-synced morphing glass lens indicator!
          ========================================================================= */}
      {!readerStory && (
        <nav
          aria-label="Bottom Navigation"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${
            curateOpen || settingsOpen ? 'z-[55]' : 'z-40'
          } w-[calc(100%-24px)] max-w-md sm:max-w-lg rounded-full p-1.5 shadow-2xl grid grid-cols-5 items-center transition-all duration-300`}
          style={{
            background: 'color-mix(in oklab, var(--glass-tint) 82%, var(--pc-accent-soft))',
            backdropFilter: 'blur(30px) saturate(200%)',
            WebkitBackdropFilter: 'blur(30px) saturate(200%)',
            border: '1px solid var(--pc-border)',
            borderTopColor: 'var(--glass-border-top)',
            boxShadow:
              '0 16px 40px -10px rgba(0, 0, 0, 0.45), 0 0 24px -6px var(--pc-accent-soft), inset 0 1px 1px 0 var(--glass-specular)',
          }}
        >
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeNavHighlight === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavClick(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative py-2 px-1 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--pc-accent)] ${
                  active
                    ? 'text-[var(--pc-accent)] font-bold'
                    : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                {/* Morphing Liquid Glass Lens Indicator */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-liquid-lens"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 30,
                      mass: 0.75,
                    }}
                    className="absolute inset-0.5 rounded-full -z-10"
                    style={{
                      background:
                        'color-mix(in oklab, var(--pc-accent) 24%, var(--glass-tint))',
                      border:
                        '1px solid color-mix(in oklab, var(--pc-accent) 52%, var(--glass-border-top))',
                      borderTopColor: 'var(--glass-border-top)',
                      boxShadow:
                        '0 4px 16px -2px var(--pc-accent-soft), inset 0 1px 1.5px 0 var(--glass-specular)',
                    }}
                  />
                )}

                <span className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      active ? 'scale-110' : 'scale-100'
                    }`}
                  />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pc-accent)] text-[var(--pc-accent-fg)] font-bold text-[9px] flex items-center justify-center shadow-sm">
                      {tab.badge}
                    </span>
                  )}
                </span>

                <span
                  className={`text-[10px] tracking-tight leading-none transition-all duration-200 ${
                    active ? 'font-bold opacity-100' : 'font-medium opacity-85'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSInstall && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
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
