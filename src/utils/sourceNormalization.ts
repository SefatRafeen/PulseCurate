import type { PlatformId, SocialSource } from '../types.ts';

const VALID_PLATFORMS = new Set<PlatformId>([
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

export function normalizePlatform(raw: string): PlatformId {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'twitter') return 'x';
  if (VALID_PLATFORMS.has(lower as PlatformId)) {
    return lower as PlatformId;
  }
  return 'x';
}

function stripUrlNoise(raw: string): string {
  return raw.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function extractPathSlug(raw: string, domains: string[]): string | null {
  const trimmed = stripUrlNoise(raw);
  if (!/^https?:\/\//i.test(trimmed) && !domains.some((d) => trimmed.toLowerCase().startsWith(d))) {
    return null;
  }
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    return parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function normalizeHandleForPlatform(platform: PlatformId, rawHandle: string): string {
  const trimmed = stripUrlNoise(rawHandle);
  if (!trimmed) return '';

  switch (platform) {
    case 'youtube': {
      const path = extractPathSlug(trimmed, ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
      if (path) {
        const channelMatch = path.match(/^channel\/(UC[a-zA-Z0-9_-]+)/i);
        if (channelMatch?.[1]) return channelMatch[1];
        const firstSeg = path.split('/')[0] || '';
        if (firstSeg.startsWith('@')) return firstSeg;
        const cMatch = path.match(/^(?:c|user)\/([^/]+)/i);
        if (cMatch?.[1]) return `@${cMatch[1].replace(/^@/, '')}`;
        if (firstSeg) return `@${firstSeg.replace(/^@/, '')}`;
      }
      if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
      return trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/\s+/g, '')}`;
    }

    case 'reddit': {
      const path = extractPathSlug(trimmed, ['reddit.com', 'www.reddit.com', 'old.reddit.com']);
      if (path) {
        const rMatch = path.match(/^r\/([^/]+)/i);
        if (rMatch?.[1]) return `r/${rMatch[1]}`;
      }
      const clean = trimmed.replace(/^\/?r\//i, '').replace(/\/.*$/, '').replace(/^@/, '');
      return `r/${clean}`;
    }

    case 'x': {
      const path = extractPathSlug(trimmed, ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']);
      if (path) {
        const seg = path.split('/')[0] || '';
        if (seg) return `@${seg.replace(/^@/, '')}`;
      }
      const clean = trimmed.replace(/^@+/, '').split('/')[0] || '';
      return `@${clean}`;
    }

    case 'instagram': {
      const path = extractPathSlug(trimmed, ['instagram.com', 'www.instagram.com']);
      if (path) {
        const seg = path.split('/')[0] || '';
        if (seg) return `@${seg.replace(/^@/, '')}`;
      }
      const clean = trimmed.replace(/^@+/, '').split('/')[0] || '';
      return `@${clean}`;
    }

    case 'tiktok': {
      const path = extractPathSlug(trimmed, ['tiktok.com', 'www.tiktok.com']);
      if (path) {
        const seg = path.split('/')[0] || '';
        if (seg) return `@${seg.replace(/^@/, '')}`;
      }
      const clean = trimmed.replace(/^@+/, '').split('/')[0] || '';
      return `@${clean}`;
    }

    case 'threads': {
      const path = extractPathSlug(trimmed, ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com']);
      if (path) {
        const seg = path.split('/')[0] || '';
        if (seg) return `@${seg.replace(/^@/, '')}`;
      }
      const clean = trimmed.replace(/^@+/, '').split('/')[0] || '';
      return `@${clean}`;
    }

    case 'facebook': {
      const path = extractPathSlug(trimmed, ['facebook.com', 'www.facebook.com', 'fb.com', 'm.facebook.com']);
      if (path) {
        const seg = path.split('/')[0] || '';
        if (seg) return seg.replace(/^@/, '');
      }
      return trimmed.replace(/^@+/, '').split('/')[0] || trimmed;
    }

    case 'linkedin': {
      const path = extractPathSlug(trimmed, ['linkedin.com', 'www.linkedin.com']);
      if (path) {
        const match = path.match(/^((?:company|in)\/[^/]+)/i);
        if (match?.[1]) return match[1].toLowerCase();
        return path.split('/').slice(0, 2).join('/');
      }
      const clean = trimmed.replace(/^@+/, '');
      if (/^(company|in)\//i.test(clean)) return clean;
      return clean;
    }

    case 'whatsapp': {
      const path = extractPathSlug(trimmed, ['whatsapp.com', 'www.whatsapp.com']);
      if (path) {
        const chMatch = path.match(/^channel\/([^/]+)/i);
        if (chMatch?.[1]) return chMatch[1];
      }
      return trimmed.replace(/^@+/, '');
    }
  }
}

export function buildCanonicalSourceUrl(
  platform: PlatformId,
  normalizedHandle: string,
  channelId?: string,
  providedUrl?: string
): string {
  if (providedUrl && /^https?:\/\//i.test(providedUrl.trim())) {
    return providedUrl.trim();
  }
  const cleanNoAt = normalizedHandle.replace(/^@+/, '');

  switch (platform) {
    case 'youtube':
      if (channelId && /^UC[a-zA-Z0-9_-]{20,}$/.test(channelId)) {
        return `https://www.youtube.com/channel/${channelId}`;
      }
      if (/^UC[a-zA-Z0-9_-]{20,}$/.test(cleanNoAt)) {
        return `https://www.youtube.com/channel/${cleanNoAt}`;
      }
      return `https://www.youtube.com/@${cleanNoAt}`;
    case 'reddit': {
      const sub = cleanNoAt.replace(/^r\//i, '');
      return `https://www.reddit.com/r/${sub}`;
    }
    case 'x':
      return `https://x.com/${cleanNoAt}`;
    case 'instagram':
      return `https://www.instagram.com/${cleanNoAt}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanNoAt}`;
    case 'linkedin':
      if (/^(company|in)\//i.test(cleanNoAt)) {
        return `https://www.linkedin.com/${cleanNoAt}`;
      }
      return `https://www.linkedin.com/in/${cleanNoAt}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanNoAt}`;
    case 'threads':
      return `https://www.threads.net/@${cleanNoAt}`;
    case 'whatsapp':
      return `https://www.whatsapp.com/channel/${encodeURIComponent(cleanNoAt)}`;
  }
}

export function normalizeSourceInput(input: {
  id?: string;
  platform: string;
  handle: string;
  displayName?: string;
  name?: string;
  url?: string;
  channelId?: string;
  description?: string;
  verified?: boolean;
}): SocialSource & { name: string; url: string } {
  const platform = normalizePlatform(input.platform);
  const rawUrlIfPassed = /^https?:\/\//i.test((input.handle || '').trim())
    ? input.handle.trim()
    : input.url;

  const handle = normalizeHandleForPlatform(platform, input.handle || input.url || '');
  const extractedChannelId =
    input.channelId ||
    (platform === 'youtube' && /^UC[a-zA-Z0-9_-]{20,}$/.test(handle) ? handle : undefined);

  const rawName = (input.name || input.displayName || '').trim();
  const derivedName =
    rawName && !/^https?:\/\//i.test(rawName)
      ? rawName
      : handle.replace(/^@/, '').replace(/^(company|in)\//i, '');

  const url = buildCanonicalSourceUrl(platform, handle, extractedChannelId, rawUrlIfPassed);
  const id =
    input.id ||
    `${platform}-${handle.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;

  return {
    id,
    platform,
    handle,
    displayName: derivedName || handle,
    name: derivedName || handle,
    url,
    channelId: extractedChannelId,
    description: input.description?.trim() || undefined,
    verified: Boolean(input.verified ?? false),
  };
}
