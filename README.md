# SkillPath AI — corrected project

React + TypeScript + Vite frontend with Supabase Auth, Postgres, and private Storage.
The scoring system is deterministic; it does not call Gemini. There is no Firebase implementation in this ZIP. `FirebaseUser` is only a compatibility type alias for a Supabase user.

## Run locally

Install Node.js 22.13+ (Node 24 also works), extract the ZIP, and open a terminal inside the project:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. On Windows you can double-click `RUN-WINDOWS.bat`.
Do not open index.html directly. The original public Supabase connection is retained in `src/config/supabase.public.json`; no secret is required for guest mode.
To use another project, copy `.env.example` to `.env.local`, set its URL and publishable key, and restart Vite. Never put a service-role key or Google OAuth secret in frontend code or `VITE_*` variables.

## Required cloud setup

Read **SUPABASE_SETUP.md**. Upload permissions and the Google provider are controlled by your Supabase project, not by changing frontend code alone.
The supplied project's public Auth settings reported Google disabled during this audit. Email sign-in is enabled.

## Verify and build

```sh
npm run lint
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run preview
```

Browser tests intercept all external Supabase requests; they do not create live users or upload live files. If Chromium is already installed, set `BROWSER_EXECUTABLE` to its absolute path.
The ZIP contains source and a reproducible npm lockfile, not node_modules. npm is the supported package manager; the stale Bun lockfile was removed.
Deploy the generated `dist` directory to your static host and add that exact origin to Supabase redirect settings.

## Corrected account behavior

- Successful signup/sign-in opens **Home**. If email confirmation is required, the screen asks the user to confirm first.
- A new real account has no demo answers, quiz attempts, completed tasks, or personal scores. Dashboard says **No scores yet**.
- Guest work stays separate and is imported only when chosen. Older unscoped browser keys are not automatically imported because they may contain another signed-in user's data; cloud records are preserved.
- With only quiz results, the measured quiz supplies the score. When self-report exists too, the app uses the existing 60/40 blend. Partially entered self-report remains exploratory; it is not a validated career prediction.
- Documents supported: PDF, PNG, JPG/JPEG, TXT, MD; nonempty files up to 10 MiB. DOCX and PPTX are not supported in this release; export those to PDF.

See **AUDIT.md** for findings, tests, limits, and prioritized improvements.
