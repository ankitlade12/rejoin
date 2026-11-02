# Historical Rejoin feature and release audit

**This audit describes revision 2dea4fe before the fixes. See [RELEASE.md](RELEASE.md) for the current release and verified resolutions.**

Reviewed November 1, 2026 (America/Chicago). Source: `2dea4fe39ebe76afec1eee4e903de629f8e7e87c`. Public app: https://rejoin-production-bec2.up.railway.app. Specification: `../Rejoin_Full_Product_Requirements_and_Technical_Design.docx`.

What this repo does: Rejoin provides a private, browser-local RSVP coding workshop with optional AI tutoring and Twitch-connected instructor controls. This review assumes one instructor, one prepared workshop, and a small cohort; the PRD's ten-active-learner performance target has not been load-tested.

**Verdict: the core hosted demonstration works, but the complete H release is not finished.** All 46 explicitly numbered H requirements were compared with source and available evidence. Passing 22 automated tests is not equivalent to passing the PRD's 16 release gates. No application code, production configuration, or real chat messages were changed during this audit.

## Evidence and limits

- Reran syntax checks and all 22 Node tests: passed.
- Hosted health reports AI configured, instructor configured, and Twitch connected. Browser session cookie has Secure, HttpOnly and SameSite=Lax.
- Rechecked hosted repair/check/approve, unsupported-JavaScript refusal, project export/import, local deletion, and the public overlay. These passed within the restricted prepared-workshop scope.
- Reproduced stale success UI, inaccurate saved-state UI under simulated quota failure, unredacted help export using a fictional credential, inaccessible import control markup, and incorrect Quick Guide copy.
- Earlier release evidence includes a real OpenAI browser recovery, hosted instructor/learner notes/checkpoints/pause/sharing, mobile layout, and an actual broadcaster command changing the public room from C2 to C3. These are earlier observations, not newly repeated live-account tests in this audit.
- Additional hosted checks passed: simulated AI provider outage preserves code and returns an authored hint; cancelling a held AI request preserves code; edits invalidate delayed AI advice; C3 increments a customized attendee count from 105 to 106 and disables repeat registration. AI responses in these failure tests were mocked; they do not measure OpenAI reliability or model quality.
- Read all application modules, server routes, storage/auth/Twitch/AI modules, tests, deployment files, and setup/doctor scripts. Vendored Acorn internals and dependency internals were not audited.

## Must fix

1. **A passing result stays visible after the code changes** — [app.js](dist/app.js:46), [app.js](dist/app.js:42).
   - What this is: the recovery panel and checkpoint indicators tell learners whether their current work has been checked.
   - Problem: after a successful C2 repair, replace the script with `while(true){}`. The stored `verified` value clears, but the screen still says “Back in the flow” and “C2: 3/3 ... checks passed.” The unsupported script is not executed; this is a misleading-status bug.
   - Fix: invalidate the displayed result and mark the edited revision unverified immediately, without rebuilding the editor or losing focus.
   - If skipped: a learner can mistake an old result for verification of new code. Blocks UX 01 and truthful-result acceptance.

2. **A failed save can become a visible “Saved” status** — [app.js](dist/app.js:12), [app.js](dist/app.js:28).
   - What this is: local storage is the only durable copy of learner edits unless exported.
   - Problem: simulate `QuotaExceededError`, edit, then switch files. The app first warns “Save failed,” then renders “Saved on this device.” The old snapshot remains, but the latest edit is not persisted.
   - Fix: render a persistent saved/saving/failed state from actual save outcome; preserve the last good snapshot and export path. Report storage-unavailable preflight failures.
   - If skipped: learners may close the page believing unsaved work is safe. Blocks LRN 02.

3. **Project import cannot be reached through the normal keyboard controls** — [app.js](dist/app.js:78).
   - What this is: users should be able to restore exported work without a mouse.
   - Problem: the file input is `hidden`, and its clickable label is not keyboard-focusable and has no keyboard activation handler. The normal Tab sequence cannot activate import.
   - Fix: use a visible accessible file input or a real button connected to the picker, then test Tab/Enter/Space and focus return.
   - If skipped: the keyboard release gate T15 cannot pass. A screen-reader review is still required after this fix.

4. **Help packets lack the promised redaction and content review** — [app.js](dist/app.js:62).
   - What this is: the learner downloads a packet to send to a human instructor.
   - Problem: the packet includes all three raw files and the question. A fictional credential-like string was exported unchanged. The UI describes the contents but does not preview or redact them; it tells the user to review the downloaded file. Nothing is sent automatically.
   - Fix: show the exact selected packet before export, screen all included text for likely secrets, let the learner exclude material, and include attempted-change context.
   - If skipped: a learner can unknowingly share sensitive text when forwarding the packet. HLP 01 is incomplete; AI's separate secret filter does not protect this path.

## Should fix before calling the complete PRD implemented

5. **Quick Guide contradicts the live AI feature** — [app.js](dist/app.js:76).
   - What this is: onboarding explains which capabilities and data transfers exist.
   - Problem: the hosted app offers working AI help, but Quick Guide says “No cloud sync or runtime AI is enabled.”
   - Fix: make that sentence reflect the configured runtime and separate cloud sync from opt-in AI.
   - If skipped: users receive contradictory privacy/capability guidance during the demo.

6. **The “30 fixture benchmark” does not cover the specified benchmark** — [backend.test.mjs](test/backend.test.mjs:18).
   - What this is: the PRD requires 30 versioned cases across syntax/reference errors, missing steps, alternatives, conflicts, and stale/unsupported/adversarial cases, including ambiguous cases.
   - Problem: the current test generates 30 assertions from six iterations over five patterns. Many differ only in a title/comment; there are no six syntax/reference-error cases or three explicit ambiguous-intent cases, nor independent behavioral checks for every case.
   - Fix: create distinct recorded fixtures with expected dispositions and preservation assertions; run the supported behavioral harness on eligible cases. Keep refusal cases explicit.
   - If skipped: passing this test cannot establish the PRD benchmark or justify general repair claims.

7. **Checkpoints are fixed labels and patterns, not published versioned contracts** — [core.js](dist/core.js:2), [app.js](dist/app.js:31).
   - What this is: a contract binds the lesson, source bundle, prerequisites and trusted checks to a version.
   - Problem: C1–C3 are hardcoded; “v1.0” is displayed, but no manifest validator, reference/test hashes, publication check, or migration contract exists.
   - Fix: provide one prepared immutable manifest, explicit checkpoint bundles/test versions, and a validation command. H does not require a visual authoring UI.
   - If skipped: INS 01 and version-pinning acceptance remain incomplete. Expanding or updating lessons safely is unsupported.

8. **Host reporting and teaching notes are simpler than specified** — [store.mjs](lib/store.mjs:16), [server.mjs](server.mjs:66).
   - What this is: the instructor should see consented checkpoint/recovery groups and common blockers.
   - Problem: only ready/stuck/building/unknown totals exist. There is no blocker category or checkpoint breakdown, and notes are one global string with no checkpoint association or dismiss action. The note dialog says notes appear on the overlay, but the overlay does not render notes.
   - Fix: add minimal consented checkpoint/error categories and a checkpoint-scoped note with dismissal; make the overlay copy match actual output.
   - If skipped: INS 03–05 are incomplete. Current counts are self-reported guest-session signals, not verified learning or active viewer counts.

9. **Ending the workshop does not close Twitch ingestion** — [server.mjs](server.mjs:74), [server.mjs](server.mjs:123).
   - What this is: End workshop should stop new recovery work and end that session's Twitch intake.
   - Problem: the room becomes paused/ended and commands are ignored, but the connector remains subscribed. There is no distinct personal continuation screen.
   - Fix: stop the connector on end, define reconnection on resume, and explain which local activities remain available.
   - If skipped: INS 07 and the post-stream journey remain partial, although ended rooms do ignore chat mutations.

10. **Recovery receipts do not contain the promised history** — [app.js](dist/app.js:63).
    - What this is: a learner can export a record of the completed recovery and unfinished work.
    - Problem: the receipt has target, last verified value, current checks, undo availability and time. It lacks checkpoint names, attempted fixes, approved changes, and remaining work; later edits can clear its check data.
    - Fix: retain a small local recovery record tied to the applied snapshot, distinct from current editor status, and export that record.
    - If skipped: POST 02 remains partial and the downloaded receipt is not a useful full recap.

## Every numbered H requirement

“Implemented” means supported in the current restricted workshop, not a claim of general-purpose coding support or complete security/accessibility certification. “Partial” means useful behavior exists but the stated requirement is not fully met. “Fail” identifies an observed mismatch. “Missing” means the required capability has no implementation.

| ID | Feature | Status | What exists / what remains |
|---|---|---|---|
| ONB 01 | Create room and URLs | Partial | One deployment-configured room/channel; separate host/join/overlay routes and host auth. No room creation or workshop-version binding workflow. |
| ONB 02 | Private guest joining | Implemented | Guest cookie, independent browser contexts, local files; Twitch linking optional. Same browser profile deliberately shares one local workspace. |
| ONB 03 | Scope and privacy before sharing | Partial | Private default and exact AI script preview/consent; limits disclosed. Quick Guide contradicts runtime AI and human packet lacks exact preview. |
| ONB 04 | Starting checkpoint | Partial | Select C1–C3 without replacing files. No checkpoint starter bundles or explicit prerequisite/preflight flow. |
| ONB 05 | Environment preflight | Missing | No consolidated storage/browser/package checks or actionable failure states. Network failure falls back to static-demo behavior. |
| ONB 06 | Protect personal work | Implemented | Whole-file protection; HTML/CSS and comments retained in supported repairs; unknown scripts refused. No range protection, but PRD allows files or ranges. |
| LRN 01 | Editor and isolated preview | Implemented, restricted | Three-file textarea editor and sandbox/CSP preview. Only recognized script forms execute; unknown programs get a not-run message. |
| LRN 02 | Reliable save states | Fail | Debounced saves, export and unload warning exist. Failed save can be displayed as saved after rerender. |
| LRN 03 | Live, verified and target positions | Partial | Three labels exist; targets do not follow the host automatically. Verification indicators can become stale after edits/checks. |
| LRN 04 | Contextual help request | Partial | Captured script/question/target and snapshot comparison. No complete snapshot/version/error evidence contract; chat does not open a private recovery request. |
| LRN 05 | Assistance choices | Partial | Authored hint, AI advice, repair review and downloadable handoff. No addressed host handoff link; manual file forwarding only. |
| LRN 06 | Export and safe undo | Implemented | Project export/import; immediate undo; newer edits cause separate pre-fix export. Detailed receipt gaps tracked under POST 02. |
| LRN 07 | Edit during analysis | Implemented, scoped | Editor remains usable; captured snapshot/target compared before showing AI advice; stale plans rejected on apply. No visible revision identifier. |
| REC 01 | Classify before repair | Partial | Recognizes prepared missing binding, two binding styles and unsupported programs. No broad syntax/reference diagnosis or intent classification. |
| REC 02 | Evidence references | Partial | Static E1/E2 and test names, with explicit static-evidence caveat. Missing snapshot IDs, checkpoint/test versions and line locations. |
| REC 03 | Compatible target selection | Partial | Manual C1–C3 selection and protected-file refusal. No prerequisite-based target recommendation or explanation. |
| REC 04 | Small teaching steps | Implemented, scoped | Hint-first path and explanation. Authored hint is specific to missing binding; C1 needs more appropriate guidance. |
| REC 05 | Protection conflicts | Implemented | Refuses protected script; offers keeping protection/human help or unlocking and reviewing again. |
| REC 06 | Exact patch approval | Partial | Full before/after text, exact snapshot comparison and candidate checks. No immutable target/test version binding or full line-aligned diff. |
| REC 07 | Bounded candidates | Implemented, simplified | One deterministic candidate per suggestion and one AI call with no retries; no autonomous repair loop. No two-attempt planner is claimed. |
| REC 08 | Precise check results | Fail | Failure, unsupported and timeout states exist; old success remains visible after edits. Preservation reporting is limited to unchanged files, not arbitrary behavior. |
| INS 01 | Publish tested checkpoint contracts | Missing | Hardcoded prepared scripts and tests; no validated/versioned manifest publication gate. |
| INS 02 | Live position controls | Implemented | Authenticated host and broadcaster checkpoint/pause; learner files/target remain intact. Hosted real command confirmed in prior release check. |
| INS 03 | Voluntary progress dashboard | Partial | Opt-in status totals, denominator and unknown count. No checkpoint/recovery-state grouping or visible per-report age. |
| INS 04 | Shared blocker groups | Missing | No test-ID/error-category reporting or blocker aggregation. |
| INS 05 | Shared teaching explanation | Partial | Global live note works. No checkpoint/blocker targeting, dismissal or note history. |
| INS 06 | Read-only stream overlay | Partial | Public goal/checkpoint/suppressed aggregates. No rotatable scoped overlay token; output is intentionally public and contains no learner code. |
| INS 07 | Pause/end/continuation | Partial | Pauses help/apply, aborts active AI on end and ignores later chat commands. Does not close Twitch connector or offer a dedicated continuation route. |
| HLP 01 | Redacted reviewed help packet | Fail | Download exists and is never auto-posted. Raw full files included, no redaction or exact in-app preview, no attempt history. |
| POST 01 | Continue after stream | Partial | Already-open editor, local files, lesson and export remain. No offline cold-start cache or distinct post-stream mode. |
| POST 02 | Learning receipt | Partial | JSON summary is clearly not a certificate. Missing approved patch/attempt history, named checkpoints and unfinished work. |
| UX 01 | Truthful status language | Fail | Most refusal/timeout language is clear, but stale success and false saved label violate it. |
| UX 02 | Keyboard operation | Fail | Native editor/buttons and linear full-file review. Hidden import control is inaccessible through normal keyboard navigation; complete keyboard/reader gate not passed. |
| UX 03 | Perceivable results | Partial | Text/icons, live toast, browser zoom and reduced-motion CSS. No full contrast, zoom, focus, async-announcement or screen-reader validation. |
| UX 04 | Attention controls | Partial | Non-blocking editor, expandable file review, no approval countdown. No notification pause/dismiss controls or collapsible recovery panel. |
| AI 01 | Treat inputs as untrusted | Implemented, bounded | Untrusted-data instruction, structured data, allowlisted evidence and no tools. No claim that every possible prompt injection has been evaluated. |
| AI 02 | Restrict AI authority | Implemented | Model returns guidance, cannot execute/apply/change tests; deterministic local code owns patches. |
| AI 03 | Evidence-based uncertainty | Implemented, scoped | Explicit static evidence/no execution warning, unsupported implementation handoff, no numeric confidence. |
| AI 04 | Useful explanations | Implemented, scoped | Hint/explanation/evidence; no private reasoning returned. Real hosted response was observed previously; broader tutor quality unmeasured. |
| SEC 01 | Execution isolation | Partial / narrowed | Opaque sandbox/CSP and canonical trusted scripts; arbitrary learner execution rejected. No fresh server worker, resource-limited general runner or independently signed verdict. |
| SEC 02 | File/path constraints | Implemented, narrower | Three exact UTF-8 text filenames, 100KB each, size/path rejection, no archive execution. PRD permits up to 20 files and a manifest; current app supports three only. |
| SEC 03 | Ownership/isolation | Implemented in current topology | Local workspaces, private guest/host sessions, no remote private project endpoints. Public SSE carries only public room fields. Multi-room/cloud ownership is not implemented. |
| SEC 04 | Minimize secrets | Partial | AI script/question filter and no raw credential logging; secrets excluded from source. Human handoff lacks screening/redaction. |
| SEC 05 | Sessions/OAuth/overlay scope | Partial | Secure cookies, CSRF, OAuth state, 24h sessions and encrypted broadcaster token storage. No revocable overlay token; real learner-linking flow still pending. |
| SEC 06 | Limits and cancellation | Partial | 35KB request cap, AI user/room caps, abort/delete and 45s timeout. No fair queue or host spend-ceiling UI; proxy/IP behavior and ten-user load unmeasured. |
| SEC 07 | Reversible sharing/deletion | Partial | Progress revocation, unlink and local/server guest deletion. No managed help-case access to revoke; exported-copy limitation not clearly explained in handoff UI. |

## Release gates T01–T16

| Gate | Current evidence | Result against the full gate |
|---|---|---|
| T01 Guest edit/save/reload/isolation | Prior two-context browser test and storage tests | Core flow passes; storage-failure bug remains under LRN 02. |
| T02 Repair while preserving title/colors | Core tests and real hosted approved repair | Pass for supported prepared scripts. |
| T03 Valid alternative accepted | `onclick` and `addEventListener` fixtures | Pass for the two recognized forms; other valid programs are refused, not rewritten. |
| T04 Protected bug | Automated conflict test | Pass for whole-file protection. |
| T05 Edited revision invalidates candidate | Snapshot mismatch test | Pass for apply prevention; stale visible status still fails UX gate. |
| T06 Duplicate/lost apply | Duplicate rejected without second mutation | Partial: local-only application; no idempotency key returning the original result after a network retry. |
| T07 Timeout/provider failure | Timeout code, provider-failure UI audit | Partial: no recorded actual timeout/cancellation-provider race matrix for exact release. |
| T08 Malicious instructions | Static untrusted comment tests; model has no tool authority | Covered within restricted scope; not a broad model-adversarial evaluation. |
| T09 Loop/network/fake PASS | Rejected before execution; canonical trusted script prevents comment injection | Covered for restricted runner; no arbitrary-code worker is present. |
| T10 Guessed private IDs | Independent sessions, CSRF, nonexistent project routes | Covered for local-only topology; no multi-room/private snapshot API exists. |
| T11 Superseded checkpoint | Target stays put on host movement | Partial: no immutable published versions or migration contract. |
| T12 Undo after manual edits | Core and hosted browser test | Pass: separate pre-fix copy retains current edits. |
| T13 Twitch disconnect/replay | Mocked migration/revocation/deduplication; actual live command | Partial: controlled real disconnect/reconnect rehearsal not recorded. |
| T14 Revoke/delete | HTTP tests, earlier live revoke, current UI deletion | Pass for stored guest data/local workspace; cannot revoke downloaded third-party copies. |
| T15 Keyboard and screen reader | Import accessibility defect; no human reader session | Not passed. |
| T16 Cohort below five | Store fixtures and public overlay observation | Pass: breakdown suppressed. |

The PRD also requires a real three-learner demonstration and a benchmark with no preservation violations/false success. Neither the complete demonstration nor the specified benchmark is recorded. Therefore the PRD's overall go/no-go gate is **not passed**.

## Features intentionally outside H

Do not count these as hackathon blockers: cloud sync across devices, teaching-assistant queue, collaborative recovery, instructor visual authoring UI, branching lessons, persistent learning history, translated explanations, multi-language runtimes, arbitrary repository/package execution, marketplace, institutional controls, and other streaming platforms. They remain beta/later scope.

The separate server verification worker and versioned prepared manifest are not merely “beta authoring UI”: the PRD discusses them in H. Current restricted execution is a deliberate narrowing and must be disclosed; supported prepared checks are not arbitrary-code verification.

## Live verification still outstanding

- Learner OAuth linking followed by opt-in `!stuck` / `!ready`, then unlink/revoke.
- Broadcaster access token actually expiring and renewing on the hosted service. Initial OAuth authorization completed, but refresh has only fixture evidence.
- Optional `!rejoin` public reply after explicit host enable. Keep it off until an authorized rehearsal; audit sent no chat messages.
- Controlled Twitch disconnect/reconnect, server restart with persistent room/auth data, and restore/rollback procedure.
- Ten active learners, concurrent AI requests, event-latency/AI-latency measurements, and resource/cost observations.
- Full keyboard, zoom/contrast and human screen-reader review.
- A real three-learner walkthrough showing repair, valid alternative and protected conflict.

## Submission work

- Make the currently private GitHub source accessible to judges by an approved visibility/access choice.
- Record and publish the required demo with actual Twitch interaction, not simulated chat.
- Include the genuine Codex session ID and final testing instructions/limitations.
- Complete the Devpost submission. This audit does not submit or publish anything.

## Recommended order

1. Fix stale result, save-state and keyboard-import bugs; add targeted regressions.
2. Correct onboarding copy and add exact redacted handoff review.
3. Finish the prepared checkpoint manifest and receipt contract; add minimum blocker reporting and clear end/continuation behavior.
4. Complete missing acceptance fixtures, accessibility checks and live integration rehearsals.
5. Freeze the tested revision, record the demo, grant judge access and submit.

Not checked: human screen-reader usability, real learner OAuth/refresh/replies, dependency internals, load/cost targets, Railway restart/restore behavior, and the new three-person filmed rehearsal. Existing hosting and the approved real OpenAI flow are working evidence, not substitutes for those checks.
