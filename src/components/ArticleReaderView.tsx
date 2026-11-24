import React, { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Headphones,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Share2,
  Sliders,
  Sun,
  Type,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useSpeechAudio } from '../hooks/useSpeechAudio.ts';
import type { FeedItem } from '../types.ts';
import {
  generateEditorialArticle,
  getEditorialImage,
  getEngagementStats,
  getEstimatedReadTime,
} from '../utils/editorialImages.ts';
import { PlatformIcon } from './PlatformIcon.tsx';

interface ArticleReaderViewProps {
  item: FeedItem | null;
  isOpen: boolean;
  isSaved?: boolean;
  onBack: () => void;
  onOpenGlobalSettings?: () => void;
  onToggleSave?: (item: FeedItem) => void;
}

export type SurfaceTint = 'theme' | 'sepia' | 'obsidian';

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  item,
  isOpen,
  isSaved = false,
  onBack,
  onOpenGlobalSettings,
  onToggleSave,
}) => {
  const speech = useSpeechAudio();

  // Reader Customization State
  const [viewMode, setViewMode] = useState<'text' | 'audio'>('text');
  const [fontSize, setFontSize] = useState<number>(22);
  const [brightness, setBrightness] = useState<number>(100);
  const [surfaceTint, setSurfaceTint] = useState<SurfaceTint>('theme');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>('left');
  const [showControlSheet, setShowControlSheet] = useState<boolean>(true);

  const fullArticle = useMemo(() => {
    return item ? generateEditorialArticle(item) : '';
  }, [item]);

  const coverImage = useMemo(() => {
    return item ? getEditorialImage(item) : '';
  }, [item]);

  const readTime = useMemo(() => {
    return item ? getEstimatedReadTime(item) : '3 min read';
  }, [item]);

  const stats = useMemo(() => {
    return item ? getEngagementStats(item) : { likes: 320, comments: 24, shares: 14, views: '2.4k' };
  }, [item]);

  if (!isOpen || !item) return null;

  const platformInfo = getPlatformInfo(item.platform);

  // Split text into paragraphs for editorial formatting
  const paragraphs = fullArticle.split('\n\n').filter((p) => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';
  const firstLetter = firstParagraph.charAt(0);
  const restOfFirstParagraph = firstParagraph.slice(1);
  const remainingParagraphs = paragraphs.slice(1);

  const handleBack = () => {
    speech.stop();
    onBack();
  };

  const handleModeChange = (mode: 'text' | 'audio') => {
    setViewMode(mode);
    if (mode === 'audio') {
      speech.play(`${item.headline}. ${fullArticle}`);
    } else {
      speech.stop();
    }
  };

  // Surface Tint styles
  const getSurfaceStyles = () => {
    switch (surfaceTint) {
      case 'sepia':
        return {
          backgroundColor: '#fbf0d9',
          color: '#2b261f',
          borderColor: 'rgba(43, 38, 31, 0.15)',
        };
      case 'obsidian':
        return {
          backgroundColor: '#090a0f',
          color: '#f1f5f9',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        };
      case 'theme':
      default:
        return {
          backgroundColor: 'var(--glass-tint)',
          color: 'var(--pc-text)',
          borderColor: 'var(--pc-border)',
        };
    }
  };

  const surfaceStyles = getSurfaceStyles();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto transition-colors duration-300"
      style={{
        filter: `brightness(${brightness}%)`,
        backgroundColor: surfaceTint === 'sepia' ? '#f4ece1' : surfaceTint === 'obsidian' ? '#000000' : 'var(--pc-bg)',
      }}
    >
      {/* Top Liquid Glass Navigation Bar */}
      <header className="sticky top-0 z-40 w-full liquid-glass-header px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="liquid-pill px-3.5 py-2 flex items-center gap-2 text-xs sm:text-sm font-semibold hover:scale-105 transition-all"
          aria-label="Back to feed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Segmented Audio | Text Toggle Pill */}
        <div className="flex items-center p-1 rounded-full liquid-glass border border-white/20 shadow-inner">
          <button
            onClick={() => handleModeChange('text')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'text'
                ? 'liquid-pill-active shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>
          <button
            onClick={() => handleModeChange('audio')}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'audio'
                ? 'liquid-btn-primary shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        </div>

        {/* Right Settings & Save Actions */}
        <div className="flex items-center gap-2">
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(item)}
              className={`p-2.5 rounded-full liquid-glass transition-all ${
                isSaved
                  ? 'text-[var(--pc-accent)] border-[var(--pc-accent)]'
                  : 'text-white/80 hover:text-white'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Story'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setShowControlSheet((prev) => !prev)}
            className={`p-2.5 rounded-full liquid-glass transition-all ${
              showControlSheet ? 'text-[var(--pc-accent)] border-[var(--pc-accent)]' : 'text-white/80 hover:text-white'
            }`}
            title="Reader Customization Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Editorial Article Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 pb-44 transition-all">
        {/* Cover Image Header */}
        <div className="relative w-full h-64 sm:h-96 rounded-[28px] overflow-hidden mb-8 shadow-2xl border border-white/20">
          <img
            src={coverImage}
            alt={item.headline}
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
              <span className="text-xs font-medium text-white/80">
                by @{item.accountName}
              </span>
            </div>
            <div className="text-xs font-medium text-white/80 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{readTime}</span>
              <span>•</span>
              <span>{item.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Audio Narration Hero Player (when in Audio mode or playing) */}
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
                onClick={() => speech.toggle(`${item.headline}. ${fullArticle}`)}
                className="px-4 py-2 rounded-full liquid-btn-primary text-xs font-bold flex items-center gap-2"
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

            {/* Audio Progress Scrubber */}
            <div className="space-y-1.5">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden cursor-pointer">
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
          className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-6 font-display"
          style={{ color: surfaceStyles.color }}
        >
          {item.headline}
        </h1>

        {/* Metadata & Topics */}
        <div className="flex flex-wrap items-center gap-2.5 pb-6 mb-8 border-b" style={{ borderColor: surfaceStyles.borderColor }}>
          <span className="liquid-pill px-3 py-1 text-xs font-semibold">
            {item.topicTag}
          </span>
          <span className="liquid-pill px-3 py-1 text-xs font-semibold">
            {item.sentiment}
          </span>
          <span className="text-xs text-[var(--pc-text-muted)] ml-auto flex items-center gap-3">
            <span>Views: {stats.views}</span>
            <span>Shares: {stats.shares}</span>
          </span>
        </div>

        {/* Editorial Body Content with Drop-Cap */}
        <article
          className="space-y-6 leading-relaxed transition-all"
          style={{
            fontSize: `${fontSize}px`,
            textAlign: textAlign,
            color: surfaceStyles.color,
          }}
        >
          {/* First Paragraph with Large Drop-Cap */}
          <p className="leading-relaxed">
            <span
              className="float-left text-5xl sm:text-6xl font-black font-display mr-3 mt-1 leading-none select-none"
              style={{ color: 'var(--pc-accent)' }}
            >
              {firstLetter}
            </span>
            {restOfFirstParagraph}
          </p>

          {/* AI Takeaways Callout Card */}
          <div
            className="my-8 p-6 rounded-3xl border shadow-lg space-y-3"
            style={{
              backgroundColor: surfaceTint === 'sepia' ? 'rgba(43, 38, 31, 0.05)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: surfaceStyles.borderColor,
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--pc-accent)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pc-accent)]" />
              Executive AI Briefing
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base">
              {item.takeaways.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-[var(--pc-accent)] font-bold shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Remaining Paragraphs */}
          {remainingParagraphs.map((para, idx) => (
            <p key={idx} className="leading-relaxed">
              {para}
            </p>
          ))}
        </article>

        {/* Original Article Link */}
        {item.sourceUrl && (
          <div className="mt-12 pt-6 border-t flex items-center justify-between" style={{ borderColor: surfaceStyles.borderColor }}>
            <span className="text-xs text-[var(--pc-text-muted)]">Source: {item.sourceUrl}</span>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pc-accent)] hover:underline"
            >
              Open Original Post
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </main>

      {/* =========================================================================
          Bottom Floating Liquid Glass Reader Control Sheet (Right Screen Style)
          ========================================================================= */}
      <AnimatePresence>
        {showControlSheet && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-lg liquid-glass rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/25 z-40 space-y-4"
          >
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                Reader Appearance
              </span>
              <button
                onClick={() => setShowControlSheet(false)}
                className="text-white/60 hover:text-white p-1 rounded-full"
                title="Hide Controls"
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
              />
              <span className="text-xs font-mono text-white/70 w-9 text-right">{brightness}%</span>
            </div>

            {/* 3 Quick Surface-Tint Swatches */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-white/70 font-medium">Surface Tint:</span>
              <div className="flex items-center gap-2">
                {/* 1. Theme-adaptive liquid glass */}
                <button
                  onClick={() => setSurfaceTint('theme')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    surfaceTint === 'theme'
                      ? 'border-[var(--pc-accent)] bg-white/20 text-white font-bold shadow-md'
                      : 'border-white/20 bg-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--pc-accent)]" />
                  Glass
                </button>

                {/* 2. Sepia */}
                <button
                  onClick={() => setSurfaceTint('sepia')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    surfaceTint === 'sepia'
                      ? 'border-amber-400 bg-[#fbf0d9] text-[#2b261f] font-bold shadow-md'
                      : 'border-white/20 bg-[#fbf0d9]/20 text-amber-200 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e8d5b5]" />
                  Sepia
                </button>

                {/* 3. Obsidian */}
                <button
                  onClick={() => setSurfaceTint('obsidian')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    surfaceTint === 'obsidian'
                      ? 'border-white bg-black text-white font-bold shadow-md'
                      : 'border-white/20 bg-black/40 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
                  Obsidian
                </button>
              </div>
            </div>

            {/* Font Size Stepper & Alignment Controls */}
            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Font Size Stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/70 font-medium">Text Size:</span>
                <div className="flex items-center rounded-full liquid-glass border border-white/20 px-1 py-0.5">
                  <button
                    onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                    className="p-1 hover:text-[var(--pc-accent)] text-white/80 transition-colors"
                    title="Decrease font size"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-white min-w-[32px] text-center">
                    {fontSize}
                  </span>
                  <button
                    onClick={() => setFontSize((s) => Math.min(32, s + 2))}
                    className="p-1 hover:text-[var(--pc-accent)] text-white/80 transition-colors"
                    title="Increase font size"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Alignment Toggles */}
              <div className="flex items-center rounded-full liquid-glass border border-white/20 p-0.5">
                <button
                  onClick={() => setTextAlign('left')}
                  className={`p-1.5 rounded-full transition-all ${
                    textAlign === 'left' ? 'liquid-pill-active text-white' : 'text-white/60 hover:text-white'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTextAlign('center')}
                  className={`p-1.5 rounded-full transition-all ${
                    textAlign === 'center' ? 'liquid-pill-active text-white' : 'text-white/60 hover:text-white'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTextAlign('justify')}
                  className={`p-1.5 rounded-full transition-all ${
                    textAlign === 'justify' ? 'liquid-pill-active text-white' : 'text-white/60 hover:text-white'
                  }`}
                  title="Align Justify"
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
