# Emergency Instagram automation setup (feature branch)

This feature is intentionally isolated and is **not production-ready until every checklist item below is completed and tested**.

## Environment variables (backend only; never use VITE_ prefixes)
- `EMERGENCY_ADMIN_SECRET`: generate a random secret of at least 32 characters and configure it in the hosting provider's server environment.
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`: token scoped to the intended D1 database with the minimum permissions needed to run SQL queries.

Do not put these values in source control, frontend variables, screenshots, or chat. The backend currently creates the mapping tables automatically when the mappings API is used.

## Current implemented scope
- `GET /api/emergency/status` reports whether the required variables are present.
- `POST /api/emergency/login` exchanges the secret for a signed, 30-minute stateless bearer token and is rate-limited.
- `GET/POST /api/emergency/mappings` read/write post-to-apply-link mappings in Cloudflare D1.
- Apply URLs must be HTTPS and cannot contain embedded credentials.
- The admin page lives at `/admin/emergency` on the feature branch.

## Not implemented yet — do not enable live usage
- Emergency webhook processing that reads D1 mappings and sends Instagram comment replies and DMs.
- Atomic durable action claims and webhook-event deduplication for the emergency path.
- Meta webhook subscription/signature and Graph API end-to-end tests for this emergency path.
- Browser/backend build and automated test run for this branch.
- Production deployment and a controlled test on a post you own.

The existing Instagram webhook handler relies on Firebase for mappings, logs, and durable idempotency. Do not route the same webhook to both the existing handler and an emergency handler unless explicit event ownership/deduplication is implemented; otherwise users may receive duplicate replies or DMs.

## Rollout checklist
1. Configure D1 and server-only environment variables on a preview deployment.
2. Confirm unauthenticated mapping reads/writes return 401 and bad access codes are rate-limited.
3. Verify the mapping survives separate serverless invocations.
4. Implement and test the emergency webhook path with Meta's documented payloads and signed requests.
5. Confirm durable dedupe across concurrent duplicate deliveries.
6. Test comment reply and DM button against a controlled Instagram post and verify the destination is the exact official URL.
7. Only then consider merging/deploying. Keep the existing automation untouched until the emergency path passes.
