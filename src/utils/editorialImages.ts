import type { FeedItem, PlatformId } from '../types.ts';

// Curated high-res editorial photos for topics
const TOPIC_PHOTOS: Record<string, string[]> = {
  'tech & ai': [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85', // abstract digital waves
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=85', // neural network light
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=85', // AI futuristic
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85', // matrix code
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85', // cybersecurity tech
  ],
  'science': [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85', // space nebula
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=85', // laboratory science
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=85', // scientific research
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85', // processor chip
  ],
  'finance & crypto': [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=85', // market chart
    'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=1200&q=85', // digital crypto
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=85', // financial analysis
    'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=85', // ethereum 3D
  ],
  'gaming': [
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=85', // neon gaming controller
    'https://images.unsplash.com/photo-1552824722-ddab1374e622?auto=format&fit=crop&w=1200&q=85', // retro arcade neon
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85', // esports arena
  ],
  'world politics': [
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=85', // capitol dome
    'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1200&q=85', // global flags
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85', // globe at night
  ],
  'startups': [
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=85', // modern office startup
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85', // collaborative team
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85', // growth analytics
  ],
  'entertainment': [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85', // concert lights
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85', // cinema theater
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=85', // audio studio
  ],
  'cybersecurity': [
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=85', // cyber lock
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85', // terminal code
  ],
  'sports': [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85', // running track
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85', // stadium floodlights
  ],
  'default': [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
  ],
};

// Simple string hash
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getEditorialImage(item: {
  id?: string;
  topicTag?: string;
  headline?: string;
  platform?: PlatformId;
  imageUrl?: string;
}): string {
  if (item.imageUrl) return item.imageUrl;

  const topicKey = (item.topicTag || 'tech & ai').toLowerCase();
  const pool = TOPIC_PHOTOS[topicKey] || TOPIC_PHOTOS.default;
  const seed = (item.id || '') + (item.headline || '') + (item.platform || '');
  const index = stringHash(seed) % pool.length;
  return pool[index];
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
