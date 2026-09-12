# Testimonium demo — V2

Format: 1920×1080 MP4, 30fps, dark theme. Keep the approved voiceover unchanged. Capture in Chrome at a 1440×900 viewport. Use Plug Power 2023 10-K if available; otherwise use the bundled sample filing and substitute only values visible in that filing.

| Time | Screen action | On-screen copy |
| --- | --- | --- |
| 0:00–0:08 | Hold on the dark landing state with the upload dropzone in view. | **Most AI chatbots guess. Testimonium refuses to.** |
| 0:08–0:18 | Drop the 10-K. Show indexing finish at `304 / 304 chunks` and the `112 pages indexed` ready state; never hold the spinner. | **Drop in any 10-K.** |
| 0:18–0:34 | Ask a filing-backed question. Let the answer stream, then open its citation in a new tab and hold on the source. | **Ask anything. Every number is cited.**<br>**Jump to the exact page. Verify it yourself.** |
| 0:34–0:46 | Return to the app. Ask: “What is the CEO's favorite food?” Hold on the refusal and Low confidence badge. | **And when it doesn't know, it says so.**<br>**No hallucinations. No guessing.** |
| 0:46–1:00 | In the bundled sample, ask a 2023 net-product-sales question, then ask “And in 2024?” Show `$144,285 thousand ($144.3M)` with citations. Click Export and show `testimonium-conversation.md`. | **It remembers the conversation.** |
| 1:00–1:08 | Fade to a dark end card with wordmark and URL. | **Testimonium — evidence-grade answers from your filings.**<br>`testimonium.vercel.app` |

## Overlay treatment

- Font: the product’s UI sans or Arial/Inter fallback; sentence case; no generic subtitle styling.
- Primary text: warm gold `#d8a84c`; supporting text: `#d4d7dd`; background: charcoal `#0d1015`.
- The protected headline area is x=88–820 / y=188–478. The screenshot frame begins at x=870 / y=350, leaving at least 50px of horizontal clearance and at least 24px below the headline; this is asserted in `render_demo.py` before export.
- Use a 180–220ms fade on overlays and 250ms crossfades only between beats.
- Keep the approved voiceover unchanged. Do not use a recognizable commercial track.

## One-take capture checklist

1. Set Chrome zoom to 100%, viewport to 1440×900, Testimonium to dark theme, and hide bookmarks/extensions.
2. Start a 1920×1080 / 30fps screen capture. Keep the cursor deliberate and visible only when interacting.
3. Capture the six beats above in order. Pause one second before and after each click so edits have clean handles.
4. Verify the citation opens a second tab, then return to the app and show both conversation turns still intact.
5. Confirm the export filename appears before ending the recording.
6. Edit to 68 seconds, add the overlays and captions at the times above, keep the approved voiceover unchanged, export H.264 MP4 at 16–20 Mbps, then replace `demo/testimonium-demo-90s.mp4` and `Portfolio/public/testimonium-demo/testimonium-demo-90s.mp4` with that capture.

## Included fallback video

`testimonium-demo-90s.mp4` is a 68-second visual storyboard made from real Testimonium captures. Its audio stream is preserved unchanged from V1. Replace it with the one-take Chrome capture above before presenting the project as a live interaction recording.
