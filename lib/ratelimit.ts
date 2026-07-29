import { NextRequest } from 'next/server';

// Same Redis credentials as lib/store.ts. No Redis locally (or if the
// integration isn't attached) means no rate limiting locally — acceptable,
// since local dev is single-user and the risk this guards against (someone
// hammering the public Gemini quota) only exists once it's actually deployed.
function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };
const limiters = new Map<string, Limiter>();

async function getLimiter(name: string, requests: number, windowSeconds: number): Promise<Limiter | null> {
  if (!hasKv()) return null;
  const cacheKey = `${name}:${requests}:${windowSeconds}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;

  const { Redis } = await import('@upstash/redis');
  const { Ratelimit } = await import('@upstash/ratelimit');
  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix: `ratelimit:${name}`,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

export interface RateLimitCheck {
  limited: boolean;
}

// Uploads embed every chunk of a new document, the expensive path. Queries
// are one embedding call plus one generation call. Different budgets for each.
export async function checkUploadRateLimit(req: NextRequest): Promise<RateLimitCheck> {
  const limiter = await getLimiter('upload', 5, 60);
  if (!limiter) return { limited: false };
  const { success } = await limiter.limit(clientIp(req));
  return { limited: !success };
}

export async function checkQueryRateLimit(req: NextRequest): Promise<RateLimitCheck> {
  const limiter = await getLimiter('query', 20, 60);
  if (!limiter) return { limited: false };
  const { success } = await limiter.limit(clientIp(req));
  return { limited: !success };
}
