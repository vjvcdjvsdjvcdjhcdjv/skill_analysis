# SkillPath AI — bug audit and repair notes

Reviewed the supplied ZIP; changes are in this corrected source package. This was a targeted code review and local regression exercise, not a guarantee that every possible bug or vulnerability is gone.

## Confirmed issues addressed

| Area | Finding and repair |
| --- | --- |
| Install | Direct esbuild dependency conflicted with Vite's peer requirements. Removed the conflict, generated npm lockfile, removed unused server/Gemini dependencies, and supplied Windows run instructions. |
| New account | Signup/sign-in opens Home. Email-confirmation-required signup does not fabricate a logged-in session. Fresh accounts start without demo answers, history, completed tasks, or personal scores. Dashboard has an onboarding empty state; careers show “Not assessed” until evidence exists. |
| Account separation | Guest persistence is separate from cloud data. One auth subscription replaces repeated subscriptions/fetches on edits. Auth epochs discard stale account-load results. Vault and quiz views remount when the account changes. Guest import requires a choice. |
| Cloud writes | Writes are serialized per user; save failures are surfaced, quiz breakdowns use `domain_breakdowns`, and the quiz-clear service explicitly deletes the user's rows. Auto-sync retries when the browser comes online. |
| Google login | OAuth starts a redirect and waits for the auth callback instead of querying a user before redirect completion. A disabled provider produces an actionable error. The supplied project reported Google disabled in one read-only public settings request. No Firebase login implementation exists in this code. |
| Email recovery | Failed reset requests no longer show a success notice. Recovery links open a form that updates the password. New signup/recovery passwords require at least 8 characters. |
| Repeated attempts | Five-attempt rolling-minute browser backoff plus optional Turnstile token support. Server protection still depends on Supabase Auth configuration. |
| Upload | Metadata inserts explicitly include the current authenticated owner; title and owner/path checks added. Empty/invalid size and mismatched extension/MIME are rejected. Supported document/image types and 10 MiB limit are explicit. Metadata-insert failure attempts storage cleanup. |
| Vault privacy | Client reads/updates/deletes filter by current owner. Signed URL and storage deletion functions reject another user's path. Metadata deletion uses the stored attachment path, and partial cleanup failures are reported accurately. Private-bucket and restrictive owner policies are supplied in SQL, but not applied live. |
| Scores | Non-numeric/non-finite inputs no longer yield NaN. Combined scores are bounded. A quiz-only user gets the actual measured score instead of a blend with an invented 50 baseline. Missing self-report is labelled. |
| Quiz | Attempt IDs use UUIDs; elapsed time uses a monotonic clock, and duplicate option/advance/finalize events are guarded. Random question/option remapping and balanced coverage verified. |
| Browser data | Malformed local workspace/feedback structures are validated; legitimate 0–100 assessment option values survive reload. Local storage failures are surfaced. Unscoped legacy keys are not automatically merged into accounts. |
| Feedback / usability | Failed feedback cloud submission is no longer labelled successful; local copy retained. Assessment options are keyboard-accessible buttons. |

## Verification actually performed

- `npm run lint`: passed TypeScript checking.
- `npm test`: 28 tests passed, including 200 randomized quiz sessions, score bounds, malformed persistence, email-confirmation behavior, OAuth control flow, owner checks, upload success/error/cleanup, database field mapping and owner-scoped delete.
- `npm run test:browser`: 9 Chromium scenarios passed: fresh signup → Home and empty dashboard, account switching, password recovery, email confirmation, rapid failed login backoff, disabled Google provider, successful document upload, failed document upload, and mobile guest navigation/quiz completion/reload. External API calls were intercepted, not sent to a real backend.
- Mobile route checks at 390×844 found no horizontal overflow on the routes exercised. Desktop signup/account flows were exercised at 1440×1000.
- `npm run build`: production bundle built successfully. Vite still warns that the main JavaScript chunk exceeds 500 kB; route-level splitting is a performance improvement listed below.
- A single read-only Auth settings request to the supplied Supabase project returned Google disabled and email enabled. No live accounts, storage objects, or database records were created or changed for this audit. No real password guessing or load attack was run.

Test reproduction is in README.md. Browser regression tests use mocked services and cannot establish production RLS, real Google consent/callback, SMTP delivery, or CAPTCHA enforcement.

## Required project-admin work before launch

1. Review/apply `supabase/SETUP.sql`; verify actual table types, bucket, grants and policies. Run real two-account access-isolation checks using test accounts.
2. Enable/configure Google in Supabase and Google Cloud using `SUPABASE_SETUP.md`; test the real callback from the deployed origin.
3. Configure email delivery, rate limits and optionally Turnstile; test missing/expired tokens and email recovery end to end.
4. Upload one real test PDF after setup, reload, preview/download, and delete it. Office document formats must first be exported to PDF.

## Limits and remaining engineering work

- Supabase admin configuration and SQL were not executed in the live project; the package alone cannot change remote bucket policies or enable Google.
- The provided SQL is a reviewed setup/migration template, not an integration-tested migration against your actual existing schema. It preserves legacy ownerless rows for administrator review.
- Browser MIME/extension checks are not file-content inspection or malware scanning. Public uploads at scale need server-side content validation, quotas, and possibly scanning.
- Cloud sync remains last-write-wins across separate devices/tabs. Unsaved changes within the debounce window, or offline edits followed by closing the browser, can be lost. Account-specific durable drafts and conflict detection are the next reliability improvement.
- Browser-local feedback is not a server-wide anonymous analytics dataset. Its calibration views should not be presented as statistically validated population evidence.
- The app uses exploratory deterministic scoring and a small question bank, not a validated psychometric test or an AI model. The existing 60/40 blend is a product heuristic. Partial self-assessment values should be interpreted as provisional.
- Short-lived signed links remain usable until expiry. File and metadata deletion are not one database transaction; orphan cleanup may need an admin.
- Initial routing, app rendering, and the tested mobile width passed; this is not exhaustive accessibility, cross-browser, or load testing.

## Opinion and improvement priorities

The interface and student workflow are a useful prototype. The biggest readiness gap was identity/data correctness and missing cloud setup; extra features should follow verified real-account upload and login reliability.

1. **Reliability first:** account-specific offline drafts, explicit retry status, multi-device conflict handling, and server error monitoring.
2. **Performance and accessibility:** lazy-load large routes, reduce the initial bundle, finish keyboard/focus support, and audit contrast with real devices.
3. **Better learning evidence:** larger reviewed question bank, question difficulty/version tracking, and feedback tied to observable completed work. Validate recommendations with student outcomes before describing them as predictive.
4. **Useful additions:** assignment reminders, document text extraction/search with user consent, and a portfolio export. Add quotas and server-side file validation before expanding upload formats.
