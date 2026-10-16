# HireDaily emergency D1 automation — preview-only setup

This is a separate admin path. **Do not enable it in production until preview checks pass.** The existing Meta callback stays `/webhooks/instagram`; do not change it.

## Backend-only environment variables
- `EMERGENCY_ADMIN_EMAIL`
- `EMERGENCY_ADMIN_PASSWORD_HASH` — SHA-256 hex digest of the chosen admin password; never store the plaintext password here.
- `EMERGENCY_SESSION_SECRET` — long random secret used to sign admin sessions.
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN` — minimum required D1 query permissions.
- `META_ACCESS_TOKEN`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN` (or `EMERGENCY_META_VERIFY_TOKEN`)
- `INSTAGRAM_BUSINESS_ID` (or supported Instagram user ID variable)
- `EMERGENCY_D1_WEBHOOK_ENABLED=true` — leave unset/false until preview tests pass.

## Frontend server-side proxy variables
- `EMERGENCY_BACKEND_URL` — preview backend URL.
- `VERCEL_AUTOMATION_BYPASS_SECRET` — only if the preview backend is protected by Vercel deployment protection.

Never put any of these secrets in client-side `VITE_*` variables or commit them to Git.

## Safe behavior
- Admin API is mounted at `/api/emergency`; the page is `/admin/emergency`.
- D1 webhook routing is opt-in. Until `EMERGENCY_D1_WEBHOOK_ENABLED=true`, the existing Firebase automation remains unchanged.
- For a comment whose media ID has a D1 mapping, the D1 processor owns that event; the legacy processor is skipped to prevent duplicate replies/DMs.
- If D1 processing errors after a mapping is found, the handler does not fall through to legacy automation because a Meta side effect may already have succeeded.
- Posts without a D1 mapping continue through the legacy automation.

## Required preview checks before production consideration
1. Build/typecheck backend and frontend.
2. Confirm login and authenticated mapping read/write/delete.
3. Confirm the latest-post dropdown fills company, role and apply URL.
4. On a controlled test post, verify one public reply and one DM with the exact apply URL.
5. Replay the same webhook and verify no duplicate reply/DM.
6. Verify an unmapped post still uses legacy automation.
7. Confirm production env variables and callback settings remain unchanged.

No production deployment or production environment changes should be made as part of this PR.
