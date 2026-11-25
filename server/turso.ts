import { createClient, type Client } from '@libsql/client/web';
import type { SocialSource } from '../src/types.ts';
import { normalizeSourceInput } from '../src/utils/sourceNormalization.ts';

let cachedClient: Client | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function isValidEnvValue(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/your-db|placeholder|changeme|example/i.test(trimmed)) return false;
  return true;
}

export function isTursoConfigured(): boolean {
  return isValidEnvValue(process.env.TURSO_DATABASE_URL) && isValidEnvValue(process.env.TURSO_AUTH_TOKEN);
}

function getTursoClient(): Client | null {
  if (!isTursoConfigured()) return null;
  if (cachedClient) return cachedClient;

  const rawUrl = process.env.TURSO_DATABASE_URL!.trim();
  const httpUrl = rawUrl.replace(/^libsql:\/\//i, 'https://').replace(/\/+$/, '');
  const authToken = process.env.TURSO_AUTH_TOKEN!.trim();

  cachedClient = createClient({
    url: httpUrl,
    authToken,
  });
  return cachedClient;
}

async function ensureSourcesSchema(client: Client): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = client
      .execute(`
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          platform TEXT NOT NULL,
          name TEXT NOT NULL,
          handle TEXT NOT NULL,
          url TEXT NOT NULL,
          channel_id TEXT,
          description TEXT,
          verified INTEGER NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(platform, handle)
        )
      `)
      .then(() => undefined)
      .catch((err) => {
        schemaReadyPromise = null;
        throw err;
      });
  }
  return schemaReadyPromise;
}

function mapRowToSocialSource(row: Record<string, unknown>): SocialSource {
  const normalized = normalizeSourceInput({
    id: String(row.id || ''),
    platform: String(row.platform || 'x'),
    handle: String(row.handle || ''),
    name: String(row.name || ''),
    displayName: String(row.name || ''),
    url: String(row.url || ''),
    channelId: row.channel_id ? String(row.channel_id) : undefined,
    description: row.description ? String(row.description) : undefined,
    verified: Boolean(Number(row.verified || 0)),
  });
  return normalized;
}

export async function getActiveSourcesFromTurso(): Promise<SocialSource[] | null> {
  const client = getTursoClient();
  if (!client) return null;

  try {
    await ensureSourcesSchema(client);
    const result = await client.execute(
      `SELECT id, platform, name, handle, url, channel_id, description, verified
       FROM sources
       WHERE active = 1
       ORDER BY created_at ASC`
    );
    return result.rows.map((r) => mapRowToSocialSource(r as unknown as Record<string, unknown>));
  } catch (err) {
    console.warn('Turso getActiveSourcesFromTurso fallback:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function upsertSourceToTurso(
  rawSource: Omit<Partial<SocialSource>, 'platform'> & { platform: string; handle: string }
): Promise<SocialSource> {
  const normalized = normalizeSourceInput({
    id: rawSource.id,
    platform: rawSource.platform,
    handle: rawSource.handle,
    displayName: rawSource.displayName,
    name: rawSource.name,
    url: rawSource.url,
    channelId: rawSource.channelId,
    description: rawSource.description,
    verified: rawSource.verified,
  });

  const client = getTursoClient();
  if (!client) return normalized;

  try {
    await ensureSourcesSchema(client);
    const now = Date.now();
    await client.execute({
      sql: `
        INSERT INTO sources (id, platform, name, handle, url, channel_id, description, verified, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(platform, handle) DO UPDATE SET
          name = excluded.name,
          url = excluded.url,
          channel_id = COALESCE(excluded.channel_id, sources.channel_id),
          description = COALESCE(excluded.description, sources.description),
          verified = excluded.verified,
          active = 1,
          updated_at = excluded.updated_at
      `,
      args: [
        normalized.id,
        normalized.platform,
        normalized.name,
        normalized.handle,
        normalized.url,
        normalized.channelId || null,
        normalized.description || null,
        normalized.verified ? 1 : 0,
        now,
        now,
      ],
    });
  } catch (err) {
    console.warn('Turso upsertSourceToTurso warning:', err instanceof Error ? err.message : err);
  }

  return normalized;
}

export async function syncAllSourcesToTurso(sources: SocialSource[]): Promise<SocialSource[]> {
  const normalizedList = sources
    .filter((s) => s && s.platform && s.handle)
    .map((s) =>
      normalizeSourceInput({
        id: s.id,
        platform: s.platform,
        handle: s.handle,
        displayName: s.displayName,
        name: s.name,
        url: s.url,
        channelId: s.channelId,
        description: s.description,
        verified: s.verified,
      })
    );

  const client = getTursoClient();
  if (!client) return normalizedList;

  try {
    await ensureSourcesSchema(client);
    const now = Date.now();

    // Mark existing active rows inactive, then upsert the current active set as active=1
    const statements = [
      { sql: 'UPDATE sources SET active = 0, updated_at = ?', args: [now] },
      ...normalizedList.map((src) => ({
        sql: `
          INSERT INTO sources (id, platform, name, handle, url, channel_id, description, verified, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(platform, handle) DO UPDATE SET
            id = excluded.id,
            name = excluded.name,
            url = excluded.url,
            channel_id = COALESCE(excluded.channel_id, sources.channel_id),
            description = COALESCE(excluded.description, sources.description),
            verified = excluded.verified,
            active = 1,
            updated_at = excluded.updated_at
        `,
        args: [
          src.id,
          src.platform,
          src.name,
          src.handle,
          src.url,
          src.channelId || null,
          src.description || null,
          src.verified ? 1 : 0,
          now,
          now,
        ],
      })),
    ];

    await client.batch(statements, 'write');
  } catch (err) {
    console.warn('Turso syncAllSourcesToTurso warning:', err instanceof Error ? err.message : err);
  }

  return normalizedList;
}

export async function removeSourceFromTurso(id: string): Promise<boolean> {
  const client = getTursoClient();
  if (!client) return false;

  try {
    await ensureSourcesSchema(client);
    await client.execute({
      sql: 'UPDATE sources SET active = 0, updated_at = ? WHERE id = ?',
      args: [Date.now(), id],
    });
    return true;
  } catch (err) {
    console.warn('Turso removeSourceFromTurso warning:', err instanceof Error ? err.message : err);
    return false;
  }
}
