# Rejoin 1.1 release record

Updated November 1, 2026 (America/Chicago). This supersedes the earlier feature audit for implemented fixes. Evidence is scoped to the prepared three-file RSVP workshop.

## Implemented and checked

- Editing invalidates visible success/checkpoint results without moving editor focus.
- Save failures persist through rerenders; startup detects unavailable storage; last good stored data remains intact.
- Import uses a visible keyboard-focusable file control. Editor/review focus styles and small explanatory text were improved.
- Human handoff has file selection, shared credential screening, exact redacted preview and explicit download approval. Copies forwarded outside Rejoin cannot be revoked.
- Quick Guide accurately distinguishes cloud sync from optional consented AI.
- Version 1.1.0 manifest validates immutable reference/harness hashes and prerequisites. The release browser suite checks actual reference behavior.
- Shared status includes optional checkpoint/blocker categories. Small blocker groups remain hidden. Notes have checkpoint scope and a dismiss action.
- Local history receipts retain attempts, approved changes, checks, names/versions and unfinished work independently of current verification.
- End disconnects Twitch, stops AI work and offers personal local practice; resume reconnects the installed connector.
- The benchmark contains 30 separately identified versioned cases in five categories, including three explicit ambiguous abstentions. Unsupported code is refused, not run or described as repaired.
- Host-only token-renewal diagnostics exercise a real invalid-token 401, refresh stored authorization and validate the renewed token. This needs a successfully completed broadcaster OAuth grant.

## Observed checks

- 25 Node tests and syntax/manifest validation pass.
- Browser release suite: all 30 expected outcomes, three reference checkpoints, the four regressions, receipt history, exact handoff contents, checkpoint note/dismissal, end/continuation/resume, and three independent learner states pass.
- Expected malformed-page failures are reported as failed checks without uncaught browser errors.
- Ten-client local test: 30 writes; measured p95 HTTP 6 ms and room event delivery 1 ms. Room state, opt-in reports and guest sessions survived process restart. These are controlled local figures, not public service latency or AI-throughput claims.
- Earlier hosted evidence: real OpenAI guidance, approved recovery, undo, private context separation, broadcaster C3 command, responsive layout and secret-file rejection.

## Live account checks

The learner test encountered Twitch `redirect_mismatch`. Earlier user reports of successful OAuth authorization are not sufficient evidence of a saved renewable grant. Register this exact callback in the application matching the configured client ID, click Add, then Save Changes:

`https://rejoin-production-bec2.up.railway.app/auth/twitch/callback`

- Learner linking / consented !stuck and !ready: pending observed stored signal after callback correction.
- Broadcaster OAuth and live refresh: pending validated renewable authorization.
- Optional !rejoin replies: pending enabled live rehearsal; off by default.
- Hosted restart/reconnect persistence: pending new deployment verification.
- Human screen-reader and three-person usability review: pending. Three isolated browser personas passed automation; they are not three human participants.

## Submission package

- Genuine main Codex session: `01a1984a-2018-72b3-a62a-790d30a801a5`.
- Description, limitations, links and judge instructions: SUBMISSION.md.
- Repository public visibility: user authorized, pending final history/working-tree secret scan.
- Video: preparing an upload-ready recording; user will upload to YouTube.
- Devpost: user must submit through their account; no connected publishing tool is available.

## Scope retained

One deployment/room, three supported files, a deterministic prepared-code runner, no cloud project sync, no arbitrary execution, and no multi-room or helper-queue claim. Automated checks do not establish learning gains, general code correctness, WCAG conformance or a completed human accessibility review.
