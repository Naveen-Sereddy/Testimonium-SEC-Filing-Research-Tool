'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ConfidenceMeter } from './ConfidenceMeter';
import { CitationChip } from './CitationChip';
import { IconFile, IconUpload, IconShield, IconQuote, IconX, IconCheck } from './icons';
import type { Confidence } from '@/lib/rag';

export interface OnboardingProps {
  onComplete: () => void;
  onUpload: () => void;
}

interface Screen {
  icon: (props: { className?: string }) => ReactNode;
  eyebrow: string;
  headline: string;
  body: ReactNode;
  demo?: ReactNode;
}

const DEMO_CITATION = {
  id: 1,
  page: 42,
  section: 'Risk Factors',
  excerpt: 'Compliance with evolving regulatory requirements could materially affect our operating margins in future periods.',
};

function ConfidenceDemo() {
  const [confidence, setConfidence] = useState<Confidence>('High');

  useEffect(() => {
    const order: Confidence[] = ['High', 'Medium', 'Low'];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % order.length;
      setConfidence(order[i]);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-overlay px-5 py-4">
      <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-tertiary">Confidence, before you read the answer</span>
      <ConfidenceMeter confidence={confidence} />
    </div>
  );
}

function CitationDemo() {
  const [active, setActive] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-overlay px-5 py-4 text-left">
      <p className="font-serif text-[15px] leading-[24px] text-primary">
        Regulatory compliance costs are a material risk factor
        <span className="mx-0.5 inline-block align-super">
          <CitationChip citation={DEMO_CITATION} isActive={active} isDimmed={false} onClick={() => setActive((a) => !a)} />
        </span>
        .
      </p>
      {active && (
        <div className="flex flex-col gap-1 border-t border-border pt-3" style={{ animation: 'fadeInUp 200ms ease-standard' }}>
          <span className="font-ui text-[11px] font-medium text-secondary">Page {DEMO_CITATION.page} · {DEMO_CITATION.section}</span>
          <p className="font-serif text-[13px] leading-[20px] text-secondary">{DEMO_CITATION.excerpt}</p>
        </div>
      )}
      <span className="font-ui text-[11px] text-tertiary">{active ? 'Click again to close' : 'Click the citation'}</span>
    </div>
  );
}

const SCREENS: Screen[] = [
  {
    icon: (p) => <IconFile {...p} />,
    eyebrow: 'What Testimonium is',
    headline: 'Evidence-grade answers from SEC filings.',
    body: (
      <>
        <p>Testimonium reads 10-K filings so equity research analysts don&apos;t have to. Ask a question, get an answer grounded in the exact page it came from.</p>
        <p className="mt-3">Not a chatbot — a research instrument. Every claim traces back to the document, not to general knowledge.</p>
      </>
    ),
  },
  {
    icon: (p) => <IconUpload {...p} />,
    eyebrow: 'What to upload',
    headline: 'Built for one document type, on purpose.',
    body: (
      <>
        <p>Upload one 10-K for research, or two annual filings for a year-over-year comparison. The combined upload can be up to 50MB.</p>
        <p className="mt-3">Testimonium indexes MD&amp;A, Risk Factors, Legal Proceedings, and primary financial statements. Other filing types remain outside this release.</p>
      </>
    ),
  },
  {
    icon: (p) => <IconShield {...p} />,
    eyebrow: 'Why trust the answer',
    headline: 'Trust before speed.',
    body: (
      <>
        <p>Every answer is retrieved from the filing you uploaded, never from general knowledge. A confidence badge tells you how well the evidence supports the answer before you read a word of it.</p>
        <p className="mt-3">If the filing doesn&apos;t say enough to answer, Testimonium tells you that instead of guessing.</p>
      </>
    ),
    demo: <ConfidenceDemo />,
  },
  {
    icon: (p) => <IconQuote {...p} />,
    eyebrow: 'How to verify',
    headline: 'Click any citation. See the receipt.',
    body: (
      <p>Every claim carries a numbered citation. Click it for the exact page, section, and excerpt it came from — inline, or in the evidence panel that stays open on desktop while you read.</p>
    ),
    demo: <CitationDemo />,
  },
  {
    icon: (p) => <IconCheck {...p} />,
    eyebrow: 'Next',
    headline: "You're ready.",
    body: <p>Upload a 10-K to get started.</p>,
  },
];

export function Onboarding({ onComplete, onUpload }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const liveRegionRef = useRef<HTMLHeadingElement>(null);

  const isLast = index === SCREENS.length - 1;
  const screen = SCREENS[index];

  const goNext = () => {
    if (isLast) {
      // Keep this inside the button's user activation. Browsers are allowed
      // to block a file-picker click once it crosses an async boundary.
      onUpload();
      onComplete();
      return;
    }
    setIndex((i) => Math.min(i + 1, SCREENS.length - 1));
  };

  const goBack = () => {
    setIndex((i) => Math.max(i - 1, 0));
  };

  const jumpTo = (i: number) => {
    setIndex(i);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goBack();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    liveRegionRef.current?.focus();
  }, [index]);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Introduction, screen ${index + 1} of ${SCREENS.length}`}
    >
      <div
        className="absolute inset-0 bg-base/90 backdrop-blur-sm"
        style={{ animation: 'fadeInUp 320ms ease-standard' }}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className="relative flex w-full max-w-[560px] flex-col rounded-2xl border border-border bg-raised p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:p-8"
        style={{ animation: 'fadeInUp 260ms ease-standard 80ms both' }}
      >
        <button
          type="button"
          onClick={onComplete}
          aria-label="Skip introduction"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-lg text-tertiary transition-colors hover:bg-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconX className="h-4 w-4" />
        </button>

        <div key={index} className="flex flex-col items-center gap-4 pt-2 text-center" style={{ animation: `fadeInUp 220ms ease-standard` }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-accent">
            <screen.icon className="h-5 w-5" />
          </div>

          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-tertiary">
            {index + 1} / {SCREENS.length} · {screen.eyebrow}
          </span>

          <h2 ref={liveRegionRef} tabIndex={-1} aria-live="polite" className="font-ui text-[24px] font-semibold leading-[30px] text-primary outline-none sm:text-[28px] sm:leading-[34px]">
            {screen.headline}
          </h2>

          <div className="max-w-[440px] font-ui text-[15px] leading-[23px] text-secondary">{screen.body}</div>

          {screen.demo && <div className="mt-1 w-full max-w-[420px]">{screen.demo}</div>}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2" role="group" aria-label="Onboarding progress">
            {SCREENS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`Go to screen ${i + 1} of ${SCREENS.length}`}
                aria-pressed={i === index}
                className="group inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-150 ${
                    i === index ? 'w-5 bg-accent' : 'w-2 bg-border-strong group-hover:bg-accent/60'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex min-h-[44px] items-center rounded-lg px-3 font-ui text-[13px] font-medium text-secondary transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-4 font-ui text-[13px] font-medium text-on transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {isLast ? (
                <>
                  <IconUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  Upload a filing
                </>
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
