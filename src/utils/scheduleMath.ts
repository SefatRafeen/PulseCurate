import type { ScheduleConfig, WeekdayCode } from '../types.ts';

const WEEKDAY_INDEX: Record<WeekdayCode, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [hStr, mStr] = (hhmm || '08:00').split(':');
  const hours = Math.min(23, Math.max(0, Number(hStr) || 0));
  const minutes = Math.min(59, Math.max(0, Number(mStr) || 0));
  return { hours, minutes };
}

function getStartBaseline(startDate: string, fromMs: number): number {
  if (!startDate) return fromMs;
  const parts = startDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return fromMs;
  const startMidnight = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
  return Math.max(fromMs, startMidnight);
}

export function computeNextScheduledTimestamp(
  schedule: ScheduleConfig,
  fromMs: number = Date.now()
): number {
  const baseline = getStartBaseline(schedule.startDate, fromMs);
  const ref = new Date(baseline);

  if (schedule.frequency === 'multiple') {
    const times = (schedule.multipleTimes && schedule.multipleTimes.length > 0
      ? schedule.multipleTimes
      : [schedule.time || '08:00']
    ).slice().sort();

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      for (const t of times) {
        const { hours, minutes } = parseTime(t);
        const candidate = new Date(
          ref.getFullYear(),
          ref.getMonth(),
          ref.getDate() + dayOffset,
          hours,
          minutes,
          0,
          0
        ).getTime();
        if (candidate > fromMs && candidate >= baseline) {
          return candidate;
        }
      }
    }
  }

  const { hours, minutes } = parseTime(schedule.time);

  if (schedule.frequency === 'weekly') {
    const allowedDays =
      schedule.weeklyDays && schedule.weeklyDays.length > 0
        ? new Set(schedule.weeklyDays.map((d) => WEEKDAY_INDEX[d]))
        : new Set([1]);
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const candidateDate = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate() + dayOffset,
        hours,
        minutes,
        0,
        0
      );
      if (
        allowedDays.has(candidateDate.getDay()) &&
        candidateDate.getTime() > fromMs &&
        candidateDate.getTime() >= baseline
      ) {
        return candidateDate.getTime();
      }
    }
  }

  if (schedule.frequency === 'monthly') {
    const targetDay = Math.min(28, Math.max(1, schedule.monthlyDay || 1));
    for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
      const candidate = new Date(
        ref.getFullYear(),
        ref.getMonth() + monthOffset,
        targetDay,
        hours,
        minutes,
        0,
        0
      ).getTime();
      if (candidate > fromMs && candidate >= baseline) {
        return candidate;
      }
    }
  }

  // Default: daily
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidate = new Date(
      ref.getFullYear(),
      ref.getMonth(),
      ref.getDate() + dayOffset,
      hours,
      minutes,
      0,
      0
    ).getTime();
    if (candidate > fromMs && candidate >= baseline) {
      return candidate;
    }
  }

  return fromMs + 24 * 60 * 60 * 1000;
}

export function formatScheduledLabel(timestamp: number | null): string {
  if (!timestamp) return 'Not scheduled';
  const target = new Date(timestamp);
  const now = new Date();

  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate();

  const timeStr = target.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  const dayStr = target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${dayStr} at ${timeStr}`;
}

export function formatCountdown(targetTimestamp: number | null, nowMs: number): string {
  if (!targetTimestamp) return '--:--:--';
  const diff = Math.max(0, targetTimestamp - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${hh}h ${mm}m`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}

export function formatRelativeTime(isoOrString: string): string {
  const parsed = Date.parse(isoOrString);
  if (Number.isNaN(parsed)) return isoOrString;
  const diffMs = Date.now() - parsed;
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(parsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
