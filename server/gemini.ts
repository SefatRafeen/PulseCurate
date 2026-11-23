import { GoogleGenAI, Type } from '@google/genai';
import type {
  FeedItem,
  PlatformId,
  SocialSource,
  TopicExtractionResult,
  TopicItem,
  TopicMood,
} from '../src/types.ts';

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const MODEL_FALLBACK_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.8-flash-lite',
] as const;

export const SEARCH_GROUNDED_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
] as const;

const PRIMARY_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;
const FALLBACK_RETRY_DELAYS_MS = [1000, 2000] as const;

export interface RetryStatusEvent {
  phase: 'retrying' | 'fallback';
  model: string;
  attempt?: number;
  maxRetries?: number;
  delayMs?: number;
  message: string;
}

export type StatusCallback = (event: RetryStatusEvent) => void;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ParsedErrorDetails {
  statusCode: number | null;
  statusText: string;
  innerMessage: string;
}

function parseErrorDetails(err: unknown): ParsedErrorDetails {
  const obj = err as {
    status?: number;
    code?: number;
    message?: string;
    error?: { code?: number; status?: string; message?: string };
  } | null;

  let statusCode: number | null =
    typeof obj?.status === 'number'
      ? obj.status
      : typeof obj?.code === 'number'
      ? obj.code
      : typeof obj?.error?.code === 'number'
      ? obj.error.code
      : null;

  let statusText = typeof obj?.error?.status === 'string' ? obj.error.status : '';
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  let innerMessage = rawMessage;

  // SDK errors often embed JSON like {"error":{"code":503,"message":"...","status":"UNAVAILABLE"}}
  const jsonStart = rawMessage.indexOf('{');
  const jsonEnd = rawMessage.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart, jsonEnd + 1)) as {
        error?: { code?: number; status?: string; message?: string };
        code?: number;
        status?: string;
        message?: string;
      };
      const target = parsed.error || parsed;
      if (typeof target.code === 'number' && !statusCode) {
        statusCode = target.code;
      }
      if (typeof target.status === 'string' && !statusText) {
        statusText = target.status;
      }
      if (typeof target.message === 'string' && target.message.trim()) {
        innerMessage = target.message.trim();
      }
    } catch {
      // Keep rawMessage
    }
  }

  return { statusCode, statusText, innerMessage };
}

export function isModelNotFoundError(err: unknown): boolean {
  const { statusCode, statusText, innerMessage } = parseErrorDetails(err);
  if (statusCode === 404) return true;
  const combined = `${statusText} ${innerMessage}`.toLowerCase();
  return (
    combined.includes('not_found') ||
    combined.includes('404') ||
    combined.includes('no longer available') ||
    combined.includes('is not found') ||
    combined.includes('not supported for generatecontent')
  );
}

export function isTransientCapacityError(err: unknown): boolean {
  const { statusCode, statusText, innerMessage } = parseErrorDetails(err);
  if (statusCode === 503 || statusCode === 429) return true;
  const combined = `${statusText} ${innerMessage}`.toLowerCase();
  return (
    combined.includes('503') ||
    combined.includes('unavailable') ||
    combined.includes('high demand') ||
    combined.includes('overloaded') ||
    combined.includes('429') ||
    combined.includes('resource_exhausted') ||
    combined.includes('rate limit') ||
    combined.includes('too many requests')
  );
}

export function formatFriendlyGeminiError(err: unknown): string {
  const { statusCode, statusText, innerMessage } = parseErrorDetails(err);
  const combined = `${statusText} ${innerMessage}`.toLowerCase();

  if (
    statusCode === 503 ||
    combined.includes('unavailable') ||
    combined.includes('high demand') ||
    combined.includes('overloaded')
  ) {
    return 'AI service is temporarily experiencing high demand. Please try again in a few moments.';
  }
  if (
    statusCode === 429 ||
    combined.includes('resource_exhausted') ||
    combined.includes('rate limit') ||
    combined.includes('too many requests')
  ) {
    return 'AI rate limit reached after automatic retries. Please wait a few seconds and try again.';
  }
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    combined.includes('permission_denied') ||
    combined.includes('api_key_invalid') ||
    combined.includes('api key')
  ) {
    return 'Unable to authenticate with the Gemini API. Please verify your API key in Settings > Secrets.';
  }
  if (isModelNotFoundError(err)) {
    return 'The AI model is temporarily unavailable. Please try again shortly.';
  }

  // Never leak raw JSON blobs to the UI
  const cleaned = innerMessage.trim();
  if (!cleaned || cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return 'AI summarization encountered a temporary issue. Please try again.';
  }
  return cleaned.length > 200 ? `${cleaned.slice(0, 197)}...` : cleaned;
}

async function generateContentWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>,
  onStatus?: StatusCallback
) {
  let lastError: unknown;
  let hadRetries = false;

  const hasTools = Boolean(params.config?.tools && (params.config.tools as unknown[]).length > 0);
  const modelsToTry = hasTools ? SEARCH_GROUNDED_MODELS : MODEL_FALLBACK_CHAIN;

  for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
    const model = modelsToTry[modelIdx];
    const retryDelays = modelIdx === 0 ? PRIMARY_RETRY_DELAYS_MS : FALLBACK_RETRY_DELAYS_MS;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return { response, modelUsed: model, hadRetries };
      } catch (err) {
        lastError = err;

        // Immediately skip to next model on 404 NOT_FOUND
        if (isModelNotFoundError(err)) {
          const nextModel = modelsToTry[modelIdx + 1];
          if (nextModel) {
            onStatus?.({
              phase: 'fallback',
              model: nextModel,
              message: `Switching to ${nextModel}...`,
            });
          }
          break;
        }

        // Retry with exponential backoff on HTTP 503 UNAVAILABLE or 429 rate limits
        if (isTransientCapacityError(err)) {
          hadRetries = true;
          if (attempt < retryDelays.length) {
            const delayMs = retryDelays[attempt];
            onStatus?.({
              phase: 'retrying',
              model,
              attempt: attempt + 1,
              maxRetries: retryDelays.length,
              delayMs,
              message: `Model busy, retrying (${attempt + 1}/${retryDelays.length})...`,
            });
            await sleep(delayMs);
            continue;
          }

          // Retries exhausted on this model -> fall back to next model if available
          const nextModel = modelsToTry[modelIdx + 1];
          if (nextModel) {
            onStatus?.({
              phase: 'fallback',
              model: nextModel,
              message: `Model busy, retrying with ${nextModel}...`,
            });
          }
          break;
        }

        if (hasTools) {
          break;
        }

        throw err;
      }
    }
  }

  // Graceful fallback when search grounding quota (429/503) is exhausted:
  // synthesize directly with gemini-3.5-flash-lite without crashing
  if (hasTools) {
    onStatus?.({
      phase: 'fallback',
      model: 'gemini-3.5-flash-lite',
      message: 'Search grounding quota busy; synthesizing intelligence directly...',
    });
    try {
      const paramsWithoutTools = {
        ...params,
        config: {
          ...params.config,
          tools: undefined,
        },
      };
      const response = await ai.models.generateContent({
        ...paramsWithoutTools,
        model: 'gemini-3.5-flash-lite',
      });
      return { response, modelUsed: 'gemini-3.5-flash-lite (direct synthesis)', hadRetries: true };
    } catch (fallbackErr) {
      console.warn('Fallback direct synthesis error:', fallbackErr);
    }
  }

  throw lastError;
}

export interface RawSocialPost {
  platform: PlatformId;
  sourceId: string;
  accountName: string;
  handle: string;
  title: string;
  content: string;
  timestamp: string;
  url: string;
}

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else {
    start = Math.max(firstBrace, firstBracket);
  }
  if (start !== -1) {
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (end > start) {
      return trimmed.slice(start, end + 1);
    }
  }
  return trimmed;
}

function safeParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(extractJsonString(raw)) as T;
  } catch {
    return fallback;
  }
}

export function sanitizeHttpUrl(url: string | undefined, fallback = 'https://news.google.com'): string {
  if (!url) return fallback;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function extractTopicsWithAI(
  input: string,
  onStatus?: StatusCallback
): Promise<TopicExtractionResult> {
  const ai = getGeminiClient();
  const { response } = await generateContentWithResilience(
    ai,
    {
      contents: `Analyze this user interest prompt and extract structured news topics, sub-topics, and overall mood classification: "${input}"`,
      config: {
        systemInstruction:
          'You are a news taxonomy engine. Extract 3 to 6 concise, clean topic labels (2-4 words each), 3 to 6 specific sub-topics/keywords, a brief 1-sentence summary, and classify the dominant mood strictly as "Serious" (politics, finance, security, local news), "Analytical" (tech, AI, science, startups, engineering), or "Entertaining" (gaming, sports, pop culture, lifestyle).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 6 concise primary topic tags.',
            },
            subTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 6 specific sub-topic keywords.',
            },
            mood: {
              type: Type.STRING,
              description: 'Must be exactly one of: Serious, Analytical, Entertaining.',
            },
            summary: {
              type: Type.STRING,
              description: 'One concise sentence summarizing the user interest profile.',
            },
          },
          required: ['keywords', 'subTopics', 'mood', 'summary'],
        },
      },
    },
    onStatus
  );

  const parsed = safeParseJson<Partial<TopicExtractionResult>>(response.text, {});
  const validMood: TopicMood =
    parsed.mood === 'Serious' || parsed.mood === 'Entertaining' ? parsed.mood : 'Analytical';

  return {
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [input.trim()],
    subTopics: Array.isArray(parsed.subTopics) ? parsed.subTopics.slice(0, 8) : [],
    mood: validMood,
    summary: parsed.summary || `Curated topics extracted for ${input.trim()}.`,
  };
}

export async function suggestSourcesWithAI(
  topics: string[],
  platforms: PlatformId[],
  mode: 'suggest' | 'quick_import' = 'suggest',
  provider?: string,
  onStatus?: StatusCallback
): Promise<SocialSource[]> {
  const ai = getGeminiClient();
  const targetPlatforms = platforms.length > 0 ? platforms : (['youtube', 'reddit', 'x', 'linkedin'] as PlatformId[]);

  const prompt =
    mode === 'quick_import'
      ? `The user connected their ${provider || 'social'} interest profile around these topics: ${topics.join(', ')}. Use Google Search to find 8 real, verified, active public accounts/channels/subreddits across [${targetPlatforms.join(', ')}] that match these interests.`
      : `Use Google Search to find 8 real, active, verified public social accounts, YouTube channels, subreddits, or pages across [${targetPlatforms.join(', ')}] that regularly post high-signal news about: ${topics.join(', ')}.`;

  let sources: SocialSource[] = [];

  try {
    const { response } = await generateContentWithResilience(
      ai,
      {
        contents: `${prompt}

Return ONLY valid JSON matching this exact structure (no markdown commentary outside JSON):
{
  "sources": [
    {
      "platform": "youtube | reddit | x | instagram | facebook | linkedin | tiktok | threads | whatsapp",
      "handle": "exact handle or subreddit e.g. @mkbhd, r/programming, @sama, company/openai",
      "displayName": "Official Account or Channel Name",
      "channelId": "YouTube UC... channel id if known, otherwise empty string",
      "description": "1 short sentence explaining what they cover",
      "verified": true
    }
  ]
}`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'Only suggest real, well-known, currently active public accounts, subreddits, or channels verified via Google Search. Never invent handles. Output strictly valid JSON.',
        },
      },
      onStatus
    );

    const parsed = safeParseJson<{ sources?: Array<Partial<SocialSource>> }>(response.text, { sources: [] });
    const allowedPlatforms = new Set<PlatformId>([
      'youtube',
      'reddit',
      'x',
      'instagram',
      'facebook',
      'linkedin',
      'tiktok',
      'threads',
      'whatsapp',
    ]);

    sources = (parsed.sources || [])
      .filter((s) => s.platform && allowedPlatforms.has(s.platform as PlatformId) && s.handle)
      .map((s, idx) => ({
        id: `${s.platform}-${(s.handle || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${idx}`,
        platform: s.platform as PlatformId,
        handle: String(s.handle).trim(),
        displayName: String(s.displayName || s.handle).trim(),
        channelId: s.channelId ? String(s.channelId).trim() : undefined,
        description: s.description ? String(s.description).trim() : undefined,
        verified: Boolean(s.verified ?? true),
      }));
  } catch (err) {
    console.warn('AI source suggestion encountered an issue; using curated high-signal recommendations:', err);
  }

  if (sources.length === 0) {
    const CURATED_FALLBACKS: Array<{
      platform: PlatformId;
      handle: string;
      displayName: string;
      description: string;
      topics: string[];
    }> = [
      { platform: 'youtube', handle: '@mkbhd', displayName: 'Marques Brownlee', description: 'Consumer tech reviews and AI insights', topics: ['tech', 'ai', 'startups'] },
      { platform: 'youtube', handle: '@theverge', displayName: 'The Verge', description: 'Tech news, gadgets, and science', topics: ['tech', 'ai', 'gaming'] },
      { platform: 'reddit', handle: 'r/technology', displayName: 'r/technology', description: 'Major technology news and announcements', topics: ['tech', 'ai', 'cybersecurity'] },
      { platform: 'reddit', handle: 'r/artificial', displayName: 'r/artificial', description: 'AI research, LLMs, and robotics discussions', topics: ['tech', 'ai'] },
      { platform: 'x', handle: '@sama', displayName: 'Sam Altman', description: 'AI updates and OpenAI announcements', topics: ['tech', 'ai', 'startups'] },
      { platform: 'x', handle: '@OpenAI', displayName: 'OpenAI', description: 'Official OpenAI updates and research', topics: ['tech', 'ai'] },
      { platform: 'linkedin', handle: 'company/openai', displayName: 'OpenAI', description: 'Enterprise AI and announcements', topics: ['tech', 'ai', 'startups'] },
      { platform: 'youtube', handle: '@BBCNews', displayName: 'BBC News', description: 'Global breaking news and international analysis', topics: ['world politics', 'local news'] },
      { platform: 'reddit', handle: 'r/worldnews', displayName: 'r/worldnews', description: 'International news from around the world', topics: ['world politics'] },
      { platform: 'x', handle: '@Reuters', displayName: 'Reuters', description: 'Global breaking business and geopolitical news', topics: ['world politics', 'finance & crypto'] },
      { platform: 'youtube', handle: '@Bloomberg', displayName: 'Bloomberg Television', description: 'Global finance, markets, and economic analysis', topics: ['finance & crypto', 'startups'] },
      { platform: 'reddit', handle: 'r/wallstreetbets', displayName: 'r/wallstreetbets', description: 'Market movements, retail trading, and volatility', topics: ['finance & crypto'] },
      { platform: 'youtube', handle: '@veritasium', displayName: 'Veritasium', description: 'An element of truth - science and engineering', topics: ['science'] },
      { platform: 'youtube', handle: '@IGN', displayName: 'IGN', description: 'Game reviews, trailers, and industry news', topics: ['gaming', 'entertainment'] },
      { platform: 'reddit', handle: 'r/gaming', displayName: 'r/gaming', description: 'Trending video games and community news', topics: ['gaming'] },
      { platform: 'reddit', handle: 'r/netsec', displayName: 'r/netsec', description: 'Information security research and vulnerabilities', topics: ['cybersecurity'] },
      { platform: 'x', handle: '@briankrebs', displayName: 'Brian Krebs', description: 'In-depth security journalism and investigation', topics: ['cybersecurity'] },
      { platform: 'youtube', handle: '@ESPN', displayName: 'ESPN', description: 'Sports highlights and analysis', topics: ['sports'] },
      { platform: 'reddit', handle: 'r/sports', displayName: 'r/sports', description: 'Live sports and tournament coverage', topics: ['sports'] },
    ];

    const lowerTopics = topics.map((t) => t.toLowerCase());
    const matched = CURATED_FALLBACKS.filter((cand) => {
      const platformOk = targetPlatforms.includes(cand.platform);
      const topicOk = cand.topics.some((ct) => lowerTopics.some((lt) => lt.includes(ct) || ct.includes(lt)));
      return platformOk && (topicOk || lowerTopics.length === 0);
    });

    const fallbackList = matched.length >= 3 ? matched : CURATED_FALLBACKS.filter((c) => targetPlatforms.includes(c.platform));

    sources = fallbackList.slice(0, 8).map((cand, idx) => ({
      id: `${cand.platform}-${cand.handle.replace(/[^a-z0-9]/gi, '')}-${Date.now()}-${idx}`,
      platform: cand.platform,
      handle: cand.handle,
      displayName: cand.displayName,
      description: cand.description,
      verified: true,
    }));
  }

  return sources;
}

function buildSiteScopedQuery(source: SocialSource): string {
  const clean = source.handle.replace(/^@/, '').replace(/^r\//, '').trim();
  switch (source.platform) {
    case 'x':
      return `site:x.com/${clean} OR site:twitter.com/${clean}`;
    case 'instagram':
      return `site:instagram.com/${clean}`;
    case 'facebook':
      return `site:facebook.com/${clean}`;
    case 'linkedin':
      if (clean.startsWith('company/') || clean.startsWith('in/')) {
        return `site:linkedin.com/${clean}`;
      }
      return `site:linkedin.com/in/${clean} OR site:linkedin.com/company/${clean}`;
    case 'tiktok':
      return `site:tiktok.com/@${clean}`;
    case 'threads':
      return `site:threads.net/@${clean}`;
    case 'whatsapp':
      return `site:whatsapp.com/channel "${clean}" OR "${clean}" WhatsApp channel updates`;
    case 'reddit':
      return `site:reddit.com/r/${clean}`;
    case 'youtube':
      return `site:youtube.com/@${clean} OR site:youtube.com/channel/${source.channelId || clean}`;
    default:
      return `${clean}`;
  }
}

export async function fetchPlatformViaSearchGrounding(
  source: SocialSource,
  topicLabels: string[],
  onStatus?: StatusCallback
): Promise<{ posts: RawSocialPost[]; noPostsMessage?: string }> {
  const ai = getGeminiClient();
  const siteQuery = buildSiteScopedQuery(source);
  const topicsContext = topicLabels.length > 0 ? topicLabels.join(', ') : 'general news and updates';

  const { response } = await generateContentWithResilience(
    ai,
    {
      contents: `Search using this site-scoped query: ${siteQuery}
Focus on recent public posts, announcements, videos, or discussions related to: ${topicsContext}.
Today's date is ${new Date().toISOString().slice(0, 10)}.

Return ONLY valid JSON matching this schema:
{
  "hasRecentPosts": true,
  "statusMessage": "optional message if no recent public posts were found",
  "posts": [
    {
      "accountName": "Display name of account/page",
      "title": "Short title or topic of the post",
      "content": "Factual summary of what the post actually says (2-3 sentences)",
      "timestamp": "ISO date or human timestamp from search result e.g. 2026-11-21 or 2 days ago",
      "url": "Direct https URL to the post or profile page found in search"
    }
  ]
}`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction:
          'You are a grounded social media intelligence retriever. Only report real, verifiable recent posts or discussions returned by Google Search. Do NOT fabricate posts, quotes, or URLs. If no recent public posts exist for this handle, set hasRecentPosts to false and return an empty posts array.',
      },
    },
    onStatus
  );

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls = groundingChunks
    .map((c) => c.web?.uri)
    .filter((u): u is string => Boolean(u && u.startsWith('http')));

  const parsed = safeParseJson<{
    hasRecentPosts?: boolean;
    statusMessage?: string;
    posts?: Array<{
      accountName?: string;
      title?: string;
      content?: string;
      timestamp?: string;
      url?: string;
    }>;
  }>(response.text, { hasRecentPosts: false, posts: [] });

  const rawPosts = (parsed.posts || [])
    .filter((p) => p && (p.content || p.title))
    .slice(0, 5)
    .map((p, idx) => ({
      platform: source.platform,
      sourceId: source.id,
      accountName: p.accountName || source.displayName || source.handle,
      handle: source.handle,
      title: p.title || `${source.displayName} update`,
      content: p.content || p.title || '',
      timestamp: p.timestamp || new Date().toISOString(),
      url: sanitizeHttpUrl(p.url || groundingUrls[idx] || groundingUrls[0], 'https://google.com'),
    }));

  if (rawPosts.length === 0) {
    return {
      posts: [],
      noPostsMessage:
        parsed.statusMessage ||
        `No recent public posts indexed for ${source.handle} on ${source.platform}.`,
    };
  }

  return { posts: rawPosts };
}

export async function filterAndSummarizePosts(
  rawPosts: RawSocialPost[],
  topics: TopicItem[],
  onStatus?: StatusCallback
): Promise<{
  items: FeedItem[];
  dominantMood: TopicMood;
  filteredOutCount: number;
  modelUsed: string;
  hadRetries: boolean;
}> {
  if (rawPosts.length === 0) {
    return {
      items: [],
      dominantMood: 'Analytical',
      filteredOutCount: 0,
      modelUsed: GEMINI_MODEL,
      hadRetries: false,
    };
  }

  const ai = getGeminiClient();
  const topicNames = topics.map((t) => `${t.label} (${t.mood})`).join(', ');

  const { response, modelUsed, hadRetries } = await generateContentWithResilience(
    ai,
    {
      contents: `User Topics: ${topicNames}

Fetched Social Posts (${rawPosts.length} items):
${JSON.stringify(rawPosts, null, 2)}`,
      config: {
        systemInstruction: `You are PulseCurate's editorial AI filter and summarizer.
Evaluate every fetched post against the User Topics.
1. Score relevance from 1 to 10 (relevanceScore).
2. STRICTLY filter out clickbait, promotional spam, and off-topic noise: ONLY include items with relevanceScore >= 7.
3. For each kept item:
   - Rewrite a crisp, factual AI Headline (no clickbait, max 14 words).
   - Write 2 to 3 concise, information-dense bullet takeaways.
   - Assign the best matching topicTag from the user's topics.
   - Classify sentiment strictly as one of: "Breaking", "Analytical", "Bullish", "Critical", "Entertaining", "Informative".
   - Classify urgency strictly as one of: "High", "Medium", "Low".
   - Preserve the exact platform, accountName, handle, timestamp, and sourceUrl from the input post.
4. Determine dominantMood across the curated feed: "Serious", "Analytical", or "Entertaining".`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dominantMood: { type: Type.STRING },
            filteredOutCount: { type: Type.INTEGER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  accountName: { type: Type.STRING },
                  handle: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  topicTag: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  takeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  sentiment: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  relevanceScore: { type: Type.NUMBER },
                  sourceUrl: { type: Type.STRING },
                },
                required: [
                  'platform',
                  'accountName',
                  'handle',
                  'timestamp',
                  'topicTag',
                  'headline',
                  'takeaways',
                  'sentiment',
                  'urgency',
                  'relevanceScore',
                  'sourceUrl',
                ],
              },
            },
          },
          required: ['dominantMood', 'filteredOutCount', 'items'],
        },
      },
    },
    onStatus
  );

  const parsed = safeParseJson<{
    dominantMood?: string;
    filteredOutCount?: number;
    items?: Array<Partial<FeedItem>>;
  }>(response.text, { dominantMood: 'Analytical', filteredOutCount: 0, items: [] });

  const keptItems: FeedItem[] = (parsed.items || [])
    .filter((item) => (item.relevanceScore ?? 0) >= 7 && item.headline)
    .map((item, idx) => ({
      id: item.id || `feed-${Date.now()}-${idx}`,
      platform: (item.platform as PlatformId) || 'x',
      accountName: item.accountName || 'Verified Source',
      handle: item.handle || '',
      timestamp: item.timestamp || new Date().toISOString(),
      topicTag: item.topicTag || topics[0]?.label || 'General',
      headline: item.headline || '',
      takeaways: Array.isArray(item.takeaways) ? item.takeaways.slice(0, 3) : [],
      sentiment: (['Breaking', 'Analytical', 'Bullish', 'Critical', 'Entertaining', 'Informative'].includes(
        String(item.sentiment)
      )
        ? item.sentiment
        : 'Informative') as FeedItem['sentiment'],
      urgency: (['High', 'Medium', 'Low'].includes(String(item.urgency))
        ? item.urgency
        : 'Medium') as FeedItem['urgency'],
      relevanceScore: Number(item.relevanceScore ?? 8),
      sourceUrl: sanitizeHttpUrl(item.sourceUrl),
    }));

  const dominantMood: TopicMood =
    parsed.dominantMood === 'Serious' || parsed.dominantMood === 'Entertaining'
      ? parsed.dominantMood
      : 'Analytical';

  return {
    items: keptItems,
    dominantMood,
    filteredOutCount: Math.max(
      Number(parsed.filteredOutCount ?? 0),
      Math.max(0, rawPosts.length - keptItems.length)
    ),
    modelUsed,
    hadRetries,
  };
}
