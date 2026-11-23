export type PlatformId =
  | 'youtube'
  | 'reddit'
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'threads'
  | 'whatsapp';

export type TopicMood = 'Serious' | 'Analytical' | 'Entertaining';

export interface TopicItem {
  id: string;
  label: string;
  mood: TopicMood;
  isCustom?: boolean;
}

export interface SocialSource {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  channelId?: string;
  description?: string;
  verified?: boolean;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'multiple';

export type WeekdayCode = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  weeklyDays: WeekdayCode[];
  monthlyDay: number;
  multipleTimes: string[]; // HH:MM strings
  time: string; // HH:MM
  startDate: string; // YYYY-MM-DD
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailAddress: string;
  webhookUrl: string;
  autoSyncOnOpen: boolean;
}

export type SentimentLabel =
  | 'Breaking'
  | 'Analytical'
  | 'Bullish'
  | 'Critical'
  | 'Entertaining'
  | 'Informative';

export type UrgencyLevel = 'High' | 'Medium' | 'Low';

export interface FeedItem {
  id: string;
  platform: PlatformId;
  accountName: string;
  handle: string;
  timestamp: string;
  topicTag: string;
  headline: string;
  takeaways: string[];
  sentiment: SentimentLabel;
  urgency: UrgencyLevel;
  relevanceScore: number;
  sourceUrl: string;
}

export interface SourceStatus {
  sourceId: string;
  platform: PlatformId;
  handle: string;
  status: 'ok' | 'no_recent_posts' | 'error';
  message?: string;
  rawCount: number;
}

export interface AppSettings {
  onboardingComplete: boolean;
  topics: TopicItem[];
  sources: SocialSource[];
  schedule: ScheduleConfig;
  themeId: string;
  autoAdaptiveTheme: boolean;
  lastUpdatedTimestamp: number | null;
  nextScheduledTimestamp: number | null;
}

export interface TopicExtractionResult {
  keywords: string[];
  subTopics: string[];
  mood: TopicMood;
  summary: string;
}

export interface FeedRefreshResponse {
  items: FeedItem[];
  sourceStatuses: SourceStatus[];
  dominantMood: TopicMood;
  fetchedAt: number;
  filteredOutCount: number;
  modelUsed?: string;
  hadRetries?: boolean;
}
