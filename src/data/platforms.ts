import type { PlatformId, TopicItem } from '../types.ts';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  shortName: string;
  placeholder: string;
  pipelineLabel: string;
  accentHex: string;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    placeholder: '@mkbhd or Channel ID (UC...)',
    pipelineLabel: 'Public RSS + Search Grounding',
    accentHex: '#EF4444',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    shortName: 'Reddit',
    placeholder: 'r/programming or r/technology',
    pipelineLabel: 'Public Subreddit JSON',
    accentHex: '#F97316',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    placeholder: '@elonmusk, @sama, or @verge',
    pipelineLabel: 'Search Grounding (site:x.com)',
    accentHex: '#E2E8F0',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    placeholder: 'company/openai or in/satyanadella',
    pipelineLabel: 'Search Grounding (site:linkedin.com)',
    accentHex: '#0A66C2',
  },
  {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    placeholder: '@zuck or @theverge',
    pipelineLabel: 'Search Grounding (site:threads.net)',
    accentHex: '#CBD5E1',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'Instagram',
    placeholder: '@natgeo or @techcrunch',
    pipelineLabel: 'Search Grounding (site:instagram.com)',
    accentHex: '#EC4899',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    placeholder: 'BBCNews or NASA',
    pipelineLabel: 'Search Grounding (site:facebook.com)',
    accentHex: '#3B82F6',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    placeholder: '@tbpn or @morningbrew',
    pipelineLabel: 'Search Grounding (site:tiktok.com)',
    accentHex: '#14B8A6',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Channels',
    shortName: 'WhatsApp',
    placeholder: 'BBC News or TechCrunch Channel',
    pipelineLabel: 'Search Grounding (Public Channels)',
    accentHex: '#22C55E',
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
