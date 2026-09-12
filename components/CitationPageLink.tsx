'use client';

import { useEffect, useState } from 'react';
import { citationPageUrl, openCitationInNewTab } from '@/lib/citationLink';
import { IconFile } from './icons';

export function CitationPageLink({ sourceUrl, page }: { sourceUrl: string | null; page: number }) {
  const [showUnavailableReason, setShowUnavailableReason] = useState(false);

  useEffect(() => setShowUnavailableReason(false), [sourceUrl, page]);

  const className = 'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[12px] font-medium text-accent transition-colors hover:border-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
  const label = `Jump to page ${page}`;

  if (sourceUrl) {
    const url = citationPageUrl(sourceUrl, page);
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(event) => openCitationInNewTab(event, url)} className={className}>
        <IconFile className="h-3.5 w-3.5" />
        {label}
      </a>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={() => setShowUnavailableReason(true)} className={className}>
        <IconFile className="h-3.5 w-3.5" />
        {label}
      </button>
      {showUnavailableReason && (
        <p role="status" className="max-w-[280px] font-ui text-[11px] leading-4 text-tertiary">
          The original PDF is not available in this browser. Re-upload it to reopen this cited page.
        </p>
      )}
    </div>
  );
}
