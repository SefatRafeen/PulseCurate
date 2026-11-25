import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Database,
  Download,
  Palette,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getThemeById, THEMES, type ThemePalette } from '../data/themes.ts';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import type { AppSettings, FeedItem, ScheduleConfig } from '../types.ts';
import { DepthFocusCarousel } from './DepthFocusCarousel.tsx';
import { ScheduleConfigurator } from './ScheduleConfigurator.tsx';

export type SettingsSection = 'menu' | 'profile' | 'preferences' | 'themes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  feedItems: FeedItem[];
  savedStoryCount: number;
  onPreviewTheme: (themeId: string | null) => void;
  onApplyTheme: (themeId: string) => void;
  onAutoAdaptiveToggle: (enabled: boolean) => void;
  onSavePreferences: (schedule: ScheduleConfig) => Promise<void>;
  onClearCachedFeed: () => void;
  onResetAllSettings: () => void;
  onSectionChange?: (section: SettingsSection) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  feedItems,
  savedStoryCount,
  onPreviewTheme,
  onApplyTheme,
  onAutoAdaptiveToggle,
  onSavePreferences,
  onClearCachedFeed,
  onResetAllSettings,
  onSectionChange,
}) => {
  const [section, setSection] = useState<SettingsSection>('menu');
  const [draftSchedule, setDraftSchedule] = useState<ScheduleConfig>(settings.schedule);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSavedFeedback, setPrefsSavedFeedback] = useState(false);

  // Themes Carousel State
  const initialThemeIndex = useMemo(() => {
    const idx = THEMES.findIndex((t) => t.id === settings.themeId);
    return idx >= 0 ? idx : 0;
  }, [settings.themeId]);

  const [carouselThemeIndex, setCarouselThemeIndex] = useState<number>(initialThemeIndex);
  const [themeAppliedFeedback, setThemeAppliedFeedback] = useState<boolean>(false);

  // Your Data State
  const [dataStatusMsg, setDataStatusMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  useScrollLock(isOpen);

  const changeSection = (next: SettingsSection) => {
    setSection(next);
    onSectionChange?.(next);
  };

  useEffect(() => {
    if (isOpen) {
      setDraftSchedule(settings.schedule);
      setPrefsSavedFeedback(false);
      setDataStatusMsg(null);
      setConfirmReset(false);
      setThemeAppliedFeedback(false);
      const idx = THEMES.findIndex((t) => t.id === settings.themeId);
      setCarouselThemeIndex(idx >= 0 ? idx : 0);
      changeSection('menu');
    } else {
      onPreviewTheme(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Live preview whenever carousel index changes in Themes mode
  useEffect(() => {
    if (!isOpen) return;
    if (section === 'themes') {
      const target = THEMES[carouselThemeIndex];
      if (target) {
        onPreviewTheme(target.id);
      }
    } else {
      onPreviewTheme(null);
    }
  }, [isOpen, section, carouselThemeIndex, onPreviewTheme]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (section !== 'menu') {
          onPreviewTheme(null);
          changeSection('menu');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, section]);

  const handleClose = () => {
    onPreviewTheme(null);
    onClose();
  };

  const handleSavePrefs = async () => {
    setIsSavingPrefs(true);
    setPrefsSavedFeedback(false);
    try {
      await onSavePreferences(draftSchedule);
      setPrefsSavedFeedback(true);
      window.setTimeout(() => setPrefsSavedFeedback(false), 2500);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleApplyCarouselTheme = (theme: ThemePalette) => {
    onApplyTheme(theme.id);
    onPreviewTheme(null);
    setThemeAppliedFeedback(true);
    window.setTimeout(() => setThemeAppliedFeedback(false), 1800);
  };

  const handleExportSettings = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        app: 'PulseCurate',
        settings,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pulsecurate-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDataStatusMsg('Exported preferences JSON backup.');
    } catch {
      setDataStatusMsg('Unable to export settings in this browser context.');
    }
  };

  const handleClearCache = () => {
    onClearCachedFeed();
    setDataStatusMsg('Cleared cached stories from local storage.');
  };

  const currentSavedTheme = getThemeById(settings.themeId);
  const previewedTheme = THEMES[carouselThemeIndex] || currentSavedTheme;

  if (!isOpen) return null;

  // =========================================================================
  // Dedicated Horizontal 3D/Blur Themes Live-Preview Carousel Dock
  // Keeps surrounding app UI sharp and visible for real-time previewing!
  // =========================================================================
  if (section === 'themes') {
    return (
      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end pb-24 px-3 sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Theme Selector"
        >
          {/* Floating Liquid Glass Theme Studio at Bottom/Center */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="pointer-events-auto mx-auto w-full max-w-2xl liquid-glass-modal rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden"
          >
            {/* Top Bar */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--pc-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    onPreviewTheme(null);
                    changeSection('menu');
                  }}
                  aria-label="Back to Settings"
                  className="liquid-pill w-8 h-8 flex items-center justify-center text-[var(--pc-text)] cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[var(--pc-text)] truncate">
                      Themes
                    </h3>
                    <span className="liquid-pill px-2 py-0.5 text-[10px] font-mono-tabular text-[var(--pc-accent)] font-bold">
                      {carouselThemeIndex + 1} / {THEMES.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--pc-text-muted)] truncate">
                    Swipe to preview live across PulseCurate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Compact Auto-Adaptive Toggle */}
                <button
                  type="button"
                  onClick={() => onAutoAdaptiveToggle(!settings.autoAdaptiveTheme)}
                  title="Auto-Adaptive Mood Theme"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    settings.autoAdaptiveTheme
                      ? 'liquid-pill-active'
                      : 'liquid-pill text-[var(--pc-text-muted)]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[var(--pc-accent)]" />
                  <span className="hidden sm:inline">Auto</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close Themes"
                  className="liquid-pill w-8 h-8 flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal 3D/Blur Theme Carousel */}
            <div className="pt-2 pb-1">
              <DepthFocusCarousel
                items={THEMES}
                activeIndex={carouselThemeIndex}
                onIndexChange={setCarouselThemeIndex}
                getKey={(t) => t.id}
                ariaLabel="PulseCurate themes"
                itemLabel={(t, i, total) => `${t.name} (${i + 1} of ${total})`}
                maxCardWidth={300}
                cardWidthRatio={0.68}
                gap={12}
                showPaginationDots={false}
                onActiveItemClick={(theme) => handleApplyCarouselTheme(theme)}
                renderCard={(theme, { isActive }) => {
                  const isSaved = settings.themeId === theme.id;
                  return (
                    <div
                      className={`rounded-[24px] p-4 border transition-all shadow-xl relative overflow-hidden ${
                        isActive ? 'ring-2 ring-[var(--pc-accent)]' : ''
                      }`}
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        borderColor: isActive ? theme.accent : theme.border,
                      }}
                    >
                      {/* Mini UI Preview Swatch inside card */}
                      <div
                        className="rounded-2xl p-3 mb-3 border space-y-2 relative overflow-hidden"
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white/25"
                              style={{ backgroundColor: theme.bg }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white/25"
                              style={{ backgroundColor: theme.surfaceElevated }}
                            />
                            <span
                              className="w-4 h-4 rounded-full shadow-sm"
                              style={{ backgroundColor: theme.accent }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.accentSoft,
                              color: theme.accent,
                            }}
                          >
                            {theme.isLight ? 'Light' : theme.group === 'vibrant' ? 'Vibrant' : 'Dark'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div
                            className="h-2.5 w-3/4 rounded-full"
                            style={{ backgroundColor: theme.text, opacity: 0.85 }}
                          />
                          <div
                            className="h-2 w-1/2 rounded-full"
                            style={{ backgroundColor: theme.textMuted, opacity: 0.65 }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold truncate">
                            {theme.name}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{ color: theme.textMuted }}
                          >
                            {isSaved ? 'Currently saved theme' : 'Live preview active'}
                          </div>
                        </div>
                        {isSaved && (
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: theme.accent,
                              color: theme.accentFg,
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* Apply / Cancel Action Footer */}
            <div className="px-4 sm:px-5 py-3.5 border-t border-[var(--pc-border)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onPreviewTheme(null);
                  changeSection('menu');
                }}
                className="liquid-pill min-h-[40px] px-4 py-1.5 text-xs font-semibold text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleApplyCarouselTheme(previewedTheme)}
                className="liquid-btn-primary min-h-[40px] px-5 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {themeAppliedFeedback
                  ? `Applied ${previewedTheme.name}!`
                  : settings.themeId === previewedTheme.id
                  ? 'Theme Active'
                  : `Apply "${previewedTheme.name}"`}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // =========================================================================
  // Standard Levitating Settings Glass Modal (Menu, Profile, Preferences, Your Data)
  // =========================================================================
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pt-4 pb-24 px-4 sm:px-6 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="PulseCurate Settings"
      >
        {/* Softly Blurred Backdrop with Strict Pointer & Touch Isolation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/45 backdrop-blur-md touch-none"
          onTouchMove={(e) => e.preventDefault()}
          onClick={handleClose}
        />

        {/* Levitating Floating Settings Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-xl max-h-[min(78dvh,calc(100dvh-120px))] flex flex-col liquid-glass-modal rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-[var(--pc-border)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {section !== 'menu' ? (
                <button
                  type="button"
                  onClick={() => changeSection('menu')}
                  aria-label="Back to Settings menu"
                  className="liquid-pill w-9 h-9 flex items-center justify-center text-[var(--pc-text)] cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-2xl liquid-glass flex items-center justify-center text-[var(--pc-accent)] shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-[var(--pc-text)] truncate">
                  {section === 'menu'
                    ? 'Settings'
                    : section === 'profile'
                    ? 'Profile'
                    : 'Preferences'}
                </h2>
                <p className="text-[11px] text-[var(--pc-text-muted)] truncate">
                  {section === 'menu'
                    ? 'Profile, delivery preferences, themes & data'
                    : section === 'profile'
                    ? 'Personalization & account identity'
                    : 'Schedule, push alerts, email digest & auto-sync'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close settings"
              className="liquid-pill w-9 h-9 flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto modal-scroll-area p-5 space-y-5">
            {section === 'menu' && (
              <>
                {/* Main Settings Navigation Cards */}
                <div className="space-y-3">
                  {/* Section 1: Profile */}
                  <button
                    type="button"
                    onClick={() => changeSection('profile')}
                    className="w-full liquid-glass rounded-3xl p-4 flex items-center justify-between gap-4 text-left hover:border-[var(--pc-accent)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[var(--pc-accent-soft)] text-[var(--pc-accent)] flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--pc-text)]">Profile</div>
                        <p className="text-xs text-[var(--pc-text-muted)] truncate">
                          Account personalization &amp; reader profile
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--pc-text-muted)] group-hover:text-[var(--pc-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Section 2: Preferences (Delivery & Notifications) */}
                  <button
                    type="button"
                    onClick={() => changeSection('preferences')}
                    className="w-full liquid-glass rounded-3xl p-4 flex items-center justify-between gap-4 text-left hover:border-[var(--pc-accent)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[var(--pc-accent-soft)] text-[var(--pc-accent)] flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--pc-text)]">
                          Preferences
                        </div>
                        <p className="text-xs text-[var(--pc-text-muted)] truncate">
                          Schedule ({settings.schedule.frequency}), Push, Email Digest &amp; Auto-Sync
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--pc-text-muted)] group-hover:text-[var(--pc-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Section 3: Themes (Opens Horizontal 3D/Blur Live Preview Carousel) */}
                  <button
                    type="button"
                    onClick={() => changeSection('themes')}
                    className="w-full liquid-glass rounded-3xl p-4 flex items-center justify-between gap-4 text-left hover:border-[var(--pc-accent)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-[var(--pc-border)] shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${currentSavedTheme.bg}, ${currentSavedTheme.accent})`,
                          color: currentSavedTheme.accentFg,
                        }}
                      >
                        <Palette className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--pc-text)]">Themes</span>
                          <span className="liquid-pill px-2 py-0.5 text-[10px] font-mono-tabular text-[var(--pc-accent)] font-bold">
                            {THEMES.length} Presets
                          </span>
                        </div>
                        <p className="text-xs text-[var(--pc-text-muted)] truncate">
                          Active: {currentSavedTheme.name} &middot; Swipe live preview
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--pc-text-muted)] group-hover:text-[var(--pc-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>

                {/* Section 4: Your Data (Dedicated bottom section in Settings) */}
                <section className="pt-2 space-y-3" aria-label="Your Data">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--pc-text-muted)] px-1">
                    <Database className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                    <span>Your Data</span>
                  </div>

                  <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-[var(--pc-surface)]/65 border border-[var(--pc-border)] p-2.5">
                        <div className="text-sm font-bold font-mono-tabular text-[var(--pc-text)]">
                          {settings.topics.length}
                        </div>
                        <div className="text-[11px] text-[var(--pc-text-muted)]">Topics</div>
                      </div>
                      <div className="rounded-2xl bg-[var(--pc-surface)]/65 border border-[var(--pc-border)] p-2.5">
                        <div className="text-sm font-bold font-mono-tabular text-[var(--pc-text)]">
                          {settings.sources.length}
                        </div>
                        <div className="text-[11px] text-[var(--pc-text-muted)]">Sources</div>
                      </div>
                      <div className="rounded-2xl bg-[var(--pc-surface)]/65 border border-[var(--pc-border)] p-2.5">
                        <div className="text-sm font-bold font-mono-tabular text-[var(--pc-text)]">
                          {feedItems.length} / {savedStoryCount}
                        </div>
                        <div className="text-[11px] text-[var(--pc-text-muted)]">Feed / Saved</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportSettings}
                        className="liquid-pill min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-[var(--pc-text)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
                        Export Preferences
                      </button>

                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="liquid-pill min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-[var(--pc-text)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                        Clear Cached Stories
                      </button>

                      {!confirmReset ? (
                        <button
                          type="button"
                          onClick={() => setConfirmReset(true)}
                          className="liquid-pill min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-[var(--pc-danger)] hover:border-[var(--pc-danger)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset Settings
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmReset(false);
                              onResetAllSettings();
                            }}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[var(--pc-danger)] text-white text-xs font-bold cursor-pointer"
                          >
                            Confirm Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            className="liquid-pill min-h-[38px] px-3 py-1.5 text-xs font-medium text-[var(--pc-text-muted)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {dataStatusMsg && (
                      <p className="text-xs text-[var(--pc-accent)] font-medium" role="status">
                        {dataStatusMsg}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Profile Sub-View: Clean Empty Placeholder State */}
            {section === 'profile' && (
              <div className="liquid-glass rounded-3xl p-8 text-center space-y-4 my-4">
                <div className="w-16 h-16 rounded-full bg-[var(--pc-accent-soft)] text-[var(--pc-accent)] flex items-center justify-center mx-auto border border-[var(--pc-accent)]/30">
                  <User className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="font-display text-base font-bold text-[var(--pc-text)]">
                    Profile Coming Soon
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--pc-text-muted)] leading-relaxed">
                    Profile customization and account features are coming in a future update.
                  </p>
                </div>
              </div>
            )}

            {/* Preferences Sub-View: Delivery & Notifications */}
            {section === 'preferences' && (
              <ScheduleConfigurator
                schedule={draftSchedule}
                onChange={setDraftSchedule}
                topics={settings.topics}
                sampleItems={feedItems}
              />
            )}
          </div>

          {/* Preferences Save Footer */}
          {section === 'preferences' && (
            <div className="px-5 py-3.5 border-t border-[var(--pc-border)] bg-[var(--glass-tint)] backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[var(--pc-accent)] font-medium">
                {prefsSavedFeedback ? 'Preferences saved & synced.' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeSection('menu')}
                  className="liquid-pill min-h-[40px] px-4 py-1.5 text-xs font-semibold text-[var(--pc-text)] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  disabled={isSavingPrefs}
                  className="liquid-btn-primary min-h-[40px] px-5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
