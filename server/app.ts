import 'dotenv/config';
import express, { Router } from 'express';
import type { PlatformId, SocialSource, TopicItem } from '../src/types.ts';
import {
  extractTopicsWithAI,
  filterAndSummarizePosts,
  formatFriendlyGeminiError,
  suggestSourcesWithAI,
  type RetryStatusEvent,
} from './gemini.ts';
import { runHybridFetchPipeline } from './hybridPipeline.ts';
import {
  dispatchEmailDigest,
  getResendConfigStatus,
  isConfiguredSecret,
} from './emailDigest.ts';

// In-memory store for /api/cron-digest fallback when triggered by external Vercel/GitHub cron
let syncedScheduleState: {
  topics: TopicItem[];
  sources: SocialSource[];
  email: string;
  webhookUrl: string;
  updatedAt: number;
} | null = null;

function wantsEventStream(req: express.Request): boolean {
  const accept = req.headers.accept || '';
  return accept.includes('text/event-stream');
}

function createSseResponder(res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  return {
    sendStatus: (evt: RetryStatusEvent) => send('status', evt),
    sendResult: (payload: unknown) => {
      send('result', payload);
      res.end();
    },
    sendError: (message: string) => {
      send('error', { error: message });
      res.end();
    },
  };
}

export function createPulseCurateApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const router = Router();

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'PulseCurate', timestamp: Date.now() });
  });

  // Email / cron status
  router.get('/email/status', (_req, res) => {
    const { serverResendConfigured } = getResendConfigStatus();
    const cronSecretConfigured = isConfiguredSecret(process.env.CRON_SECRET);
    res.json({ serverResendConfigured, cronSecretConfigured });
  });

  // Step 1: Extract structured keywords, sub-topics, and mood using Gemini
  router.post('/topics/extract', async (req, res) => {
    const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    if (!input || input.length > 500) {
      res.status(400).json({ error: 'Please provide a topic description (1 to 500 characters).' });
      return;
    }

    const useStream = wantsEventStream(req);
    const sse = useStream ? createSseResponder(res) : null;

    try {
      const result = await extractTopicsWithAI(input, sse?.sendStatus);
      if (sse) {
        sse.sendResult(result);
      } else {
        res.json(result);
      }
    } catch (err) {
      const message = formatFriendlyGeminiError(err);
      if (sse) {
        sse.sendError(message);
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  // Step 2: Auto-Suggest or Quick Import real handles across platforms
  router.post('/sources/suggest', async (req, res) => {
    const topics = Array.isArray(req.body?.topics)
      ? req.body.topics.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];
    const platforms = Array.isArray(req.body?.platforms)
      ? (req.body.platforms as PlatformId[])
      : (['youtube', 'reddit', 'x', 'linkedin'] as PlatformId[]);
    const mode = req.body?.mode === 'quick_import' ? 'quick_import' : 'suggest';
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : undefined;

    if (topics.length === 0) {
      res.status(400).json({ error: 'Select at least one topic before suggesting channels.' });
      return;
    }

    const useStream = wantsEventStream(req);
    const sse = useStream ? createSseResponder(res) : null;

    try {
      const sources = await suggestSourcesWithAI(topics, platforms, mode, provider, sse?.sendStatus);
      if (sse) {
        sse.sendResult({ sources });
      } else {
        res.json({ sources });
      }
    } catch (err) {
      const message = formatFriendlyGeminiError(err);
      if (sse) {
        sse.sendError(message);
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  // Hybrid Fetch + Gemini Filter & Summarize Pipeline
  router.post('/feed/refresh', async (req, res) => {
    const topics = Array.isArray(req.body?.topics) ? (req.body.topics as TopicItem[]) : [];
    const sources = Array.isArray(req.body?.sources) ? (req.body.sources as SocialSource[]) : [];

    if (topics.length === 0) {
      res.status(400).json({ error: 'At least one active topic is required.' });
      return;
    }
    if (sources.length === 0) {
      res.status(400).json({ error: 'At least one social media source is required.' });
      return;
    }

    const useStream = wantsEventStream(req);
    const sse = useStream ? createSseResponder(res) : null;

    try {
      const topicLabels = topics.map((t) => t.label);
      const { rawPosts, sourceStatuses } = await runHybridFetchPipeline(
        sources.slice(0, 15),
        topicLabels,
        sse?.sendStatus
      );
      const summarized = await filterAndSummarizePosts(rawPosts, topics, sse?.sendStatus);

      const payload = {
        items: summarized.items,
        sourceStatuses,
        dominantMood: summarized.dominantMood,
        fetchedAt: Date.now(),
        filteredOutCount: summarized.filteredOutCount,
        modelUsed: summarized.modelUsed,
        hadRetries: summarized.hadRetries,
      };

      if (sse) {
        sse.sendResult(payload);
      } else {
        res.json(payload);
      }
    } catch (err) {
      const message = formatFriendlyGeminiError(err);
      if (sse) {
        sse.sendError(message);
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  // Sync schedule & delivery profile
  router.post('/schedule/sync', (req, res) => {
    const topics = Array.isArray(req.body?.topics) ? (req.body.topics as TopicItem[]) : [];
    const sources = Array.isArray(req.body?.sources) ? (req.body.sources as SocialSource[]) : [];
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const webhookUrl = typeof req.body?.webhookUrl === 'string' ? req.body.webhookUrl.trim() : '';

    syncedScheduleState = {
      topics,
      sources,
      email,
      webhookUrl,
      updatedAt: Date.now(),
    };
    res.json({ synced: true, updatedAt: syncedScheduleState.updatedAt });
  });

  // Layer 2: Send Personal Email Digest
  router.post('/email/send-digest', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid personal email address.' });
        return;
      }
      const webhookUrl = typeof req.body?.webhookUrl === 'string' ? req.body.webhookUrl.trim() : '';
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const topics = Array.isArray(req.body?.topics) ? req.body.topics : [];
      const isTest = Boolean(req.body?.isTest);

      const result = await dispatchEmailDigest({
        email,
        webhookUrl,
        items,
        topics,
        isTest,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email digest.';
      res.status(500).json({ error: message });
    }
  });

  // Vercel Cron or GitHub Actions endpoint
  const handleCronDigest = async (req: express.Request, res: express.Response) => {
    try {
      if (isConfiguredSecret(process.env.CRON_SECRET)) {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${process.env.CRON_SECRET!.trim()}`) {
          res.status(401).json({ error: 'Unauthorized cron trigger.' });
          return;
        }
      }

      const body = req.body || {};
      const topics: TopicItem[] =
        Array.isArray(body.topics) && body.topics.length > 0
          ? body.topics
          : syncedScheduleState?.topics || [];
      const sources: SocialSource[] =
        Array.isArray(body.sources) && body.sources.length > 0
          ? body.sources
          : syncedScheduleState?.sources || [];
      const email =
        typeof body.email === 'string' && body.email.trim()
          ? body.email.trim()
          : syncedScheduleState?.email || '';
      const webhookUrl =
        typeof body.webhookUrl === 'string' && body.webhookUrl.trim()
          ? body.webhookUrl.trim()
          : syncedScheduleState?.webhookUrl || '';

      if (topics.length === 0 || sources.length === 0 || !email) {
        res.status(400).json({
          error:
            'Missing topics, sources, or email. Pass them in the POST JSON body or save your schedule in PulseCurate first.',
        });
        return;
      }

      const { rawPosts, sourceStatuses } = await runHybridFetchPipeline(
        sources.slice(0, 15),
        topics.map((t) => t.label)
      );
      const summarized = await filterAndSummarizePosts(rawPosts, topics);
      const emailResult = await dispatchEmailDigest({
        email,
        webhookUrl,
        items: summarized.items,
        topics: topics.map((t) => t.label),
        isTest: false,
      });

      res.json({
        ok: true,
        fetchedAt: Date.now(),
        storyCount: summarized.items.length,
        modelUsed: summarized.modelUsed,
        sourceStatuses,
        delivery: {
          delivered: emailResult.delivered,
          channel: emailResult.channel,
          message: emailResult.message,
          subject: emailResult.subject,
        },
      });
    } catch (err) {
      const message = formatFriendlyGeminiError(err);
      res.status(500).json({ error: message });
    }
  };

  router.get('/cron-digest', handleCronDigest);
  router.post('/cron-digest', handleCronDigest);

  // Mount router under BOTH /api and / so it works regardless of Vercel rewrites
  app.use('/api', router);
  app.use(router);

  return app;
}

const app = createPulseCurateApp();
export default app;
