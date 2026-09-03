# Testimonium verification — 2026-09-03

This report records the checks run after the two-filing, table-evidence, comparison, and evaluation-contract work. It is a local engineering record; no deployment or Git operation is part of this report.

## Checks completed

| Check | Result | What it covers |
| --- | --- | --- |
| `npm test -- --run` | 17 files, 73 tests passed | Retrieval, citation parsing, real-filing table extraction, comparison, confidence, Redis batching, session validation, and existing behavior |
| `npm run lint` | Passed | ESLint checks |
| `npm run eval:contract` | 50 cases valid | 25 narrative, 10 financial-table, 10 comparison, and 5 refusal cases are present and structurally valid |
| `npm run build` | Passed | Production Next.js compilation, TypeScript, route generation, and bundling |
| `npm run eval` | 6/6 smoke cases passed | Live production behavior, refusal consistency, page ranges, and brief/standard/detailed citation depth |
| Smoke retrieval section precision | 16/20 | Retrieved citations whose section matched the expected section for the smoke query |
| Smoke citation page validity | 20/20 | Returned citation pages were within the uploaded filing's 112-page range |
| Smoke refusal accuracy | 2/2 | Both unsupported questions were refused with Low confidence and no citations |
| Portfolio `npm run check && npm run build` | Passed | Astro diagnostics (0 errors) and static output for the updated Testimonium case study |
| `git diff --check` | Passed | No whitespace errors in the Testimonium changes |
| Local dev smoke | Passed | Home route responds without creating unexpected workspace files |
| Responsive visual check | Passed | Dark/light desktop and 390 × 844 mobile layouts; no horizontal overflow or browser console warnings |

## What is now in the product

- Upload accepts one or two PDF Form 10-K filings and stores filing metadata with every chunk and citation.
- Retrieval covers the existing narrative sections plus conservative primary-statement table passages.
- Answers can render Markdown tables and expose the table title, inferred periods, row text, section, page, filing, and source excerpt.
- A comparison endpoint and panel show added, modified, and removed passages for Risk Factors and MD&A, with evidence from both filings.
- Redis chunk writes, reads, and deletion pipelines are capped at 30 keys, use session/document/chunk namespacing, and expire after one hour.
- Primary-statement extraction was checked against the bundled 112-page filing. It identified 15 table chunks on PDF pages 76, 77, and 79 and preserved parenthesized losses, currency signs, periods, and stated units.
- Confidence thresholds are explicit and can be calibrated from labeled examples; the shipped defaults remain marked provisional.
- The versioned 50-case golden-set contract is checked in CI along with tests, lint, and the production build.
- The portfolio case study describes the current scope and its evidence boundaries.

## Evidence boundary

The 50-case file is a coverage contract, not a measured five-company accuracy report. The repository currently contains the bundled demo filing, not a checked-in corpus of five companies across multiple years. Full-corpus retrieval precision, recall, citation accuracy, and refusal accuracy therefore still need to be measured when that corpus is supplied. The smoke figures above describe only the six live queries run against the bundled filing.

Project 2 and Project 3 were not changed. Changes are local and intentionally uncommitted/unpushed.
