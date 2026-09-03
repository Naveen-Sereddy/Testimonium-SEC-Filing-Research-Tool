import { describe, expect, it } from 'vitest';
import { calibrateConfidenceProfile, confidenceLabel } from '../../lib/confidence';

describe('calibrateConfidenceProfile', () => {
  it('requires a labeled set large enough to be meaningful', () => {
    expect(() => calibrateConfidenceProfile([{ score: 0.9, correct: true }])).toThrow(/10 labeled examples/);
  });

  it('derives explicit precision-target thresholds from labeled retrieval outcomes', () => {
    const examples = Array.from({ length: 10 }, (_, i) => ({ score: 0.95 - i * 0.05, correct: i < 7 }));
    const profile = calibrateConfidenceProfile(examples, 2);
    expect(profile.status).toBe('calibrated');
    expect(profile.sampleCount).toBe(10);
    expect(profile.highThreshold).toBeGreaterThanOrEqual(profile.mediumThreshold);
  });
});

describe('confidenceLabel', () => {
  it('uses the supplied calibrated profile instead of hidden constants', () => {
    const profile = {
      highThreshold: 0.9,
      mediumThreshold: 0.5,
      highMinCount: 2,
      sampleCount: 20,
      method: 'precision-target' as const,
      status: 'calibrated' as const,
    };
    expect(confidenceLabel([0.91, 0.9, 0.4], profile)).toBe('High');
    expect(confidenceLabel([0.6, 0.4], profile)).toBe('Medium');
    expect(confidenceLabel([0.4, 0.3], profile)).toBe('Low');
  });
});
