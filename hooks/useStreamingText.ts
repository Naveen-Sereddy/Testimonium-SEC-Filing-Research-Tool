'use client';

import { useEffect, useState } from 'react';

const DURATION_MS = 550;
const SAFETY_MARGIN_MS = 400;

export function useStreamingText(fullText: string) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || fullText.length === 0) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    setDisplayedText('');
    setIsStreaming(true);

    const start = performance.now();
    let frameId: number;
    let done = false;

    // Reveal is driven by elapsed wall-clock time, not frame count, so a
    // throttled or backgrounded tab (rAF can drop to ~1fps) still completes
    // on schedule instead of appearing to freeze mid-stream.
    const finish = () => {
      if (done) return;
      done = true;
      setDisplayedText(fullText);
      setIsStreaming(false);
    };

    const tick = (now: number) => {
      if (done) return;
      const progress = Math.min(1, (now - start) / DURATION_MS);
      if (progress >= 1) {
        finish();
        return;
      }
      setDisplayedText(fullText.slice(0, Math.floor(fullText.length * progress)));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    // Hard fallback: rAF can be fully suspended in some backgrounded-tab
    // cases, so guarantee completion via a timer that isn't rAF-throttled.
    const safety = setTimeout(finish, DURATION_MS + SAFETY_MARGIN_MS);

    return () => {
      done = true;
      cancelAnimationFrame(frameId);
      clearTimeout(safety);
    };
  }, [fullText]);

  return { displayedText, isStreaming };
}
