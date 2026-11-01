# Rejoin — your place in the stream

A working, single-room hackathon MVP for live coding workshops. Learners keep their own event page while reviewing and approving small, checked recovery steps. The interface uses charcoal and Twitch purple.

## Start

Node.js 22+ is required (24 recommended).

```sh
cd rejoin
npm ci
npm run setup
npm run dev
```

Open http://localhost:4173. `setup` creates an ignored, permission-restricted `.env` with a random instructor password and never overwrites existing settings. View that file locally to get the password. Select the Instructor view and sign in. `npm run doctor` reports configuration presence without printing secrets.

Learner invitation: `http://localhost:4173/?join=1`. OBS browser source: `http://localhost:4173/?overlay=1`. Use separate browser profiles for instructor and learner demos. A browser profile has one local workspace.

## Implemented

- Three checkpoint community RSVP workshop, source editor, restricted interactive preview, authored hints and learning prompt.
- Optional runtime AI guidance using the OpenAI Responses API through the AI SDK. Exact script-sharing preview, explicit consent, structured evidence, secret screening, cancellation, timeout and room/user budgets. AI never applies code or certifies behavior.
- AST-recognized workshop variants, including whitespace/comments and two event binding styles. Recovery inserts required statements while retaining learner comments, title and CSS. Unknown programs receive a handoff instead of unsafe execution.
- Candidate behavioral checks, exact file before/after review, explicit approval, stale-revision rejection, protected files and undo. Undo after new edits offers a separate pre-fix export.
- Local save/reload, export/import, activity receipt, private help packet and deletion.
- Independent guest sessions, instructor password authentication, session rotation, CSRF checks, authenticated host controls, teaching notes, pause/end, live SSE checkpoint updates and invitation links.
- Opt-in self-reported community status. Public breakdowns are suppressed below five opted-in guests. No learner code or private question is included in room state or overlay.
- Twitch EventSub connector, broadcaster-only checkpoint/pause commands, OAuth learner linking, linked/consented `!stuck` and `!ready`, reconnection, revocation and event deduplication.
- Optional `!rejoin` public link replies, disabled until the host explicitly enables them. Requires a public HTTPS origin and `user:write:chat`; limited to one reply per 30 seconds.

## Configuration

Edit `.env` locally; never paste credentials into chat or commit them.

| Variable | Purpose |
| --- | --- |
| `REJOIN_HOST_PASSWORD` | Random instructor password; minimum 16 characters |
| `PUBLIC_ORIGIN` | Exact browser origin, default `http://localhost:4173`; no trailing slash |
| `HOST` / `PORT` | Bind address and port; default loopback / 4173 |
| `OPENAI_API_KEY` | Optional runtime AI credentials |
| `OPENAI_MODEL` | Configurable model, default `gpt-5-mini`; verify account access |
| `REJOIN_AI_CALL_LIMIT` | Maximum room calls/hour, default 40; five per guest/hour |
| `TWITCH_CLIENT_ID` | Registered Twitch application client ID |
| `TWITCH_ACCESS_TOKEN` | Broadcaster-owned user token with `user:read:chat` |
| `TWITCH_CLIENT_SECRET` | Needed only for optional learner OAuth linking |
| `REJOIN_DATA_FILE` | Persistent room/session JSON, default `.data/state.json` |

AI uses one request, no automatic retries, 24 KB script input, a 1,000-character question, 1,800 output-token cap, and a 45-second deadline. The model supplies tutoring and an allowed next action; deterministic code proposes edits. Authored assistance remains available without an API key. Models can be wrong; model output cannot establish a passed test.

## Twitch setup

Follow Twitch's [chatbot guide](https://dev.twitch.tv/docs/chat/chatbot-guide/) and [installed-chatbot authentication](https://dev.twitch.tv/docs/chat/authenticating/). Rejoin uses Node's built-in WebSocket and broadcaster credentials; no separate bot account is needed for this installed topology.

1. Register a Twitch developer application. For learner linking, register the exact OAuth callback `http://localhost:4173/auth/twitch/callback` (or your deployed HTTPS origin plus that path).
2. Obtain a broadcaster User Access Token with `user:read:chat`. Add `user:write:chat` only for optional public invitation replies. Use the same application's client ID. The Twitch CLI supports `twitch token --user-token --scopes "user:read:chat user:write:chat"`.
3. Set the client ID/token in `.env`, restart, and verify the app says Twitch connected.
4. Send `!checkpoint C3` as the broadcaster. Connected learner pages and the overlay should update. `!pause` pauses recovery; another checkpoint command resumes it.
5. For learner commands, configure the client secret and exact redirect. Learners choose Community & privacy → Link Twitch, then separately enable sharing. `!stuck` / `!ready` use validated Twitch user IDs, never a typed username.
6. With public HTTPS hosting and the write scope, explicitly enable `!rejoin` replies in the host console. Replies contain only the public invitation link.

Learner linking requests no resource scopes; the temporary token is validated for identity and discarded. Linking expires with the 24-hour guest session. Credentials are never given to the model/browser. Use the authenticated host console’s Connect Twitch action to authorize the broadcaster. Its refresh token is encrypted on the persistent volume using a key derived from the instructor password; expired tokens renew on a 401 response. Changing the instructor password requires reconnecting Twitch. A manually supplied access token without a refresh token still requires replacement when it expires. Connection gaps are visible and missed events are not invented. Commands and replies are not a general-purpose chatbot.

## Share the full MVP

The **private Sites URL is a static preview**. It does not run the Node server, AI endpoint, or Twitch connector. Full functionality runs with `npm run dev` or the container below.

Use one continuously running Node/container instance behind HTTPS with a persistent volume. Do not deploy this JSON-store server as multiple replicas or ephemeral serverless functions. Set `PUBLIC_ORIGIN` to the exact external HTTPS origin and `HOST=0.0.0.0`. The instance serves frontend and APIs together; no CORS configuration is needed. Proxy SSE without buffering. Update the Twitch redirect to match.

```sh
docker build -t rejoin .
docker volume create rejoin-data
docker run --rm -p 4173:4173 --env-file .env -e HOST=0.0.0.0 \
  -v rejoin-data:/app/.data rejoin
```

The production container was built and its health, frontend, parser asset, and secret-file rejection were checked locally. TLS termination and the public hostname are hosting responsibilities. No public full-stack deployment is claimed.

## Verification

```sh
npm run check
npm test
```

21 Node tests pass, including a 30-fixture deterministic recovery benchmark, HTTP session/authorization/CSRF/privacy tests, real SDK request serialization with a mocked model response, and simulated Twitch EventSub handshake/deduplication/migration/revocation. Fixtures are disclosed test data; they do not establish real provider availability or model accuracy.

The browser test uses independent instructor and learner contexts and tests customization, actual RSVP behavior, saving, safe undo, live checkpoint/note/pause delivery, sharing/revocation and mobile layout. Start a disposable server with `REJOIN_HOST_PASSWORD=test-only-password-123456` and an isolated `REJOIN_DATA_FILE`, then run `python3 test/browser.py` with Python Playwright installed. `CHROMIUM_PATH` can select an existing browser. `python3 test/browser-ai.py` additionally tests AI consent and approval using a disclosed mock response, never a real model call. The test password is a fixture only; never use it for a deployed room.

## Privacy and execution boundaries

Files remain in browser localStorage unless the learner explicitly asks for AI assistance or exports a handoff. AI receives only the approved script/question/checkpoint via the server. Rejoin retains no uploaded code or model transcripts. Requests use `store:false`; provider retention policies still apply. Secret scanning is best-effort, not proof that a file contains no secrets.

Server storage contains public room state, hashed session tokens, CSRF values, optional Twitch user IDs and opt-in status. Guest sessions expire after 24 hours; cleanup runs every minute. Deletion aborts active AI work, removes the server session/link/sharing, and clears local files after server deletion succeeds. There are no automatic backups. One browser profile shares localStorage: use separate profiles on shared devices.

The preview has an opaque origin, no same-origin privilege, an HTML allowlist, and a network-denying CSP. Arbitrary learner JavaScript never runs. Acorn recognizes only semantic forms of the prepared scripts; preview executes canonical trusted equivalents. Comments cannot inject script markup. Candidate checks test that constrained rendered representation, not arbitrary web programs. Unsupported code, timeout, failed checks or stale state cannot produce an applied verified recovery. CSS can still affect layout; visual quality is not certified. Supported input is exactly three named UTF-8 text files, each at most 100 KB.

Fonts load from Google Fonts with offline fallbacks. No analytics are included. A learner's self-reported readiness is always separate from local verification and from understanding.

## Remaining release gates

- Real OpenAI guidance and a real broadcaster chat checkpoint command have passed locally. Broadcaster OAuth renewal, learner OAuth linking, and optional chat replies still need a live account rehearsal.
- Deploy the full Node application to a persistent HTTPS host for remote learners; the static private preview is insufficient for this.
- Run a three-person live rehearsal and record the actual Twitch interaction.
- Publish an accessible GitHub/GitLab/Bitbucket repository, record a public YouTube demo under three minutes, add the real Codex session ID and submit on Devpost.
- Human keyboard/screen-reader review and the full PRD T01–T16 evidence remain incomplete. The benchmark is narrower than the PRD's proposed research evaluation. No learning or market claim is made.

This MVP intentionally supports one room and one prepared workshop. Multi-language repair, arbitrary code execution, cloud code sync and a workshop marketplace are outside it.
