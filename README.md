# Rejoin

A Twitch-inspired, private-first coding workshop companion. Help a learner repair a community RSVP page without replacing their title, styles, or intentional work.

## Run locally

Requires Node.js 22 or newer. There are no npm dependencies and no build step.

```sh
cd rejoin
npm run dev
```

Open http://localhost:4173. Run `npm test` for the core checks and `npm run check` for syntax checks. For browser checks, install Python Playwright and its Chromium browser, start the server, then run `python3 test/browser.py`. Set `CHROMIUM_PATH` if using an existing Chromium installation.

## What works

- Responsive charcoal and purple workspace, file editor, restricted preview, checkpoint selection and lesson guide.
- Browser-local saving, project JSON export/import, deletion and private help-packet export.
- Prepared C1/C2/C3 RSVP workshop, hint-first assistance and protected files.
- Exact before/after patch inspection, candidate behavioral checks, explicit approval, stale-revision rejection and undo with separate-copy export after newer edits.
- Read-only instructor overlay at `/?overlay=1`, rehearsal controls and a local Twitch EventSub connector.
- Prepared code accepts both `addEventListener` and `onclick` variants. Unsupported JavaScript gets an explicit abstention.

## Twitch connector

This is an installed, instructor-operated connector. Create a Twitch developer application and obtain a broadcaster User Access Token with `user:read:chat`. The token's client ID must match the application. The official CLI can obtain a test token: `twitch token --user-token --scopes "user:read:chat"`. Follow https://dev.twitch.tv/docs/chat/authenticating/ for setup. Do not paste tokens into chat or source files.

Set `TWITCH_CLIENT_ID` and `TWITCH_ACCESS_TOKEN` in your local process environment, then run `npm run dev`. Alternatively, create an ignored `.env` file and use `node --env-file=.env server.mjs`. The server validates the token, subscribes to the broadcaster's `channel.chat.message` events, and streams public room state to browsers. Credentials never reach the browser. `!checkpoint C1`, `!checkpoint C2`, `!checkpoint C3`, and `!pause` require the validated broadcaster ID. A checkpoint command also resumes a paused workshop.

`!rejoin` writes a join request to the local connector console. It does **not** send a chat reply. The connector handles keepalives, reconnection, subscription revocation, token validation and recent event deduplication. Events missed during a connection gap are not reconstructed. `!stuck` and `!ready` are deliberately inactive until secure learner identity linking exists.

The server binds only to loopback. Other devices cannot join this local room. Hosted static preview does not run the Node connector; it remains a labeled demo. Do not describe that preview as a multi-user live service.

## Demo in under three minutes

1. Open the workspace; disclose that the workshop and missing event binding are prepared fixtures.
2. Change the title in `index.html` and a color in `style.css`.
3. Return to `script.js`, choose C2, and select Help me continue.
4. Review the local-only scope, read the hint, and request a suggested fix.
5. Open the exact before/after file, check the suggestion, and approve it.
6. Click the RSVP button. Show the title and colors are preserved, reload, and undo.
7. Protect `script.js` and show that repair refuses to override it.
8. With a real broadcaster token, send `!checkpoint C3` from Twitch and show the live checkpoint update. Open the overlay without private code.

Codex produced the application, tests, styles, connector and this documentation. Record the actual session ID with `/status`; no session evidence is fabricated. Submission also needs a repository and a public demo video showing real Twitch functionality: https://twitchcon-codex.devpost.com/.

## Architecture and privacy

`dist/core.js` holds deterministic recovery, revision guards, validation and command authorization. `dist/app.js` handles local state, rendering and checks. `server.mjs` serves the static app plus read-only room/event endpoints and optionally connects to Twitch. The static app deploys independently.

Code is saved only in localStorage in this browser profile. It is not a secure multi-account store on shared devices. There are no code upload endpoints, cloud accounts, runtime AI calls, tracking or cohort sharing. Font requests go to Google Fonts; offline fallback fonts are available. Clearing browser storage loses local progress. Export before switching devices.

Preview runs in an opaque-origin sandbox without same-origin privileges. HTML is reduced to a small tag/attribute allowlist. CSP blocks networking and external resources. Only byte-recognized workshop scripts execute; arbitrary JavaScript never executes. Checks use a separate sandbox with a fixed harness and bind results to the exact approved snapshot. A timeout is inconclusive. Title checks and RSVP behavior do not prove arbitrary visual correctness or learning. CSS and HTML outside the supported rendering contract may not display as authored. Input is limited to three named UTF-8 text files, 100 KB each. No credentials or real personal data belong in this workshop.

## Release status and remaining gates

This is a functional restricted demo, **not completion of every H requirement in the PRD**. Eleven core automated tests pass; Chromium smoke coverage includes recovery, actual button behavior, reload, undo, privacy controls, instructor rehearsal and narrow viewport layout. See `test/` for reproducible checks.

Not implemented or verified: runtime model adapter; hosted multi-user rooms and private sessions; OAuth learner linking; consented cohort analytics; production isolation for arbitrary code; durable room state; the 30-case benchmark; full T01–T16 acceptance evidence; screen-reader user testing; a real Twitch credential/event run. The current connector is tested at the command-authorization layer, not against a live account. No adoption or learning improvement is claimed.

The next release gate is a real Twitch rehearsal plus authenticated room hosting. Runtime AI should only propose bounded changes after explicit file-sharing consent; it must not replace the current approval and verification checks.
