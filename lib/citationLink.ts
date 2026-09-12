import type { MouseEvent } from 'react';

export function citationPageUrl(fileUrl: string, page: number): string {
  return `${fileUrl}#page=${Math.max(1, Math.round(page))}`;
}

/** Keep the research workspace in its tab; the PDF always opens separately. */
export function openCitationInNewTab(event: MouseEvent<HTMLAnchorElement>, url: string): void {
  event.preventDefault();
  window.open(url, '_blank', 'noopener,noreferrer');
}
