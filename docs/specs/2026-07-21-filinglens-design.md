# FilingLens — Design Spec

**Status:** Approved for implementation planning
**Date:** 2026-07-21
**Author:** Naveen Madhav (solo build)

## 1. Vision

"Editorial Intelligence" — a private research library where an expert
financial-research analyst lives inside the interface. It reads a 10-K,
finds the exact disclosure, answers with page-level citations. Not a
chatbot. A research instrument.

Emotional target: "This is trustworthy. This is precise. This is not
another ChatGPT wrapper."

This is a solo-authored concept piece. Every product, design, and
engineering decision below was made by one person. Where the language
below reads as "the PM decided" or "backend confirmed," read that as a
role the author played, documented as a first-person decision — not a
credited teammate. No named collaborators exist on this project.

## 2. Problem

During earnings season, product managers and analysts need to locate
specific disclosures inside 10-K filings — risk factor language, revenue
segments, compliance statements — but documents run 150–250 pages. Finding
one specific disclosure takes 15–30 minutes of manual skimming; preparing
a brief on three topics can take 3–4 hours.

Existing tools (Bloomberg, AlphaSense, Hebbia, etc.) are built for
research specialists at a price point and complexity level aimed at
enterprise desks. There's no middle ground between "read it yourself" and
an expensive specialist platform. This project doesn't compete with those
— it's a UX artifact demonstrating how citation-grounded trust could be
designed into a research tool, at a scale a solo build can prove out.

## 3. Users

**Primary:** Product managers and analysts who read SEC filings as part
of their job but aren't research specialists. They know what they're
looking for; they don't want to learn a query language.

**Secondary:** Fintech designers/engineers who need to cite accurate
regulatory language when building product copy or compliance docs.

## 4. Success Metrics (targets — report actual results honestly after testing, [tbd] until measured)

- Task completion: user finds a specific disclosure in under 30 seconds, 80% of the time
- Citation accuracy: retrieved excerpt matches intended passage, self-rated (or spot-checked by a real named reviewer if one exists) ≥ 90%
- Trust: post-task "I trust this answer is accurate" ≥ 4.1/5 (informal, n=1-3 self/friend testers — state sample size honestly, never dressed up as a formal study)
- Error handling: when the system declines to answer, user understands why and can rephrase

## 5. Scope

**In — v1**
- PDF upload: drag-drop, click-browse, Ctrl+V paste
- Retrieval from narrative sections only: MD&A, Risk Factors, Legal Proceedings
- Query → answer with numbered inline citations [1] [2]
- Source drawer: exact excerpt + page number + section heading
- Confidence meter per answer, in the answer header (not settings)
- Dark + light theme toggle
- "I don't know" fallback when context is insufficient

**Out — v1 (deliberate, stated as design decisions not gaps)**
- Financial tables (income statements, balance sheets). Hypothesis under test is retrieval speed on prose, not structured/tabular data. Flagged explicitly in the UI copy and case study — not a silent gap.
- Cross-filing comparison. Single-document mode keeps citation precision tight.
- Non-SEC document formats. Chunking/section-detection tuned to 10-K structure.
- Browser extension / SEC.gov live integration.
- Persistent storage across sessions. Demo PDF re-embeds fresh per cold start.

## 6. Open Questions (resolved before build starts)

1. PDF viewer side-by-side vs. source-drawer-only? → **Resolved:** source drawer only. Keeps the reading column at optimal measure (760px); a side-by-side viewer would fight the 12-column layout at the 1024px breakpoint.
2. Confidence threshold cutoffs? → **Resolved:** High ≥ 0.85 similarity across ≥3 sources, Medium 0.60–0.84, Low < 0.60 or non-overlapping sources. Verbal labels ("Supported" / "Partial" / "Uncertain") shown alongside the gauge, not numeric tiers alone — numeric-only tiers tested vague in review.
3. Max upload file size? → **Resolved:** 20MB (covers the large majority of 10-Ks; exhibit-heavy filings may exceed this, out of scope for v1).

## 7. Typography

Two families only.

| Element | Font | Weight | Size | Line-height |
|---|---|---|---|---|
| Page title | Geist | 600 | 28px | 34px |
| Section label | Geist | 500 | 11px uppercase, 0.08em tracking | 16px |
| Body UI / nav / sidebar | Geist | 400 | 14px | 20px |
| Button text | Geist | 500 | 14px | 20px |
| Input placeholder | Geist | 400, 45% opacity | 15px | 22px |
| Answer body | Source Serif 4 | 400 | 17px | 28px |
| Answer emphasis | Source Serif 4 | 600 | 17px | 28px |
| Citation inline / metadata | Geist Mono | 500 | 12px | 18px |
| Timestamps | Geist | 400 | 11px | 16px |
| Brand wordmark | Geist | 700 | 20px | 24px |

Serif for answers: financial disclosures are dense, long-form, meant to
be read carefully. Serif signals "this requires attention," and the
contrast against sans UI chrome marks the boundary between interface and
document content. Geist for UI: crisp at small sizes, distinct from
Inter-fatigue.

## 8. Color System

Dark-first, CSS variables, swapped via `[data-theme]` on `<html>`.

**Dark (default)**
```
--bg-base: #0c0c0f       --border-default: #272730   --text-primary: #ededed
--bg-raised: #131318     --border-subtle: #1e1e26     --text-secondary: #8b8b94
--bg-overlay: #1a1a22    --border-strong: #3a3a46     --text-tertiary: #5c5c66
--bg-sunken: #0f0f14
--bg-hover: #22222c
```

**Light**
```
--bg-base: #f8f8fa       --border-default: #d8d8e0
--bg-raised: #ffffff     --text-primary: #111118
--bg-overlay: #f0f0f4    --text-secondary: #5c5c66
--bg-hover: #e4e4ea      --text-tertiary: #909098
```

**Accent (both themes):** `#f5b942` base, `#f7c76e` hover, `rgba(245,185,66,0.12)` muted glow, `#1a1400` text-on-accent.

**Semantic:** success `#4ade80`, error `#f87171`, warning `#fbbf24`, info `#67c7eb`.

**Citation highlight:** bg `rgba(245,185,66,0.08)`, border `rgba(245,185,66,0.35)`.

Amber over indigo/purple: indigo is the default AI palette; amber reads
precise and warm without the generic-chatbot association, and carries
into light mode unchanged.

## 9. Layout & Spacing

12-column grid, breakpoints 768px / 1024px. 4px base spacing unit
(tokens: 4/8/12/16/20/24/32/40/48). Reading column max-width 760px.
Sidebar 280px, collapses to 0 below 768px. Radius: sm 6px, md 10px, lg
14px, full 9999px.

## 10. Components (full inventory, states included)

Nav bar · Sidebar (recent sessions, empty state, hover/active states) ·
Document upload zone (idle/drag-over/uploading/success/error states) ·
Document info bar · Chat input (expandable 1–6 lines, focus glow,
toolbar chips) · AI response card · Citation chips (default/hover/click →
source drawer) · Source excerpt block · Copy/Regenerate actions ·
Streaming state (2-dot pulse, character stream ~38ms/char, paragraph
fade-in) · Empty state (suggestion chips) · Error state · Settings
slide-over (model select, citation depth slider, theme toggle) · Full
dark/light theme.

Full state-by-state detail for each component carries over unchanged
from the original interaction spec — reference this doc's predecessor
notes in the implementation plan; no components were cut or altered by
the vertical pivot.

## 11. Motion

Default: `all 180ms cubic-bezier(0.16, 1, 0.3, 1)`.

- Response cards: stagger 60ms, translateY+fade from 8px, 320ms each
- Sidebar items: stagger 30ms, translateX -8px→0, 240ms
- Source drawer: slide up 280ms ease-out, `cubic-bezier(0,0,0.2,1)`, no overshoot
- Settings panel: slide from right, 300ms ease-out
- Citation chip hover: translateY(-1px), 150ms — the one exception to "no transform on hover"
- Streaming: ~38ms/char, paragraph fade-in 120ms ease-out, stop-cursor blinks 600ms then fades
- `prefers-reduced-motion: reduce` disables all of the above globally

No page-level parallax, no spring physics on text, no full-card color
shifts on hover.

## 12. Interaction Spec — Citation Chip → Source Drawer

The signature interaction. Chip: 22px circle, `bg-overlay`,
`border-default`, number in Geist Mono 500 11px, inline immediately after
the referenced text. Click opens the source drawer below that response
card, auto-scrolls to the cited excerpt, dims all other citations to 60%
opacity while open (focus management). Click another chip → drawer
scrolls to that source. Click outside or ESC closes it (200ms ease-out);
ESC returns focus to the chip. Keyboard-navigable, `role="button"`,
`aria-label="Jump to citation N, page P"`.

## 13. Accessibility

WCAG 2.1 AA. 4.5:1 text contrast on raised surfaces, 3:1 on UI
components. Focus indicator: 2px solid accent, 2px offset. Streaming
container: `aria-live="polite"`. File input: PDF MIME only, described.
No icon-only buttons without `aria-label`. Drag-drop zone has a text
alternative. Error cards: `role="alert"`.

## 14. Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind. All
  styling through CSS token variables — no raw color/spacing literals in
  components.
- **RAG pipeline (Next.js API routes):**
  1. Upload → `pdf-parse` extracts text + page metadata
  2. Chunk ~1000 chars, 200-char overlap
  3. Embed via OpenAI `text-embedding-3-small`
  4. Store in an **in-memory array** (chunk text + page/section metadata +
     embedding vector) — no external vector DB, no native-module
     dependency. Re-embeds on cold start since the bundled demo PDF is
     the only persistent doc; this is a stated v1 scope decision, not a
     limitation discovered later.
  5. Query → embed → cosine similarity → top-5 chunks
  6. Prompt model with chunks + page/section metadata; instructed to
     answer only from context, cite `[N]`, say "I don't know" if
     insufficient
  7. Return answer + source chunks with page numbers
- **Deployment:** Vercel. `vercel.json` included. One real public SEC
  10-K (from EDGAR, public domain) bundled as the demo document so the
  app works on first load with no setup.

## 15. Artifacts (portfolio deliverables)

All first-person, no invented collaborators, no fabricated meeting
records:

1. **PRD** — problem, users, metrics, scope in/out, open questions
   (resolved), written by the author as the alignment artifact
2. **This design spec** — token system, component/interaction spec,
   architecture
3. **Live prototype** — deployed URL
4. **Retrospective** — what shipped, what didn't work (page-boundary
   chunking, confidence-threshold tuning), what's next; metrics reported
   honestly with real sample sizes, `[tbd]` until actually measured

Case-study framing line: "This is a complete design spec and
cross-functional artifact pack I wrote to lead a product concept — PRD,
token system, interaction spec, and retrospective, built to align PM,
engineering, and design around one shared source of truth, the same way
I'd hand off work on a real team."

## 16. Testing

- API smoke test after backend build, before UI work: upload demo PDF,
  send one query, confirm citations return with correct page numbers
- Manual browser pass before shipping: upload flow, the 3 PRD test
  scenarios, dark + light theme, streaming behavior, citation chip →
  drawer, keyboard nav, `prefers-reduced-motion`
- No completion claims without running the above
