import React, { useEffect, useState } from 'react';
import { Bell, Check, Clock, Code2, Copy, Info, Loader2, Mail, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import type { FeedItem, ScheduleConfig, ScheduleFrequency, TopicItem, WeekdayCode } from '../types.ts';

interface ScheduleConfiguratorProps {
  schedule: ScheduleConfig;
  onChange: (schedule: ScheduleConfig) => void;
  topics: TopicItem[];
  sampleItems?: FeedItem[];
}

const WEEKDAYS: WeekdayCode[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00', display: '08:00 AM' },
  { label: 'Noon', time: '13:00', display: '01:00 PM' },
  { label: 'Afternoon', time: '17:00', display: '05:00 PM' },
  { label: 'Night', time: '21:00', display: '09:00 PM' },
];

export const ScheduleConfigurator: React.FC<ScheduleConfiguratorProps> = ({
  schedule,
  onChange,
  topics,
  sampleItems = [],
}) => {
  const [notifStatus, setNotifStatus] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [newMultiTime, setNewMultiTime] = useState('12:00');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    previewHtml?: string;
  } | null>(null);
  const [showCronSnippet, setShowCronSnippet] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverResendConfigured, setServerResendConfigured] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetch('/api/email/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) {
          setServerResendConfigured(Boolean(data.serverResendConfigured));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const hasWebhook = Boolean(schedule.webhookUrl.trim());
  const isEmailConfigured = hasWebhook || serverResendConfigured;

  const update = (patch: Partial<ScheduleConfig>) => {
    onChange({ ...schedule, ...patch });
  };

  const toggleWeekday = (day: WeekdayCode) => {
    const current = schedule.weeklyDays || [];
    const exists = current.includes(day);
    const next = exists ? current.filter((d) => d !== day) : [...current, day];
    update({ weeklyDays: next.length > 0 ? next : ['Mon'] });
  };

  const addMultipleTime = () => {
    if (!newMultiTime) return;
    const current = schedule.multipleTimes || [];
    if (!current.includes(newMultiTime)) {
      update({ multipleTimes: [...current, newMultiTime].sort() });
    }
  };

  const removeMultipleTime = (timeStr: string) => {
    const next = (schedule.multipleTimes || []).filter((t) => t !== timeStr);
    update({ multipleTimes: next.length > 0 ? next : ['08:00'] });
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotifStatus('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifStatus(result);
      if (result === 'granted') {
        update({ pushEnabled: true });
        new Notification('PulseCurate Notifications Active', {
          body: 'Layer 1 push alerts are ready for your scheduled digest updates.',
        });
      } else {
        update({ pushEnabled: false });
      }
    } catch {
      setNotifStatus('denied');
    }
  };

  const handleSendTestEmail = async () => {
    if (!schedule.emailAddress.trim()) {
      setEmailFeedback({ type: 'error', text: 'Enter your personal email address first.' });
      return;
    }
    setIsSendingTest(true);
    setEmailFeedback(null);
    try {
      const res = await fetch('/api/email/send-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: schedule.emailAddress.trim(),
          webhookUrl: schedule.webhookUrl.trim(),
          topics: topics.map((t) => t.label),
          items: sampleItems,
          isTest: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test digest.');

      if (data.delivered) {
        update({ emailEnabled: true });
      }
      setEmailFeedback({
        type: data.delivered ? 'success' : 'info',
        text: data.message,
        previewHtml: data.previewHtml,
      });
    } catch (err) {
      setEmailFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Test email dispatch failed.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';

  const vercelCronSnippet = `{
  "crons": [
    {
      "path": "/api/cron-digest",
      "schedule": "0 ${Number((schedule.time || '08:00').split(':')[0])} * * *"
    }
  ]
}`;

  const githubActionSnippet = `name: PulseCurate Scheduled Digest
on:
  schedule:
    - cron: '0 ${Number((schedule.time || '08:00').split(':')[0])} * * *'
jobs:
  trigger-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger PulseCurate Cron Digest
        run: |
          curl -X POST "${appOrigin}/api/cron-digest" \\
            -H "Content-Type: application/json" \\
            -d '{"email":"${schedule.emailAddress || 'you@example.com'}"}'`;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard permission denial
    }
  };

  return (
    <div className="space-y-6">
      {/* Frequency & Time Picker */}
      <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 sm:p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
          <Clock className="w-4 h-4 text-[var(--pc-accent)]" />
          <span>Update Frequency &amp; Schedule</span>
        </div>

        {/* Frequency Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'multiple', label: 'Multiple / Day' },
            ] as Array<{ id: ScheduleFrequency; label: string }>
          ).map((freq) => {
            const active = schedule.frequency === freq.id;
            return (
              <button
                key={freq.id}
                type="button"
                onClick={() => update({ frequency: freq.id })}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)] text-[var(--pc-text)]'
                    : 'border-[var(--pc-border)] bg-[var(--pc-bg)] text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                }`}
              >
                {freq.label}
              </button>
            );
          })}
        </div>

        {/* Weekly Day Checkboxes */}
        {schedule.frequency === 'weekly' && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--pc-text-muted)]">Select Days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = (schedule.weeklyDays || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`min-h-[40px] min-w-[48px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)] text-[var(--pc-text)]'
                        : 'border-[var(--pc-border)] bg-[var(--pc-bg)] text-[var(--pc-text-muted)]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Day Picker */}
        {schedule.frequency === 'monthly' && (
          <div className="flex items-center gap-3">
            <label htmlFor="monthly-day" className="text-xs font-medium text-[var(--pc-text-muted)]">
              Day of Month:
            </label>
            <select
              id="monthly-day"
              value={schedule.monthlyDay}
              onChange={(e) => update({ monthlyDay: Number(e.target.value) })}
              className="min-h-[40px] rounded-lg border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3 py-1.5 text-sm text-[var(--pc-text)] font-mono-tabular"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multiple Times Per Day */}
        {schedule.frequency === 'multiple' && (
          <div className="space-y-2.5">
            <span className="text-xs font-medium text-[var(--pc-text-muted)]">
              Daily Delivery Slots
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(schedule.multipleTimes || []).map((t) => (
                <div
                  key={t}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-bg)] flex items-center gap-2 text-xs font-mono-tabular text-[var(--pc-text)]"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => removeMultipleTime(t)}
                    aria-label={`Remove ${t}`}
                    className="text-[var(--pc-text-muted)] hover:text-[var(--pc-danger)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={newMultiTime}
                  onChange={(e) => setNewMultiTime(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-[var(--pc-border)] bg-[var(--pc-bg)] px-2.5 text-xs font-mono-tabular text-[var(--pc-text)]"
                />
                <button
                  type="button"
                  onClick={addMultipleTime}
                  className="min-h-[38px] px-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-elevated)] text-xs font-medium text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Time Presets + Exact Clock & Start Date */}
        <div className="space-y-3 pt-1">
          {schedule.frequency !== 'multiple' && (
            <div>
              <span className="block text-xs font-medium text-[var(--pc-text-muted)] mb-2">
                Time Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIME_PRESETS.map((preset) => {
                  const active = schedule.time === preset.time;
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => update({ time: preset.time })}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)] text-[var(--pc-text)]'
                          : 'border-[var(--pc-border)] bg-[var(--pc-bg)] text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className="text-[11px] font-mono-tabular opacity-80">{preset.display}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schedule.frequency !== 'multiple' && (
              <div>
                <label
                  htmlFor="exact-time-picker"
                  className="block text-xs font-medium text-[var(--pc-text-muted)] mb-1.5"
                >
                  Exact Time (HH:MM)
                </label>
                <input
                  id="exact-time-picker"
                  type="time"
                  value={schedule.time}
                  onChange={(e) => update({ time: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3.5 text-sm font-mono-tabular text-[var(--pc-text)] focus:outline-none focus:border-[var(--pc-accent)]"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="start-date-picker"
                className="block text-xs font-medium text-[var(--pc-text-muted)] mb-1.5"
              >
                Start Date
              </label>
              <input
                id="start-date-picker"
                type="date"
                value={schedule.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3.5 text-sm font-mono-tabular text-[var(--pc-text)] focus:outline-none focus:border-[var(--pc-accent)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3-Layer Fail-Safe Delivery System */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--pc-text)]">
          3-Layer Fail-Safe Delivery System
        </h3>

        {/* Layer 1: Browser Push Notification */}
        <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
              <Bell className="w-4 h-4 text-[var(--pc-accent)]" />
              <span>Layer 1: Browser Push Notification</span>
            </div>
            <p className="text-xs text-[var(--pc-text-muted)]">
              Triggers an OS notification with your top headline summary when the scheduled time hits.
            </p>
            <div className="text-xs text-[var(--pc-text-muted)]">
              Permission status:{' '}
              <strong className="text-[var(--pc-text)] capitalize">{notifStatus}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={requestPushPermission}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-elevated)] text-xs font-semibold text-[var(--pc-text)] hover:border-[var(--pc-accent)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {notifStatus === 'granted' && schedule.pushEnabled
              ? 'Push Active (Send Test)'
              : 'Enable Push Alerts'}
          </button>
        </div>

        {/* Layer 2: Personal Email Digest */}
        <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
                <Mail className="w-4 h-4 text-[var(--pc-accent)]" />
                <span>Layer 2: Personal Email Digest</span>
              </div>
              <p className="text-xs text-[var(--pc-text-muted)] mt-1">
                Delivers a formatted digest even when your browser is closed via your webhook or cron trigger.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--pc-text)] cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={schedule.emailEnabled}
                onChange={(e) => update({ emailEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-[var(--pc-accent)]"
              />
              Enable
            </label>
          </div>

          <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3 py-2 flex items-center gap-2 text-xs">
            <Info
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: isEmailConfigured ? 'var(--pc-success)' : 'var(--pc-text-muted)' }}
            />
            <span className="text-[var(--pc-text)] font-medium">
              {isEmailConfigured
                ? hasWebhook
                  ? 'Email digest ready (custom webhook configured)'
                  : 'Email digest ready (server Resend configured)'
                : 'Email digest not configured'}
            </span>
            {!isEmailConfigured && (
              <span className="text-[var(--pc-text-muted)]">
                &mdash; Optional. Feed &amp; Refresh work normally without email credentials.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="digest-email"
                className="block text-xs font-medium text-[var(--pc-text-muted)] mb-1"
              >
                Personal Email Address
              </label>
              <input
                id="digest-email"
                type="email"
                value={schedule.emailAddress}
                onChange={(e) => update({ emailAddress: e.target.value })}
                placeholder="you@domain.com"
                className="w-full min-h-[44px] rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3.5 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60 focus:outline-none focus:border-[var(--pc-accent)]"
              />
            </div>
            <div>
              <label
                htmlFor="digest-webhook"
                className="block text-xs font-medium text-[var(--pc-text-muted)] mb-1"
              >
                EmailJS / Resend Webhook URL (Optional)
              </label>
              <input
                id="digest-webhook"
                type="url"
                value={schedule.webhookUrl}
                onChange={(e) => update({ webhookUrl: e.target.value })}
                placeholder="https://hook.your-mailer.com/..."
                className="w-full min-h-[44px] rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] px-3.5 text-sm text-[var(--pc-text)] placeholder:text-[var(--pc-text-muted)]/60 focus:outline-none focus:border-[var(--pc-accent)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-elevated)] text-xs font-semibold text-[var(--pc-text)] hover:border-[var(--pc-accent)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSendingTest ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[var(--pc-accent)]" />
              )}
              Send Test Digest Email Now
            </button>

            <button
              type="button"
              onClick={() => setShowCronSnippet((v) => !v)}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] text-xs font-medium text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] flex items-center gap-2 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showCronSnippet ? 'Hide' : 'Show'} /api/cron-digest &amp; Cron Config
            </button>
          </div>

          {emailFeedback && (
            <div
              className={`rounded-xl border p-3 text-xs space-y-2 ${
                emailFeedback.type === 'error'
                  ? 'border-[var(--pc-danger)]/50 text-[var(--pc-danger)]'
                  : 'border-[var(--pc-border)] text-[var(--pc-text)] bg-[var(--pc-bg)]'
              }`}
            >
              <p>{emailFeedback.text}</p>
            </div>
          )}

          {showCronSnippet && (
            <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-bg)] p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--pc-text)]">
                  Endpoint: <code className="font-mono-tabular text-[var(--pc-accent)]">{appOrigin}/api/cron-digest</code>
                </span>
                <button
                  type="button"
                  onClick={() => copyText('endpoint', `${appOrigin}/api/cron-digest`)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--pc-border)] text-[var(--pc-text-muted)] hover:text-[var(--pc-text)] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'endpoint' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy URL
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[var(--pc-text-muted)]">
                  <span>vercel.json Cron Config</span>
                  <button
                    type="button"
                    onClick={() => copyText('vercel', vercelCronSnippet)}
                    className="hover:text-[var(--pc-text)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'vercel' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--pc-surface)] border border-[var(--pc-border)] overflow-x-auto font-mono-tabular text-[11px] text-[var(--pc-text)]">
                  {vercelCronSnippet}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[var(--pc-text-muted)]">
                  <span>GitHub Actions Workflow (.github/workflows/digest.yml)</span>
                  <button
                    type="button"
                    onClick={() => copyText('gh', githubActionSnippet)}
                    className="hover:text-[var(--pc-text)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'gh' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--pc-surface)] border border-[var(--pc-border)] overflow-x-auto font-mono-tabular text-[11px] text-[var(--pc-text)]">
                  {githubActionSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Layer 3: Guaranteed On-Open Auto-Sync */}
        <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pc-text)]">
              <RefreshCw className="w-4 h-4 text-[var(--pc-success)]" />
              <span>Layer 3: Guaranteed On-Open Auto-Sync (Zero-Fail Fallback)</span>
            </div>
            <p className="text-xs text-[var(--pc-text-muted)]">
              Tracks <code className="font-mono-tabular">lastUpdatedTimestamp</code> and{' '}
              <code className="font-mono-tabular">nextScheduledTimestamp</code> locally. Any missed cycle automatically syncs the instant you open or refresh PulseCurate.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--pc-text)] shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={schedule.autoSyncOnOpen}
              onChange={(e) => update({ autoSyncOnOpen: e.target.checked })}
              className="w-4 h-4 rounded accent-[var(--pc-accent)]"
            />
            Active
          </label>
        </div>
      </div>
    </div>
  );
};
