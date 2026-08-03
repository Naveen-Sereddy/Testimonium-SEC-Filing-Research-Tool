import type { RawPage } from './chunk';

export interface FilingMetadata {
  company: string | null;
  fiscalYearEnd: string | null;
}

// SEC cover pages are a standardized form, not free text, so both anchors
// below are boilerplate present on essentially every 10-K, not patterns
// tuned to one filing. If either doesn't match, the field is omitted
// rather than guessed — consistent with refusing over guessing elsewhere
// in this app.
const REGISTRANT_LABEL = /^(.{2,120})\r?\n\s*\(Exact name of registrant as specified in its charter\)/im;
const FISCAL_YEAR_END = /for the fiscal year ended\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;

export function extractFilingMetadata(pages: RawPage[]): FilingMetadata {
  const coverText = pages.slice(0, 3).map((p) => p.text).join('\n');

  const companyMatch = REGISTRANT_LABEL.exec(coverText);
  const company = companyMatch ? companyMatch[1].trim().replace(/\s+/g, ' ') : null;

  const yearMatch = FISCAL_YEAR_END.exec(coverText);
  const fiscalYearEnd = yearMatch ? yearMatch[1].replace(/\s+/g, ' ').trim() : null;

  return { company, fiscalYearEnd };
}
