# Rejoin

## Pitch
Live coding should not leave beginners choosing between falling behind and replacing their own work. Rejoin helps a learner return to the workshop while keeping their title, colors and personal touches.

## What it does
Rejoin pairs a private browser workspace with a Twitch-connected workshop room. Learners choose a checkpoint, read a hint or explicitly request AI guidance, inspect a small suggested change, run checks, approve it and undo it. Instructors move checkpoints through Twitch chat or an authenticated console, publish notes and see anonymous opt-in readiness signals. Small public cohorts stay hidden.

## How we built it
Built with OpenAI Codex: vanilla JavaScript interface, Node backend, AST-based prepared-workshop recovery, sandboxed preview, revision guards, an OpenAI structured tutoring adapter, Twitch EventSub/OAuth integration and automated tests. Codex generated and revised implementation and tests; the developer reviewed the product direction and PRD.

## Honest demo disclosure
The RSVP workshop and missing event binding are prepared examples. JavaScript execution is limited to recognized workshop forms. Runtime AI needs a configured key. Real OpenAI recovery passed in the hosted browser app, and live Twitch checkpoint delivery passed on the public Railway app. Automated provider tests also use disclosed fixtures. The deployed app is https://rejoin-production-bec2.up.railway.app; source is https://github.com/ankitlade12/rejoin (currently private).

## Three-minute recording plan
- 0:00–0:20: Explain the learner's problem; show the prepared workshop and personalized event title.
- 0:20–0:40: Send `!checkpoint C2` in the actual broadcaster's Twitch chat. Show another browser and the overlay update.
- 0:40–1:25: Learner asks for help, reviews the approved context, sees a hint, checks the exact fix and applies it. Click RSVP.
- 1:25–1:50: Show title/comments/styles preserved. Show protected-script refusal and undo after new edits preserving both copies.
- 1:50–2:15: Show opt-in sharing; if fewer than five learners, explicitly show the privacy suppression rather than fabricated counts.
- 2:15–2:40: Show the Codex thread and real passing test output. Explain the restricted execution boundary.
- 2:40–2:55: State what is working, the community benefit and the remaining scope limits.

## Submission checklist
- [ ] Actual live Twitch rehearsal recorded.
- [ ] Public YouTube video under three minutes.
- [ ] GitHub/GitLab/Bitbucket URL accessible to judges with source/assets/setup.
- [ ] Actual Codex session ID from the main development thread.
- [x] Public full-stack URL and reproducible local testing instructions.
- [x] English description and testing instructions prepared in this repository.
- [ ] Devpost submission before November 2, 2026, 4 PM America/Chicago.

Official requirements: https://twitchcon-codex.devpost.com/rules
