import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getMatchingSuggestions,
  getPlatformInfo,
  PLATFORMS,
  type DirectorySourceItem,
} from '../data/platforms.ts';
import type { PlatformId, SocialSource, TopicItem } from '../types.ts';
import { postWithRetryStatus, sanitizeClientError } from '../utils/apiClient.ts';
import { PlatformIcon } from './PlatformIcon.tsx';

interface SourceSelectorProps {
  topics: TopicItem[];
  sources: SocialSource[];
  onChange: (sources: SocialSource[]) => void;
  compact?: boolean;
}

const OAUTH_PROVIDERS: Array<{ id: PlatformId; label: string; desc: string }> = [
  { id: 'youtube', label: 'YouTube Subscriptions', desc: 'Import top verified creator channels for your topics' },
  { id: 'reddit', label: 'Reddit Communities', desc: 'Import high-signal subreddits matching your interests' },
  { id: 'x', label: 'X (Twitter) Following', desc: 'Import journalists, researchers, and builders' },
  { id: 'linkedin', label: 'LinkedIn Voices', desc: 'Import industry leaders and company pages' },
  { id: 'instagram', label: 'Instagram Following', desc: 'Import verified news publications and creators' },
  { id: 'facebook', label: 'Facebook Pages', desc: 'Import official news agencies and topic pages' },
  { id: 'threads', label: 'Threads Following', desc: 'Import real-time commentary and thought leaders' },
  { id: 'tiktok', label: 'TikTok Followed Creators', desc: 'Import short-form news explainers and analysts' },
  { id: 'whatsapp', label: 'WhatsApp Channels', desc: 'Import public broadcast channels and topic digests' },
];

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  topics,
  sources,
  onChange,
  compact = false,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('youtube');
  const [handleInput, setHandleInput] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [suggestedPool, setSuggestedPool] = useState<SocialSource[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Live Suggestion Bar state for every platform
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [liveSuggestions, setLiveSuggestions] = useState<Array<DirectorySourceItem | SocialSource>>(() =>
    getMatchingSuggestions('youtube', '', 6)
  );

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProvider, setImportProvider] = useState<PlatformId | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCandidates, setImportedCandidates] = useState<SocialSource[]>([]);

  const activePlatformInfo = getPlatformInfo(selectedPlatform);

  // Update suggestions whenever selected platform or input changes
  useEffect(() => {
    const immediate = getMatchingSuggestions(selectedPlatform, handleInput, 6);
    setLiveSuggestions(immediate);
    setHighlightedIndex(immediate.length > 0 ? 0 : -1);

    const trimmed = handleInput.trim();
    if (trimmed.length < 2) {
      setIsLiveSearching(false);
      return;
    }

    let active = true;
    setIsLiveSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/sources/search?platform=${selectedPlatform}&q=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.matches)) {
          const seen = new Set<string>();
          const merged: Array<DirectorySourceItem | SocialSource> = [];

          [...data.matches, ...immediate].forEach((item) => {
            const key = `${item.platform}:${item.handle.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });
          setLiveSuggestions(merged.slice(0, 7));
        }
      } catch {
        // Fallback to instant directory matches
      } finally {
        if (active) setIsLiveSearching(false);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedPlatform, handleInput]);

  // Click outside to dismiss suggestion bar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeHandle = (platform: PlatformId, raw: string): string => {
    const trimmed = raw.trim();
    if (platform === 'reddit') {
      const clean = trimmed.replace(/^https?:\/\/(www\.)?reddit\.com\/r\//i, '').replace(/^r\//i, '').replace(/\/.*$/, '');
      return `r/${clean}`;
    }
    return trimmed;
  };

  const addSource = (candidate: Omit<SocialSource, 'id'> & { id?: string }) => {
    const normalizedHandle = normalizeHandle(candidate.platform, candidate.handle);
    const duplicate = sources.some(
      (s) =>
        s.platform === candidate.platform &&
        s.handle.toLowerCase() === normalizedHandle.toLowerCase()
    );
    if (duplicate) return;

    const newSource: SocialSource = {
      id: candidate.id || `${candidate.platform}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: candidate.platform,
      handle: normalizedHandle,
      displayName: candidate.displayName || normalizedHandle,
      channelId: candidate.channelId,
      description: candidate.description,
      verified: candidate.verified,
    };
    onChange([...sources, newSource]);
  };

  const handleSelectSuggestion = (item: DirectorySourceItem | SocialSource) => {
    addSource(item);
    setHandleInput('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsDropdownOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < liveSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : liveSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (isDropdownOpen && highlightedIndex >= 0 && liveSuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(liveSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

    if (isDropdownOpen && highlightedIndex >= 0 && liveSuggestions[highlightedIndex]) {
      handleSelectSuggestion(liveSuggestions[highlightedIndex]);
      return;
    }

    addSource({
      platform: selectedPlatform,
      handle: handleInput.trim(),
      displayName: handleInput.trim(),
    });
    setHandleInput('');
    setIsDropdownOpen(false);
  };

  const removeSource = (id: string) => {
    onChange(sources.filter((s) => s.id !== id));
  };

  const handleAutoSuggest = async () => {
    if (topics.length === 0) {
      setSuggestError('Select at least one topic first so AI can match real channels.');
      return;
    }
    setSuggestError(null);
    setRetryStatus(null);
    setIsSuggesting(true);
    try {
      const data = await postWithRetryStatus<{ sources?: SocialSource[] }>(
        '/api/sources/suggest',
        {
          topics: topics.map((t) => t.label),
          platforms: [selectedPlatform, 'youtube', 'reddit', 'x', 'linkedin'].filter(
            (v, i, a) => a.indexOf(v) === i
          ),
          mode: 'suggest',
        },
        (statusMsg) => setRetryStatus(statusMsg)
      );
      setSuggestedPool(data.sources || []);
    } catch (err) {
      setSuggestError(
        sanitizeClientError(err, 'Unable to suggest channels right now. Please try again.')
      );
    } finally {
      setIsSuggesting(false);
      setRetryStatus(null);
    }
  };

  const handleQuickImportConnect = async (providerId: PlatformId) => {
    setImportProvider(providerId);
    setIsImporting(true);
    setImportedCandidates([]);
    setSuggestError(null);
    setRetryStatus(null);
    try {
      const data = await postWithRetryStatus<{ sources?: SocialSource[] }>(
        '/api/sources/suggest',
        {
          topics: topics.length > 0 ? topics.map((t) => t.label) : ['Technology', 'World News'],
          platforms: [providerId],
          mode: 'quick_import',
          provider: getPlatformInfo(providerId).name,
        },
        (statusMsg) => setRetryStatus(statusMsg)
      );
      setImportedCandidates(data.sources || []);
    } catch (err) {
      setSuggestError(sanitizeClientError(err, 'Import failed. Please try again.'));
    } finally {
      setIsImporting(false);
      setRetryStatus(null);
    }
  };

  const addAllImported = () => {
    const next = [...sources];
    importedCandidates.forEach((cand) => {
      const norm = normalizeHandle(cand.platform, cand.handle);
      if (
        !next.some(
          (s) => s.platform === cand.platform && s.handle.toLowerCase() === norm.toLowerCase()
        )
      ) {
        next.push({ ...cand, handle: norm });
      }
    });
    onChange(next);
    setShowImportModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Platform Picker Grid */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-sm font-semibold text-[var(--pc-text)]">
            Select Platform (9 Supported)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setImportProvider(selectedPlatform);
                setShowImportModal(true);
                handleQuickImportConnect(selectedPlatform);
              }}
              className="liquid-pill px-3 py-1.5 text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
              Connect {activePlatformInfo.name} (OAuth)
            </button>
            <span className="text-xs text-[var(--pc-text-muted)] hidden sm:inline">
              {activePlatformInfo.pipelineLabel}
            </span>
          </div>
        </div>

        <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-9'}`}>
          {PLATFORMS.map((p) => {
            const active = selectedPlatform === p.id;
            const count = sources.filter((s) => s.platform === p.id).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`min-h-[44px] px-2.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'liquid-pill-active'
                    : 'liquid-pill text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                <span style={{ color: active ? p.accentHex : undefined }}>
                  <PlatformIcon platform={p.id} className="w-4 h-4 shrink-0" />
                </span>
                <span className="truncate">{p.shortName}</span>
                {count > 0 && (
                  <span className="font-mono-tabular text-[11px] opacity-75">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Handle Bar + AI Actions (Liquid Glass) */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-3">
        <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2.5">
          <div ref={searchBoxRef} className="flex-1 relative">
            <div className="relative flex items-center">
              <span
                className="absolute left-3.5 pointer-events-none"
                style={{ color: activePlatformInfo.accentHex }}
              >
                <PlatformIcon platform={selectedPlatform} className="w-4 h-4" />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={handleInput}
                onChange={(e) => {
                  setHandleInput(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${activePlatformInfo.name} channel, page, or handle... e.g. ${activePlatformInfo.placeholder}`}
                className="liquid-input w-full min-h-[44px] pl-10 pr-9 py-2 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60"
                autoComplete="off"
                aria-label={`Search ${activePlatformInfo.name} channels and handles`}
                aria-expanded={isDropdownOpen}
              />
              {handleInput && (
                <button
                  type="button"
                  onClick={() => {
                    setHandleInput('');
                    setHighlightedIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 p-1 rounded-full text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Attached Interactive Suggestion Bar (Apple Liquid Glass Dropdown) */}
            {isDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-2 z-40 rounded-3xl liquid-glass-dropdown overflow-hidden divide-y divide-[var(--pc-border)]/40"
                role="listbox"
                aria-label={`${activePlatformInfo.name} Suggestions`}
              >
                {/* Header bar */}
                <div className="px-4 py-2.5 bg-[var(--pc-bg)]/70 backdrop-blur-md flex items-center justify-between text-[11px] text-[var(--pc-text-muted)] font-medium">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-[var(--pc-accent)]" />
                    {handleInput.trim() ? (
                      <span>Closest matches on {activePlatformInfo.name}</span>
                    ) : (
                      <span>Popular &amp; Verified on {activePlatformInfo.name}</span>
                    )}
                  </span>
                  {isLiveSearching ? (
                    <span className="flex items-center gap-1 text-[var(--pc-accent)]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Searching...</span>
                    </span>
                  ) : (
                    <span>{liveSuggestions.length} suggestions</span>
                  )}
                </div>

                {/* Suggestion list */}
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--pc-border)]/30">
                  {liveSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--pc-text-muted)]">
                      No matching verified preset found. Click <strong>Add Source</strong> or press <strong>Enter</strong> to add &ldquo;{handleInput}&rdquo; directly!
                    </div>
                  ) : (
                    liveSuggestions.map((item, idx) => {
                      const isClosest = idx === 0 && Boolean(handleInput.trim());
                      const isHighlighted = idx === highlightedIndex;
                      const normHandle = normalizeHandle(item.platform, item.handle);
                      const isAlreadyAdded = sources.some(
                        (s) =>
                          s.platform === item.platform &&
                          s.handle.toLowerCase() === normHandle.toLowerCase()
                      );

                      return (
                        <div
                          key={`${item.platform}-${item.handle}-${idx}`}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-[var(--pc-accent-soft)]'
                              : 'hover:bg-[var(--pc-surface-elevated)]'
                          }`}
                          role="option"
                          aria-selected={isHighlighted}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className="p-1.5 rounded-lg shrink-0 mt-0.5"
                              style={{
                                backgroundColor: `${activePlatformInfo.accentHex}18`,
                                color: activePlatformInfo.accentHex,
                              }}
                            >
                              <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-[var(--pc-text)] truncate">
                                  {item.displayName}
                                </span>
                                {item.verified && (
                                  <CheckCircle2
                                    className="w-3.5 h-3.5 text-sky-400 shrink-0"
                                    aria-label="Verified account"
                                  />
                                )}
                                {isClosest && (
                                  <span className="liquid-pill-active px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                    ✨ Closest Match
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-[var(--pc-text-muted)] truncate">
                                {item.handle}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-[var(--pc-text-muted)] line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAlreadyAdded ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--pc-success)] bg-[var(--pc-success)]/10 px-2.5 py-1 rounded-full border border-[var(--pc-success)]/25">
                                <Check className="w-3 h-3" />
                                Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSuggestion(item);
                                }}
                                className={`min-h-[30px] px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  isClosest
                                    ? 'liquid-btn-primary'
                                    : 'liquid-pill text-[var(--pc-text)]'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer shortcut bar */}
                <div className="px-4 py-2 bg-[var(--pc-bg)]/70 backdrop-blur-md flex items-center justify-between text-[10px] text-[var(--pc-text-muted)]">
                  <span>
                    Press <kbd className="px-1.5 py-0.5 rounded-full bg-[var(--pc-surface)] border border-[var(--pc-border)] font-mono text-[9px]">↵ Enter</kbd> to add match
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded-full bg-[var(--pc-surface)] border border-[var(--pc-border)] font-mono text-[9px]">↑</kbd>{' '}
                    <kbd className="px-1.5 py-0.5 rounded-full bg-[var(--pc-surface)] border border-[var(--pc-border)] font-mono text-[9px]">↓</kbd> to navigate
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!handleInput.trim()}
            className="liquid-btn-primary min-h-[44px] px-5 py-2 font-semibold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-45 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAutoSuggest}
            disabled={isSuggesting}
            className="liquid-pill min-h-[40px] px-4 py-2 text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--pc-accent)]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
            )}
            Quick Fill Recommended Sources
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="liquid-pill min-h-[40px] px-4 py-2 text-xs font-medium text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            Connect Account (OAuth)
          </button>
        </div>

        {(isSuggesting || isImporting) && retryStatus && (
          <p className="text-xs text-[var(--pc-text-muted)] flex items-center gap-1.5" role="status">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--pc-accent)]" />
            <span>{retryStatus}</span>
          </p>
        )}

        {suggestError && (
          <p className="text-xs text-[var(--pc-danger)]" role="alert">
            {suggestError}
          </p>
        )}
      </div>

      {/* AI Suggested Pool */}
      {suggestedPool.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--pc-text)]">
              AI-Verified Channel Suggestions
            </span>
            <button
              type="button"
              onClick={() => {
                const next = [...sources];
                suggestedPool.forEach((cand) => {
                  const norm = normalizeHandle(cand.platform, cand.handle);
                  if (
                    !next.some(
                      (s) => s.platform === cand.platform && s.handle.toLowerCase() === norm.toLowerCase()
                    )
                  ) {
                    next.push({ ...cand, handle: norm });
                  }
                });
                onChange(next);
              }}
              className="text-xs font-medium text-[var(--pc-accent)] hover:underline cursor-pointer"
            >
              Add all suggestions
            </button>
          </div>
          <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {suggestedPool.map((item) => {
              const pInfo = getPlatformInfo(item.platform);
              const isAdded = sources.some(
                (s) =>
                  s.platform === item.platform &&
                  s.handle.toLowerCase() === normalizeHandle(item.platform, item.handle).toLowerCase()
              );
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[var(--pc-text-muted)]">
                      <span style={{ color: pInfo.accentHex }}>
                        <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                      </span>
                      <span>{pInfo.shortName}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="truncate font-mono-tabular">{item.handle}</span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--pc-text)] truncate mt-0.5">
                      {item.displayName}
                    </div>
                    {item.description && (
                      <p className="text-xs text-[var(--pc-text-muted)] line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => addSource(item)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--pc-border)] bg-[var(--pc-surface-elevated)] text-[var(--pc-text)] hover:border-[var(--pc-accent)] disabled:opacity-50 shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--pc-success)]" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Sources List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--pc-text)]">Active Sources</h4>
          <span className="text-xs text-[var(--pc-text-muted)] font-mono-tabular">
            {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </span>
        </div>

        {sources.length === 0 ? (
          <div className="liquid-glass rounded-3xl border-dashed p-6 text-center text-xs text-[var(--pc-text-muted)]">
            No sources added yet. Type a handle/subreddit above or click &ldquo;Quick Fill Recommended Sources&rdquo;.
          </div>
        ) : (
          <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sources.map((src) => {
              const pInfo = getPlatformInfo(src.platform);
              return (
                <div
                  key={src.id}
                  className="liquid-glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ color: pInfo.accentHex }} className="shrink-0 p-1.5 rounded-full bg-[var(--pc-surface-elevated)]">
                      <PlatformIcon platform={src.platform} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--pc-text)] truncate">
                        {src.displayName}
                      </div>
                      <div className="text-xs text-[var(--pc-text-muted)] truncate">
                        {pInfo.shortName} &middot; {src.handle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSource(src.id)}
                    aria-label={`Remove ${src.displayName}`}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full text-[var(--pc-text-muted)] hover:text-[var(--pc-danger)] hover:bg-[var(--pc-danger)]/15 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Import Modal (Apple Liquid Glass Modal) */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Import via Account Interests"
        >
          <div className="w-full max-w-lg rounded-3xl liquid-glass-modal p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[var(--pc-text)]">
                  Quick Import via Account Interests
                </h3>
                <p className="text-xs text-[var(--pc-text-muted)] mt-1">
                  Pick a social profile to match popular verified accounts tailored to your Step 1 topics in one click.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="Close modal"
                className="liquid-pill min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OAUTH_PROVIDERS.map((prov) => {
                const active = importProvider === prov.id;
                const pInfo = getPlatformInfo(prov.id);
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleQuickImportConnect(prov.id)}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                      active
                        ? 'liquid-pill-active'
                        : 'liquid-glass hover:border-[var(--pc-accent)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
                      <span style={{ color: pInfo.accentHex }}>
                        <PlatformIcon platform={prov.id} className="w-4 h-4" />
                      </span>
                      <span>{prov.label}</span>
                    </div>
                    <p className="text-xs text-[var(--pc-text-muted)] mt-1">{prov.desc}</p>
                  </button>
                );
              })}
            </div>

            {isImporting && (
              <div className="py-6 flex items-center justify-center gap-2 text-sm text-[var(--pc-text-muted)]" role="status">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--pc-accent)]" />
                <span>{retryStatus || 'Matching verified accounts with your topics...'}</span>
              </div>
            )}

            {!isImporting && importedCandidates.length > 0 && (
              <div className="space-y-3 border-t border-[var(--pc-border)]/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--pc-text)]">
                    Recommended Accounts ({importedCandidates.length})
                  </span>
                  <button
                    type="button"
                    onClick={addAllImported}
                    className="liquid-btn-primary min-h-[36px] px-4 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Import All Selected
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {importedCandidates.map((cand) => {
                    const isAdded = sources.some(
                      (s) =>
                        s.platform === cand.platform &&
                        s.handle.toLowerCase() === normalizeHandle(cand.platform, cand.handle).toLowerCase()
                    );
                    return (
                      <div
                        key={cand.id}
                        className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--pc-text)] truncate">
                            {cand.displayName}
                          </div>
                          <div className="text-xs text-[var(--pc-text-muted)] truncate">
                            {cand.handle} {cand.description ? `· ${cand.description}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => addSource(cand)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-[var(--pc-border)] text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {isAdded ? 'Added' : 'Import'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
