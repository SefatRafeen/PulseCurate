import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Plus, RefreshCw, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PRESET_TOPICS } from '../data/platforms.ts';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import type { SocialSource, TopicItem } from '../types.ts';
import { SourceSelector } from './SourceSelector.tsx';

interface CurateModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: TopicItem[];
  sources: SocialSource[];
  onTopicsChange: (topics: TopicItem[]) => void;
  onSourcesChange: (sources: SocialSource[]) => void;
  onRefreshFeed: () => Promise<void>;
  isRefreshing?: boolean;
}

const KNOWN_TOPICS_STORAGE_KEY = 'pulsecurate_known_topics_v1';

function loadStoredCustomTopics(): TopicItem[] {
  try {
    const raw = localStorage.getItem(KNOWN_TOPICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CurateModal: React.FC<CurateModalProps> = ({
  isOpen,
  onClose,
  topics,
  sources,
  onTopicsChange,
  onSourcesChange,
  onRefreshFeed,
  isRefreshing = false,
}) => {
  const [subTab, setSubTab] = useState<'topics' | 'sources'>('topics');
  const [topicQuery, setTopicQuery] = useState('');
  const [knownCustomPool, setKnownCustomPool] = useState<TopicItem[]>(() =>
    loadStoredCustomTopics()
  );

  useScrollLock(isOpen);

  // Sync any custom topics present in settings into known pool so deselecting moves them to Unselected
  useEffect(() => {
    setKnownCustomPool((prev) => {
      const map = new Map<string, TopicItem>();
      prev.forEach((t) => map.set(t.label.toLowerCase(), t));
      let changed = false;
      topics.forEach((t) => {
        const key = t.label.toLowerCase();
        const isPreset = PRESET_TOPICS.some((p) => p.label.toLowerCase() === key);
        if (!isPreset && !map.has(key)) {
          map.set(key, t);
          changed = true;
        }
      });
      if (!changed) return prev;
      const next = Array.from(map.values());
      try {
        localStorage.setItem(KNOWN_TOPICS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage limits
      }
      return next;
    });
  }, [topics]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const selectedLabels = useMemo(
    () => new Set(topics.map((t) => t.label.toLowerCase())),
    [topics]
  );

  // Full catalog of unselected topics (presets + remembered custom topics not currently active)
  const unselectedTopics = useMemo(() => {
    const combined = [...PRESET_TOPICS, ...knownCustomPool];
    const seen = new Set<string>();
    const list: TopicItem[] = [];
    for (const item of combined) {
      const key = item.label.toLowerCase();
      if (!seen.has(key) && !selectedLabels.has(key)) {
        seen.add(key);
        list.push(item);
      }
    }
    return list;
  }, [knownCustomPool, selectedLabels]);

  const trimmedQuery = topicQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const filteredSelected = useMemo(() => {
    if (!normalizedQuery) return topics;
    return topics.filter((t) => t.label.toLowerCase().includes(normalizedQuery));
  }, [topics, normalizedQuery]);

  const filteredUnselected = useMemo(() => {
    if (!normalizedQuery) return unselectedTopics;
    return unselectedTopics.filter((t) => t.label.toLowerCase().includes(normalizedQuery));
  }, [unselectedTopics, normalizedQuery]);

  const showCustomAddPrompt =
    trimmedQuery.length > 0 &&
    filteredSelected.length === 0 &&
    filteredUnselected.length === 0;

  const handleDeselectTopic = (topic: TopicItem) => {
    onTopicsChange(
      topics.filter((t) => t.label.toLowerCase() !== topic.label.toLowerCase())
    );
  };

  const handleSelectTopic = (topic: TopicItem) => {
    if (selectedLabels.has(topic.label.toLowerCase())) return;
    onTopicsChange([...topics, topic]);
  };

  const handleCreateCustomTopic = () => {
    if (!trimmedQuery) return;
    const exists = topics.some(
      (t) => t.label.toLowerCase() === trimmedQuery.toLowerCase()
    );
    if (exists) {
      setTopicQuery('');
      return;
    }

    const newTopic: TopicItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: trimmedQuery,
      mood: 'Analytical',
      isCustom: true,
    };

    setKnownCustomPool((prev) => {
      const next = [...prev, newTopic];
      try {
        localStorage.setItem(KNOWN_TOPICS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    onTopicsChange([...topics, newTopic]);
    setTopicQuery('');
  };

  const handleApplyAndRefresh = async () => {
    onClose();
    await onRefreshFeed();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pt-4 pb-24 px-4 sm:px-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Curate Topics and Sources"
        >
          {/* Softly Blurred Backdrop with Strict Pointer & Touch Isolation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-md touch-none"
            onTouchMove={(e) => e.preventDefault()}
            onClick={onClose}
          />

          {/* Levitating Floating Glass Card (Not Fullscreen, Visible Margins on All Sides) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-xl max-h-[min(78dvh,calc(100dvh-120px))] flex flex-col liquid-glass-modal rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header + Top Segmented Switcher */}
            <div className="px-5 pt-5 pb-4 border-b border-[var(--pc-border)] space-y-4 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl liquid-glass flex items-center justify-center text-[var(--pc-accent)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[var(--pc-text)]">
                      Curate Feed
                    </h2>
                    <p className="text-[11px] text-[var(--pc-text-muted)]">
                      Manage your active topics &amp; social channels
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Curate"
                  className="liquid-pill w-9 h-9 flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sleek Two-Part Apple Liquid Glass Segmented Switcher: Topics | Sources */}
              <div
                className="relative grid grid-cols-2 p-1 rounded-full liquid-glass"
                role="tablist"
                aria-label="Curate sections"
              >
                {(['topics', 'sources'] as const).map((tab) => {
                  const isActive = subTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSubTab(tab)}
                      className={`relative z-10 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'text-[var(--pc-text)]'
                          : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="curate-segmented-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-full liquid-pill-active -z-10"
                        />
                      )}
                      <span>{tab === 'topics' ? 'Topics' : 'Sources'}</span>
                      <span className="font-mono-tabular text-[11px] opacity-75">
                        ({tab === 'topics' ? topics.length : sources.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body (Strict Scroll Containment) */}
            <div className="flex-1 overflow-y-auto modal-scroll-area p-5 space-y-5">
              {subTab === 'topics' ? (
                <div className="space-y-5">
                  {/* Search & Custom Topic Creation Bar */}
                  <div className="space-y-2.5">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-[var(--pc-text-muted)] absolute left-4 pointer-events-none" />
                      <input
                        type="search"
                        value={topicQuery}
                        onChange={(e) => setTopicQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && showCustomAddPrompt) {
                            e.preventDefault();
                            handleCreateCustomTopic();
                          }
                        }}
                        placeholder="Search topics or add a custom topic..."
                        aria-label="Search or add topics"
                        className="liquid-input w-full min-h-[44px] pl-10 pr-9 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60"
                      />
                      {topicQuery && (
                        <button
                          type="button"
                          onClick={() => setTopicQuery('')}
                          aria-label="Clear topic search"
                          className="absolute right-3 p-1 rounded-full text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Custom Topic Prompt when query matches 0 existing topics */}
                    {showCustomAddPrompt && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleCreateCustomTopic}
                        className="w-full rounded-2xl p-3.5 text-left liquid-pill-active flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-medium text-[var(--pc-text)]">
                          Do you want to add &lsquo;<strong className="text-[var(--pc-accent)]">{trimmedQuery}</strong>&rsquo; to your topics?
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-btn-primary text-xs font-semibold shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </span>
                      </motion.button>
                    )}
                  </div>

                  {/* Section 1: Selected / Added (Single-Column Vertical Bullet-Point List) */}
                  <section className="space-y-2.5" aria-label="Selected topics">
                    <div className="flex items-center justify-between border-b border-[var(--pc-border)] pb-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--pc-accent)]">
                        Selected / Added
                      </h3>
                      <span className="text-xs font-mono-tabular text-[var(--pc-text-muted)]">
                        {filteredSelected.length}
                      </span>
                    </div>

                    {filteredSelected.length === 0 ? (
                      <p className="text-xs text-[var(--pc-text-muted)] py-2 pl-2">
                        {normalizedQuery
                          ? 'No selected topics match this filter.'
                          : 'No topics selected yet. Click a topic below to add it.'}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredSelected.map((topic) => (
                          <li key={topic.id}>
                            <button
                              type="button"
                              onClick={() => handleDeselectTopic(topic)}
                              className="w-full rounded-2xl px-3.5 py-2.5 text-left liquid-glass hover:border-[var(--pc-danger)]/60 flex items-center justify-between gap-3 group transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  aria-hidden="true"
                                  className="w-2.5 h-2.5 rounded-full bg-[var(--pc-accent)] shrink-0 shadow-[0_0_8px_var(--pc-accent-soft)]"
                                />
                                <span className="text-sm font-semibold text-[var(--pc-text)] truncate">
                                  {topic.label}
                                </span>
                                {topic.isCustom && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--pc-accent-soft)] text-[var(--pc-accent)] font-semibold shrink-0">
                                    Custom
                                  </span>
                                )}
                              </div>

                              <span className="text-xs text-[var(--pc-text-muted)] group-hover:text-[var(--pc-danger)] flex items-center gap-1 shrink-0">
                                <span className="hidden sm:inline text-[11px]">Remove</span>
                                <X className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Section 2: Unselected (Single-Column Vertical Bullet-Point List) */}
                  <section className="space-y-2.5" aria-label="Unselected topics">
                    <div className="flex items-center justify-between border-b border-[var(--pc-border)] pb-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--pc-text-muted)]">
                        Unselected
                      </h3>
                      <span className="text-xs font-mono-tabular text-[var(--pc-text-muted)]">
                        {filteredUnselected.length}
                      </span>
                    </div>

                    {filteredUnselected.length === 0 ? (
                      <p className="text-xs text-[var(--pc-text-muted)] py-2 pl-2">
                        {normalizedQuery
                          ? 'No unselected topics match this filter.'
                          : 'All preset and custom topics are currently selected.'}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredUnselected.map((topic) => (
                          <li key={topic.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectTopic(topic)}
                              className="w-full rounded-2xl px-3.5 py-2.5 text-left liquid-glass hover:border-[var(--pc-accent)] flex items-center justify-between gap-3 group transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  aria-hidden="true"
                                  className="w-2 h-2 rounded-full bg-[var(--pc-text-muted)]/55 group-hover:bg-[var(--pc-accent)] shrink-0 transition-colors"
                                />
                                <span className="text-sm font-medium text-[var(--pc-text-muted)] group-hover:text-[var(--pc-text)] truncate transition-colors">
                                  {topic.label}
                                </span>
                              </div>

                              <span className="text-xs text-[var(--pc-text-muted)] group-hover:text-[var(--pc-accent)] flex items-center gap-1 shrink-0">
                                <span className="hidden sm:inline text-[11px]">Add</span>
                                <Plus className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              ) : (
                <SourceSelector
                  topics={topics}
                  sources={sources}
                  onChange={onSourcesChange}
                  compact
                />
              )}
            </div>

            {/* Footer Bar */}
            <div className="px-5 py-3.5 border-t border-[var(--pc-border)] bg-[var(--glass-tint)] backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[var(--pc-text-muted)]">
                {topics.length} {topics.length === 1 ? 'topic' : 'topics'} &middot;{' '}
                {sources.length} {sources.length === 1 ? 'source' : 'sources'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="liquid-pill min-h-[38px] px-4 py-1.5 text-xs font-semibold text-[var(--pc-text)] cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleApplyAndRefresh}
                  disabled={isRefreshing || topics.length === 0 || sources.length === 0}
                  className="liquid-btn-primary min-h-[38px] px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Feed
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
