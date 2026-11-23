import React, { useEffect, useState } from 'react';
import { Check, Palette, RotateCcw, Save, Sliders, Sparkles, X } from 'lucide-react';
import { THEMES } from '../data/themes.ts';
import type { AppSettings, FeedItem, ScheduleConfig, SocialSource, TopicItem } from '../types.ts';
import { ScheduleConfigurator } from './ScheduleConfigurator.tsx';
import { SourceSelector } from './SourceSelector.tsx';
import { TopicSelector } from './TopicSelector.tsx';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  feedItems: FeedItem[];
  onThemeChange: (themeId: string) => void;
  onAutoAdaptiveToggle: (enabled: boolean) => void;
  onSaveAndRefresh: (updates: {
    topics: TopicItem[];
    sources: SocialSource[];
    schedule: ScheduleConfig;
  }) => Promise<void>;
  onRestartOnboarding: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  feedItems,
  onThemeChange,
  onAutoAdaptiveToggle,
  onSaveAndRefresh,
  onRestartOnboarding,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'config'>('themes');
  const [draftTopics, setDraftTopics] = useState<TopicItem[]>(settings.topics);
  const [draftSources, setDraftSources] = useState<SocialSource[]>(settings.sources);
  const [draftSchedule, setDraftSchedule] = useState<ScheduleConfig>(settings.schedule);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftTopics(settings.topics);
      setDraftSources(settings.sources);
      setDraftSchedule(settings.schedule);
      setError(null);
    }
  }, [isOpen, settings.topics, settings.sources, settings.schedule]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (draftTopics.length === 0) {
      setError('Keep at least one active topic.');
      return;
    }
    if (draftSources.length === 0) {
      setError('Keep at least one active social media source.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSaveAndRefresh({
        topics: draftTopics,
        sources: draftSources,
        schedule: draftSchedule,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Settings">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer */}
      <aside className="relative z-10 w-full max-w-2xl h-full bg-[var(--pc-bg)] border-l border-[var(--pc-border)] flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[var(--pc-border)] flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--pc-text)]">
              PulseCurate Settings
            </h2>
            <p className="text-xs text-[var(--pc-text-muted)]">
              Customize appearance themes or edit your topics, sources, and schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="px-5 pt-3 border-b border-[var(--pc-border)] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`min-h-[42px] px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'themes'
                ? 'border-[var(--pc-accent)] text-[var(--pc-text)]'
                : 'border-transparent text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
            }`}
          >
            <Palette className="w-4 h-4" />
            Themes &amp; Appearance (18)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`min-h-[42px] px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'border-[var(--pc-accent)] text-[var(--pc-text)]'
                : 'border-transparent text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Topics, Sources &amp; Schedule
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'themes' ? (
            <div className="space-y-6">
              {/* Auto-Adaptive Theme Toggle */}
              <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
                    <Sparkles className="w-4 h-4 text-[var(--pc-accent)]" />
                    <span>Auto-Adaptive Theme</span>
                  </div>
                  <p className="text-xs text-[var(--pc-text-muted)]">
                    Automatically shifts palette based on dominant topic mood: Serious/Politics &rarr; Midnight Crimson, Tech/AI &rarr; Cyber Blue, Entertainment/Gaming &rarr; Violet Pulse.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoAdaptiveTheme}
                  onClick={() => onAutoAdaptiveToggle(!settings.autoAdaptiveTheme)}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${
                    settings.autoAdaptiveTheme ? 'bg-[var(--pc-accent)]' : 'bg-[var(--pc-surface-elevated)] border border-[var(--pc-border)]'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full transition-transform ${
                      settings.autoAdaptiveTheme
                        ? 'translate-x-6 bg-[var(--pc-accent-fg)]'
                        : 'translate-x-1 bg-[var(--pc-text-muted)]'
                    }`}
                  />
                </button>
              </div>

              {/* 18-Theme Visual Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--pc-text)]">
                    Select Theme ({THEMES.length} Presets)
                  </h3>
                  <span className="text-xs text-[var(--pc-text-muted)]">
                    Applied instantaneously
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((theme) => {
                    const active = settings.themeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onThemeChange(theme.id)}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? 'ring-2 ring-[var(--pc-accent)] border-[var(--pc-accent)]'
                            : 'border-[var(--pc-border)] hover:border-[var(--pc-text-muted)]/50'
                        }`}
                        style={{ backgroundColor: theme.bg, color: theme.text }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: theme.surface }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: theme.accent }}
                            />
                          </div>
                          {active && (
                            <Check className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
                          )}
                        </div>
                        <div className="text-xs font-semibold truncate">{theme.name}</div>
                        <div
                          className="text-[11px] capitalize mt-0.5"
                          style={{ color: theme.textMuted }}
                        >
                          {theme.isLight ? 'Light Mode' : 'Dark Mode'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="space-y-3">
                <h3 className="text-base font-bold text-[var(--pc-text)] border-b border-[var(--pc-border)] pb-2">
                  01. Edit Topics &amp; AI Keywords
                </h3>
                <TopicSelector topics={draftTopics} onChange={setDraftTopics} compact />
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-[var(--pc-text)] border-b border-[var(--pc-border)] pb-2">
                  02. Edit Social Media Sources
                </h3>
                <SourceSelector
                  topics={draftTopics}
                  sources={draftSources}
                  onChange={setDraftSources}
                  compact
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-[var(--pc-text)] border-b border-[var(--pc-border)] pb-2">
                  03. Schedule, Email &amp; Fail-Safe Delivery
                </h3>
                <ScheduleConfigurator
                  schedule={draftSchedule}
                  onChange={setDraftSchedule}
                  topics={draftTopics}
                  sampleItems={feedItems}
                />
              </section>

              <div className="pt-2 border-t border-[var(--pc-border)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onRestartOnboarding}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--pc-border)] text-xs font-medium text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen 3-Step Setup Wizard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {activeTab === 'config' && (
          <div className="px-5 py-4 border-t border-[var(--pc-border)] bg-[var(--pc-surface)] space-y-2 shrink-0">
            {error && (
              <p className="text-xs text-[var(--pc-danger)]" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--pc-border)] text-sm font-medium text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                style={{
                  backgroundColor: 'var(--pc-accent)',
                  color: 'var(--pc-accent-fg)',
                }}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving & Updating Feed...' : 'Save & Update Feed'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
