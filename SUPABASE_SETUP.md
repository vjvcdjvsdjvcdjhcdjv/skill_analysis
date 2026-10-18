# Supabase setup and verification

## 1. Documents / Study Vault

The code now includes the authenticated `user_id` when inserting metadata, uses owner-specific private paths, surfaces storage/database failures, and attempts file cleanup if metadata creation fails. An admin still has to verify the project schema, bucket, and policies. We did not modify the live database or assert that its existing policies match the proposed setup.

1. Back up existing project data, then open the Supabase SQL Editor for the same project as your frontend config.
2. Review and run `supabase/SETUP.sql`. It creates missing profile, quiz, vault and feedback structures, a private `vault` bucket, a 10 MiB limit, allowed MIME types, and owner-only row/storage policies. It preserves existing records, including legacy rows with no owner. Existing incompatible column types require a reviewed migration; the transaction rolls back if any statement fails.
3. Review the policy listing returned at the end. Restrictive owner guards narrow previously broad permissive rules on these app tables and the vault bucket. Other restrictive policies can still deny operations; resolve conflicting project-specific policies deliberately.
4. Sign in with a test account and upload a small PDF. Check that the metadata row has that user's UUID and its `file_path` begins with the same UUID.
5. Reload and confirm the file remains listed; preview/download it and delete the test item. Signed links are short-lived. Never make the bucket public to work around permission failures.
6. With a second test account, verify it cannot list, sign, overwrite, update metadata for, or delete the first account's files. Verify anonymous calls cannot access them. These server-policy checks must be run against your actual project after migration; local mocked tests cannot prove RLS enforcement.

Files with legacy NULL `user_id` are hidden, not deleted. Have the administrator verify ownership from trusted records before migrating them. Do not assign all old records to the current user. If a metadata delete succeeds but file cleanup fails, the UI reports the partial result; an administrator can remove the orphan after checking references.

Troubleshooting:

| Failure | Check |
| --- | --- |
| Bucket not found / missing relation or column | Run and verify the setup SQL in the correct project. |
| New row violates row-level security / permission denied | Signed-in user, owner UUID/path, grants, and all restrictive policies. |
| Invalid JWT / session expired | Sign in again; check the frontend points to the same project. |
| Unsupported file | Use PDF, PNG, JPG/JPEG, TXT, or MD; export Office documents to PDF. |
| File too large / empty | Use a nonempty file at most 10 MiB. |
| Network failure | Retry after reconnecting; do not assume the file was saved. |

## 2. Google login (Supabase, not Firebase)

The supplied project's `/auth/v1/settings` returned `external.google = false` during a read-only check. Enabling Google only in Firebase will not enable this Supabase implementation.

1. In Google Cloud, configure an OAuth consent screen and a **Web application** OAuth client. Add test users if the consent screen is in testing mode.
2. Add authorized JavaScript origins: `http://localhost:3000` and your exact production site origin.
3. Add this authorized redirect URI for the supplied Supabase project:

   `https://yxyxpovlnbzyvhakfpoe.supabase.co/auth/v1/callback`

   For another project, use the callback URL shown in its Supabase Google provider settings.
4. In Supabase Authentication → Sign In / Providers → Google, enable Google and enter the Google OAuth client ID and secret. The secret belongs only in the Supabase dashboard.
5. In Supabase Auth URL Configuration, set the production Site URL and allow the local and production return URLs used by the app. Include the recovery URL `http://localhost:3000/?recovery=1` and its production equivalent.
6. Save, open a fresh browser session, choose **Continue with Google**, complete consent, and confirm you return to Home with the correct account. This real consent/callback flow requires your provider setup and was not completed in the local mocked test.

Do not add a second independent Firebase login system unless you also design a verified Firebase-to-Supabase identity integration. Merely signing in to Firebase does not create a Supabase authenticated session for Storage RLS.

Official guide: https://supabase.com/docs/guides/auth/social-login/auth-google

## 3. Repeated login protection and recovery

The frontend limits rapid attempts to five per rolling minute in the current session. This is UX backoff, not server enforcement: an attacker can bypass browser code or clear storage.

- Review Supabase Auth rate limits and password/security settings. Enable email confirmation for public signups if appropriate for your product.
- The code supports optional Cloudflare Turnstile. Create a site for your local/production hostnames, configure its secret in Supabase Auth CAPTCHA settings, then put only the public site key in `VITE_TURNSTILE_SITE_KEY` and rebuild. Tokens are passed with signup, email login, and reset requests. Enabling server CAPTCHA without setting the client site key will block these requests.
- Test CAPTCHA with valid, expired, and missing tokens after setup; it was not activated against the live project in this audit.
- Configure email delivery and test a recovery email end to end. The app now has a new-password form and reports reset-request failures instead of saying every request succeeded.
- Feedback is append-only and requires sign-in under the provided SQL; anonymous guests retain a device copy and see a cloud failure if they try to submit.

Official references:
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/storage/security/access-control
