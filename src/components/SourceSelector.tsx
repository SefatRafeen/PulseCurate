import React, { useState } from 'react';
import { Check, DownloadCloud, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { getPlatformInfo, PLATFORMS } from '../data/platforms.ts';
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

  // Quick Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProvider, setImportProvider] = useState<PlatformId | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCandidates, setImportedCandidates] = useState<SocialSource[]>([]);

  const activePlatformInfo = getPlatformInfo(selectedPlatform);

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

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;
    addSource({
      platform: selectedPlatform,
      handle: handleInput.trim(),
      displayName: handleInput.trim(),
    });
    setHandleInput('');
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
          <span className="text-xs text-[var(--pc-text-muted)]">
            Pipeline: {activePlatformInfo.pipelineLabel}
          </span>
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
                className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)] text-[var(--pc-text)]'
                    : 'border-[var(--pc-border)] bg-[var(--pc-surface)] text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
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

      {/* Add Handle Bar + AI Actions */}
      <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 space-y-3">
        <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative flex items-center">
            <span
              className="absolute left-3.5 pointer-events-none"
              style={{ color: activePlatformInfo.accentHex }}
            >
              <PlatformIcon platform={selectedPlatform} className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder={`Add ${activePlatformInfo.name}: e.g. ${activePlatformInfo.placeholder}`}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60 focus:outline-none focus:border-[var(--pc-accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={!handleInput.trim()}
            className="min-h-[44px] px-4 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-45 cursor-pointer"
            style={{
              backgroundColor: 'var(--pc-accent)',
              color: 'var(--pc-accent-fg)',
            }}
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
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-elevated)] text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--pc-accent)]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
            )}
            Auto-Suggest Real Channels
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] text-xs font-medium text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] hover:border-[var(--pc-text-muted)]/50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            Quick Import via Account Interests
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
          <div className="rounded-xl border border-dashed border-[var(--pc-border)] p-5 text-center text-xs text-[var(--pc-text-muted)]">
            No sources added yet. Type a handle/subreddit above or click &ldquo;Auto-Suggest Real Channels&rdquo;.
          </div>
        ) : (
          <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sources.map((src) => {
              const pInfo = getPlatformInfo(src.platform);
              return (
                <div
                  key={src.id}
                  className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] px-3.5 py-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span style={{ color: pInfo.accentHex }} className="shrink-0">
                      <PlatformIcon platform={src.platform} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--pc-text)] truncate">
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
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--pc-text-muted)] hover:text-[var(--pc-danger)] hover:bg-[var(--pc-surface-elevated)] transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Import Modal (Simulated Interest OAuth Flow) */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Import via Account Interests"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5 sm:p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
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
                className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] hover:bg-[var(--pc-surface-elevated)] cursor-pointer"
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
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)]'
                        : 'border-[var(--pc-border)] bg-[var(--pc-bg)] hover:border-[var(--pc-text-muted)]/50'
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
              <div className="space-y-3 border-t border-[var(--pc-border)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--pc-text)]">
                    Recommended Accounts ({importedCandidates.length})
                  </span>
                  <button
                    type="button"
                    onClick={addAllImported}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--pc-accent)',
                      color: 'var(--pc-accent-fg)',
                    }}
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
