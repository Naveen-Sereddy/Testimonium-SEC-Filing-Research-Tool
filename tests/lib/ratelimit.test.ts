import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { checkUploadRateLimit, checkQueryRateLimit } from '../../lib/ratelimit';

const req = new NextRequest('http://localhost/api/query', { method: 'POST' });

describe('ratelimit', () => {
  it('never limits when no Redis credentials are configured (local dev)', async () => {
    expect((await checkUploadRateLimit(req)).limited).toBe(false);
    expect((await checkQueryRateLimit(req)).limited).toBe(false);
  });
});
