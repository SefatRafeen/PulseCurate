export interface StreamStatusPayload {
  phase?: 'retrying' | 'fallback';
  model?: string;
  attempt?: number;
  maxRetries?: number;
  message: string;
}

export function sanitizeClientError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Strip accidental raw JSON error blobs if an upstream proxy returned one
  if (trimmed.startsWith('{') || trimmed.includes('{"error"')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
      return 'AI service is temporarily experiencing high demand. Please try again in a moment.';
    }
    if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit')) {
      return 'AI rate limit reached. Please wait a few seconds and try again.';
    }
    try {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
          error?: { message?: string } | string;
          message?: string;
        };
        const extracted =
          typeof parsed.error === 'string'
            ? parsed.error
            : parsed.error?.message || parsed.message;
        if (extracted && !extracted.trim().startsWith('{')) {
          return extracted.trim();
        }
      }
    } catch {
      // Fall through to fallback
    }
    return fallback;
  }

  return trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
}

export async function postWithRetryStatus<T>(
  url: string,
  body: unknown,
  onStatus?: (message: string) => void
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: T | undefined;
    let streamError: string | null = null;

    const processBlock = (block: string) => {
      const lines = block.split('\n');
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) return;
      const rawData = dataLines.join('\n');

      try {
        const parsed = JSON.parse(rawData) as Record<string, unknown>;
        if (eventName === 'status') {
          const msg = typeof parsed.message === 'string' ? parsed.message : 'Model busy, retrying...';
          onStatus?.(msg);
        } else if (eventName === 'result') {
          finalResult = parsed as T;
        } else if (eventName === 'error') {
          streamError = sanitizeClientError(
            typeof parsed.error === 'string' ? parsed.error : '',
            'AI processing encountered a temporary issue. Please try again.'
          );
        }
      } catch {
        // Ignore malformed partial SSE frames
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        if (chunk.trim()) {
          processBlock(chunk);
        }
      }
    }

    if (buffer.trim()) {
      processBlock(buffer);
    }

    if (streamError) {
      throw new Error(streamError);
    }
    if (finalResult !== undefined) {
      return finalResult;
    }
    throw new Error('AI request ended unexpectedly. Please try again.');
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    if (!response.ok) {
      throw new Error('Unable to complete request right now. Please try again.');
    }
  }

  if (!response.ok) {
    throw new Error(
      sanitizeClientError(
        typeof data.error === 'string' ? data.error : text,
        'Unable to complete AI request right now. Please try again.'
      )
    );
  }

  return data as T;
}
