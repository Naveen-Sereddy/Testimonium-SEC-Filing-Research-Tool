import { describe, expect, it } from 'vitest';
import { isValidSessionId } from '../../lib/session';

describe('isValidSessionId', () => {
  it('accepts generated v4 UUID session ids', () => {
    expect(isValidSessionId('6c125162-a73a-468f-8066-688a6b9f4fc3')).toBe(true);
  });

  it('rejects values that could escape the Redis session namespace', () => {
    expect(isValidSessionId('session:other:*')).toBe(false);
    expect(isValidSessionId('../../other')).toBe(false);
  });
});
