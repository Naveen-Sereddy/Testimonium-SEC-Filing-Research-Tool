# Testimonium — Design Spec

**Tagline:** Evidence-grade answers from SEC filings.
**Status:** Approved for implementation planning
**Date:** 2026-07-21
**Author:** Naveen Sereddy (solo build)

## 1. Vision

"Editorial Intelligence" — a private research library where an expert
financial-research analyst lives inside the interface. It reads a 10-K,
finds the exact disclosure, answers with page-level citations. Not a
chatbot. A research instrument.

Emotional target: "This is trustworthy. This is precise. This is not
another ChatGPT wrapper."

**Revision (post-engagement):** this section originally described the
project as a solo concept piece, written before the engagement with the
client's research team was underway. It was a real client engagement: a
mid-sized asset manager's equity research team, NDA. Every product,
design, and engineering decision below was still made by one person —
Naveen was the sole designer and engineer on the build itself, with no
other credited teammate on that side. Where the language below reads as
"the PM decided" or "backend confirmed," read that as a role the author
played. But the research — the shadowing, the analyst interviews, the
verification session — was real client work, not a solo hypothesis
exercise. See the case study and README for the confirmed engagement
details.

**Revision (post-launch, round 2):** a second pass after initial launch
changed several things this spec describes as current. The Settings
slide-over (§ Settings panel, § Layout & Navigation below) was replaced
by a static "How this works" modal — Citation Depth moved to a pill row
next to the composer, theme toggle moved to the nav bar, and neither
lives behind a settings menu anymore. The sidebar gained a document-name
header above the nested question list. A persistent right-hand evidence
panel was added on desktop, updated by any citation click. The upload
progress bar was replaced with staged honest status text. Touch targets
were bumped to 44px and a real focus trap was added to the modal. The
README and case study reflect the current, post-round-2 behavior; treat
this document as the historical plan that shipped v1, not the current
architecture.

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

## 4. Success Metrics (targets at spec time — see Revision below for what was actually measured)

- Task completion: user finds a specific disclosure in under 30 seconds, 80% of the time
- Citation accuracy: retrieved excerpt matches intended passage, self-rated (or spot-checked by a real named reviewer if one exists) ≥ 90%
- Trust: post-task "I trust this answer is accurate" ≥ 4.1/5
- Error handling: when the system declines to answer, user understands why and can rephrase

**Revision (post-engagement):** these targets were written before testing.
Actual validation was a closing two-hour verification session with the
client's research team: each analyst uploaded a 10-K from their own
coverage and asked three questions from real recent work. Result: 100%
citation accuracy (every cited page contained the quoted text, zero false
citations), sub-30-second time to first answer on pre-processed
documents, and 2 of 3 observed questions hit full task completion live
(the third needed a follow-up because that filing lacked a narrative
section, which the tool surfaced as a clean error rather than guessing).
Discovery itself (the shadowing, the five analyst interviews that shaped
this spec) predates this metrics section and is not the same as the
closing verification — see the case study for the full discovery
account.

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
- Persistent storage across sessions. **Revision:** a session's chunks now survive across serverless instances via Redis (see section 14), but only for that session's 1-hour TTL — there's still no cross-session history, no accounts, no multi-day persistence.

## 6. Open Questions (resolved before build starts)

1. PDF viewer side-by-side vs. source-drawer-only? → **Resolved:** source drawer only. Keeps the reading column at optimal measure (760px); a side-by-side viewer would fight the 12-column layout at the 1024px breakpoint.
2. Confidence threshold cutoffs? → **Resolved:** High ≥ 0.85 similarity across ≥3 sources, Medium 0.60–0.84, Low < 0.60 or non-overlapping sources. Verbal labels ("Supported" / "Partial" / "Uncertain") shown alongside the gauge, not numeric tiers alone — numeric-only tiers tested vague in review.
3. Max upload file size? → **Resolved:** 20MB at spec time. **Revision:** lowered to 4MB post-launch after confirming Vercel Functions hard-cap request bodies at 4.5MB platform-wide (not configurable) — the original 20MB figure would have 413'd before this app's own check ever ran.

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

**Accent — dark theme:** `#f5b942` base, `#f7c76e` hover, `rgba(245,185,66,0.12)` muted glow, `#1a1400` text-on-accent.

**Accent — light theme (revised, see rationale below):** darker same-hue amber, tuned so it clears 4.5:1 as text and 3:1 as a border/UI element against both `bg-raised` and `bg-overlay` in light mode — see `app/globals.css` for the exact hex value in force, computed and verified against the real WCAG relative-luminance formula rather than fixed here.

**Semantic — dark theme:** success `#4ade80`, error `#f87171`, warning `#fbbf24`, info `#67c7eb`.

**Semantic — light theme (revised):** darker same-hue variants of each, same 4.5:1/3:1 requirement — see `app/globals.css` for exact values.

**Citation highlight:** bg `rgba(245,185,66,0.08)`, border `rgba(245,185,66,0.35)` (unchanged, both themes — used as a background wash, not foreground text/border, so the original amber's low contrast against light surfaces is not a WCAG concern here).

Amber over indigo/purple: indigo is the default AI palette; amber reads
precise and warm without the generic-chatbot association.

**Revision (Task 20 accessibility pass):** the original spec called for
`#f5b942` unchanged in light mode. Measured contrast showed this fails
WCAG AA badly on light surfaces — 1.55:1 as a border/UI element (needs
3:1) and 1.76:1 as text (needs 4.5:1) — because a bright, high-lightness
amber that reads crisply on near-black naturally loses contrast against
near-white. The same problem applies to the semantic colors, which were
tuned for dark surfaces only. Light theme now uses darker, same-hue
variants of accent and each semantic color, tuned to the contrast level
each token's actual usage requires: accent, success, error, and info
meet 4.5:1 (used as text) against both `bg-raised` (white) and
`bg-overlay` (light gray); warning meets 3:1 (used only as a non-text
fill in the confidence meter, not as text) against both — if warning is
ever used as text in a future component, it will need retuning to 4.5:1
first. Dark theme is untouched. This was a deliberate
sign-off, not a silent implementer deviation from the original "unchanged
across themes" instruction — see [[testimonium-a11y-pass]] rationale in
the build ledger.

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
Answer reveal state (2-dot pulse while waiting, then a time-based
progressive reveal once the complete response arrives — see Revision
below, not true token streaming) · Empty state (suggestion chips) · Error
state · Settings slide-over (citation depth control, theme toggle) · Full
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
- Answer reveal: **Revision** — originally spec'd as character-by-character streaming at ~38ms/char. Built that way first, then replaced: `requestAnimationFrame`-driven per-char reveal is fragile under tab throttling (backgrounded tabs can drop to ~1fps), so late-firing frames looked "stuck" for seconds at a time. Rewrote as a time-based reveal — progress computed from elapsed wall-clock time (~550ms total) so a single late frame still jumps to the mathematically correct position, plus an independent `setTimeout` safety net that force-completes regardless. This reveals the complete response Gemini already returned; it is not token-level streaming from the model.
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
  3. Embed via Google Gemini `gemini-embedding-001` (via Gemini's
     OpenAI-compatible API, using the `openai` SDK)
  4. Store chunk text + page/section metadata + embedding vector, keyed
     per upload session.
     **Revision (post-launch):** originally an in-memory array — no
     external vector DB, no native-module dependency. This broke in real
     production use: Vercel runs multiple instances of the same
     function, and a query landing on a different instance than the
     upload found an empty store, silently returning "I don't know"
     regardless of the question. Fixed by moving to Upstash Redis
     (Vercel Marketplace integration), keyed per session with a 1-hour
     TTL, one key per chunk rather than one blob (a full document's
     chunks with embeddings exceed Upstash's 10MB single-request limit
     as one blob; reads and writes are batched in groups of 30 keys for
     the same reason). Still no SQLite/native-module dependency, which
     was always the actual constraint, not "no database at all."
  5. Query → embed → cosine similarity → top-k chunks (k = 3/5/8,
     user-selectable via the Citation Depth setting; nothing is
     threshold-filtered before this point, the threshold only drives the
     confidence label in step 7, not what reaches the model)
  6. Prompt Gemini with chunks + page/section metadata; instructed to
     answer only from context, cite `[N]`, say "I don't know" if
     insufficient. **Revision:** originally pinned to `gemini-2.5-flash`;
     that dated model was retired mid-project and started 404ing, fixed
     by switching to the `gemini-flash-latest` alias specifically so
     future retirements don't take the app down the same way. Tradeoff
     noted, not resolved: a `-latest` alias can also change quality
     silently with no warning — there is no regression eval in place to
     catch that if it happens.
  7. Return answer + source chunks with page numbers. A refusal always
     returns Low confidence and no citations, regardless of how strong
     the underlying retrieval scores were — confidence describes trust in
     an answer, not retrieval geometry.
- **Deployment:** Vercel. `vercel.json` included. One real public SEC
  10-K (from EDGAR, public domain) bundled as the demo document so the
  app works on first load with no setup.
- **Provider note (post-spec revision):** this spec originally called for
  OpenAI (`text-embedding-3-small` + `gpt-4o`); the implementation was
  later swapped to Google Gemini's free tier via Gemini's
  OpenAI-compatible endpoint to avoid a paid API, using the same `openai`
  SDK unchanged — chunking, the in-memory store, retrieval, and the
  citation format below are all unaffected by this swap.

## 15. Artifacts (portfolio deliverables)

All first-person, no invented collaborators, no fabricated meeting
records:

1. **PRD** — problem, users, metrics, scope in/out, open questions
   (resolved), written by the author as the alignment artifact
2. **This design spec** — token system, component/interaction spec,
   architecture
3. **Live prototype** — deployed URL
4. **Retrospective** — what shipped, what didn't work (page-boundary
   chunking, confidence-threshold tuning, three separate production bugs
   found only after real deployment), what's next; metrics reported
   honestly with real sample sizes from the actual closing verification
   session, not estimates

Case-study framing line: "This is a complete design spec and
cross-functional artifact pack I wrote to lead a real client engagement —
PRD, token system, interaction spec, and retrospective, built to align
the client's research team, and myself as the sole designer/engineer,
around one shared source of truth, the same way I'd hand off work on a
larger team."

## 16. Testing

- API smoke test after backend build, before UI work: upload demo PDF,
  send one query, confirm citations return with correct page numbers
- Manual browser pass before shipping: upload flow, the 3 PRD test
  scenarios, dark + light theme, streaming behavior, citation chip →
  drawer, keyboard nav, `prefers-reduced-motion`
- No completion claims without running the above
