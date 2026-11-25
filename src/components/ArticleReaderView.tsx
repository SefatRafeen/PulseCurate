import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  ArrowLeft,
  Bookmark,
  ChevronDown,
  Clock,
  ExternalLink,
  Headphones,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  Sliders,
  Sun,
  Type,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import { useSpeechAudio } from '../hooks/useSpeechAudio.ts';
import type { FeedItem } from '../types.ts';
import {
  generateEditorialArticle,
  generateEditorialArticleSections,
  getEditorialImage,
  getEngagementStats,
  getEstimatedReadTime,
  getMediumPreviewSummary,
} from '../utils/editorialImages.ts';
import { formatRelativeTime } from '../utils/scheduleMath.ts';
import { PlatformIcon } from './PlatformIcon.tsx';

interface ArticleReaderViewProps {
  item: FeedItem | null;
  isOpen: boolean;
  isSaved?: boolean;
  onBack: () => void;
  onToggleSave?: (item: FeedItem) => void;
  onEnrichItem?: (itemId: string, patch: Partial<FeedItem>) => void;
}

export type SurfaceTint = 'theme' | 'sepia' | 'obsidian';

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  item,
  isOpen,
  isSaved = false,
  onBack,
  onToggleSave,
  onEnrichItem,
}) => {
  const speech = useSpeechAudio();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const enrichedIdsRef = useRef<Set<string>>(new Set());

  // Reader Customization State (Appearance panel ALWAYS closed by default)
  const [viewMode, setViewMode] = useState<'text' | 'audio'>('text');
  const [fontSize, setFontSize] = useState<number>(20);
  const [brightness, setBrightness] = useState<number>(100);
  const [surfaceTint, setSurfaceTint] = useState<SurfaceTint>('theme');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>('left');
  const [showControlSheet, setShowControlSheet] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const active = isOpen && Boolean(item);
  useScrollLock(active);

  // Always close Reader Appearance popover & reset scroll when opening any article
  useEffect(() => {
    setShowControlSheet(false);
    setViewMode('text');
    setImgFailed(false);
    if (active && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [active, item?.id]);

  // Escape key closes control sheet first, otherwise navigates back
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showControlSheet) {
          setShowControlSheet(false);
        } else {
          speech.stop();
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, showControlSheet, onBack, speech]);

  // Background deep AI analysis enrichment when opening a story missing rich fullContent
  useEffect(() => {
    if (!active || !item) return;
    if (item.fullContent && item.fullContent.trim().length > 360) return;
    if (enrichedIdsRef.current.has(item.id)) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    enrichedIdsRef.current.add(item.id);
    let cancelled = false;
    setIsEnriching(true);

    fetch('/api/article/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.fullContent === 'string' && data.fullContent.trim().length > 200) {
          onEnrichItem?.(item.id, {
            previewSummary: data.previewSummary || item.previewSummary,
            takeaways: Array.isArray(data.takeaways) && data.takeaways.length > 0 ? data.takeaways : item.takeaways,
            fullContent: data.fullContent,
          });
        }
      })
      .catch(() => {
        // Silently keep rich structured client analysis
      })
      .finally(() => {
        if (!cancelled) setIsEnriching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, item, onEnrichItem]);

  const articleSections = useMemo(() => {
    return item ? generateEditorialArticleSections(item) : [];
  }, [item]);

  const fullArticleText = useMemo(() => {
    return item ? generateEditorialArticle(item) : '';
  }, [item]);

  const mediumSummary = useMemo(() => {
    return item ? getMediumPreviewSummary(item) : { overview: '', takeaways: [] };
  }, [item]);

  const coverImage = useMemo(() => {
    return item ? getEditorialImage(item) : '';
  }, [item]);

  const readTime = useMemo(() => {
    return item ? getEstimatedReadTime(item) : '5 min read';
  }, [item]);

  const stats = useMemo(() => {
    return item ? getEngagementStats(item) : { likes: 320, comments: 24, shares: 14, views: '2.4k' };
  }, [item]);

  if (!active || !item) return null;

  const platformInfo = getPlatformInfo(item.platform);

  const firstSection = articleSections[0];
  const firstParagraph = firstSection?.paragraphs[0] || '';
  const firstLetter = firstParagraph.charAt(0);
  const restOfFirstParagraph = firstParagraph.slice(1);
  const firstSectionTail = firstSection?.paragraphs.slice(1) || [];
  const followingSections = articleSections.slice(1);

  const handleBack = () => {
    speech.stop();
    setShowControlSheet(false);
    onBack();
  };

  const handleModeChange = (mode: 'text' | 'audio') => {
    setViewMode(mode);
    if (mode === 'audio') {
      speech.play(`${item.headline}. ${fullArticleText}`);
    } else {
      speech.stop();
    }
  };

  const getSurfaceStyles = () => {
    switch (surfaceTint) {
      case 'sepia':
        return {
          backgroundColor: '#fbf0d9',
          color: '#2b261f',
          mutedColor: '#6b5c49',
          borderColor: 'rgba(43, 38, 31, 0.16)',
          cardBg: 'rgba(43, 38, 31, 0.05)',
        };
      case 'obsidian':
        return {
          backgroundColor: '#000000',
          color: '#f1f5f9',
          mutedColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          cardBg: 'rgba(255, 255, 255, 0.04)',
        };
      case 'theme':
      default:
        return {
          backgroundColor: 'var(--pc-bg)',
          color: 'var(--pc-text)',
          mutedColor: 'var(--pc-text-muted)',
          borderColor: 'var(--pc-border)',
          cardBg: 'var(--glass-tint)',
        };
    }
  };

  const surfaceStyles = getSurfaceStyles();

  return (
    <div
      ref={scrollContainerRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.headline}
      className="fixed inset-0 z-[60] overflow-y-auto modal-scroll-area transition-colors duration-300"
      style={{
        filter: `brightness(${brightness}%)`,
        backgroundColor: surfaceStyles.backgroundColor,
        color: surfaceStyles.color,
      }}
    >
      {/* Top Liquid Glass Navigation Bar */}
      <header className="sticky top-0 z-40 w-full liquid-glass-header px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="liquid-pill px-3.5 py-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--pc-text)] hover:scale-105 transition-all cursor-pointer"
          aria-label="Back to feed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Segmented Audio | Text Toggle Pill */}
        <div className="flex items-center p-1 rounded-full liquid-glass shadow-inner">
          <button
            type="button"
            onClick={() => handleModeChange('text')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'text'
                ? 'liquid-pill-active shadow-md'
                : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('audio')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'audio'
                ? 'liquid-btn-primary shadow-md'
                : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        </div>

        {/* Right Save & Appearance Toggle Actions */}
        <div className="flex items-center gap-2">
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(item)}
              className={`p-2.5 rounded-full liquid-glass transition-all cursor-pointer ${
                isSaved
                  ? 'text-[var(--pc-accent)] border-[var(--pc-accent)]'
                  : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Story'}
              aria-label={isSaved ? 'Remove from Saved' : 'Save Story'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowControlSheet((prev) => !prev)}
            className={`p-2.5 rounded-full liquid-glass transition-all cursor-pointer ${
              showControlSheet
                ? 'text-[var(--pc-accent)] border-[var(--pc-accent)]'
                : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
            }`}
            title="Reader Appearance Settings"
            aria-label="Toggle Reader Appearance Settings"
            aria-expanded={showControlSheet}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Editorial Article Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-7 sm:py-11 pb-36 transition-all">
        {/* Original Source Cover Image (or clean attribution strip if post has no image) */}
        {coverImage && !imgFailed ? (
          <div className="relative w-full h-60 sm:h-96 rounded-[28px] overflow-hidden mb-8 shadow-2xl border border-[var(--pc-border)]">
            <img
              src={coverImage}
              alt={item.headline}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2.5">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-md"
                  style={{ backgroundColor: platformInfo.brandColor }}
                >
                  <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                  {platformInfo.name}
                </span>
                <span className="text-xs font-medium text-white/85">
                  by @{item.accountName}
                </span>
              </div>
              <div className="text-xs font-medium text-white/85 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{readTime}</span>
                <span>•</span>
                <span>{formatRelativeTime(item.timestamp)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 text-white"
                style={{ backgroundColor: platformInfo.brandColor }}
              >
                <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                {platformInfo.name}
              </span>
              <span className="text-xs font-medium" style={{ color: surfaceStyles.mutedColor }}>
                by @{item.accountName}
              </span>
            </div>
            <div className="text-xs font-medium flex items-center gap-2" style={{ color: surfaceStyles.mutedColor }}>
              <Clock className="w-3.5 h-3.5" />
              <span>{readTime}</span>
              <span>•</span>
              <span>{formatRelativeTime(item.timestamp)}</span>
            </div>
          </div>
        )}

        {/* Audio Narration Hero Player */}
        {viewMode === 'audio' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 liquid-glass rounded-3xl border border-[var(--pc-accent)]/40 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full liquid-btn-primary flex items-center justify-center shadow-lg">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--pc-text)]">PulseCurate AI Narrator</h4>
                  <p className="text-xs text-[var(--pc-text-muted)]">Neural Speech Synthesis</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => speech.toggle(`${item.headline}. ${fullArticleText}`)}
                className="px-4 py-2 rounded-full liquid-btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                {speech.isPlaying && !speech.isPaused ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[var(--pc-border)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[var(--pc-accent)] h-full transition-all duration-300"
                  style={{ width: `${Math.round(speech.progress * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--pc-text-muted)] font-mono">
                <span>0:00</span>
                <span>{readTime}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Article Headline */}
        <h1
          className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-5 font-display"
          style={{ color: surfaceStyles.color }}
        >
          {item.headline}
        </h1>

        {/* Metadata & Topics */}
        <div
          className="flex flex-wrap items-center gap-2.5 pb-6 mb-8 border-b"
          style={{ borderColor: surfaceStyles.borderColor }}
        >
          <span className="liquid-pill px-3 py-1 text-xs font-semibold text-[var(--pc-text)]">
            {item.topicTag}
          </span>
          <span className="liquid-pill px-3 py-1 text-xs font-semibold text-[var(--pc-text)]">
            {item.sentiment}
          </span>
          {isEnriching && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--pc-accent)] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Deepening AI analysis...
            </span>
          )}
          <span
            className="text-xs ml-auto flex items-center gap-3"
            style={{ color: surfaceStyles.mutedColor }}
          >
            <span>Views: {stats.views}</span>
            <span>Shares: {stats.shares}</span>
          </span>
        </div>

        {/* Comprehensive Editorial Analysis */}
        <article
          className="space-y-7 leading-relaxed transition-all"
          style={{
            fontSize: `${fontSize}px`,
            textAlign,
            color: surfaceStyles.color,
          }}
        >
          {/* First Section with Large Drop-Cap */}
          {firstSection && (
            <section className="space-y-5">
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--pc-accent)' }}
              >
                {firstSection.title}
              </h2>
              <p className="leading-relaxed">
                <span
                  className="float-left text-5xl sm:text-6xl font-black font-display mr-3 mt-1 leading-none select-none"
                  style={{ color: 'var(--pc-accent)' }}
                >
                  {firstLetter}
                </span>
                {restOfFirstParagraph}
              </p>
              {firstSectionTail.map((para, idx) => (
                <p key={idx} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </section>
          )}

          {/* Executive AI Briefing Callout Card */}
          <div
            className="my-8 p-6 rounded-3xl border shadow-lg space-y-3.5"
            style={{
              backgroundColor: surfaceStyles.cardBg,
              borderColor: surfaceStyles.borderColor,
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--pc-accent)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pc-accent)]" />
              Executive AI Briefing &amp; Key Evidence
            </div>
            <ul className="space-y-3 text-sm sm:text-base">
              {mediumSummary.takeaways.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-[var(--pc-accent)] font-bold shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Subsequent Deep-Dive Sections */}
          {followingSections.map((sec, sIdx) => (
            <section key={sIdx} className="space-y-4">
              <h2
                className="text-xs font-bold uppercase tracking-widest pt-2"
                style={{ color: 'var(--pc-accent)' }}
              >
                {sec.title}
              </h2>
              {sec.paragraphs.map((para, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </article>

        {/* Original Article Link */}
        {item.sourceUrl && (
          <div
            className="mt-12 pt-6 border-t flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: surfaceStyles.borderColor }}
          >
            <span
              className="text-xs truncate max-w-md"
              style={{ color: surfaceStyles.mutedColor }}
            >
              Source: {item.sourceUrl}
            </span>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pc-accent)] hover:underline shrink-0"
            >
              Open Original Post
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </main>

      {/* Bottom Floating Liquid Glass Reader Control Sheet (Closed by default; opens ONLY on toggle) */}
      <AnimatePresence>
        {showControlSheet && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-lg liquid-glass-modal rounded-3xl p-4 sm:p-5 shadow-2xl z-50 space-y-4"
          >
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pc-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--pc-text)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                Reader Appearance
              </span>
              <button
                type="button"
                onClick={() => setShowControlSheet(false)}
                className="text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] p-1 rounded-full cursor-pointer"
                title="Hide Controls"
                aria-label="Close Reader Appearance"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Brightness Slider */}
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="range"
                min="60"
                max="125"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[var(--pc-accent)] cursor-pointer"
                title={`Brightness: ${brightness}%`}
                aria-label="Reader brightness"
              />
              <span className="text-xs font-mono text-[var(--pc-text-muted)] w-10 text-right">
                {brightness}%
              </span>
            </div>

            {/* 3 Quick Surface-Tint Swatches */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-[var(--pc-text-muted)] font-medium">Surface Tint:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSurfaceTint('theme')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    surfaceTint === 'theme'
                      ? 'liquid-pill-active'
                      : 'liquid-pill text-[var(--pc-text-muted)]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--pc-accent)]" />
                  Glass
                </button>

                <button
                  type="button"
                  onClick={() => setSurfaceTint('sepia')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    surfaceTint === 'sepia'
                      ? 'border-amber-500 bg-[#fbf0d9] text-[#2b261f] font-bold shadow-md'
                      : 'border-[var(--pc-border)] bg-[#fbf0d9]/20 text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e8d5b5]" />
                  Sepia
                </button>

                <button
                  type="button"
                  onClick={() => setSurfaceTint('obsidian')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    surfaceTint === 'obsidian'
                      ? 'border-white bg-black text-white font-bold shadow-md'
                      : 'border-[var(--pc-border)] bg-black/40 text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
                  Obsidian
                </button>
              </div>
            </div>

            {/* Font Size Stepper & Alignment Controls */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--pc-text-muted)] font-medium">Text Size:</span>
                <div className="flex items-center rounded-full liquid-glass px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                    className="p-1.5 hover:text-[var(--pc-accent)] text-[var(--pc-text)] transition-colors cursor-pointer"
                    title="Decrease font size"
                    aria-label="Decrease font size"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-[var(--pc-text)] min-w-[32px] text-center">
                    {fontSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.min(32, s + 2))}
                    className="p-1.5 hover:text-[var(--pc-accent)] text-[var(--pc-text)] transition-colors cursor-pointer"
                    title="Increase font size"
                    aria-label="Increase font size"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center rounded-full liquid-glass p-0.5">
                <button
                  type="button"
                  onClick={() => setTextAlign('left')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    textAlign === 'left'
                      ? 'liquid-pill-active'
                      : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                  title="Align Left"
                  aria-label="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('center')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    textAlign === 'center'
                      ? 'liquid-pill-active'
                      : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                  title="Align Center"
                  aria-label="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('justify')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    textAlign === 'justify'
                      ? 'liquid-pill-active'
                      : 'text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                  }`}
                  title="Align Justify"
                  aria-label="Align Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
