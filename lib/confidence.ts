export type Confidence = 'High' | 'Medium' | 'Low';

export interface CalibrationExample {
  score: number;
  correct: boolean;
}

export interface ConfidenceProfile {
  highThreshold: number;
  mediumThreshold: number;
  highMinCount: number;
  sampleCount: number;
  method: 'precision-target';
  status: 'provisional' | 'calibrated';
}

/**
 * Baseline used until a labeled evaluation corpus is supplied. The profile is
 * explicit and versionable so thresholds are no longer hidden constants in
 * retrieval code. It is intentionally marked provisional.
 */
export const DEFAULT_CONFIDENCE_PROFILE: ConfidenceProfile = {
  highThreshold: 0.85,
  mediumThreshold: 0.6,
  highMinCount: 3,
  sampleCount: 0,
  method: 'precision-target',
  status: 'provisional',
};

function precisionAt(examples: CalibrationExample[], threshold: number): { precision: number; count: number } {
  const selected = examples.filter((example) => example.score >= threshold);
  if (selected.length === 0) return { precision: 0, count: 0 };
  return { precision: selected.filter((example) => example.correct).length / selected.length, count: selected.length };
}

function thresholdFor(examples: CalibrationExample[], targetPrecision: number, minimumCount: number): number {
  const candidates = Array.from(new Set(examples.map((example) => Number(example.score.toFixed(4))))).sort((a, b) => b - a);
  const passing = candidates.filter((threshold) => {
    const result = precisionAt(examples, threshold);
    return result.count >= minimumCount && result.precision >= targetPrecision;
  });
  return passing.at(-1) ?? candidates[0] ?? 0;
}

/** Derive transparent score cutoffs from labeled retrieval outcomes. */
export function calibrateConfidenceProfile(examples: CalibrationExample[], highMinCount = 3): ConfidenceProfile {
  if (examples.length < 10) throw new Error('At least 10 labeled examples are required to calibrate confidence');
  const highThreshold = thresholdFor(examples, 0.95, highMinCount);
  const mediumThreshold = Math.min(highThreshold, thresholdFor(examples, 0.8, Math.max(3, Math.floor(examples.length * 0.1))));
  return {
    highThreshold,
    mediumThreshold,
    highMinCount,
    sampleCount: examples.length,
    method: 'precision-target',
    status: 'calibrated',
  };
}

export function confidenceLabel(topScores: number[], profile: ConfidenceProfile = DEFAULT_CONFIDENCE_PROFILE): Confidence {
  const strongCount = topScores.filter((score) => score >= profile.highThreshold).length;
  if (strongCount >= profile.highMinCount) return 'High';
  if ((topScores[0] ?? 0) >= profile.mediumThreshold) return 'Medium';
  return 'Low';
}
