import type { PlatformId, TopicItem } from '../types.ts';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  shortName: string;
  placeholder: string;
  pipelineLabel: string;
  accentHex: string;
  brandColor: string;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    placeholder: '@mkbhd or Channel ID (UC...)',
    pipelineLabel: 'Public RSS + Search Grounding',
    accentHex: '#EF4444',
    brandColor: '#DC2626',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    shortName: 'Reddit',
    placeholder: 'r/programming or r/technology',
    pipelineLabel: 'Public Subreddit JSON',
    accentHex: '#F97316',
    brandColor: '#EA580C',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    placeholder: '@elonmusk, @sama, or @verge',
    pipelineLabel: 'Search Grounding (site:x.com)',
    accentHex: '#E2E8F0',
    brandColor: '#18181B',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    placeholder: 'company/openai or in/satyanadella',
    pipelineLabel: 'Search Grounding (site:linkedin.com)',
    accentHex: '#0A66C2',
    brandColor: '#0A66C2',
  },
  {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    placeholder: '@zuck or @theverge',
    pipelineLabel: 'Search Grounding (site:threads.net)',
    accentHex: '#CBD5E1',
    brandColor: '#1E293B',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'Instagram',
    placeholder: '@natgeo or @techcrunch',
    pipelineLabel: 'Search Grounding (site:instagram.com)',
    accentHex: '#EC4899',
    brandColor: '#DB2777',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    placeholder: 'BBCNews or NASA',
    pipelineLabel: 'Search Grounding (site:facebook.com)',
    accentHex: '#3B82F6',
    brandColor: '#2563EB',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    placeholder: '@tbpn or @morningbrew',
    pipelineLabel: 'Search Grounding (site:tiktok.com)',
    accentHex: '#14B8A6',
    brandColor: '#0D9488',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Channels',
    shortName: 'WhatsApp',
    placeholder: 'BBC News or TechCrunch Channel',
    pipelineLabel: 'Search Grounding (Public Channels)',
    accentHex: '#22C55E',
    brandColor: '#16A34A',
  },
];

export const PRESET_TOPICS: TopicItem[] = [
  { id: 'tech-ai', label: 'Tech & AI', mood: 'Analytical' },
  { id: 'world-politics', label: 'World Politics', mood: 'Serious' },
  { id: 'finance-crypto', label: 'Finance & Crypto', mood: 'Serious' },
  { id: 'science', label: 'Science', mood: 'Analytical' },
  { id: 'gaming', label: 'Gaming', mood: 'Entertaining' },
  { id: 'entertainment', label: 'Entertainment', mood: 'Entertaining' },
  { id: 'sports', label: 'Sports', mood: 'Entertaining' },
  { id: 'startups', label: 'Startups', mood: 'Analytical' },
  { id: 'cybersecurity', label: 'Cybersecurity', mood: 'Serious' },
  { id: 'local-news', label: 'Local News', mood: 'Serious' },
];

export function getPlatformInfo(id: PlatformId): PlatformInfo {
  return PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
}

export interface DirectorySourceItem {
  platform: PlatformId;
  handle: string;
  displayName: string;
  description: string;
  channelId?: string;
  verified: boolean;
}

export const POPULAR_SOURCES_DIRECTORY: DirectorySourceItem[] = [
  // YouTube
  { platform: 'youtube', handle: '@mkbhd', displayName: 'Marques Brownlee', description: 'Consumer tech, flagship reviews & AI hardware analysis', verified: true },
  { platform: 'youtube', handle: '@theverge', displayName: 'The Verge', description: 'Tech news, gadgets, science & culture reporting', verified: true },
  { platform: 'youtube', handle: '@fireship', displayName: 'Fireship', description: 'High-intensity code tutorials, web dev & tech news', verified: true },
  { platform: 'youtube', handle: '@lexfridman', displayName: 'Lex Fridman', description: 'In-depth interviews on AI, robotics, science & philosophy', verified: true },
  { platform: 'youtube', handle: '@veritasium', displayName: 'Veritasium', description: 'Science, physics, space & engineering phenomena', verified: true },
  { platform: 'youtube', handle: '@kurzgesagt', displayName: 'Kurzgesagt – In a Nutshell', description: 'Animated science, biology, space & human futures', verified: true },
  { platform: 'youtube', handle: '@ycombinator', displayName: 'Y Combinator', description: 'Startup founder advice, pitches & Silicon Valley insight', verified: true },
  { platform: 'youtube', handle: '@bloomberg', displayName: 'Bloomberg Television', description: 'Global financial markets, economics & corporate updates', verified: true },
  { platform: 'youtube', handle: '@bbcnews', displayName: 'BBC News', description: 'International breaking news, documentaries & analysis', verified: true },
  { platform: 'youtube', handle: '@ign', displayName: 'IGN', description: 'Video game reviews, gameplays, trailers & news', verified: true },
  { platform: 'youtube', handle: '@linustechtips', displayName: 'Linus Tech Tips', description: 'PC hardware benchmarks, custom builds & tech guides', verified: true },
  { platform: 'youtube', handle: '@networkchuck', displayName: 'NetworkChuck', description: 'Cybersecurity, ethical hacking, Linux & networking', verified: true },
  { platform: 'youtube', handle: '@mrwhosetheboss', displayName: 'Mrwhosetheboss', description: 'Smartphone camera tests, tech setups & innovation', verified: true },
  { platform: 'youtube', handle: '@techlinked', displayName: 'TechLinked', description: 'Fast, humorous daily tech news highlights', verified: true },
  { platform: 'youtube', handle: '@wsj', displayName: 'The Wall Street Journal', description: 'Business journalism, global economics & markets', verified: true },

  // Reddit
  { platform: 'reddit', handle: 'r/technology', displayName: 'r/technology', description: 'Major technology news, breakthroughs & regulatory policy', verified: true },
  { platform: 'reddit', handle: 'r/programming', displayName: 'r/programming', description: 'Computer science, software engineering & developer tools', verified: true },
  { platform: 'reddit', handle: 'r/artificial', displayName: 'r/artificial', description: 'Artificial intelligence research, LLMs & robotics', verified: true },
  { platform: 'reddit', handle: 'r/MachineLearning', displayName: 'r/MachineLearning', description: 'Deep learning research, papers, models & datasets', verified: true },
  { platform: 'reddit', handle: 'r/worldnews', displayName: 'r/worldnews', description: 'Breaking global news and international geopolitics', verified: true },
  { platform: 'reddit', handle: 'r/news', displayName: 'r/news', description: 'Real-time general news stories and current events', verified: true },
  { platform: 'reddit', handle: 'r/gaming', displayName: 'r/gaming', description: 'Trending video games, news, memes & community clips', verified: true },
  { platform: 'reddit', handle: 'r/Games', displayName: 'r/Games', description: 'In-depth video game industry news & technical analysis', verified: true },
  { platform: 'reddit', handle: 'r/science', displayName: 'r/science', description: 'Peer-reviewed research and major scientific breakthroughs', verified: true },
  { platform: 'reddit', handle: 'r/space', displayName: 'r/space', description: 'Space exploration, astronomy, NASA & SpaceX updates', verified: true },
  { platform: 'reddit', handle: 'r/startups', displayName: 'r/startups', description: 'Startup discussions, growth, funding & founder advice', verified: true },
  { platform: 'reddit', handle: 'r/wallstreetbets', displayName: 'r/wallstreetbets', description: 'Stock market moves, retail trading, options & memes', verified: true },
  { platform: 'reddit', handle: 'r/CryptoCurrency', displayName: 'r/CryptoCurrency', description: 'Bitcoin, Ethereum, DeFi & blockchain developments', verified: true },
  { platform: 'reddit', handle: 'r/netsec', displayName: 'r/netsec', description: 'Information security research, exploits & vulnerability CVEs', verified: true },
  { platform: 'reddit', handle: 'r/webdev', displayName: 'r/webdev', description: 'Web development, frontend libraries, backend & design', verified: true },

  // X (Twitter)
  { platform: 'x', handle: '@sama', displayName: 'Sam Altman', description: 'CEO of OpenAI posting on AI research & product vision', verified: true },
  { platform: 'x', handle: '@elonmusk', displayName: 'Elon Musk', description: 'Tesla, SpaceX, xAI, Neuralink & tech developments', verified: true },
  { platform: 'x', handle: '@OpenAI', displayName: 'OpenAI', description: 'Official OpenAI announcements, models & API updates', verified: true },
  { platform: 'x', handle: '@karpathy', displayName: 'Andrej Karpathy', description: 'AI researcher and educator sharing deep neural net insights', verified: true },
  { platform: 'x', handle: '@verge', displayName: 'The Verge', description: 'Technology news, consumer culture & product reviews', verified: true },
  { platform: 'x', handle: '@TechCrunch', displayName: 'TechCrunch', description: 'Venture capital, startup rounds & tech industry news', verified: true },
  { platform: 'x', handle: '@paulg', displayName: 'Paul Graham', description: 'YC co-founder essays, startups & software philosophy', verified: true },
  { platform: 'x', handle: '@Reuters', displayName: 'Reuters', description: 'Breaking global news wire and market coverage', verified: true },
  { platform: 'x', handle: '@Bloomberg', displayName: 'Bloomberg', description: 'Global financial news, stock movements & economy', verified: true },
  { platform: 'x', handle: '@NASA', displayName: 'NASA', description: 'Space missions, Mars rover & James Webb imagery', verified: true },
  { platform: 'x', handle: '@ylecun', displayName: 'Yann LeCun', description: 'Meta Chief AI Scientist, machine learning theory & debate', verified: true },
  { platform: 'x', handle: '@briankrebs', displayName: 'Brian Krebs', description: 'Cybercrime investigation and cyber security reporting', verified: true },

  // LinkedIn
  { platform: 'linkedin', handle: 'company/openai', displayName: 'OpenAI', description: 'AI research breakthroughs, enterprise deployments & hiring', verified: true },
  { platform: 'linkedin', handle: 'company/google', displayName: 'Google', description: 'Google research, cloud solutions & developer tools', verified: true },
  { platform: 'linkedin', handle: 'company/microsoft', displayName: 'Microsoft', description: 'Enterprise cloud, Azure, Copilot & global software', verified: true },
  { platform: 'linkedin', handle: 'company/nvidia', displayName: 'NVIDIA', description: 'Accelerated computing, GPUs & generative AI hardware', verified: true },
  { platform: 'linkedin', handle: 'in/satyanadella', displayName: 'Satya Nadella', description: 'Chairman & CEO of Microsoft on technology leadership', verified: true },
  { platform: 'linkedin', handle: 'in/sundarpichai', displayName: 'Sundar Pichai', description: 'CEO of Google and Alphabet sharing product milestones', verified: true },
  { platform: 'linkedin', handle: 'company/techcrunch', displayName: 'TechCrunch', description: 'Startup showcases, investment news & tech analysis', verified: true },
  { platform: 'linkedin', handle: 'company/bloomberg-lp', displayName: 'Bloomberg LP', description: 'Financial markets, fintech, data & economic news', verified: true },
  { platform: 'linkedin', handle: 'company/anthropic-ai', displayName: 'Anthropic', description: 'Claude models, constitutional AI & safety research', verified: true },

  // Instagram
  { platform: 'instagram', handle: '@natgeo', displayName: 'National Geographic', description: 'Exploration, science, nature & award-winning photography', verified: true },
  { platform: 'instagram', handle: '@techcrunch', displayName: 'TechCrunch', description: 'Startup news cards, founder stories & gadgets', verified: true },
  { platform: 'instagram', handle: '@theverge', displayName: 'The Verge', description: 'Aesthetic gadget reviews, camera comparisons & design', verified: true },
  { platform: 'instagram', handle: '@nasa', displayName: 'NASA', description: 'Deep space telescope photos & cosmic discoveries', verified: true },
  { platform: 'instagram', handle: '@bbcnews', displayName: 'BBC News', description: 'World news stories, explainer cards & field journalism', verified: true },
  { platform: 'instagram', handle: '@mkbhd', displayName: 'Marques Brownlee', description: 'Tech aesthetics, studio gear & hardware photography', verified: true },
  { platform: 'instagram', handle: '@wired', displayName: 'WIRED', description: 'Future technology, internet culture & science visuals', verified: true },
  { platform: 'instagram', handle: '@bloombergbusiness', displayName: 'Bloomberg Business', description: 'Financial infographics, market trends & corporate news', verified: true },

  // Facebook
  { platform: 'facebook', handle: 'BBCNews', displayName: 'BBC News', description: 'Global news reports, live broadcast clips & analysis', verified: true },
  { platform: 'facebook', handle: 'CNN', displayName: 'CNN', description: 'Breaking news coverage, world events & politics', verified: true },
  { platform: 'facebook', handle: 'TechCrunch', displayName: 'TechCrunch', description: 'Tech sector reporting, new products & investments', verified: true },
  { platform: 'facebook', handle: 'TheVerge', displayName: 'The Verge', description: 'Consumer tech, device teardowns & science stories', verified: true },
  { platform: 'facebook', handle: 'NASA', displayName: 'NASA', description: 'Live rocket launches, spacewalks & science briefings', verified: true },
  { platform: 'facebook', handle: 'Reuters', displayName: 'Reuters', description: 'Independent global journalism & breaking market news', verified: true },
  { platform: 'facebook', handle: 'Bloomberg', displayName: 'Bloomberg', description: 'Financial news, stock market updates & business economy', verified: true },

  // Threads
  { platform: 'threads', handle: '@zuck', displayName: 'Mark Zuckerberg', description: 'Meta updates, open-source Llama AI & mixed reality', verified: true },
  { platform: 'threads', handle: '@theverge', displayName: 'The Verge', description: 'Live tech commentary, discussions & rapid reviews', verified: true },
  { platform: 'threads', handle: '@mkbhd', displayName: 'Marques Brownlee', description: 'Daily thoughts on consumer tech & smartphone hardware', verified: true },
  { platform: 'threads', handle: '@mosseri', displayName: 'Adam Mosseri', description: 'Head of Instagram on social algorithms & platform changes', verified: true },
  { platform: 'threads', handle: '@techcrunch', displayName: 'TechCrunch', description: 'Startup news, venture rounds & Silicon Valley buzz', verified: true },
  { platform: 'threads', handle: '@nasa', displayName: 'NASA', description: 'Space missions & science discussions with astronomers', verified: true },
  { platform: 'threads', handle: '@wired', displayName: 'WIRED', description: 'Internet phenomena, tech culture & cybersecurity reports', verified: true },

  // TikTok
  { platform: 'tiktok', handle: '@tbpn', displayName: 'The Bulwark / Public News', description: 'Bite-sized daily geopolitical and policy news', verified: true },
  { platform: 'tiktok', handle: '@morningbrew', displayName: 'Morning Brew', description: 'Funny and informative business & finance explainers', verified: true },
  { platform: 'tiktok', handle: '@washingtonpost', displayName: 'Washington Post', description: 'Fast-paced, creative news breakdowns & journalism', verified: true },
  { platform: 'tiktok', handle: '@mkbhd', displayName: 'Marques Brownlee', description: '60-second tech reviews, blind smartphone tests & tips', verified: true },
  { platform: 'tiktok', handle: '@cleoabram', displayName: 'Cleo Abram', description: 'Optimistic science and technological progress stories', verified: true },
  { platform: 'tiktok', handle: '@planetmoney', displayName: 'NPR Planet Money', description: 'Economics, supply chains & money theories explained', verified: true },

  // WhatsApp Channels
  { platform: 'whatsapp', handle: 'BBC News', displayName: 'BBC News', description: 'Direct daily news alerts and global bulletin digests', verified: true },
  { platform: 'whatsapp', handle: 'TechCrunch', displayName: 'TechCrunch Channel', description: 'Silicon Valley news, AI tools & breaking tech alerts', verified: true },
  { platform: 'whatsapp', handle: 'The Verge', displayName: 'The Verge Channel', description: 'Gadget releases, smartphone reviews & culture', verified: true },
  { platform: 'whatsapp', handle: 'Financial Times', displayName: 'Financial Times Channel', description: 'Global business analysis & economic market reports', verified: true },
  { platform: 'whatsapp', handle: 'Reuters', displayName: 'Reuters Channel', description: 'Real-time unbiased breaking news from around the globe', verified: true },
  { platform: 'whatsapp', handle: 'Meta', displayName: 'Meta Official', description: 'Official product updates from WhatsApp and Meta AI', verified: true },
  { platform: 'whatsapp', handle: 'UNICEF', displayName: 'UNICEF Global', description: 'Humanitarian news, children health & global safety', verified: true },
];

export function getMatchingSuggestions(
  platform: PlatformId,
  query: string,
  limit = 6
): DirectorySourceItem[] {
  const pool = POPULAR_SOURCES_DIRECTORY.filter((s) => s.platform === platform);
  const q = query.trim().toLowerCase().replace(/^[@/]|r\//g, '');

  if (!q) {
    return pool.slice(0, limit);
  }

  // Score each candidate for closest match ranking
  const scored = pool.map((item) => {
    const handleClean = item.handle.toLowerCase().replace(/^[@/]|r\//g, '');
    const nameClean = item.displayName.toLowerCase();
    const descClean = (item.description || '').toLowerCase();

    let score = 0;
    if (handleClean === q || nameClean === q) {
      score += 100;
    } else if (handleClean.startsWith(q) || nameClean.startsWith(q)) {
      score += 80;
    } else if (nameClean.includes(` ${q}`) || handleClean.includes(`_${q}`) || handleClean.includes(`-${q}`)) {
      score += 60;
    } else if (handleClean.includes(q) || nameClean.includes(q)) {
      score += 40;
    } else if (descClean.includes(q)) {
      score += 20;
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item)
    .slice(0, limit);
}

