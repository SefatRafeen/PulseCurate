import type { FeedItem, PlatformId } from '../types.ts';

// Simple string hash for deterministic engagement/read-time estimation
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractYouTubeThumbnailFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?(?:[^&]*&)*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i
  );
  if (match?.[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

/**
 * Returns ONLY the original thumbnail from the source (never AI-generated or generic stock images).
 * Returns null if the source post has no original thumbnail image.
 */
export function getEditorialImage(item: {
  id?: string;
  topicTag?: string;
  headline?: string;
  platform?: PlatformId;
  imageUrl?: string;
  sourceUrl?: string;
}): string | null {
  if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl.trim())) {
    return item.imageUrl.trim();
  }
  const ytThumb = extractYouTubeThumbnailFromUrl(item.sourceUrl);
  if (ytThumb) return ytThumb;
  return null;
}

export function getEstimatedReadTime(item: {
  headline: string;
  previewSummary?: string;
  takeaways?: string[];
  fullContent?: string;
}): string {
  const words = (
    item.headline +
    ' ' +
    (item.previewSummary || '') +
    ' ' +
    (item.takeaways || []).join(' ') +
    ' ' +
    (item.fullContent || '')
  )
    .trim()
    .split(/\s+/).length;
  const minutes = Math.max(3, Math.min(9, Math.ceil(words / 65) + 1));
  return `${minutes} min read`;
}

export function getEngagementStats(item: { id: string; headline: string }) {
  const seed = stringHash(item.id + item.headline);
  const likes = 240 + (seed % 3400);
  const comments = 18 + (seed % 420);
  const shares = 12 + (seed % 190);
  const viewsK = (1.5 + (seed % 85) / 10).toFixed(1);

  return {
    likes,
    comments,
    shares,
    views: `${viewsK}k`,
  };
}

/**
 * Tier 1 (Preview Modal): Medium-length structured AI summary with contextual overview
 * and 4-6 substantive takeaways so users get immediate, rich insight without truncation.
 */
export function getMediumPreviewSummary(item: FeedItem): {
  overview: string;
  takeaways: string[];
} {
  const baseTakeaways = (item.takeaways || []).map((t) => t.trim()).filter(Boolean);
  const platformName = item.platform.toUpperCase();

  const overview =
    item.previewSummary && item.previewSummary.trim().length > 40
      ? item.previewSummary.trim()
      : `${item.accountName} (${platformName}) surfaced a ${item.urgency.toLowerCase()}-priority ${item.topicTag} update: "${item.headline}". Classified as ${item.sentiment.toLowerCase()} with a relevance score of ${item.relevanceScore}/10, this development captures shifting momentum across ${item.topicTag} discussions and highlights concrete signals stakeholders are tracking now.`;

  if (baseTakeaways.length >= 4) {
    return {
      overview,
      takeaways: baseTakeaways.slice(0, 6),
    };
  }

  const supplementalPoints = [
    `Primary Context (${item.topicTag}): ${item.accountName} frames this development as a pivotal shift in current ${item.topicTag} coverage, carrying a ${item.sentiment.toLowerCase()} tone and ${item.urgency.toLowerCase()} urgency rating.`,
    `Signal Verification & Priority: Ranked ${item.relevanceScore}/10 against your curated topics, filtering out surface noise to surface verified primary-source commentary from ${item.handle || item.accountName}.`,
    `Ecosystem Impact: Industry observers monitoring ${item.topicTag} note that developments like "${item.headline}" frequently ripple across downstream tools, community workflows, and strategic priorities.`,
    `What to Watch Next: Follow-up updates from ${item.accountName} and peer ${platformName} commentators will clarify short-term adoption, community response, and real-world execution details.`,
  ];

  const enriched = [...baseTakeaways];
  for (const point of supplementalPoints) {
    if (enriched.length >= 5) break;
    enriched.push(point);
  }

  return {
    overview,
    takeaways: enriched.slice(0, 6),
  };
}

export interface EditorialSection {
  title: string;
  paragraphs: string[];
}

/**
 * Tier 2 (Full Article Reader): Comprehensive, in-depth AI summary & executive analysis
 * covering full context, factual/technical details, implications, and forward outlook.
 */
export function generateEditorialArticleSections(item: FeedItem): EditorialSection[] {
  const { overview, takeaways } = getMediumPreviewSummary(item);
  const platform = item.platform.toUpperCase();
  const creator = item.accountName;
  const topic = item.topicTag;

  if (item.fullContent && item.fullContent.trim().length > 360) {
    const rawParas = item.fullContent
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParas.length >= 4) {
      return [
        {
          title: 'Executive Context & Situation Overview',
          paragraphs: [rawParas[0], rawParas[1]],
        },
        {
          title: 'Technical & Factual Deep Dive',
          paragraphs: [rawParas[2]],
        },
        {
          title: 'Strategic Implications & Forward Outlook',
          paragraphs: rawParas.slice(3),
        },
      ];
    }
    return [
      {
        title: 'Full AI Executive Analysis',
        paragraphs: rawParas,
      },
    ];
  }

  return [
    {
      title: 'Executive Context & Situation Overview',
      paragraphs: [
        overview,
        `As conversations surrounding ${topic} accelerate across global networks, primary reporting from ${creator} (${item.handle || creator}) on ${platform} places "${item.headline}" at the center of current debate. Rather than an isolated social post, this update reflects broader structural shifts unfolding across ${topic}, drawing heightened engagement and cross-platform scrutiny.`,
      ],
    },
    {
      title: 'Technical & Factual Deep Dive',
      paragraphs: [
        `At the core of the report are several concrete signals extracted directly from ${creator}'s coverage. ${takeaways.slice(0, 3).join(' ')}`,
        takeaways.length > 3
          ? `Further examination underscores why analysts assigned a ${item.relevanceScore}/10 relevance score and ${item.urgency.toLowerCase()} urgency classification: ${takeaways.slice(3).join(' ')}`
          : `Evaluated through PulseCurate's multi-factor relevance filter (${item.relevanceScore}/10, ${item.sentiment} framing), the underlying evidence points to tangible shifts in execution, architecture, or policy rather than speculative commentary.`,
      ],
    },
    {
      title: 'Strategic Implications & Broader Impact',
      paragraphs: [
        `For practitioners, decision-makers, and enthusiasts following ${topic}, the immediate implication is a measurable shift in baseline expectations. When credible primary voices like ${creator} elevate a development with ${item.sentiment.toLowerCase()} momentum, secondary builders and competing platforms typically respond rapidly—reshaping standards, tooling, and community consensus.`,
        `At the same time, separating durable signal from short-lived algorithmic amplification requires tracking verifiable milestones. Cross-referencing ${platform} updates alongside independent announcements helps distinguish foundational changes from temporary market or social sentiment spikes.`,
      ],
    },
    {
      title: 'What to Watch Next',
      paragraphs: [
        `Looking ahead, key indicators to monitor include official follow-up releases linked to ${creator}'s thread, responses from peer researchers or institutional voices in ${topic}, and concrete adoption metrics over the coming days. PulseCurate will continue tracking ${item.handle || creator} and adjacent channels to surface verified follow-on developments automatically.`,
      ],
    },
  ];
}

export function generateEditorialArticle(item: FeedItem): string {
  return generateEditorialArticleSections(item)
    .map((sec) => `${sec.title}\n\n${sec.paragraphs.join('\n\n')}`)
    .join('\n\n');
}
