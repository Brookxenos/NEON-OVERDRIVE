import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
// Keep cache short because Deezer preview MP3 tokens expire after a few hours
const SHORT_CACHE_MS = 1000 * 60 * 3;
const EXPIRY_SAFETY_BUFFER_MS = 1000 * 60 * 5;

export interface DeezerTrackPayload {
  id: number;
  title: string;
  artistName: string;
  coverMedium: string;
  previewUrl: string;
  expiresAt: number;
}

interface DeezerApiTrackItem {
  id?: number;
  title?: string;
  preview?: string;
  artist?: {
    name?: string;
  };
  album?: {
    cover_medium?: string;
  };
}

interface DeezerApiSearchResponse {
  data?: DeezerApiTrackItem[];
  error?: {
    type?: string;
    message?: string;
    code?: number;
  };
}

interface SearchCacheEntry {
  tracks: DeezerTrackPayload[];
  cachedAt: number;
}

const searchCache = new Map<string, SearchCacheEntry>();

function parsePreviewExpiryMs(previewUrl: string): number {
  const match = previewUrl.match(/(?:^|[~?&])exp=(\d{9,13})/);
  if (match && match[1]) {
    const raw = Number(match[1]);
    if (Number.isFinite(raw) && raw > 0) {
      return raw < 1e12 ? raw * 1000 : raw;
    }
  }
  return Date.now() + 1000 * 60 * 90;
}

function isCacheFresh(entry: SearchCacheEntry): boolean {
  const now = Date.now();
  if (now - entry.cachedAt > SHORT_CACHE_MS) return false;
  return entry.tracks.every((t) => t.expiresAt - EXPIRY_SAFETY_BUFFER_MS > now);
}

async function fetchDeezerSearch(query: string, limit: number): Promise<DeezerTrackPayload[]> {
  const cacheKey = `${query.toLowerCase()}::${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && isCacheFresh(cached)) {
    return cached.tracks;
  }

  const endpoint = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error(`Deezer API returned HTTP ${res.status}`);
  }

  const json = (await res.json()) as DeezerApiSearchResponse;
  if (json.error) {
    throw new Error(json.error.message || 'Deezer API search error');
  }

  const rows = Array.isArray(json.data) ? json.data : [];
  const tracks: DeezerTrackPayload[] = [];

  for (const item of rows) {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const artistName = typeof item.artist?.name === 'string' ? item.artist.name.trim() : '';
    const coverMedium =
      typeof item.album?.cover_medium === 'string' ? item.album.cover_medium.trim() : '';
    const previewUrl = typeof item.preview === 'string' ? item.preview.trim() : '';

    if (!title || !artistName || !previewUrl.startsWith('https://')) {
      continue;
    }

    const expiresAt = parsePreviewExpiryMs(previewUrl);
    if (expiresAt - EXPIRY_SAFETY_BUFFER_MS <= Date.now()) {
      continue;
    }

    tracks.push({
      id: typeof item.id === 'number' ? item.id : tracks.length + 1,
      title,
      artistName,
      coverMedium,
      previewUrl,
      expiresAt,
    });
  }

  if (tracks.length > 0) {
    searchCache.set(cacheKey, {
      tracks,
      cachedAt: Date.now(),
    });
  }

  return tracks;
}

async function createApp(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/deezer/search', async (req: Request, res: Response) => {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : 'synthwave outrun';
    const safeQuery = rawQuery.slice(0, 80) || 'synthwave outrun';
    const rawLimit = Number(req.query.limit || 12);
    const safeLimit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(25, Math.round(rawLimit))) : 12;

    try {
      const tracks = await fetchDeezerSearch(safeQuery, safeLimit);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        query: safeQuery,
        data: tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: { name: t.artistName },
          album: { cover_medium: t.coverMedium },
          preview: t.previewUrl,
          expiresAt: t.expiresAt,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deezer search failed';
      res.status(502).json({ error: message, data: [] });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEON OVERDRIVE server listening on http://0.0.0.0:${PORT}`);
  });
}

void createApp();
