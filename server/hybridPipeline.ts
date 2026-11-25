import type { SocialSource, SourceStatus } from '../src/types.ts';
import { normalizeSourceInput } from '../src/utils/sourceNormalization.ts';
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

export function extractYouTubeThumbnail(url: string): string | undefined {
  if (!url) return undefined;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^&]*&)*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match?.[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return undefined;
}

export async function resolveSourceThumbnail(url: string): Promise<string | undefined> {
  if (!url || !/^https?:\/\//i.test(url)) return undefined;

  const ytThumb = extractYouTubeThumbnail(url);
  if (ytThumb) return ytThumb;

  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; PulseCurate/1.0; +https://pulsecurate.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      },
      2600
    );
    if (!res.ok) return undefined;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      return undefined;
    }

    const html = (await res.text()).slice(0, 80_000);
    const metaPatterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    ];

    for (const re of metaPatterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const raw = decodeXmlEntities(m[1]);
        try {
          const resolved = new URL(raw, url).toString();
          if (/^https?:\/\//i.test(resolved)) {
            return resolved;
          }
        } catch {
          // ignore invalid URL
        }
      }
    }
  } catch {
    // Non-blocking thumbnail lookup
  }

  return undefined;
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
          const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim();
          const mediaThumbRaw = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/i)?.[1];
          const imageUrl = mediaThumbRaw
            ? decodeXmlEntities(mediaThumbRaw)
            : videoId
            ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            : extractYouTubeThumbnail(link);

          return {
            platform: 'youtube',
            sourceId: source.id,
            accountName: channelName,
            handle: source.handle,
            title,
            content: desc ? `${title}. ${desc.slice(0, 900)}` : title,
            timestamp: published,
            url: link,
            imageUrl,
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
                url_overridden_by_dest?: string;
                thumbnail?: string;
                preview?: {
                  images?: Array<{
                    source?: { url?: string };
                  }>;
                };
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
            const previewUrl = d.preview?.images?.[0]?.source?.url
              ? decodeXmlEntities(d.preview.images[0].source.url)
              : undefined;
            const destUrl = d.url_overridden_by_dest || d.url || '';
            const directImageUrl = /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(destUrl)
              ? destUrl
              : extractYouTubeThumbnail(destUrl);
            const redditThumb =
              d.thumbnail && /^https?:\/\//i.test(d.thumbnail)
                ? decodeXmlEntities(d.thumbnail)
                : undefined;

            return {
              platform: 'reddit',
              sourceId: source.id,
              accountName: d.subreddit_name_prefixed || `r/${cleanSub}`,
              handle: `r/${cleanSub}`,
              title: d.title || '',
              content: d.selftext ? `${d.title}. ${d.selftext.slice(0, 950)}` : d.title || '',
              timestamp: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
              url: permalink,
              imageUrl: previewUrl || directImageUrl || redditThumb,
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
  const normalizedSources = sources.map((raw) => normalizeSourceInput(raw));

  const results = await Promise.allSettled(
    normalizedSources.map(async (source) => {
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

  // Resolve original thumbnails via YouTube/OpenGraph metadata for any post missing imageUrl
  await Promise.allSettled(
    rawPosts.map(async (post) => {
      if (!post.imageUrl && post.url) {
        const resolved = await resolveSourceThumbnail(post.url);
        if (resolved) {
          post.imageUrl = resolved;
        }
      }
    })
  );

  return { rawPosts, sourceStatuses };
}
