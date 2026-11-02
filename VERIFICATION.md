# Earlier release evidence

See [RELEASE.md](RELEASE.md) for current 1.1 validation and resolved findings. This file records the earlier release rehearsal.

# Rejoin release evidence

Updated November 1, 2026. These are observed checks, not blanket production certification.

| Flow | Evidence | Limit |
| --- | --- | --- |
| Recovery and preservation | 30 deterministic fixtures in automated suite | Prepared workshop only |
| App logic, privacy and auth | 22 Node tests passing | No independent security audit |
| Real AI recovery | Browser consent → live OpenAI response → candidate checks → approval → working RSVP | Passed on public Railway origin; one prepared fixture, not model accuracy evaluation |
| Customization and undo | Custom event title retained; reload and undo passed in Chromium | No cloud file sync |
| Live Twitch checkpoint | User sent !checkpoint C3; connected room changed from C2 to C3 | Repeated successfully on public Railway origin after local server stopped |
| Host/learner separation | Two isolated browser contexts on public Railway; host changes preserve learner source | One room per deployment |
| Progress privacy | Sharing starts off; revoke works; fewer than five hides breakdown | Self-reported readiness only |
| Refresh handling | Concurrent 401 refresh fixture; encrypted persistence and tamper rejection | Real OAuth renewal still pending |
| Production container | Docker build and HTTP health/frontend/parser checks passed; /.env returns 404 | Public HTTPS health, frontend, parser, secret-file rejection and browser flows passed |
| Keyboard/mobile | Browser layout fits 390px; native controls and visible focus | Full assistive-technology review pending |

Hosted broadcaster authorization and callback registration were completed by the developer; public health reports Twitch connected.

Remaining live checks: learner linking and opt-in chat signals; token renewal after expiry; optional public invitation reply after host enables it; recording and judge repository access.
