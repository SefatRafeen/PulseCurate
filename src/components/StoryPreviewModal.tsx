import React, { useMemo } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Headphones,
  Heart,
  MessageSquare,
  Pause,
  Play,
  Share2,
  Volume2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPlatformInfo } from '../data/platforms.ts';
import { useSpeechAudio } from '../hooks/useSpeechAudio.ts';
import type { FeedItem } from '../types.ts';
import { getEditorialImage, getEngagementStats, getEstimatedReadTime } from '../utils/editorialImages.ts';
import { PlatformIcon } from './PlatformIcon.tsx';

interface StoryPreviewModalProps {
  item: FeedItem | null;
  isOpen: boolean;
  isSaved?: boolean;
  onClose: () => void;
  onOpenReader: (item: FeedItem) => void;
  onToggleSave?: (item: FeedItem) => void;
}

export const StoryPreviewModal: React.FC<StoryPreviewModalProps> = ({
  item,
  isOpen,
  isSaved = false,
  onClose,
  onOpenReader,
  onToggleSave,
}) => {
  const speech = useSpeechAudio();

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

  const narrationText = `${item.headline}. Reported by ${item.accountName} on ${platformInfo.name}. Key takeaways: ${item.takeaways.join('. ')}`;

  const handleListenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speech.toggle(narrationText);
  };

  const handleClose = () => {
    speech.stop();
    onClose();
  };

  const handleOpenReader = () => {
    speech.stop();
    onOpenReader(item);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Ambient Dark Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={handleClose}
        />

        {/* Liquid Glass Preview Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl liquid-glass rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl z-10 my-auto border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white/90 hover:text-white hover:scale-105 transition-all shadow-lg"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Full-bleed Cover Image Container */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black/40">
            <img
              src={coverImage}
              alt={item.headline}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Smooth gradient fade into card body */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--glass-tint)] via-[var(--glass-tint)]/40 to-black/20" />

            {/* Platform & Topic Pill badges over image */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-white/25 shadow-md"
                style={{
                  backgroundColor: `${platformInfo.brandColor}cc`,
                  color: '#ffffff',
                }}
              >
                <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                {platformInfo.name}
              </span>
              <span className="liquid-pill px-3 py-1 text-xs font-medium text-white/90">
                {item.topicTag}
              </span>
            </div>

            {/* Floating Circular Listen / AI Audio Summary Button on Right */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleListenClick}
              className="absolute bottom-4 right-5 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full liquid-btn-primary flex flex-col items-center justify-center shadow-xl border-2 border-white/40"
              title={speech.isPlaying ? (speech.isPaused ? 'Resume Audio' : 'Pause Audio') : 'Listen to AI Summary'}
            >
              {speech.isPlaying && !speech.isPaused ? (
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-current rounded-full animate-pulse" />
                  <span className="w-1 h-6 bg-current rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-3 bg-current rounded-full animate-pulse delay-150" />
                </div>
              ) : (
                <Headphones className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
              <span className="text-[9px] font-bold tracking-tight uppercase mt-0.5">
                {speech.isPlaying && !speech.isPaused ? 'Pause' : 'Listen'}
              </span>
            </motion.button>
          </div>

          {/* Card Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Creator / Source Attribution & Read Time */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md text-sm border-2 border-white/20"
                  style={{ backgroundColor: platformInfo.brandColor }}
                >
                  {item.accountName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--pc-text)] flex items-center gap-1.5">
                    by <span className="text-[var(--pc-accent)]">@{item.accountName}</span>
                  </div>
                  <div className="text-xs text-[var(--pc-text-muted)] flex items-center gap-2">
                    <span>{item.timestamp}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {readTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engagement Stats Row */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--pc-text-muted)]">
                <span className="flex items-center gap-1 hover:text-red-400 transition-colors">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  {stats.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {stats.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  {stats.shares}
                </span>
              </div>
            </div>

            {/* Bold Multi-Line Headline */}
            <h2 className="text-xl sm:text-2xl font-black text-[var(--pc-text)] leading-snug tracking-tight font-display">
              {item.headline}
            </h2>

            {/* AI Audio Playback Status Bar (if active) */}
            {speech.isPlaying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="liquid-pill px-4 py-2.5 flex items-center justify-between text-xs text-[var(--pc-accent)]"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  <span>AI Audio Summary playing...</span>
                </div>
                <div className="w-28 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[var(--pc-accent)] h-full transition-all duration-300"
                    style={{ width: `${Math.round(speech.progress * 100)}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* AI-Summarized Key Takeaways */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--pc-accent)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--pc-accent)] animate-ping" />
                AI Key Takeaways
              </div>
              <div className="space-y-2.5 bg-black/20 rounded-2xl p-4 sm:p-5 border border-white/10">
                {item.takeaways.map((takeaway, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--pc-accent-soft)] text-[var(--pc-accent)] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-[var(--pc-accent)]/30">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-[var(--pc-text)] leading-relaxed">
                      {takeaway}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment & Relevance Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--pc-text-muted)]">Tone:</span>
                <span className="liquid-pill px-2.5 py-0.5 text-xs font-medium text-[var(--pc-text)]">
                  {item.sentiment}
                </span>
                <span className="text-[var(--pc-text-muted)] ml-2">Urgency:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    item.urgency === 'High'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : item.urgency === 'Medium'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {item.urgency}
                </span>
              </div>

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--pc-text-muted)] hover:text-[var(--pc-accent)] transition-colors"
                >
                  Original Post
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Action Buttons: Read Full Article & Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleOpenReader}
                className="flex-1 py-3.5 px-6 liquid-btn-primary font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl"
              >
                Read Full Article
              </button>

              {onToggleSave && (
                <button
                  onClick={() => onToggleSave(item)}
                  className={`p-3.5 rounded-full liquid-glass transition-all ${
                    isSaved
                      ? 'text-[var(--pc-accent)] border-[var(--pc-accent)]'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title={isSaved ? 'Remove from Saved' : 'Save Story'}
                >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
