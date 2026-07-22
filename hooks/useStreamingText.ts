'use client';

import { useEffect, useState } from 'react';

export function useStreamingText(fullText: string, charsPerTick = 1) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    setDisplayedText('');
    setIsStreaming(true);
    let i = 0;

    const interval = setInterval(() => {
      i += charsPerTick;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 38);

    return () => clearInterval(interval);
  }, [fullText, charsPerTick]);

  return { displayedText, isStreaming };
}
