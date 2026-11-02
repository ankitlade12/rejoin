# Rejoin

## Pitch
Live coding should not leave beginners choosing between falling behind and replacing their own work. Rejoin helps a learner return to the workshop while keeping their title, colors and personal touches.

## What it does
Rejoin pairs a private browser workspace with a Twitch-connected workshop room. Learners choose a checkpoint, read a hint or explicitly request AI guidance, inspect a small suggested change, run checks, approve it and undo it. Instructors move checkpoints through Twitch chat or an authenticated console, publish notes and see anonymous opt-in readiness signals. Small public cohorts stay hidden.

## How we built it
Built with OpenAI Codex: vanilla JavaScript interface, Node backend, AST-based prepared-workshop recovery, sandboxed preview, revision guards, an OpenAI structured tutoring adapter, Twitch EventSub/OAuth integration and automated tests. Codex generated and revised implementation and tests; the developer reviewed the product direction and PRD.

## Honest demo disclosure
The RSVP workshop and missing event binding are prepared examples. JavaScript execution is limited to recognized workshop forms. Runtime AI needs a configured key. Real OpenAI recovery passed in the hosted browser app, and live Twitch checkpoint delivery passed on the public Railway app. Automated provider tests also use disclosed fixtures. The deployed app is https://rejoin-production-bec2.up.railway.app; source is https://github.com/ankitlade12/rejoin .

## Three-minute recording plan
- 0:00–0:20: Explain the learner's problem; show the prepared workshop and personalized event title.
- 0:20–0:40: Send `!checkpoint C2` in the actual broadcaster's Twitch chat. Show another browser and the overlay update.
- 0:40–1:25: Learner asks for help, reviews the approved context, sees a hint, checks the exact fix and applies it. Click RSVP.
- 1:25–1:50: Show title/comments/styles preserved. Show protected-script refusal and undo after new edits preserving both copies.
- 1:50–2:15: Show opt-in sharing; if fewer than five learners, explicitly show the privacy suppression rather than fabricated counts.
- 2:15–2:40: Show the Codex thread and real passing test output. Explain the restricted execution boundary.
- 2:40–2:55: State what is working, the community benefit and the remaining scope limits.

## Submission checklist
- [x] Actual live Twitch checkpoint transition recorded in artifacts/rejoin-demo.mp4.
- [ ] Public YouTube video under three minutes.
- [x] Public GitHub source with assets and setup: https://github.com/ankitlade12/rejoin.
- [x] Main development Codex session ID: `01a1984a-2018-72b3-a62a-790d30a801a5` (confirmed from environment and session metadata).
- [x] Public full-stack URL and reproducible local testing instructions.
- [x] English description and testing instructions prepared in this repository.
- [ ] Devpost submission before November 2, 2026, 4 PM America/Chicago.

Official requirements: https://twitchcon-codex.devpost.com/rules

## Ready-to-paste links

- Application: https://rejoin-production-bec2.up.railway.app/?join=1
- Source: https://github.com/ankitlade12/rejoin
- Codex session: `01a1984a-2018-72b3-a62a-790d30a801a5`
- YouTube: add the public URL after uploading the prepared recording.

## Judge testing

Join privately, personalize the event title, select C2, choose Help me continue, then an authored hint or optional consented AI guidance. Review the proposed fix, check it, approve, and click the RSVP button. Verify the title stayed unchanged. Try undo; add a new comment and observe that undo offers a separate pre-fix copy. Protect script.js before requesting another fix to see a safe conflict. The public OBS overlay shows live Twitch checkpoint changes without learner code. Instructor access uses a private password; do not publish it in the description or video.
