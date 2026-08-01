'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'testimonium-onboarded';

export function useOnboarding(): { showOnboarding: boolean; complete: () => void; replay: () => void } {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) setShowOnboarding(true);
  }, []);

  const complete = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setShowOnboarding(false);
  };

  const replay = () => setShowOnboarding(true);

  return { showOnboarding, complete, replay };
}
