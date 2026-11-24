import React, { useState } from 'react';
import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { PRESET_TOPICS } from '../data/platforms.ts';
import type { TopicExtractionResult, TopicItem, TopicMood } from '../types.ts';
import { postWithRetryStatus, sanitizeClientError } from '../utils/apiClient.ts';

interface TopicSelectorProps {
  topics: TopicItem[];
  onChange: (topics: TopicItem[]) => void;
  compact?: boolean;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, onChange, compact = false }) => {
  const [customInput, setCustomInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [extractionInfo, setExtractionInfo] = useState<TopicExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedLabels = new Set(topics.map((t) => t.label.toLowerCase()));

  const togglePreset = (preset: TopicItem) => {
    const exists = topics.some((t) => t.label.toLowerCase() === preset.label.toLowerCase());
    if (exists) {
      onChange(topics.filter((t) => t.label.toLowerCase() !== preset.label.toLowerCase()));
    } else {
      onChange([...topics, preset]);
    }
  };

  const removeTopic = (id: string) => {
    onChange(topics.filter((t) => t.id !== id));
  };

  const handleExtractCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setError(null);
    setRetryStatus(null);
    setIsExtracting(true);
    try {
      const result = await postWithRetryStatus<TopicExtractionResult>(
        '/api/topics/extract',
        { input: trimmed },
        (statusMsg) => setRetryStatus(statusMsg)
      );
      setExtractionInfo(result);

      const newItems: TopicItem[] = [];
      const existingLower = new Set(topics.map((t) => t.label.toLowerCase()));
      const candidates = [...result.keywords, ...result.subTopics.slice(0, 2)];

      candidates.forEach((kw, idx) => {
        const clean = kw.trim();
        if (clean && !existingLower.has(clean.toLowerCase())) {
          existingLower.add(clean.toLowerCase());
          newItems.push({
            id: `custom-${Date.now()}-${idx}`,
            label: clean,
            mood: result.mood,
            isCustom: true,
          });
        }
      });

      if (newItems.length > 0) {
        onChange([...topics, ...newItems]);
      }
      setCustomInput('');
    } catch (err) {
      setError(sanitizeClientError(err, 'Unable to extract topics right now. Please try again.'));
    } finally {
      setIsExtracting(false);
      setRetryStatus(null);
    }
  };

  const addQuickMoodTag = (label: string, mood: TopicMood) => {
    if (selectedLabels.has(label.toLowerCase())) return;
    onChange([
      ...topics,
      { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label, mood, isCustom: true },
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-sm font-semibold text-[var(--pc-text)]">Core Topics & Niches</h3>
          <span className="text-xs text-[var(--pc-text-muted)] font-mono-tabular">
            {topics.length} selected
          </span>
        </div>
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
          {PRESET_TOPICS.map((preset) => {
            const active = selectedLabels.has(preset.label.toLowerCase());
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => togglePreset(preset)}
                className={`min-h-[44px] px-4 py-2.5 text-left transition-all flex items-center justify-between gap-2 text-sm font-medium cursor-pointer ${
                  active
                    ? 'liquid-pill-active'
                    : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                <span className="truncate">{preset.label}</span>
                {active && <Check className="w-4 h-4 shrink-0 text-[var(--pc-accent)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Others / Custom Topic AI Extractor (Liquid Glass) */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-3">
        <div>
          <label
            htmlFor="custom-topic-input"
            className="block text-sm font-semibold text-[var(--pc-text)]"
          >
            Others / Custom Topic
          </label>
          <p className="text-xs text-[var(--pc-text-muted)] mt-1">
            Describe any niche naturally (e.g., &ldquo;indie game dev, Three.js, and Bangladeshi tech startups&rdquo;). Gemini extracts structured tags and mood.
          </p>
        </div>

        <form onSubmit={handleExtractCustom} className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="custom-topic-input"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type your custom topics or interests..."
            className="liquid-input flex-1 min-h-[44px] px-4 py-2 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60"
          />
          <button
            type="submit"
            disabled={isExtracting || !customInput.trim()}
            className="liquid-btn-primary min-h-[44px] px-5 py-2 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze &amp; Add Tags
              </>
            )}
          </button>
        </form>

        {isExtracting && retryStatus && (
          <p className="text-xs text-[var(--pc-text-muted)] flex items-center gap-1.5" role="status">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--pc-accent)]" />
            <span>{retryStatus}</span>
          </p>
        )}

        {error && (
          <p className="text-xs text-[var(--pc-danger)]" role="alert">
            {error}
          </p>
        )}

        {extractionInfo && (
          <div className="pt-2 border-t border-[var(--pc-border)]/50 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--pc-text-muted)]">
              <span>Mood: <strong className="text-[var(--pc-text)]">{extractionInfo.mood}</strong></span>
              <span aria-hidden="true">&middot;</span>
              <span>{extractionInfo.summary}</span>
            </div>
            {extractionInfo.subTopics.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--pc-text-muted)] mr-1">Related sub-topics:</span>
                {extractionInfo.subTopics.map((sub) => {
                  const alreadyAdded = selectedLabels.has(sub.toLowerCase());
                  return (
                    <button
                      key={sub}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addQuickMoodTag(sub, extractionInfo.mood)}
                      className="liquid-pill text-xs px-3 py-1 text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] disabled:opacity-45 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {sub}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Removable Tags (Liquid Pills) */}
      {topics.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[var(--pc-text-muted)]">
            Active Topic Tags (click to remove)
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => removeTopic(topic.id)}
                className="liquid-pill min-h-[36px] px-3.5 py-1.5 text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-danger)] flex items-center gap-2 transition-all group cursor-pointer"
                title={`Mood: ${topic.mood} — Click to remove`}
              >
                <span>{topic.label}</span>
                <span className="text-[var(--pc-text-muted)] text-[11px] font-mono">({topic.mood})</span>
                <X className="w-3.5 h-3.5 text-[var(--pc-text-muted)] group-hover:text-[var(--pc-danger)]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
