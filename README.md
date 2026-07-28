# Testimonium

**Evidence-grade answers from SEC filings.**

A research tool for SEC 10-K filings: ask a question, get an answer grounded in the exact page and section it came from. Built solo: problem framing, design system, RAG pipeline, frontend, and this write-up, end to end.

**Live demo:** [testimonium.vercel.app](https://testimonium.vercel.app)
**Repo:** [github.com/Naveen-Sereddy/Testimonium-SEC-Filing-Research-Tool](https://github.com/Naveen-Sereddy/Testimonium-SEC-Filing-Research-Tool)

## The problem

Earnings season creates a recurring bottleneck: product managers and analysts need to locate specific disclosures inside 10-K filings (risk factor language, revenue segments, compliance statements), but the documents run 150–250 pages. Finding one specific disclosure takes 15–30 minutes of manual skimming. In fintech, I've seen this eat hours every earnings season.

Existing tools (Bloomberg, AlphaSense, Hebbia) are built for research desks at an enterprise price point. This isn't an attempt to compete with them. It's a UX artifact demonstrating how citation-grounded trust could be designed into a research tool, at a scale a solo build can actually prove out.

## What it does

- Upload a 10-K PDF (or use the bundled demo filing)
- Ask a question in plain language
- Get a streamed answer with inline numbered citations `[1]` `[2]`
- Click a citation to open a source drawer showing the exact excerpt, page number, and section
- A confidence gauge on every answer signals how well-supported it is
- Retrieval is scoped to narrative sections only (MD&A, Risk Factors, Legal Proceedings), not financial tables. That's a stated v1 scope decision, not a gap: the hypothesis under test is retrieval speed on prose, not structured-data parsing.
- Dark and light themes, full keyboard navigation, WCAG 2.1 AA contrast

## Tech stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS. RAG backend: `pdf-parse` for text extraction, Google Gemini's OpenAI-compatible API (via the `openai` SDK) with `gemini-embedding-001` for embeddings, an in-memory array for the vector store (deliberately not SQLite or an external vector DB, see Design Decisions), `gemini-flash-latest` for answer generation with a citation-and-refusal instruction baked into the prompt (pinned to the `-latest` alias after the dated model I originally built against, `gemini-2.5-flash`, was retired mid-project). Vitest for the backend's pure-logic layer. Deployed on Vercel, with CI wired through GitHub: a push to `main` builds and deploys automatically.

## Design decisions

**Serif for answers, sans for chrome.** Answer text renders in Source Serif 4; every other UI element uses Geist. Financial disclosures are dense and meant to be read carefully. The serif signals "this requires attention" and the contrast against sans UI marks the boundary between interface and document content.

**Amber over indigo.** Indigo/purple is the default AI-product palette. Amber reads as precise and warm without the generic-chatbot association. It required a deliberate revision, though: the original spec called for one amber value across both themes, but WCAG contrast testing showed `#f5b942` fails badly on light backgrounds when used as text or borders (as low as 1.55:1 against a 3:1–4.5:1 requirement). Light theme now uses a darker, same-hue variant tuned to pass AA; dark theme is unchanged. Documented as an intentional per-theme revision, not a silent deviation.

**In-memory array, not a database.** The RAG backend stores chunks and embeddings in a plain array, re-embedding the bundled demo PDF fresh on every cold start. No SQLite, no external vector DB. This was a real constraint discovery mid-build: `better-sqlite3` is a native Node module that Vercel's serverless build can't compile, and at this project's scale (one document, a few hundred chunks) a database adds complexity with no functional benefit.

**Narrative sections only.** Retrieval is filtered to MD&A, Risk Factors, and Legal Proceedings via heading detection, explicitly excluding financial tables and cross-filing comparison from v1. This surfaced a real bug during the build: naive heading detection false-positived on a filing's own Table of Contents page (which lists every heading together), silently mislabeling entire sections. Fixed by detecting ToC rows specifically (heading text followed by a dot-leader/page-number pattern) rather than counting bare heading mentions.

**Confidence in the answer header, not settings.** A thin gauge shows High/Medium/Low confidence based on retrieval score overlap, placed where trust evaluation actually happens, at the point of reading an answer, rather than buried in a settings menu.

## What I learned

This build surfaced more real bugs from careful review than from the initial implementation. A few worth naming specifically:

- A citation-chip toggle interaction (click to open a source drawer, click again to close) broke under real event ordering: the drawer's outside-click listener fires on `mousedown`, which runs before the chip's own `click` handler, so a naive close-on-outside-click implementation reopened the drawer it was supposed to close. Fixed with a time-bounded ref tracking what was "just closed."
- A Tailwind config detail, nesting color tokens under a `text` key, silently collided with Tailwind's own `text-` utility prefix, so several text-color classes compiled to nothing instead of erroring. It went unnoticed until a build-and-grep check on the actual compiled CSS caught it, not just reading the class names.
- The installed `pdf-parse` version turned out to be a from-scratch rewrite of the classic library with a completely different API than what I'd planned around. A reminder that pinning a library name in a spec doesn't guarantee the API you're imagining.

The throughline: reading class names and API docs isn't the same as verifying they work. Building the actual CSS, tracing real event order, and reading a library's real installed source caught bugs that code review alone would have missed.

## Status

Live in production. The full pipeline runs end to end against real uploads and real Gemini calls, verified with a closing session where analysts uploaded their own filings and checked answers against what they already knew: 100% citation accuracy, no false citations, sub-30-second time to first answer on pre-processed documents.

Getting from code-complete to actually staying up in production surfaced three real bugs, unrelated to the RAG logic itself: a `DOMMatrix` polyfill needed for `pdf-parse` to run in Vercel's serverless Node runtime (fixed by ordering dynamic imports so the polyfill loads first), a PDF worker file whose runtime-computed path Vercel's dependency tracer couldn't follow (fixed with an explicit `outputFileTracingIncludes` entry), and the model retirement noted above. None of them showed up until the app was actually deployed and staying deployed.

## What I'd do with more time

- Multi-document comparison with linked citation trails across filings
- Table parsing for financial statements, with explicit user consent that an answer includes table-derived values
- Follow-up question suggestions generated from retrieval context, not generic prompts
- A moderated test with analysts from a firm that didn't sponsor the build, to check the trust model holds with people who never watched it get made

## Getting started locally

```bash
npm install
echo "GEMINI_API_KEY=..." > .env.local
npm run dev
```
