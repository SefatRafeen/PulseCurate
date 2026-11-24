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
  takeaways?: string[];
  fullContent?: string;
}): string {
  const words = (item.headline + ' ' + (item.takeaways || []).join(' ')).split(/\s+/).length;
  const minutes = Math.max(2, Math.min(7, Math.ceil(words / 40) + 1));
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

export function generateEditorialArticle(item: FeedItem): string {
  if (item.fullContent && item.fullContent.length > 100) {
    return item.fullContent;
  }

  const headline = item.headline;
  const platform = item.platform.toUpperCase();
  const creator = item.accountName;
  const takeaways = item.takeaways || [];
  const topic = item.topicTag;

  const p1 = `As discussions surrounding ${topic} intensify across global networks, latest reports from ${creator} on ${platform} highlight critical turning points shaping the landscape. ${headline} has emerged as a central focal point, sparking widespread analysis among industry insiders and everyday observers alike.`;

  const bulletsSection = takeaways.length > 0
    ? takeaways.map((t) => `• ${t}`).join('\n\n')
    : `Key developments emphasize rapid transformations and emergent consensus within the ${topic} ecosystem.`;

  const p2 = `Experts observing the velocity of these changes note that the structural implications go far beyond surface-level metrics. "The convergence of real-time signals with strategic infrastructure marks a distinct era for how intelligence is curated and consumed," notes recent industry analysis. The dialogue sparked by ${creator} emphasizes the necessity for adaptive, high-fidelity monitoring.`;

  const p3 = `Moving forward, stakeholders across ${topic} are advised to track secondary developments closely. As algorithmic distribution platforms evolve, maintaining direct access to original primary source feeds remains essential for separating genuine signal from algorithmic amplification.`;

  return `${p1}\n\n${bulletsSection}\n\n${p2}\n\n${p3}`;
}
