# Testimonium Implementation Plan

> **Historical note:** this plan was written and executed against the OpenAI API (`OPENAI_API_KEY`, `text-embedding-3-small`, `gpt-4o`). The project was later migrated to Google Gemini's free-tier OpenAI-compatible endpoint (`GEMINI_API_KEY`, `gemini-embedding-001`, `gemini-2.5-flash`) — see `lib/embeddings.ts`/`lib/chat.ts`, `.env.example`, and the design spec's §14 provider note for the current setup. Any `OPENAI_API_KEY`/OpenAI-model references below are historical, not current instructions.


**Goal:** Build and deploy Testimonium — a Next.js RAG app that answers questions about SEC 10-K narrative sections with page-level citations, styled per the approved design spec.

**Architecture:** Next.js 14 App Router + TypeScript. Pure-function RAG core (`lib/`) unit-tested with Vitest, orchestrated by two thin API routes. React components consume design tokens exposed as Tailwind color/font names mapped to CSS variables. In-memory array vector store, no native modules, no external vector DB.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Vitest, `pdf-parse`, `openai` SDK, `pdf-lib` (test fixtures only), Vercel deploy.

## Global Constraints

- Fonts: Geist (UI) + Source Serif 4 (answer body) via `next/font/google`, loaded once in `app/layout.tsx`.
- Colors: exact hex tokens from spec §8, both themes, swapped via `[data-theme]` on `<html>`.
- Spacing: 4px-multiple tokens only (spec §9).
- Radius: sm 6px, md 10px, lg 14px, full 9999px.
- Motion default: `180ms cubic-bezier(0.16, 1, 0.3, 1)`; citation chip hover is the only element using `translateY(-1px)`; all motion disabled under `prefers-reduced-motion: reduce`.
- Vector store: in-memory array, no SQLite/native modules, no external vector DB service (spec §14).
- Scope: retrieval limited to MD&A, Risk Factors, Legal Proceedings sections only; tables and cross-filing comparison are out of scope for v1 (spec §5).
- Max upload size: 20MB.
- Answer generation must cite `[N]` inline and say `"I don't know based on the provided document."` when context is insufficient (spec §14).
- No fabricated collaborators anywhere in code comments, README, or docs — first-person only (spec §2, §15).
- WCAG 2.1 AA: 4.5:1 text contrast on raised surfaces, 3:1 on UI components, 2px accent focus ring at 2px offset, `aria-live="polite"` on streaming container (spec §13).

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `vitest.config.ts`
- Create: `app/layout.tsx` (minimal placeholder, replaced in Task 2)
- Create: `app/page.tsx` (minimal placeholder, replaced in Task 19)

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js app and a runnable `npm run test` Vitest suite. Every later task assumes both commands work.

- [ ] **Step 1: Scaffold Next.js**

```bash
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```
Accept defaults when prompted. This creates `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts`, `.gitignore`.

- [ ] **Step 2: Install RAG + test dependencies**

```bash
npm install openai pdf-parse
npm install -D vitest pdf-lib @vitejs/plugin-react
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 4: Add test script**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify scaffold runs**

Run: `npm run dev` (then Ctrl+C once you see "Ready" in the log)
Expected: server starts on port 3000 with no errors.

Run: `npm run test`
Expected: "No test files found" (no failure — confirms Vitest is wired).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js 14 app with Vitest"
```

---

## Task 2: Design Tokens, Fonts, Tailwind Mapping

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: Tailwind color classes `bg-base`, `bg-raised`, `bg-overlay`, `bg-sunken`, `bg-hover`, `border`, `border-subtle`, `border-strong`, `text-primary`, `text-secondary`, `text-tertiary`, `text-accent`, `bg-accent`, `border-accent`, semantic `text-success` / `text-error` / `text-warning` / `text-info`, font families `font-ui`, `font-serif`, `font-mono`, radii `rounded-sm` (6px) / `rounded-md` (10px) / `rounded-lg` (14px). Every later component task consumes these class names — do not invent new token names.

- [ ] **Step 1: Write globals.css tokens**

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
[data-theme='dark'] {
  --bg-base: #0c0c0f;
  --bg-raised: #131318;
  --bg-overlay: #1a1a22;
  --bg-sunken: #0f0f14;
  --bg-hover: #22222c;

  --border-default: #272730;
  --border-subtle: #1e1e26;
  --border-strong: #3a3a46;

  --text-primary: #ededed;
  --text-secondary: #8b8b94;
  --text-tertiary: #5c5c66;

  --accent-base: #f5b942;
  --accent-hover: #f7c76e;
  --accent-muted: rgba(245, 185, 66, 0.12);
  --accent-text-on-dark: #1a1400;

  --success: #4ade80;
  --error: #f87171;
  --warning: #fbbf24;
  --info: #67c7eb;

  --highlight-bg: rgba(245, 185, 66, 0.08);
  --highlight-border: rgba(245, 185, 66, 0.35);
}

[data-theme='light'] {
  --bg-base: #f8f8fa;
  --bg-raised: #ffffff;
  --bg-overlay: #f0f0f4;
  --bg-sunken: #e8e8ed;
  --bg-hover: #e4e4ea;

  --border-default: #d8d8e0;
  --border-subtle: #d8d8e0;
  --border-strong: #b8b8c4;

  --text-primary: #111118;
  --text-secondary: #5c5c66;
  --text-tertiary: #909098;
}

html {
  background-color: var(--bg-base);
  color-scheme: dark;
}

[data-theme='light'] {
  color-scheme: light;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Map tokens into Tailwind**

Replace `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        raised: 'var(--bg-raised)',
        overlay: 'var(--bg-overlay)',
        sunken: 'var(--bg-sunken)',
        hover: 'var(--bg-hover)',
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent-base)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          on: 'var(--accent-text-on-dark)',
        },
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        highlight: {
          bg: 'var(--highlight-bg)',
          border: 'var(--highlight-border)',
        },
      },
      fontFamily: {
        ui: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
        drawer: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Load fonts and wire theme attribute**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
});

export const metadata: Metadata = {
  title: 'Testimonium — Financial Document Intelligence',
  description: 'Ask questions about SEC 10-K filings and get page-cited answers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${geist.variable} ${geistMono.variable} ${sourceSerif.variable}`}>
      <body className="font-ui text-[14px] leading-[20px]">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify tokens render**

Temporarily set `app/page.tsx` content to:

```tsx
export default function Page() {
  return (
    <main className="min-h-screen bg-base p-8">
      <h1 className="font-ui text-[28px] font-semibold leading-[34px] text-primary">Testimonium</h1>
      <p className="mt-4 font-serif text-[17px] leading-[28px] text-primary">
        Answer body renders in Source Serif 4.
      </p>
    </main>
  );
}
```

Run: `npm run dev`, open `http://localhost:3000`.
Expected: dark background (#0c0c0f), sans-serif heading, visibly different serif paragraph below it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add design token system, font loading, Tailwind token mapping"
```

---

## Task 3: Chunking (`lib/chunk.ts`)

**Files:**
- Create: `lib/chunk.ts`
- Test: `tests/lib/chunk.test.ts`

**Interfaces:**
- Produces: `interface RawPage { pageNumber: number; text: string }`, `interface Chunk { id: string; text: string; page: number }`, `function chunkPages(pages: RawPage[], chunkSize?: number, overlap?: number): Chunk[]`. Task 6 (sections) and Task 11 (rag orchestration) import these exact names.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/chunk.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { chunkPages } from '../../lib/chunk';

describe('chunkPages', () => {
  it('returns one chunk for a page shorter than chunkSize', () => {
    const chunks = chunkPages([{ pageNumber: 1, text: 'short page text' }], 1000, 200);
    expect(chunks).toEqual([{ id: 'chunk-0', text: 'short page text', page: 1 }]);
  });

  it('splits a long page into overlapping chunks with correct step size', () => {
    const text = 'a'.repeat(2500);
    const chunks = chunkPages([{ pageNumber: 1, text }], 1000, 200);
    expect(chunks.length).toBe(3);
    expect(chunks[0].text.length).toBe(1000);
    expect(chunks[1].text.length).toBe(1000);
    expect(chunks[2].text.length).toBe(900);
    // overlap check: last 200 chars of chunk 0 equal first 200 chars of chunk 1
    expect(chunks[0].text.slice(-200)).toBe(chunks[1].text.slice(0, 200));
  });

  it('tags each chunk with its source page number and continues numbering ids across pages', () => {
    const chunks = chunkPages(
      [
        { pageNumber: 1, text: 'a'.repeat(1500) },
        { pageNumber: 2, text: 'b'.repeat(500) },
      ],
      1000,
      200,
    );
    const page1Chunks = chunks.filter((c) => c.page === 1);
    const page2Chunks = chunks.filter((c) => c.page === 2);
    expect(page1Chunks.length).toBe(2);
    expect(page2Chunks.length).toBe(1);
    expect(chunks.map((c) => c.id)).toEqual(['chunk-0', 'chunk-1', 'chunk-2']);
  });

  it('skips whitespace-only trailing slices', () => {
    const chunks = chunkPages([{ pageNumber: 1, text: 'a'.repeat(1000) + '   ' }], 1000, 200);
    expect(chunks.every((c) => c.text.trim().length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- chunk`
Expected: FAIL — `Cannot find module '../../lib/chunk'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/chunk.ts`:

```ts
export interface RawPage {
  pageNumber: number;
  text: string;
}

export interface Chunk {
  id: string;
  text: string;
  page: number;
}

export function chunkPages(pages: RawPage[], chunkSize = 1000, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  let idCounter = 0;

  for (const page of pages) {
    const text = page.text;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end);

      if (slice.trim().length > 0) {
        chunks.push({ id: `chunk-${idCounter++}`, text: slice, page: page.pageNumber });
      }

      if (end === text.length) break;
      start = end - overlap;
    }
  }

  return chunks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- chunk`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/chunk.ts tests/lib/chunk.test.ts
git commit -m "Add page-aware text chunking with overlap"
```

---

## Task 4: Cosine Similarity + Top-K (`lib/similarity.ts`)

**Files:**
- Create: `lib/similarity.ts`
- Test: `tests/lib/similarity.test.ts`

**Interfaces:**
- Produces: `function cosineSimilarity(a: number[], b: number[]): number`, `interface Scored<T> { item: T; score: number }`, `function topK<T>(items: T[], embeddings: number[][], queryEmbedding: number[], k: number): Scored<T>[]`. Task 11 imports `cosineSimilarity` directly (retrieval is inlined there against the store; `topK` is used by its own test to prove the ranking contract).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/similarity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cosineSimilarity, topK } from '../../lib/similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('returns 0 when either vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('topK', () => {
  it('returns the k highest-scoring items sorted descending', () => {
    const items = ['a', 'b', 'c', 'd'];
    const embeddings = [
      [1, 0],
      [0.9, 0.1],
      [0, 1],
      [-1, 0],
    ];
    const query = [1, 0];
    const result = topK(items, embeddings, query, 2);
    expect(result.map((r) => r.item)).toEqual(['a', 'b']);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- similarity`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/similarity.ts`:

```ts
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface Scored<T> {
  item: T;
  score: number;
}

export function topK<T>(items: T[], embeddings: number[][], queryEmbedding: number[], k: number): Scored<T>[] {
  const scored = items.map((item, i) => ({
    item,
    score: cosineSimilarity(embeddings[i], queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- similarity`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/similarity.ts tests/lib/similarity.test.ts
git commit -m "Add cosine similarity and top-k ranking"
```

---

## Task 5: In-Memory Vector Store (`lib/store.ts`)

**Files:**
- Create: `lib/store.ts`
- Test: `tests/lib/store.test.ts`

**Interfaces:**
- Consumes: `Chunk` from `lib/chunk.ts`
- Produces: `interface StoredChunk extends Chunk { section: string; embedding: number[] }`, `function resetStore(): void`, `function addChunks(chunks: StoredChunk[]): void`, `function getAllChunks(): StoredChunk[]`. Task 11 (`rag.ts`) is the only consumer.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, addChunks, getAllChunks, StoredChunk } from '../../lib/store';

const sample: StoredChunk = {
  id: 'chunk-0',
  text: 'sample text',
  page: 1,
  section: 'Risk Factors',
  embedding: [0.1, 0.2, 0.3],
};

describe('store', () => {
  beforeEach(() => resetStore());

  it('starts empty', () => {
    expect(getAllChunks()).toEqual([]);
  });

  it('accumulates chunks across multiple addChunks calls', () => {
    addChunks([sample]);
    addChunks([{ ...sample, id: 'chunk-1' }]);
    expect(getAllChunks().length).toBe(2);
  });

  it('resetStore clears all chunks', () => {
    addChunks([sample]);
    resetStore();
    expect(getAllChunks()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- store`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/store.ts`:

```ts
import type { Chunk } from './chunk';

export interface StoredChunk extends Chunk {
  section: string;
  embedding: number[];
}

let store: StoredChunk[] = [];

export function resetStore(): void {
  store = [];
}

export function addChunks(chunks: StoredChunk[]): void {
  store.push(...chunks);
}

export function getAllChunks(): StoredChunk[] {
  return store;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- store`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/store.ts tests/lib/store.test.ts
git commit -m "Add in-memory vector store (no native deps, no external DB)"
```

---

## Task 6: Section Detection & Filtering (`lib/sections.ts`)

**Files:**
- Create: `lib/sections.ts`
- Test: `tests/lib/sections.test.ts`

**Interfaces:**
- Consumes: `RawPage`, `Chunk` from `lib/chunk.ts`; `StoredChunk` shape (minus `embedding`) from `lib/store.ts`
- Produces: `const ALLOWED_SECTIONS: string[]`, `function sectionsForPages(pages: RawPage[]): Map<number, string>`, `function tagAndFilterChunks(chunks: Chunk[], sectionMap: Map<number, string>): Array<Chunk & { section: string }>`. Task 11 imports all three.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sectionsForPages, tagAndFilterChunks, ALLOWED_SECTIONS } from '../../lib/sections';
import type { RawPage, Chunk } from '../../lib/chunk';

describe('sectionsForPages', () => {
  it('tags pages before any heading as Unknown', () => {
    const pages: RawPage[] = [{ pageNumber: 1, text: 'Cover page, no headings here.' }];
    const map = sectionsForPages(pages);
    expect(map.get(1)).toBe('Unknown');
  });

  it('detects Risk Factors, Legal Proceedings, and MD&A headings', () => {
    const pages: RawPage[] = [
      { pageNumber: 1, text: 'Item 1A. Risk Factors\nOur exposure to credit risk...' },
      { pageNumber: 2, text: 'Continued risk discussion...' },
      { pageNumber: 3, text: "Item 7. Management's Discussion and Analysis\nRevenue grew..." },
      { pageNumber: 4, text: 'Item 3. Legal Proceedings\nWe are subject to claims...' },
    ];
    const map = sectionsForPages(pages);
    expect(map.get(1)).toBe('Risk Factors');
    expect(map.get(2)).toBe('Risk Factors');
    expect(map.get(3)).toBe('MD&A');
    expect(map.get(4)).toBe('Legal Proceedings');
  });
});

describe('tagAndFilterChunks', () => {
  it('drops chunks whose page section is not in ALLOWED_SECTIONS', () => {
    const chunks: Chunk[] = [
      { id: 'chunk-0', text: 'cover page text', page: 1 },
      { id: 'chunk-1', text: 'risk factor text', page: 2 },
    ];
    const sectionMap = new Map([
      [1, 'Unknown'],
      [2, 'Risk Factors'],
    ]);
    const result = tagAndFilterChunks(chunks, sectionMap);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ id: 'chunk-1', text: 'risk factor text', page: 2, section: 'Risk Factors' });
  });

  it('exposes the allowed section list used by the filter', () => {
    expect(ALLOWED_SECTIONS).toEqual(['Risk Factors', 'Legal Proceedings', 'MD&A']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- sections`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/sections.ts`:

```ts
import type { RawPage, Chunk } from './chunk';

export const ALLOWED_SECTIONS = ['Risk Factors', 'Legal Proceedings', 'MD&A'] as const;

const SECTION_PATTERNS: Array<[RegExp, string]> = [
  [/item\s*1a\.?\s*risk factors/i, 'Risk Factors'],
  [/item\s*3\.?\s*legal proceedings/i, 'Legal Proceedings'],
  [/item\s*7\.?\s*management.?s discussion/i, 'MD&A'],
];

export function sectionsForPages(pages: RawPage[]): Map<number, string> {
  const map = new Map<number, string>();
  let current = 'Unknown';

  for (const page of pages) {
    for (const [pattern, label] of SECTION_PATTERNS) {
      if (pattern.test(page.text)) {
        current = label;
        break;
      }
    }
    map.set(page.pageNumber, current);
  }

  return map;
}

export function tagAndFilterChunks(
  chunks: Chunk[],
  sectionMap: Map<number, string>,
): Array<Chunk & { section: string }> {
  return chunks
    .map((chunk) => ({ ...chunk, section: sectionMap.get(chunk.page) ?? 'Unknown' }))
    .filter((chunk) => (ALLOWED_SECTIONS as readonly string[]).includes(chunk.section));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- sections`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/sections.ts tests/lib/sections.test.ts
git commit -m "Add narrative-section detection and chunk filtering"
```

---

## Task 7: PDF Page Extraction (`lib/pdf.ts`)

**Files:**
- Create: `lib/pdf.ts`
- Test: `tests/lib/pdf.test.ts` (generates its own fixture PDF with `pdf-lib` — no external file needed)

**Interfaces:**
- Consumes: `RawPage` from `lib/chunk.ts`
- Produces: `function extractPages(buffer: Buffer): Promise<RawPage[]>` with 1-based `pageNumber`. Task 11 imports this.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pdf.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { extractPages } from '../../lib/pdf';

const fixturePath = path.join(__dirname, 'fixtures', 'sample.pdf');

beforeAll(async () => {
  mkdirSync(path.dirname(fixturePath), { recursive: true });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page1 = doc.addPage([600, 800]);
  page1.drawText('Item 1A. Risk Factors', { x: 50, y: 750, size: 14, font });
  page1.drawText('Our exposure to consumer credit risk is significant.', { x: 50, y: 700, size: 12, font });

  const page2 = doc.addPage([600, 800]);
  page2.drawText('Item 3. Legal Proceedings', { x: 50, y: 750, size: 14, font });
  page2.drawText('We are subject to various claims in the ordinary course of business.', {
    x: 50,
    y: 700,
    size: 12,
    font,
  });

  const bytes = await doc.save();
  writeFileSync(fixturePath, bytes);
});

describe('extractPages', () => {
  it('returns one RawPage per PDF page with 1-based numbering and correct text', async () => {
    const buffer = readFileSync(fixturePath);
    const pages = await extractPages(buffer);
    expect(pages.length).toBe(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].text).toContain('Risk Factors');
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[1].text).toContain('Legal Proceedings');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- pdf`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/pdf.ts`:

```ts
import pdfParse from 'pdf-parse';
import type { RawPage } from './chunk';

export async function extractPages(buffer: Buffer): Promise<RawPage[]> {
  const pages: RawPage[] = [];

  await pdfParse(buffer, {
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pages.push({ pageNumber: pages.length + 1, text });
      return text;
    },
  });

  return pages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- pdf`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/pdf.ts tests/lib/pdf.test.ts
git commit -m "Add page-aware PDF text extraction"
```

---

## Task 8: OpenAI Embeddings Client (`lib/embeddings.ts`)

**Files:**
- Create: `lib/embeddings.ts`
- Test: `tests/lib/embeddings.test.ts` (mocks the `openai` package)
- Create: `.env.example`

**Interfaces:**
- Produces: `function embedTexts(texts: string[]): Promise<number[][]>`. Task 11 imports this for both document chunks and queries.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/embeddings.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: createMock };
  },
}));

import { embedTexts } from '../../lib/embeddings';

describe('embedTexts', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('calls the embeddings API with text-embedding-3-small and returns the embedding vectors in order', async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2] },
        { embedding: [0.3, 0.4] },
      ],
    });

    const result = await embedTexts(['first chunk', 'second chunk']);

    expect(createMock).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['first chunk', 'second chunk'],
    });
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- embeddings`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/embeddings.ts`:

```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}
```

Create `.env.example`:

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- embeddings`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/embeddings.ts tests/lib/embeddings.test.ts .env.example
git commit -m "Add OpenAI embeddings client"
```

---

## Task 9: Chat Completion + Prompt Builder (`lib/chat.ts`)

**Files:**
- Create: `lib/chat.ts`
- Test: `tests/lib/chat.test.ts` (mocks the `openai` package)

**Interfaces:**
- Produces: `interface ContextChunk { index: number; text: string; page: number; section: string }`, `function buildPrompt(question: string, context: ContextChunk[]): string`, `function askModel(question: string, context: ContextChunk[]): Promise<string>`. Task 11 imports all three.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/chat.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPrompt } from '../../lib/chat';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

describe('buildPrompt', () => {
  it('includes numbered context blocks with page/section metadata and the citation instruction', () => {
    const prompt = buildPrompt('What is our credit risk exposure?', [
      { index: 1, text: 'Exposure to consumer credit risk is significant.', page: 12, section: 'Risk Factors' },
    ]);
    expect(prompt).toContain('[1] (Page 12, Risk Factors)');
    expect(prompt).toContain('Exposure to consumer credit risk is significant.');
    expect(prompt).toContain('Cite sources inline as [N]');
    expect(prompt).toContain("I don't know based on the provided document.");
    expect(prompt).toContain('What is our credit risk exposure?');
  });
});

describe('askModel', () => {
  beforeEach(() => createMock.mockReset());

  it('sends the built prompt to gpt-4o and returns the response content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'Answer with citation [1].' } }],
    });
    const { askModel } = await import('../../lib/chat');
    const result = await askModel('question', [{ index: 1, text: 'ctx', page: 1, section: 'Risk Factors' }]);
    expect(result).toBe('Answer with citation [1].');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o', temperature: 0.2 }),
    );
  });

  it('falls back to the "I don\'t know" string if the API returns no content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const { askModel } = await import('../../lib/chat');
    const result = await askModel('question', []);
    expect(result).toBe("I don't know based on the provided document.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- chat`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/chat.ts`:

```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ContextChunk {
  index: number;
  text: string;
  page: number;
  section: string;
}

const FALLBACK = "I don't know based on the provided document.";

export function buildPrompt(question: string, context: ContextChunk[]): string {
  const contextBlock = context.map((c) => `[${c.index}] (Page ${c.page}, ${c.section})\n${c.text}`).join('\n\n');

  return [
    'Answer the question using only the context below. Cite sources inline as [N] matching the numbered context blocks.',
    `If the context does not contain enough information to answer, respond exactly: "${FALLBACK}"`,
    '',
    `Context:\n${contextBlock}`,
    '',
    `Question: ${question}`,
  ].join('\n');
}

export async function askModel(question: string, context: ContextChunk[]): Promise<string> {
  const prompt = buildPrompt(question, context);
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? FALLBACK;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- chat`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/chat.ts tests/lib/chat.test.ts
git commit -m "Add prompt builder and chat completion with citation instruction"
```

---

## Task 10: RAG Orchestration (`lib/rag.ts`)

**Files:**
- Create: `lib/rag.ts`
- Test: `tests/lib/rag.test.ts` (mocks `lib/pdf`, `lib/embeddings`, `lib/chat`; uses real `lib/chunk`, `lib/sections`, `lib/similarity`, `lib/store`)

**Interfaces:**
- Consumes: `extractPages` (Task 7), `chunkPages` (Task 3), `sectionsForPages`/`tagAndFilterChunks` (Task 6), `embedTexts` (Task 8), `askModel`/`ContextChunk` (Task 9), `cosineSimilarity` (Task 4), `resetStore`/`addChunks`/`getAllChunks`/`StoredChunk` (Task 5)
- Produces: `class NoNarrativeSectionsError extends Error`, `interface UploadResult { chunkCount: number; pageCount: number }`, `function processUpload(buffer: Buffer): Promise<UploadResult>`, `interface Citation { id: number; page: number; section: string; excerpt: string }`, `type Confidence = 'High' | 'Medium' | 'Low'`, `interface QueryResult { answer: string; citations: Citation[]; confidence: Confidence }`, `function answerQuestion(question: string, k?: number): Promise<QueryResult>`, `function confidenceLabel(topScores: number[]): Confidence`. Tasks 12 (API routes) and 16 (ResponseCard types) depend on `Citation`, `Confidence`, `QueryResult`, `UploadResult` exactly as named here.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/rag.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetStore } from '../../lib/store';

vi.mock('../../lib/pdf', () => ({
  extractPages: vi.fn(),
}));
vi.mock('../../lib/embeddings', () => ({
  embedTexts: vi.fn(),
}));
vi.mock('../../lib/chat', () => ({
  askModel: vi.fn(),
}));

import { extractPages } from '../../lib/pdf';
import { embedTexts } from '../../lib/embeddings';
import { askModel } from '../../lib/chat';
import { processUpload, answerQuestion, confidenceLabel, NoNarrativeSectionsError } from '../../lib/rag';

describe('processUpload', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(extractPages).mockReset();
    vi.mocked(embedTexts).mockReset();
  });

  it('extracts, chunks, filters to narrative sections, embeds, and stores the chunks', async () => {
    vi.mocked(extractPages).mockResolvedValue([
      { pageNumber: 1, text: 'Item 1A. Risk Factors\n' + 'a'.repeat(50) },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]]);

    const result = await processUpload(Buffer.from('fake-pdf-bytes'));

    expect(result.pageCount).toBe(1);
    expect(result.chunkCount).toBe(1);
    expect(embedTexts).toHaveBeenCalled();
  });

  it('throws NoNarrativeSectionsError when no allowed section is detected', async () => {
    vi.mocked(extractPages).mockResolvedValue([{ pageNumber: 1, text: 'Cover page only.' }]);
    await expect(processUpload(Buffer.from('fake'))).rejects.toThrow(NoNarrativeSectionsError);
  });
});

describe('confidenceLabel', () => {
  it('returns High when at least 3 scores are >= 0.85', () => {
    expect(confidenceLabel([0.9, 0.88, 0.86, 0.5])).toBe('High');
  });

  it('returns Medium when top score is between 0.60 and 0.85 without 3 strong matches', () => {
    expect(confidenceLabel([0.7, 0.5])).toBe('Medium');
  });

  it('returns Low when top score is below 0.60', () => {
    expect(confidenceLabel([0.4, 0.2])).toBe('Low');
  });

  it('returns Low for an empty score list', () => {
    expect(confidenceLabel([])).toBe('Low');
  });
});

describe('answerQuestion', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(embedTexts).mockReset();
    vi.mocked(askModel).mockReset();
  });

  it('returns the fallback answer with no citations when the store is empty', async () => {
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]]);
    const result = await answerQuestion('What is our risk?');
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe("I don't know based on the provided document.");
    expect(result.confidence).toBe('Low');
    expect(askModel).not.toHaveBeenCalled();
  });

  it('retrieves top chunks, asks the model, and returns numbered citations with truncated excerpts', async () => {
    const { addChunks } = await import('../../lib/store');
    addChunks([
      {
        id: 'chunk-0',
        text: 'x'.repeat(300),
        page: 12,
        section: 'Risk Factors',
        embedding: [1, 0],
      },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue('Answer citing [1].');

    const result = await answerQuestion('What is our risk?');

    expect(result.answer).toBe('Answer citing [1].');
    expect(result.citations).toEqual([
      { id: 1, page: 12, section: 'Risk Factors', excerpt: 'x'.repeat(200) },
    ]);
    expect(result.confidence).toBe('Medium');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- rag`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `lib/rag.ts`:

```ts
import { extractPages } from './pdf';
import { chunkPages } from './chunk';
import { sectionsForPages, tagAndFilterChunks } from './sections';
import { embedTexts } from './embeddings';
import { askModel, type ContextChunk } from './chat';
import { resetStore, addChunks, getAllChunks } from './store';
import { cosineSimilarity } from './similarity';

export class NoNarrativeSectionsError extends Error {}

export interface UploadResult {
  chunkCount: number;
  pageCount: number;
}

export async function processUpload(buffer: Buffer): Promise<UploadResult> {
  const pages = await extractPages(buffer);
  const sectionMap = sectionsForPages(pages);
  const rawChunks = chunkPages(pages, 1000, 200);
  const filtered = tagAndFilterChunks(rawChunks, sectionMap);

  if (filtered.length === 0) {
    throw new NoNarrativeSectionsError('No narrative sections detected in this document');
  }

  const embeddings = await embedTexts(filtered.map((c) => c.text));
  resetStore();
  addChunks(filtered.map((c, i) => ({ ...c, embedding: embeddings[i] })));

  return { chunkCount: filtered.length, pageCount: pages.length };
}

export interface Citation {
  id: number;
  page: number;
  section: string;
  excerpt: string;
}

export type Confidence = 'High' | 'Medium' | 'Low';

export interface QueryResult {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
}

const FALLBACK = "I don't know based on the provided document.";
const HIGH_THRESHOLD = 0.85;
const MEDIUM_THRESHOLD = 0.6;
const HIGH_MIN_COUNT = 3;

export function confidenceLabel(topScores: number[]): Confidence {
  const strongCount = topScores.filter((s) => s >= HIGH_THRESHOLD).length;
  if (strongCount >= HIGH_MIN_COUNT) return 'High';
  if ((topScores[0] ?? 0) >= MEDIUM_THRESHOLD) return 'Medium';
  return 'Low';
}

export async function answerQuestion(question: string, k = 5): Promise<QueryResult> {
  const all = getAllChunks();

  if (all.length === 0) {
    return { answer: FALLBACK, citations: [], confidence: 'Low' };
  }

  const [queryEmbedding] = await embedTexts([question]);
  const scored = all
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const context: ContextChunk[] = scored.map((s, i) => ({
    index: i + 1,
    text: s.chunk.text,
    page: s.chunk.page,
    section: s.chunk.section,
  }));

  const answer = await askModel(question, context);

  const citations: Citation[] = context.map((c) => ({
    id: c.index,
    page: c.page,
    section: c.section,
    excerpt: c.text.slice(0, 200),
  }));

  return { answer, citations, confidence: confidenceLabel(scored.map((s) => s.score)) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- rag`
Expected: PASS (8 tests)

Run: `npm run test`
Expected: all suites across Tasks 3–10 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/rag.ts tests/lib/rag.test.ts
git commit -m "Add RAG orchestration: upload pipeline, retrieval, confidence scoring"
```

---

## Task 11: API Routes

**Files:**
- Create: `app/api/upload/route.ts`
- Create: `app/api/query/route.ts`

**Interfaces:**
- Consumes: `processUpload`, `answerQuestion`, `NoNarrativeSectionsError` from `lib/rag.ts` (Task 10)
- Produces: `POST /api/upload` accepting `multipart/form-data` with field `file`, returning `{ chunkCount, pageCount }` or `{ error }`; `POST /api/query` accepting JSON `{ question: string }`, returning `QueryResult` or `{ error }`. Task 19 (page orchestration) calls both by URL.

These routes are thin wrappers around already-unit-tested logic — verified by manual smoke test per spec §16, not a separate automated suite.

- [ ] **Step 1: Write the upload route**

Create `app/api/upload/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { processUpload, NoNarrativeSectionsError } from '@/lib/rag';

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await processUpload(buffer);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoNarrativeSectionsError) {
      return NextResponse.json(
        { error: 'No narrative sections (MD&A, Risk Factors, Legal Proceedings) detected in this document' },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the query route**

Create `app/api/query/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/rag';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const result = await answerQuestion(question);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Source a real demo 10-K PDF (manual, one-time)**

This is a manual sourcing step, not code — do not fabricate or guess a URL. Go to SEC EDGAR full-text search (`https://www.sec.gov/cgi-bin/browse-edgar` or `https://efts.sec.gov/LATEST/search-index?q=...`), find any real company's 10-K filing under 20MB, and save it as `public/demo/sample-10k.pdf`. Confirm it contains real "Item 1A. Risk Factors", "Item 3. Legal Proceedings", and "Item 7. Management's Discussion and Analysis" headings (required for Task 6's section detection to work on it).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@public/demo/sample-10k.pdf"
```
Expected: JSON response with `chunkCount` > 0 and `pageCount` > 0.

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the main risk factors?"}'
```
Expected: JSON response with a non-empty `answer` string, a `citations` array with `page`/`section`/`excerpt` fields, and a `confidence` of `High`, `Medium`, or `Low`.

Do not proceed to Task 12 until both smoke tests return the expected shape — this is the checkpoint that catches a broken backend before 12 UI components get built against it.

- [ ] **Step 5: Commit**

```bash
git add app/api public/demo
git commit -m "Add upload and query API routes, bundle demo 10-K"
```

---

## Task 12: Theme System

**Files:**
- Create: `hooks/useTheme.ts`
- Create: `components/ThemeToggle.tsx`

**Interfaces:**
- Produces: `function useTheme(): { theme: 'dark' | 'light'; toggleTheme: () => void }`, `function ThemeToggle(): JSX.Element`. Task 17 (SettingsPanel) and Task 19 (page.tsx) consume `useTheme`.

- [ ] **Step 1: Write the theme hook**

Create `hooks/useTheme.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'testimonium-theme';

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
```

- [ ] **Step 2: Write the toggle component**

Create `components/ThemeToggle.tsx`:

```tsx
'use client';

import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="rounded-full border border-border bg-overlay px-3 py-1.5 font-ui text-[13px] text-secondary transition-colors duration-[180ms] ease-standard hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
```

- [ ] **Step 3: Manual verification**

Add `<ThemeToggle />` temporarily to `app/page.tsx`, run `npm run dev`, click it.
Expected: background/text colors swap between the dark and light token sets defined in Task 2, and the choice survives a page refresh (localStorage).

- [ ] **Step 4: Commit**

```bash
git add hooks/useTheme.ts components/ThemeToggle.tsx
git commit -m "Add theme hook and toggle with localStorage persistence"
```

---

## Task 13: Upload Zone + Document Info Bar

**Files:**
- Create: `components/UploadZone.tsx`
- Create: `components/DocumentInfoBar.tsx`

**Interfaces:**
- Produces: `interface UploadZoneProps { status: 'idle' | 'dragover' | 'uploading' | 'success' | 'error'; errorMessage?: string; onFileSelected: (file: File) => void; onRetry?: () => void }`, `function UploadZone(props: UploadZoneProps): JSX.Element`; `interface DocumentInfoBarProps { fileName: string; pageCount: number; chunkCount: number; onRemove: () => void }`, `function DocumentInfoBar(props: DocumentInfoBarProps): JSX.Element`. Task 19 owns the `status` state machine and passes it down.

- [ ] **Step 1: Write UploadZone**

Create `components/UploadZone.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';

export interface UploadZoneProps {
  status: 'idle' | 'dragover' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  onFileSelected: (file: File) => void;
  onRetry?: () => void;
}

export function UploadZone({ status, errorMessage, onFileSelected, onRetry }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const borderClass = isDragOver ? 'border-accent bg-accent-muted' : 'border-border';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF by dropping a file here or using the file picker"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelected(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed ${borderClass} p-12 text-center transition-colors duration-200`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-describedby="upload-help"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />

      {status === 'uploading' && (
        <div className="h-0.5 w-full max-w-xs overflow-hidden rounded-full bg-hover">
          <div className="h-full w-2/3 animate-pulse bg-accent transition-all duration-300" />
        </div>
      )}

      {status === 'success' ? (
        <p className="font-ui text-[15px] text-success">Upload complete.</p>
      ) : status === 'error' ? (
        <p role="alert" className="font-ui text-[14px] text-error">
          Upload failed.{' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="underline"
          >
            Retry
          </button>
          {errorMessage ? <span className="block text-tertiary">{errorMessage}</span> : null}
        </p>
      ) : (
        <>
          <p className="font-ui text-[15px] leading-[22px] text-secondary">Drop a PDF here, or click to browse</p>
          <p id="upload-help" className="font-ui text-[12px] text-tertiary">
            Supports PDF up to 20MB
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write DocumentInfoBar**

Create `components/DocumentInfoBar.tsx`:

```tsx
export interface DocumentInfoBarProps {
  fileName: string;
  pageCount: number;
  chunkCount: number;
  onRemove: () => void;
}

export function DocumentInfoBar({ fileName, pageCount, chunkCount, onRemove }: DocumentInfoBarProps) {
  const approxTokens = Math.round((chunkCount * 1000) / 4 / 1000);

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-overlay px-4 py-3">
      <p className="font-ui text-[13px] text-secondary">
        {fileName} — {pageCount} pages · ~{approxTokens}K tokens
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${fileName}`}
        className="font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-error"
      >
        Remove
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Mount both in a scratch route or `app/page.tsx`, run `npm run dev`. Drag a non-PDF file over the zone: border turns accent-colored. Click to open the file picker.
Expected: visual states match idle/dragover/error described above; keyboard `Enter` on the focused upload zone opens the file picker.

- [ ] **Step 4: Commit**

```bash
git add components/UploadZone.tsx components/DocumentInfoBar.tsx
git commit -m "Add upload zone and document info bar components"
```

---

## Task 14: Chat Input + Empty State

**Files:**
- Create: `components/ChatInput.tsx`
- Create: `components/EmptyState.tsx`

**Interfaces:**
- Produces: `interface ChatInputProps { onSubmit: (question: string) => void; disabled?: boolean; value: string; onChange: (value: string) => void }`, `function ChatInput(props: ChatInputProps): JSX.Element`; `interface EmptyStateProps { onSuggestionClick: (text: string) => void }`, `function EmptyState(props: EmptyStateProps): JSX.Element`. Task 19 owns the input's `value` and wires `onSuggestionClick` to fill it.

- [ ] **Step 1: Write ChatInput**

Create `components/ChatInput.tsx`:

```tsx
'use client';

import { useRef } from 'react';

export interface ChatInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function ChatInput({ onSubmit, disabled, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
      onChange('');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] items-end gap-2 rounded-lg border border-border bg-overlay p-3 transition-shadow duration-[180ms] ease-standard focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-muted)]">
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 6 * 22)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask anything about your document…"
        rows={1}
        aria-label="Ask a question about your document"
        className="max-h-[132px] flex-1 resize-none bg-transparent font-ui text-[15px] leading-[22px] text-primary placeholder:text-tertiary placeholder:opacity-45 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send question"
        className="rounded-full bg-accent px-4 py-2 font-ui text-[14px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write EmptyState**

Create `components/EmptyState.tsx`:

```tsx
const SUGGESTIONS = ['Summarize key findings', 'What are the main policies?', 'Extract action items'];

export interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="font-ui text-[18px] font-medium text-primary">What do you want to know?</h2>
      <p className="max-w-[420px] font-ui text-[14px] leading-[22px] text-secondary">
        Ask a question about your document. I&apos;ll find the most relevant passages and answer with citations.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestionClick(s)}
            className="rounded-full border border-border bg-hover px-3 py-1.5 font-ui text-[13px] text-secondary transition-colors duration-150 hover:border-border-strong"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Mount both, run `npm run dev`. Type in the textarea past one line: it grows up to 6 lines then scrolls. Press Enter: submits and clears. Shift+Enter: inserts a newline instead of submitting. Click a suggestion chip: confirm the callback fires (log it temporarily).

- [ ] **Step 4: Commit**

```bash
git add components/ChatInput.tsx components/EmptyState.tsx
git commit -m "Add chat input and empty state with suggestion chips"
```

---

## Task 15: Citation Chip + Source Drawer + Confidence Meter

**Files:**
- Create: `components/CitationChip.tsx`
- Create: `components/SourceDrawer.tsx`
- Create: `components/ConfidenceMeter.tsx`

**Interfaces:**
- Consumes: `Citation`, `Confidence` types from `lib/rag.ts` (Task 10)
- Produces: `interface CitationChipProps { citation: Citation; isActive: boolean; isDimmed: boolean; onClick: () => void }`, `function CitationChip(props: CitationChipProps): JSX.Element`; `interface SourceDrawerProps { citation: Citation; onClose: () => void }`, `function SourceDrawer(props: SourceDrawerProps): JSX.Element`; `interface ConfidenceMeterProps { confidence: Confidence }`, `function ConfidenceMeter(props: ConfidenceMeterProps): JSX.Element`. Task 16 (ResponseCard) composes all three.

- [ ] **Step 1: Write CitationChip**

Create `components/CitationChip.tsx`:

```tsx
import type { Citation } from '@/lib/rag';

export interface CitationChipProps {
  citation: Citation;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export function CitationChip({ citation, isActive, isDimmed, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="button"
      aria-label={`Jump to citation ${citation.id}, page ${citation.page}`}
      aria-pressed={isActive}
      className={[
        'inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-mono text-[11px] font-medium transition-all duration-150 ease-standard hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        isActive
          ? 'border-accent bg-accent-muted text-primary'
          : 'border-border bg-overlay text-secondary hover:border-accent hover:bg-accent-muted',
        isDimmed && !isActive ? 'opacity-60' : '',
      ].join(' ')}
    >
      {citation.id}
    </button>
  );
}
```

- [ ] **Step 2: Write SourceDrawer**

Create `components/SourceDrawer.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { Citation } from '@/lib/rag';

export interface SourceDrawerProps {
  citation: Citation;
  onClose: () => void;
}

export function SourceDrawer({ citation, onClose }: SourceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={drawerRef}
      className="mt-3 animate-[slideUp_280ms_cubic-bezier(0,0,0.2,1)] rounded-md border-l-2 border-accent bg-overlay p-4"
    >
      <p className="font-ui text-[12px] text-secondary">
        Page {citation.page} · {citation.section}
      </p>
      <p className="mt-2 font-serif text-[14px] leading-[22px] text-[#b0b0b8]">{citation.excerpt}</p>
    </div>
  );
}
```

Add the `slideUp` keyframe to `app/globals.css` (append at end of file):

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 3: Write ConfidenceMeter**

Create `components/ConfidenceMeter.tsx`:

```tsx
import type { Confidence } from '@/lib/rag';

export interface ConfidenceMeterProps {
  confidence: Confidence;
}

const CONFIDENCE_STYLES: Record<Confidence, { color: string; width: string; label: string }> = {
  High: { color: 'bg-success', width: 'w-full', label: 'Supported' },
  Medium: { color: 'bg-warning', width: 'w-2/3', label: 'Partial' },
  Low: { color: 'bg-error', width: 'w-1/3', label: 'Uncertain' },
};

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const { color, width, label } = CONFIDENCE_STYLES[confidence];

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-hover">
        <div className={`h-full ${width} ${color} transition-all duration-300`} />
      </div>
      <span className="font-ui text-[11px] text-tertiary">{label}</span>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Mount all three with sample data, run `npm run dev`. Click the chip: drawer slides up. Press ESC: drawer closes and focus returns to the chip (tab order check). Click outside the drawer: it closes. Confirm all three `ConfidenceMeter` states render distinct colors and widths.

- [ ] **Step 5: Commit**

```bash
git add components/CitationChip.tsx components/SourceDrawer.tsx components/ConfidenceMeter.tsx app/globals.css
git commit -m "Add citation chip, source drawer, and confidence meter"
```

---

## Task 16: Streaming Hook + Response Card

**Files:**
- Create: `hooks/useStreamingText.ts`
- Create: `components/ResponseCard.tsx`

**Interfaces:**
- Consumes: `Citation`, `Confidence` from `lib/rag.ts`; `CitationChip`, `SourceDrawer`, `ConfidenceMeter` from Task 15
- Produces: `function useStreamingText(fullText: string, charsPerTick?: number): { displayedText: string; isStreaming: boolean }`; `interface ResponseCardProps { answer: string; citations: Citation[]; confidence: Confidence; timestamp: number; onCopy: () => void; onRegenerate: () => void }`, `function ResponseCard(props: ResponseCardProps): JSX.Element`. Task 19 renders one `ResponseCard` per message.

- [ ] **Step 1: Write the failing test for the citation-parsing helper**

The `[N]` → chip substitution is pure logic worth unit-testing even though the component itself is verified manually.

Create `tests/lib/parseCitations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitAnswerOnCitations } from '../../lib/parseCitations';

describe('splitAnswerOnCitations', () => {
  it('splits text around [N] markers into alternating text and citation-id segments', () => {
    const result = splitAnswerOnCitations('Exposure is significant [1] per the filing [2].');
    expect(result).toEqual([
      { type: 'text', value: 'Exposure is significant ' },
      { type: 'citation', id: 1 },
      { type: 'text', value: ' per the filing ' },
      { type: 'citation', id: 2 },
      { type: 'text', value: '.' },
    ]);
  });

  it('returns a single text segment when there are no citation markers', () => {
    expect(splitAnswerOnCitations('No citations here.')).toEqual([{ type: 'text', value: 'No citations here.' }]);
  });
});
```

Run: `npm run test -- parseCitations`
Expected: FAIL — module not found

- [ ] **Step 2: Implement the helper**

Create `lib/parseCitations.ts`:

```ts
export type AnswerSegment = { type: 'text'; value: string } | { type: 'citation'; id: number };

export function splitAnswerOnCitations(answer: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  const pattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: answer.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'citation', id: Number(match[1]) });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < answer.length) {
    segments.push({ type: 'text', value: answer.slice(lastIndex) });
  }

  return segments;
}
```

Run: `npm run test -- parseCitations`
Expected: PASS (2 tests)

- [ ] **Step 3: Write the streaming hook**

Create `hooks/useStreamingText.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

export function useStreamingText(fullText: string, charsPerTick = 1) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
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
```

- [ ] **Step 4: Write ResponseCard**

Create `components/ResponseCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { Citation, Confidence } from '@/lib/rag';
import { splitAnswerOnCitations } from '@/lib/parseCitations';
import { useStreamingText } from '@/hooks/useStreamingText';
import { CitationChip } from './CitationChip';
import { SourceDrawer } from './SourceDrawer';
import { ConfidenceMeter } from './ConfidenceMeter';

export interface ResponseCardProps {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
  timestamp: number;
  onCopy: () => void;
  onRegenerate: () => void;
}

export function ResponseCard({ answer, citations, confidence, timestamp, onCopy, onRegenerate }: ResponseCardProps) {
  const { displayedText, isStreaming } = useStreamingText(answer);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const segments = splitAnswerOnCitations(displayedText);
  const citationById = new Map(citations.map((c) => [c.id, c]));
  const activeCitation = activeCitationId ? citationById.get(activeCitationId) : undefined;

  const handleCopy = () => {
    navigator.clipboard.writeText(answer.replace(/\[\d+\]/g, '').trim());
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  return (
    <div className="mx-auto w-full max-w-[760px] rounded-md border border-border bg-raised p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1 w-1 animate-pulse rounded-full bg-accent" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-accent [animation-delay:100ms]" />
            </span>
          )}
          <span className="font-ui text-[14px] font-medium text-primary">Answer</span>
        </div>
        <ConfidenceMeter confidence={confidence} />
      </div>

      <p aria-live="polite" className="font-serif text-[17px] leading-[28px] text-primary">
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <span key={i}>{seg.value}</span>
          ) : citationById.has(seg.id) ? (
            <span key={i} className="mx-0.5 inline-block align-super">
              <CitationChip
                citation={citationById.get(seg.id)!}
                isActive={activeCitationId === seg.id}
                isDimmed={activeCitationId !== null && activeCitationId !== seg.id}
                onClick={() => setActiveCitationId(activeCitationId === seg.id ? null : seg.id)}
              />
            </span>
          ) : null,
        )}
      </p>

      {activeCitation && <SourceDrawer citation={activeCitation} onClose={() => setActiveCitationId(null)} />}

      {!isStreaming && (
        <div className="mt-4 flex gap-4">
          <button
            type="button"
            onClick={handleCopy}
            className={`font-ui text-[13px] transition-colors duration-150 ${copied ? 'text-success' : 'text-tertiary hover:text-primary'}`}
          >
            {copied ? 'Copied!' : 'Copy answer'}
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-primary"
          >
            Regenerate
          </button>
          <span className="ml-auto font-ui text-[11px] text-tertiary">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Manual verification**

Mount `ResponseCard` with a sample answer containing `[1]` and `[2]` markers plus matching citations. Run `npm run dev`.
Expected: text streams in at a readable pace, citation chips appear inline at the right spot once their marker streams past, clicking a chip opens the drawer, "Copy answer" flips to "Copied!" for 800ms.

- [ ] **Step 6: Commit**

```bash
git add lib/parseCitations.ts tests/lib/parseCitations.test.ts hooks/useStreamingText.ts components/ResponseCard.tsx
git commit -m "Add streaming hook, citation parsing, and response card"
```

---

## Task 17: Nav Bar, Sidebar, Settings Panel

**Files:**
- Create: `components/NavBar.tsx`
- Create: `components/Sidebar.tsx`
- Create: `components/SettingsPanel.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`, `useTheme` from Task 12
- Produces: `interface NavBarProps { onNewThread: () => void; onOpenSettings: () => void }`; `interface SidebarSession { id: string; question: string; timestamp: number }`, `interface SidebarProps { sessions: SidebarSession[]; activeId: string | null; onSelect: (id: string) => void; onClear: () => void }`; `interface SettingsPanelProps { isOpen: boolean; onClose: () => void; citationDepth: 'brief' | 'standard' | 'detailed'; onCitationDepthChange: (v: 'brief' | 'standard' | 'detailed') => void }`. Task 19 owns `sessions`, `activeId`, and `citationDepth` state.

- [ ] **Step 1: Write NavBar**

Create `components/NavBar.tsx`:

```tsx
import { ThemeToggle } from './ThemeToggle';

export interface NavBarProps {
  onNewThread: () => void;
  onOpenSettings: () => void;
}

export function NavBar({ onNewThread, onOpenSettings }: NavBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-base px-8 py-4">
      <span className="font-ui text-[20px] font-bold text-primary">Testimonium</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNewThread}
          className="rounded-full bg-accent px-4 py-2 font-ui text-[14px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover"
        >
          New Thread
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-full border border-border bg-overlay px-3 py-2 font-ui text-[13px] text-secondary transition-colors duration-150 hover:text-primary"
        >
          Settings
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write Sidebar**

Create `components/Sidebar.tsx`:

```tsx
export interface SidebarSession {
  id: string;
  question: string;
  timestamp: number;
}

export interface SidebarProps {
  sessions: SidebarSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onClear }: SidebarProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-raised p-4 md:flex">
      <p className="mb-3 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Recent</p>

      {sessions.length === 0 ? (
        <p className="font-ui text-[14px] leading-[22px] text-tertiary">
          No conversations yet. Upload a document to start.
        </p>
      ) : (
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-150 ${
                  activeId === s.id ? 'border-accent bg-hover' : 'border-transparent hover:bg-hover'
                }`}
              >
                <p className="truncate font-ui text-[14px] text-primary">{s.question.slice(0, 40)}</p>
                <p className="font-ui text-[11px] text-tertiary">{new Date(s.timestamp).toLocaleTimeString()}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onClear}
        className="mt-3 self-start font-ui text-[13px] text-secondary transition-colors duration-150 hover:text-primary"
      >
        Clear history
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Write SettingsPanel**

Create `components/SettingsPanel.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  citationDepth: 'brief' | 'standard' | 'detailed';
  onCitationDepthChange: (v: 'brief' | 'standard' | 'detailed') => void;
}

export function SettingsPanel({ isOpen, onClose, citationDepth, onCitationDepthChange }: SettingsPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-base/60"
      />
      <div className="absolute right-0 top-0 h-full w-[360px] animate-[slideIn_300ms_ease-out] border-l border-border bg-raised p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-ui text-[16px] font-medium text-primary">Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close settings" className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2 font-ui text-[11px] uppercase tracking-[0.08em] text-secondary">Citation depth</p>
          <div className="flex gap-2">
            {(['brief', 'standard', 'detailed'] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={() => onCitationDepthChange(depth)}
                className={`rounded-full border px-3 py-1.5 font-ui text-[13px] capitalize transition-colors duration-150 ${
                  citationDepth === depth ? 'border-accent bg-accent-muted text-primary' : 'border-border text-secondary'
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </div>

        <p className="font-ui text-[12px] leading-[18px] text-tertiary">
          Citation depth controls how many source passages (3 / 5 / 8) are retrieved per question.
        </p>
      </div>
    </div>
  );
}
```

Add the `slideIn` keyframe to `app/globals.css`:

```css
@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
```

- [ ] **Step 4: Manual verification**

Mount all three, run `npm run dev`. Open settings: panel slides in from the right, overlay dims background, ESC and the ✕ both close it. Change citation depth: selected pill highlights in accent.

- [ ] **Step 5: Commit**

```bash
git add components/NavBar.tsx components/Sidebar.tsx components/SettingsPanel.tsx app/globals.css
git commit -m "Add nav bar, sidebar, and settings panel"
```

---

## Task 18: Error State

**Files:**
- Create: `components/ErrorState.tsx`

**Interfaces:**
- Produces: `interface ErrorStateProps { message: string; onRetry: () => void }`, `function ErrorState(props: ErrorStateProps): JSX.Element`. Task 19 renders this when an upload or query call fails.

- [ ] **Step 1: Write ErrorState**

Create `components/ErrorState.tsx`:

```tsx
export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="mx-auto w-full max-w-[760px] rounded-md border-l-2 border-error bg-overlay p-4">
      <p className="font-ui text-[14px] font-medium text-primary">Something went wrong</p>
      <p className="mt-1 font-ui text-[13px] text-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Mount with a sample message, run `npm run dev`. Confirm the left accent-colored border reads as `--error`, and "Try again" fires the callback.

- [ ] **Step 3: Commit**

```bash
git add components/ErrorState.tsx
git commit -m "Add error state component"
```

---

## Task 19: Page Orchestration

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes every component and hook produced in Tasks 12–18, plus `POST /api/upload` and `POST /api/query` from Task 11.
- Produces: the full working app at `/`. No later task depends on new exports from this file.

- [ ] **Step 1: Write the orchestrating page**

Replace `app/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { Sidebar, type SidebarSession } from '@/components/Sidebar';
import { UploadZone } from '@/components/UploadZone';
import { DocumentInfoBar } from '@/components/DocumentInfoBar';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';
import { ResponseCard } from '@/components/ResponseCard';
import { ErrorState } from '@/components/ErrorState';
import { SettingsPanel } from '@/components/SettingsPanel';
import type { QueryResult } from '@/lib/rag';

interface Message extends QueryResult {
  id: string;
  question: string;
  timestamp: number;
}

type DocState =
  | { status: 'idle' }
  | { status: 'dragover' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; fileName: string; pageCount: number; chunkCount: number };

export default function Page() {
  const [docState, setDocState] = useState<DocState>({ status: 'idle' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [citationDepth, setCitationDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');

  const handleFileSelected = async (file: File) => {
    setDocState({ status: 'uploading' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const body = await res.json();

    if (!res.ok) {
      setDocState({ status: 'error', message: body.error ?? 'Upload failed' });
      return;
    }

    setDocState({
      status: 'ready',
      fileName: file.name,
      pageCount: body.pageCount,
      chunkCount: body.chunkCount,
    });
  };

  const runQuery = async (question: string) => {
    setQueryError(null);
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const body = await res.json();

    if (!res.ok) {
      setQueryError(body.error ?? 'Something went wrong');
      return;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      question,
      timestamp: Date.now(),
      ...(body as QueryResult),
    };
    setMessages((prev) => [...prev, message]);
  };

  const sessions: SidebarSession[] = messages.map((m) => ({ id: m.id, question: m.question, timestamp: m.timestamp }));

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        onNewThread={() => {
          setDocState({ status: 'idle' });
          setMessages([]);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1">
        <Sidebar
          sessions={sessions}
          activeId={messages.at(-1)?.id ?? null}
          onSelect={() => {}}
          onClear={() => setMessages([])}
        />

        <main className="flex flex-1 flex-col gap-6 px-8 py-8">
          {docState.status === 'ready' && (
            <DocumentInfoBar
              fileName={docState.fileName}
              pageCount={docState.pageCount}
              chunkCount={docState.chunkCount}
              onRemove={() => setDocState({ status: 'idle' })}
            />
          )}

          {docState.status !== 'ready' && (
            <UploadZone
              status={docState.status === 'idle' ? 'idle' : docState.status === 'uploading' ? 'uploading' : docState.status === 'error' ? 'error' : 'idle'}
              errorMessage={docState.status === 'error' ? docState.message : undefined}
              onFileSelected={handleFileSelected}
              onRetry={() => setDocState({ status: 'idle' })}
            />
          )}

          {docState.status === 'ready' && messages.length === 0 && (
            <EmptyState onSuggestionClick={(text) => setInputValue(text)} />
          )}

          <div className="flex flex-1 flex-col gap-6">
            {messages.map((m) => (
              <ResponseCard
                key={m.id}
                answer={m.answer}
                citations={m.citations}
                confidence={m.confidence}
                timestamp={m.timestamp}
                onCopy={() => {}}
                onRegenerate={() => runQuery(m.question)}
              />
            ))}
          </div>

          {queryError && <ErrorState message={queryError} onRetry={() => setQueryError(null)} />}

          {docState.status === 'ready' && (
            <ChatInput value={inputValue} onChange={setInputValue} onSubmit={runQuery} />
          )}
        </main>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        citationDepth={citationDepth}
        onCitationDepthChange={setCitationDepth}
      />
    </div>
  );
}
```

- [ ] **Step 2: Manual browser verification against the PRD test scenarios**

Run: `npm run dev`, open `http://localhost:3000`.

1. Upload `public/demo/sample-10k.pdf` via click-to-browse. Expected: progress indicator, then `DocumentInfoBar` with correct page/chunk counts, then `EmptyState` with 3 suggestion chips.
2. Click a suggestion chip, then send it. Expected: streaming response, citation chips appear inline, confidence meter shows a color.
3. Ask: "What are the main risk factors?" Expected: cited answer referencing Risk Factors section pages.
4. Click a citation chip. Expected: source drawer opens below the card, other chips dim to 60% opacity, ESC closes it and returns focus to the chip.
5. Toggle theme via nav bar. Expected: all surfaces/text swap per Task 2 tokens, no unstyled flash.
6. Ask a question with no relevant content in the document. Expected: "I don't know based on the provided document." with no citations, Low confidence.
7. Click "New Thread". Expected: returns to the upload zone, messages cleared.

Do not mark this task complete until all 7 pass.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Wire full app: upload, chat, citations, settings, theme"
```

---

## Task 20: Accessibility and Reduced-Motion Pass

**Files:**
- Modify: `app/globals.css` (already has the `prefers-reduced-motion` block from Task 2 — verify it covers the animations added in Tasks 15/17)
- Modify: `components/ResponseCard.tsx`, `components/CitationChip.tsx` (focus-visible rings, already added in Tasks 15/16 — verify)

**Interfaces:** none new; this task verifies contracts already established.

- [ ] **Step 1: Contrast check**

Run: `npm run dev`. Use browser devtools' contrast checker (or `axe DevTools` extension) on `text-secondary` over `bg-raised` in both themes.
Expected: ≥ 4.5:1. If any token combination fails, adjust the failing hex value in `app/globals.css` — do not skip this, the spec (§13) requires it.

- [ ] **Step 2: Reduced-motion check**

In Chrome devtools, Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload the app, trigger streaming and drawer-open.
Expected: no animation — text appears instantly, drawer snaps open instead of sliding.

- [ ] **Step 3: Keyboard-only pass**

Tab through the entire page with no mouse: upload zone, chat input, send button, citation chips, settings gear.
Expected: every interactive element shows the 2px accent focus ring at 2px offset; citation chips are reachable and activate with Enter/Space; ESC from an open source drawer returns focus to the chip that opened it.

- [ ] **Step 4: Screen reader spot check**

With VoiceOver (Cmd+F5 on macOS) or a browser screen-reader extension, submit a question and let the answer stream.
Expected: new content is announced via the `aria-live="polite"` region without interrupting mid-sentence reading elsewhere on the page.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "Fix accessibility issues found in AA pass"
```
(Skip this commit if step 1–4 found nothing to fix.)

---

## Task 21: Deployment Config

**Files:**
- Create: `vercel.json`

**Interfaces:** none — this is deploy configuration, not application code.

- [ ] **Step 1: Write vercel.json**

Create `vercel.json`:

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Set the environment variable in Vercel**

In the Vercel project dashboard → Settings → Environment Variables, add `OPENAI_API_KEY` (same value as your local `.env.local`, which should already exist locally and is gitignored — never commit it).

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```
Follow the prompts to link/create the project. Expected: a live `https://<project>.vercel.app` URL.

- [ ] **Step 4: Verify the live deployment**

Repeat the 7 manual checks from Task 19 Step 2 against the live URL instead of localhost.
Expected: identical behavior — this catches env-var or serverless-runtime issues that don't show up locally (this is exactly why Task 10's in-memory-array decision matters: no native module to fail to compile on Vercel's build).

- [ ] **Step 5: Commit**

```bash
git add vercel.json
git commit -m "Add Vercel deployment config"
```

---

## Task 22: README

**Files:**
- Create: `README.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Write README.md**

Create `README.md` with these sections, filled in with real content once the live URL exists (do not leave any bracketed placeholder unresolved before calling this done):

```markdown
# Testimonium — Financial Document Intelligence

[Case study opening from spec §15 — the "artifact pack" paragraph — first-person, no invented collaborators]

## Live demo
[URL after Task 21]

## Problem
[From spec §2 — real, witnessed at BILL/Fidelity, described generically per the confidentiality guidance already agreed: "in fintech, I've seen..." rather than naming internal employer processes]

## Tech stack
Next.js 14 (App Router), TypeScript, Tailwind CSS, OpenAI (text-embedding-3-small + gpt-4o), pdf-parse, Vitest, Vercel.

## Design decisions
[Serif-for-answers rationale, amber-over-indigo rationale, in-memory-array-over-sql.js rationale, narrative-sections-only scope decision — pull directly from spec §5, §7, §8, §14]

## What I learned
[Fill in honestly after building — this is the one section that cannot be pre-written]

## Live URL
[Same as above, repeated per original ask]
```


- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add README with case study and design rationale"
```

---

## Self-Review Notes

**Spec coverage:** §2 (problem/framing) → Task 22 README. §5 (scope in/out) → Task 6 filters to `ALLOWED_SECTIONS`, Task 11 upload route rejects docs with none. §7–9 (typography/color/spacing) → Task 2. §10–12 (components/motion/interaction) → Tasks 13–18. §13 (accessibility) → Task 20. §14 (architecture, in-memory store) → Tasks 3–11. §15 (artifacts, no fabrication) → Task 22 explicitly re-flags the confidentiality/first-person constraint at the point where it's easiest to violate (writing marketing copy). §16 (testing) → smoke test in Task 11 Step 4, full manual pass in Task 19 Step 2.

**Placeholder scan:** the only bracketed placeholders left are in Task 22's README skeleton, and Step 1 explicitly instructs filling them before considering the task done — that's a real constraint, not an escaped TODO.

**Type consistency:** `Citation`, `Confidence`, `QueryResult`, `UploadResult` are defined once in Task 10 and imported by name (never redefined) in Tasks 11, 15, 16, 19. `Chunk` (Task 3) → `StoredChunk` (Task 5, extends `Chunk`) → consumed as `StoredChunk[]` in Task 10's `getAllChunks()`. Verified no signature drift across tasks.
