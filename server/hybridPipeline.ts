import type { SocialSource, SourceStatus } from '../src/types.ts';
import {
  fetchPlatformViaSearchGrounding,
  formatFriendlyGeminiError,
  type RawSocialPost,
  type StatusCallback,
} from './gemini.ts';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveYouTubeChannelId(handleOrId: string): Promise<string | null> {
  const trimmed = handleOrId.trim();
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  const cleanHandle = trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/\s+/g, '')}`;
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/${encodeURIComponent(cleanHandle)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PulseCurate/1.0; +https://pulsecurate.app)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const metaMatch = html.match(/itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/i);
    if (metaMatch?.[1]) return metaMatch[1];
    const canonicalMatch = html.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i);
    if (canonicalMatch?.[1]) return canonicalMatch[1];
  } catch {
    return null;
  }
  return null;
}

async function fetchYouTubeSource(
  source: SocialSource,
  topicLabels: string[],
  onStatus?: StatusCallback
): Promise<{ posts: RawSocialPost[]; status: SourceStatus }> {
  const channelId = source.channelId || (await resolveYouTubeChannelId(source.handle));

  if (channelId) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
      const res = await fetchWithTimeout(rssUrl, {
        headers: { 'User-Agent': 'PulseCurate/1.0' },
      });
      if (res.ok) {
        const xml = await res.text();
        const authorMatch = xml.match(/<author>\s*<name>([\s\S]*?)<\/name>/i);
        const channelName = authorMatch ? decodeXmlEntities(authorMatch[1]) : source.displayName || source.handle;
        const entryMatches = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)).slice(0, 5);
        const posts: RawSocialPost[] = entryMatches.map((m) => {
          const entry = m[1];
          const title = decodeXmlEntities(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'YouTube Video');
          const link = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1] || `https://www.youtube.com/channel/${channelId}`;
          const published = entry.match(/<published>([\s\S]*?)<\/published>/i)?.[1] || new Date().toISOString();
          const desc = decodeXmlEntities(
            entry.match(/<media:description>([\s\S]*?)<\/media:description>/i)?.[1] || ''
          );
          return {
            platform: 'youtube',
            sourceId: source.id,
            accountName: channelName,
            handle: source.handle,
            title,
            content: desc ? `${title}. ${desc.slice(0, 400)}` : title,
            timestamp: published,
            url: link,
          };
        });

        if (posts.length > 0) {
          return {
            posts,
            status: {
              sourceId: source.id,
              platform: 'youtube',
              handle: source.handle,
              status: 'ok',
              rawCount: posts.length,
            },
          };
        }
      }
    } catch {
      // Fall through to Google Search Grounding
    }
  }

  // Fallback to Gemini Google Search Grounding for YouTube
  try {
    const grounded = await fetchPlatformViaSearchGrounding(source, topicLabels, onStatus);
    return {
      posts: grounded.posts,
      status: {
        sourceId: source.id,
        platform: 'youtube',
        handle: source.handle,
        status: grounded.posts.length > 0 ? 'ok' : 'no_recent_posts',
        message: grounded.noPostsMessage,
        rawCount: grounded.posts.length,
      },
    };
  } catch (err) {
    return {
      posts: [],
      status: {
        sourceId: source.id,
        platform: 'youtube',
        handle: source.handle,
        status: 'error',
        message: formatFriendlyGeminiError(err),
        rawCount: 0,
      },
    };
  }
}

async function fetchRedditSource(
  source: SocialSource,
  topicLabels: string[],
  onStatus?: StatusCallback
): Promise<{ posts: RawSocialPost[]; status: SourceStatus }> {
  const cleanSub = source.handle
    .replace(/^https?:\/\/(www\.)?reddit\.com\/r\//i, '')
    .replace(/^r\//i, '')
    .replace(/\/.*$/, '')
    .trim();

  if (cleanSub) {
    try {
      const jsonUrl = `https://www.reddit.com/r/${encodeURIComponent(cleanSub)}/hot.json?limit=10`;
      const res = await fetchWithTimeout(jsonUrl, {
        headers: {
          'User-Agent': 'web:PulseCurate:v1.0.0 (by /u/pulsecurate_reader)',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: {
            children?: Array<{
              data?: {
                title?: string;
                selftext?: string;
                permalink?: string;
                url?: string;
                created_utc?: number;
                stickied?: boolean;
                subreddit_name_prefixed?: string;
              };
            }>;
          };
        };
        const children = data?.data?.children || [];
        const posts: RawSocialPost[] = children
          .filter((c) => c.data && !c.data.stickied && c.data.title)
          .slice(0, 6)
          .map((c) => {
            const d = c.data!;
            const permalink = d.permalink ? `https://www.reddit.com${d.permalink}` : `https://www.reddit.com/r/${cleanSub}`;
            return {
              platform: 'reddit',
              sourceId: source.id,
              accountName: d.subreddit_name_prefixed || `r/${cleanSub}`,
              handle: `r/${cleanSub}`,
              title: d.title || '',
              content: d.selftext ? `${d.title}. ${d.selftext.slice(0, 420)}` : d.title || '',
              timestamp: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
              url: permalink,
            };
          });

        if (posts.length > 0) {
          return {
            posts,
            status: {
              sourceId: source.id,
              platform: 'reddit',
              handle: source.handle,
              status: 'ok',
              rawCount: posts.length,
            },
          };
        }
      }
    } catch {
      // Fallback to search grounding
    }
  }

  try {
    const grounded = await fetchPlatformViaSearchGrounding(source, topicLabels, onStatus);
    return {
      posts: grounded.posts,
      status: {
        sourceId: source.id,
        platform: 'reddit',
        handle: source.handle,
        status: grounded.posts.length > 0 ? 'ok' : 'no_recent_posts',
        message: grounded.noPostsMessage,
        rawCount: grounded.posts.length,
      },
    };
  } catch (err) {
    return {
      posts: [],
      status: {
        sourceId: source.id,
        platform: 'reddit',
        handle: source.handle,
        status: 'error',
        message: formatFriendlyGeminiError(err),
        rawCount: 0,
      },
    };
  }
}

export async function runHybridFetchPipeline(
  sources: SocialSource[],
  topicLabels: string[],
  onStatus?: StatusCallback
): Promise<{ rawPosts: RawSocialPost[]; sourceStatuses: SourceStatus[] }> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      if (source.platform === 'youtube') {
        return fetchYouTubeSource(source, topicLabels, onStatus);
      }
      if (source.platform === 'reddit') {
        return fetchRedditSource(source, topicLabels, onStatus);
      }
      try {
        const grounded = await fetchPlatformViaSearchGrounding(source, topicLabels, onStatus);
        return {
          posts: grounded.posts,
          status: {
            sourceId: source.id,
            platform: source.platform,
            handle: source.handle,
            status: grounded.posts.length > 0 ? ('ok' as const) : ('no_recent_posts' as const),
            message: grounded.noPostsMessage,
            rawCount: grounded.posts.length,
          },
        };
      } catch (err) {
        return {
          posts: [],
          status: {
            sourceId: source.id,
            platform: source.platform,
            handle: source.handle,
            status: 'error' as const,
            message: formatFriendlyGeminiError(err),
            rawCount: 0,
          },
        };
      }
    })
  );

  const rawPosts: RawSocialPost[] = [];
  const sourceStatuses: SourceStatus[] = [];

  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      rawPosts.push(...res.value.posts);
      sourceStatuses.push(res.value.status);
    } else {
      const s = sources[idx];
      sourceStatuses.push({
        sourceId: s.id,
        platform: s.platform,
        handle: s.handle,
        status: 'error',
        message: formatFriendlyGeminiError(res.reason),
        rawCount: 0,
      });
    }
  });

  return { rawPosts, sourceStatuses };
}
