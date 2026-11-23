import type { FeedItem } from '../src/types.ts';

export function isConfiguredSecret(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const placeholderPatterns = [
    /^my_/i,
    /^your_/i,
    /placeholder/i,
    /changeme/i,
    /^<.*>$/,
    /^re_x+$/i,
    /^re_your/i,
    /^test_?key$/i,
    /example/i,
  ];
  return !placeholderPatterns.some((re) => re.test(trimmed));
}

export function getResendConfigStatus(): {
  serverResendConfigured: boolean;
  fromEmail: string;
} {
  const serverResendConfigured = isConfiguredSecret(process.env.RESEND_API_KEY);
  const rawFrom = process.env.RESEND_FROM_EMAIL;
  const fromEmail =
    isConfiguredSecret(rawFrom) && rawFrom && rawFrom.includes('@')
      ? rawFrom.trim()
      : 'PulseCurate <onboarding@resend.dev>';
  return { serverResendConfigured, fromEmail };
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export function validateSafeWebhookUrl(rawUrl: string): { valid: boolean; url?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, error: 'Webhook URL is empty.' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'Webhook URL must use http or https.' };
    }
    if (isPrivateOrLoopbackHost(parsed.hostname)) {
      return { valid: false, error: 'Private or loopback webhook hosts are not allowed.' };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid webhook URL format.' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDigestHtml(
  items: FeedItem[],
  topics: string[],
  isTest = false
): { subject: string; html: string; text: string } {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `${isTest ? '[Test] ' : ''}PulseCurate Digest — ${dateStr} (${items.length} stories)`;

  const cardsHtml =
    items.length > 0
      ? items
          .slice(0, 10)
          .map((item) => {
            const safeUrl = /^https?:\/\//i.test(item.sourceUrl) ? item.sourceUrl : '#';
            const bullets = item.takeaways
              .map((t) => `<li style="margin-bottom:4px;color:#CBD5E1;">${escapeHtml(t)}</li>`)
              .join('');
            return `
              <div style="background:#111827;border:1px solid #1E293B;border-radius:10px;padding:18px;margin-bottom:14px;">
                <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">
                  ${escapeHtml(item.platform.toUpperCase())} &middot; ${escapeHtml(item.accountName)} &middot; ${escapeHtml(item.topicTag)}
                </div>
                <h2 style="font-size:17px;line-height:1.35;color:#F8FAFC;margin:0 0 10px 0;">
                  ${escapeHtml(item.headline)}
                </h2>
                <ul style="margin:0 0 12px 0;padding-left:18px;font-size:14px;line-height:1.5;">
                  ${bullets}
                </ul>
                <a href="${escapeHtml(safeUrl)}" style="color:#38BDF8;font-size:13px;text-decoration:none;font-weight:600;">
                  View Source Post &rarr;
                </a>
              </div>
            `;
          })
          .join('')
      : `<p style="color:#94A3B8;font-size:14px;">No new stories matched your filter threshold in this cycle. Your active topics: ${escapeHtml(topics.join(', '))}.</p>`;

  const html = `
    <div style="background:#0B0F19;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:28px 16px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="border-bottom:1px solid #1E293B;padding-bottom:14px;margin-bottom:20px;">
          <h1 style="margin:0;font-size:20px;color:#F8FAFC;">PulseCurate</h1>
          <p style="margin:4px 0 0 0;font-size:13px;color:#94A3B8;">
            ${escapeHtml(dateStr)} &middot; Topics: ${escapeHtml(topics.join(', '))}
          </p>
        </div>
        ${cardsHtml}
        <p style="font-size:12px;color:#64748B;margin-top:24px;border-top:1px solid #1E293B;padding-top:14px;">
          Delivered by PulseCurate 3-Layer Fail-Safe Digest Engine.
        </p>
      </div>
    </div>
  `;

  const text = [
    subject,
    `Topics: ${topics.join(', ')}`,
    '',
    ...items.slice(0, 10).map(
      (i) =>
        `[${i.platform.toUpperCase()}] ${i.headline}\n${i.takeaways.map((t) => `- ${t}`).join('\n')}\nSource: ${i.sourceUrl}\n`
    ),
  ].join('\n');

  return { subject, html, text };
}

export async function dispatchEmailDigest(params: {
  email: string;
  webhookUrl?: string;
  items: FeedItem[];
  topics: string[];
  isTest?: boolean;
}): Promise<{
  delivered: boolean;
  configured: boolean;
  channel: 'webhook' | 'resend_env' | 'not_configured';
  message: string;
  subject: string;
  previewHtml: string;
}> {
  const { email, webhookUrl, items, topics, isTest } = params;
  const { subject, html, text } = buildDigestHtml(items, topics, isTest);

  // 1. User-configured EmailJS / Resend / Make / custom webhook URL
  if (webhookUrl && webhookUrl.trim()) {
    const check = validateSafeWebhookUrl(webhookUrl);
    if (!check.valid || !check.url) {
      throw new Error(check.error || 'Invalid webhook URL');
    }
    const response = await fetch(check.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        email,
        subject,
        html,
        text,
        topics,
        itemCount: items.length,
        items: items.slice(0, 10),
        isTest: Boolean(isTest),
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Webhook responded with HTTP ${response.status}${errText ? `: ${errText.slice(0, 160)}` : ''}`);
    }

    return {
      delivered: true,
      configured: true,
      channel: 'webhook',
      message: `Digest dispatched to webhook for ${email}.`,
      subject,
      previewHtml: html,
    };
  }

  // 2. Optional server-side RESEND_API_KEY (only if real non-placeholder value is present)
  const { serverResendConfigured, fromEmail } = getResendConfigStatus();
  if (serverResendConfigured && process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          html,
          text,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text().catch(() => '');
        return {
          delivered: false,
          configured: false,
          channel: 'not_configured',
          message: `Email digest not configured (${resendRes.status}: ${errBody.slice(0, 120) || 'Resend rejected key'}). Server email sending was skipped safely.`,
          subject,
          previewHtml: html,
        };
      }

      return {
        delivered: true,
        configured: true,
        channel: 'resend_env',
        message: `Digest email sent via Resend to ${email}.`,
        subject,
        previewHtml: html,
      };
    } catch {
      return {
        delivered: false,
        configured: false,
        channel: 'not_configured',
        message: 'Email digest not configured — unable to reach Resend API; skipped gracefully.',
        subject,
        previewHtml: html,
      };
    }
  }

  // 3. No webhook or valid RESEND_API_KEY configured — skip server email sending gracefully
  return {
    delivered: false,
    configured: false,
    channel: 'not_configured',
    message: `Email digest not configured. Compiled preview for ${email} without sending — add a webhook URL or RESEND_API_KEY in Secrets to enable email delivery.`,
    subject,
    previewHtml: html,
  };
}
