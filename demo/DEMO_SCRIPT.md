# Testimonium 90-second demo

Format: 1920×1080 MP4, 30fps, dark theme, no voiceover. Capture in Chrome at a 1440×900 viewport. Use Plug Power 2023 10-K if available; otherwise use the bundled sample filing and substitute only values visible in that filing.

| Time | Screen action | On-screen copy |
| --- | --- | --- |
| 0:00–0:08 | Hold on the dark landing state with the upload dropzone in view. | **Most AI chatbots guess. Testimonium refuses to.** |
| 0:08–0:20 | Drop the 10-K. Let the staged status move through extracting, chunking, and indexing. End on the ready banner. | **Drop in any 10-K.** |
| 0:20–0:38 | Ask: “What was Plug Power's total revenue in 2023?” Let the answer stream. Show “$891,340 thousand (~$891.3M).” Open its citation in a new tab at page 51 and hold on the highlighted source. | **Ask anything. Every number is cited.**<br>**Jump to the exact page. Verify it yourself.** |
| 0:38–0:52 | Return to the app. Ask: “What is the CEO's favorite food?” Hold on the refusal and Low confidence badge. | **And when it doesn't know, it says so.**<br>**No hallucinations. No guessing.** |
| 0:52–1:05 | Ask: “And in 2022?” Show “$701,440 thousand ($701.4M)” with citations. Click Export and show `testimonium-conversation.md` in the downloads tray. | **It remembers the conversation.** |
| 1:05–1:15 | Fade to a dark end card with wordmark and URL. | **Testimonium — evidence-grade answers from your filings.**<br>`testimonium.vercel.app` |

## Overlay treatment

- Font: the product’s UI sans or Arial/Inter fallback; sentence case; no generic subtitle styling.
- Primary text: warm gold `#d8a84c`; supporting text: `#d4d7dd`; background: charcoal `#0d1015`.
- Keep captions in the upper-left safe area, off the interface controls.
- Use a 180–220ms fade on overlays and 250ms crossfades only between beats.
- Use a low-volume, original ambient bed at roughly -32 LUFS. No voiceover and no recognizable commercial track.

## One-take capture checklist

1. Set Chrome zoom to 100%, viewport to 1440×900, Testimonium to dark theme, and hide bookmarks/extensions.
2. Start a 1920×1080 / 30fps screen capture. Keep the cursor deliberate and visible only when interacting.
3. Capture the six beats above in order. Pause one second before and after each click so edits have clean handles.
4. Verify the citation opens a second tab, then return to the app and show both conversation turns still intact.
5. Confirm the export filename appears before ending the recording.
6. Edit to 75 seconds, add the overlays at the times above, mix the ambient bed quietly, export H.264 MP4 at 16–20 Mbps, then replace `demo/testimonium-demo-90s.mp4` and `Portfolio/public/testimonium-demo/testimonium-demo-90s.mp4` with that capture.

## Included fallback video

`testimonium-demo-90s.mp4` is an 88-second visual storyboard made from real Testimonium captures. Replace it with the one-take Chrome capture above before presenting the project as a live interaction recording.
