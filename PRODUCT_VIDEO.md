# Product walkthrough

Use `artifacts/rejoin-product-demo.mp4` for the new upload: **2 minutes 41 seconds, 1920 × 1080, H.264/AAC**. The earlier captioned `rejoin-demo.mp4` is superseded.

The walkthrough explains the learner problem and community need, then shows instructor controls, actual public Twitch chat commands, the learner workspace, consented AI help, reviewed recovery, protection and safe undo, human handoff, exports and receipts, privacy, overlay and personal continuation.

Audio: locally synthesized Indian English male voice (Aman). No subtitles, captions, or developer/test-case discussion. The visible text belongs to the actual application and Twitch interfaces. Commands were explicitly authorized by the channel owner. The room is restored afterward and optional public replies are disabled when the rehearsal ends.

## Suggested YouTube title

Rejoin — Keep your place in the stream

## Suggested description

Live coding moves quickly. One small error can leave a beginner stuck, while copying the instructor's entire project can erase their personal work.

Rejoin helps learners return to a Twitch coding workshop without starting over. Follow clear checkpoints, work privately, ask for guidance with permission, review a focused change, and stay in control of what gets applied. Instructors coordinate the lesson through Twitch chat and share teaching notes, while learners choose whether to share a simple progress signal.

Explore the workshop: https://rejoin-production-bec2.up.railway.app/?join=1
Source: https://github.com/ankitlade12/rejoin

Rejoin currently supports a prepared three-checkpoint HTML, CSS and JavaScript RSVP workshop. Narration is synthesized.

## Recording tooling

The scripts are specific to this owner's authorized demonstration. They require macOS with the Aman Indian English voice, FFmpeg, Python Pillow and Playwright. They are not application runtime dependencies. `record-product.py` sends seven public chat commands; obtain the channel owner's permission before running it. Credentials are read from the environment, never displayed or recorded. Recording assets remain ignored by Git and deployment uploads.
