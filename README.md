# Testimonium

**Evidence-grade answers from SEC filings.**

A research tool for SEC 10-K filings: ask a question, get an answer grounded in the exact page and section it came from. Built solo, as an outside engineer, for a real asset-management research team under NDA: problem framing, design system, RAG pipeline, frontend, and this write-up, end to end.

**Live demo:** [testimonium.vercel.app](https://testimonium.vercel.app)
**Repo:** [github.com/Naveen-Sereddy/Testimonium-SEC-Filing-Research-Tool](https://github.com/Naveen-Sereddy/Testimonium-SEC-Filing-Research-Tool)

## The problem

Earnings season creates a recurring bottleneck: product managers and analysts need to locate specific disclosures inside 10-K filings (risk factor language, revenue segments, compliance statements), but the documents run 150–250 pages. Finding one specific disclosure takes 15–30 minutes of manual skimming. In fintech, I've seen this eat hours every earnings season.

Existing tools (Bloomberg, AlphaSense, Hebbia) are built for research desks at an enterprise price point, and the team barely used the ones they already had. Testimonium was scoped and built for this specific team's actual workflow instead, not as a competitor to those platforms. Full engagement details (discovery, shadowing, verification session with real analysts) are in the [case study](https://naveensereddy.com/case-testimonium/); the client's name is withheld under NDA.

## What it does

- Upload one or two SEC 10-K PDFs (or use the bundled demo filing)
- Compare two annual filings year over year: section-level changes appear first, with expandable paragraph-level excerpts and citations for both years
- Ask a question in plain language
- Get an answer with a progressive text reveal (the complete response is fetched first, then revealed over ~550ms, not token-level streaming) and inline numbered citations `[1]` `[2]`
- Click a citation to open a source drawer showing the exact excerpt, page number, and section, with a link that copies the excerpt to the clipboard so it can be found with ⌘F in the reader's own uploaded PDF
- A confidence gauge on every answer signals how well-supported it is; a model refusal always shows Low with no citations, regardless of retrieval score, so a non-answer never gets dressed up as a confident one
- A "Why this answer" disclosure on every response states, in plain language, how many passages were retrieved, from which sections, and how many were strong matches, generated deterministically from the same retrieval numbers behind the confidence gauge, not a separate model call
- 2-3 follow-up question chips after each answer, grounded in the citation's own section and the document's other indexed sections, not generic canned prompts
- Citation depth (brief/standard/detailed), controlled from a pill row next to the composer, actually changes how many source chunks are retrieved per question (k = 3/5/8)
- Retrieval covers narrative sections (MD&A, Risk Factors, Legal Proceedings) and conservatively detected primary financial-statement table passages. Table passages retain a table title and inferred period columns so the answer and evidence panel can show where a value came from. The document info bar shows exactly which sections got indexed after upload, alongside the company name and fiscal year end extracted from each filing's cover page
- A persistent evidence panel on desktop: click any citation anywhere in the conversation and it updates with the exact excerpt, page, and section, plus a link that opens the reader's own uploaded PDF straight to that page
- Dark and light themes, full keyboard navigation, a focus-trapped help modal, 44px touch targets throughout, and WCAG 2.1 AA contrast

## Tech stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS. RAG backend: `pdf-parse` for text extraction, Google Gemini's OpenAI-compatible API (via the `openai` SDK) with `gemini-embedding-001` for embeddings, an Upstash Redis session store for chunks and embeddings, `gemini-flash-latest` for answer generation with a citation-and-refusal instruction baked into the prompt, and Vitest for the backend's pure-logic layer. Deployed on Vercel, with CI wired through GitHub: tests, the benchmark contract, and the production build must pass before a pull request can merge.

## Design decisions

**Serif for answers, sans for chrome.** Answer text renders in Source Serif 4; every other UI element uses Geist. Financial disclosures are dense and meant to be read carefully. The serif signals "this requires attention" and the contrast against sans UI marks the boundary between interface and document content.

**Amber over indigo.** Indigo/purple is the default AI-product palette. Amber reads as precise and warm without the generic-chatbot association. It required a deliberate revision, though: the original spec called for one amber value across both themes, but WCAG contrast testing showed `#f5b942` fails badly on light backgrounds when used as text or borders (as low as 1.55:1 against a 3:1–4.5:1 requirement). Light theme now uses a darker, same-hue variant tuned to pass AA; dark theme is unchanged. Documented as an intentional per-theme revision, not a silent deviation.

**Session-scoped Redis, not a full vector DB.** The first version stored chunks and embeddings in a plain in-memory array. That worked in every manual test and then broke intermittently in real production use: Vercel runs multiple instances of the same function, and a query landing on a different instance than the upload found an empty store, since a module-level array only lives in one instance's memory. Every question got the same "I don't know" fallback regardless of what was actually asked, with no error thrown, just a quiet wrong answer. The fix was moving the store to Upstash Redis (via Vercel's Marketplace integration), keyed per upload session with a one-hour TTL, so any instance can serve any request for that session. `better-sqlite3` was still the wrong call, it's a native Node module Vercel's serverless build can't compile, but "no database" and "no cross-instance persistence" turned out to be two different requirements, and only the first one was ever the actual goal.

**Conservative filing scope.** Retrieval is filtered to MD&A, Risk Factors, Legal Proceedings, and primary financial-statement table passages. Heading detection skips table-of-contents pages, and table extraction keeps source text plus inferred period columns rather than pretending a PDF parser has perfect visual-table fidelity. Cross-filing comparison uses the same stored chunks so every change remains traceable to both annual filings.

**Confidence in the answer header, not a settings menu.** A thin gauge shows High/Medium/Low confidence based on retrieval score overlap, placed where trust evaluation actually happens, at the point of reading an answer. There's no settings panel at all, what used to be one is now an informational "How this works" panel (no controls, just context), since citation depth and theme are both controlled inline where they're used.

## What I learned

This build surfaced more real bugs from careful review than from the initial implementation. A few worth naming specifically:

- A citation-chip toggle interaction (click to open a source drawer, click again to close) broke under real event ordering: the drawer's outside-click listener fires on `mousedown`, which runs before the chip's own `click` handler, so a naive close-on-outside-click implementation reopened the drawer it was supposed to close. Fixed with a time-bounded ref tracking what was "just closed."
- A Tailwind config detail, nesting color tokens under a `text` key, silently collided with Tailwind's own `text-` utility prefix, so several text-color classes compiled to nothing instead of erroring. It went unnoticed until a build-and-grep check on the actual compiled CSS caught it, not just reading the class names.
- The installed `pdf-parse` version turned out to be a from-scratch rewrite of the classic library with a completely different API than what I'd planned around. A reminder that pinning a library name in a spec doesn't guarantee the API you're imagining.

The throughline: reading class names and API docs isn't the same as verifying they work. Building the actual CSS, tracing real event order, and reading a library's real installed source caught bugs that code review alone would have missed.

## Eval

`npm run eval` first validates the 50-case benchmark contract, then runs a small smoke set against the real deployed API. The versioned contract lives in `eval/golden-set.json` and is validated in CI; it covers narrative retrieval, financial tables, Risk Factors and MD&amp;A comparison, and refusal behavior. The smoke set checks retrieval-section precision, citation page validity, refusals, and citation depth (3/5/8). It hits production directly, with no mocks. Last run:

```
6/6 passed
Citation Depth check: brief=3, standard=5, detailed=8 citations — PASS
```

What this does and doesn't prove, stated plainly: the smoke set validates retrieval-and-refusal behavior against one bundled document. The 50-case file is a structured benchmark contract and coverage checklist; it is not presented as a measured accuracy result until the five-company, multi-year corpus is populated and run. Confidence thresholds are now represented by an explicit profile and the repository includes a precision-target calibration function, but the default profile remains provisional until labeled examples are supplied. This is evidence for the behaviors actually checked, not a claim of formal model certification.

## Status

Live in production. The full pipeline runs end to end against real uploads and real Gemini calls, verified with a closing session where analysts uploaded their own filings and checked answers against what they already knew: 100% citation accuracy, no false citations, sub-30-second time to first answer on pre-processed documents.

Getting from code-complete to actually staying up in production surfaced three real bugs, unrelated to the RAG logic itself: a `DOMMatrix` polyfill needed for `pdf-parse` to run in Vercel's serverless Node runtime (fixed by ordering dynamic imports so the polyfill loads first), a PDF worker file whose runtime-computed path Vercel's dependency tracer couldn't follow (fixed with an explicit `outputFileTracingIncludes` entry), and the model retirement noted above. None of them showed up until the app was actually deployed and staying deployed.

## What I'd do with more time

- Expand the benchmark corpus beyond the checked-in contract and report measured retrieval, citation, and refusal metrics
- Improve table extraction against more SEC filing layouts, with parser fixtures for merged cells and footnotes
- A moderated test with analysts from a firm that didn't sponsor the build, to check the trust model holds with people who never watched it get made

## Getting started locally

```bash
npm install
echo "GEMINI_API_KEY=..." > .env.local
npm run dev
```

## License

MIT
