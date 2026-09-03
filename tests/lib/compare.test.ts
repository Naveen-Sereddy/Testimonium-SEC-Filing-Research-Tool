import { describe, expect, it, beforeEach } from 'vitest';
import { addChunks, resetStore, setSessionDocuments } from '../../lib/store';
import { compareSessionFilings } from '../../lib/compare';

describe('compareSessionFilings', () => {
  const session = 'comparison-test';

  beforeEach(async () => {
    await resetStore(session);
    await setSessionDocuments(session, [
      { id: 'filing-1', fileName: 'annual-2024.pdf', company: 'Example', fiscalYearEnd: 'December 31, 2024', filingYear: 2024, pageCount: 2, indexedSections: ['Risk Factors'] },
      { id: 'filing-2', fileName: 'annual-2025.pdf', company: 'Example', fiscalYearEnd: 'December 31, 2025', filingYear: 2025, pageCount: 2, indexedSections: ['Risk Factors'] },
    ]);
  });

  it('returns added and modified changes with both filing sides', async () => {
    await addChunks(session, [
      { id: 'old-1', text: 'The company faces credit risk from customers.', page: 1, section: 'Risk Factors', embedding: [1, 0], documentId: 'filing-1' },
      { id: 'new-1', text: 'The company faces significant credit risk from customers and partners.', page: 1, section: 'Risk Factors', embedding: [0.99, 0.01], documentId: 'filing-2' },
      { id: 'new-2', text: 'A new cyber incident could interrupt operations.', page: 2, section: 'Risk Factors', embedding: [0, 1], documentId: 'filing-2' },
    ]);
    const result = await compareSessionFilings(session);
    expect(result?.previous.filingYear).toBe(2024);
    expect(result?.current.filingYear).toBe(2025);
    expect(result?.changes.some((change) => change.kind === 'modified' && change.previous && change.current)).toBe(true);
    expect(result?.changes.some((change) => change.kind === 'added' && change.current?.page === 2)).toBe(true);
    expect(result?.changes.find((change) => change.current?.page === 1)?.current?.chunkId).toBe('new-1');
  });

  it('returns null when a session does not contain a filing pair', async () => {
    await resetStore(session);
    await setSessionDocuments(session, [
      { id: 'filing-1', fileName: 'annual-2024.pdf', company: 'Example', fiscalYearEnd: 'December 31, 2024', filingYear: 2024, pageCount: 2, indexedSections: ['Risk Factors'] },
    ]);
    expect(await compareSessionFilings(session)).toBeNull();
  });
});
