import type { AppSettings, FeedItem, ScheduleConfig, SourceStatus } from '../types.ts';

const SETTINGS_KEY = 'pulsecurate_settings_v1';
const FEED_KEY = 'pulsecurate_feed_v1';

export function getTodayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  frequency: 'daily',
  weeklyDays: ['Mon', 'Wed', 'Fri'],
  monthlyDay: 1,
  multipleTimes: ['08:00', '17:00'],
  time: '08:00',
  startDate: getTodayDateInput(),
  pushEnabled: false,
  emailEnabled: false,
  emailAddress: '',
  webhookUrl: '',
  autoSyncOnOpen: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingComplete: false,
  topics: [],
  sources: [],
  schedule: DEFAULT_SCHEDULE,
  themeId: 'minimal-dark',
  autoAdaptiveTheme: false,
  lastUpdatedTimestamp: null,
  nextScheduledTimestamp: null,
};

export interface CachedFeedData {
  items: FeedItem[];
  sourceStatuses: SourceStatus[];
  filteredOutCount: number;
  fetchedAt: number;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      schedule: {
        ...DEFAULT_SCHEDULE,
        ...(parsed.schedule || {}),
      },
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadCachedFeed(): CachedFeedData | null {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFeedData;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedFeed(feed: CachedFeedData): void {
  try {
    localStorage.setItem(FEED_KEY, JSON.stringify(feed));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
