# Careerly OS — production-oriented career automation platform

This repository is intended to run against real services, not hardcoded demo data.

## Production architecture
- Next.js + TypeScript application server
- PostgreSQL persistence
- User-owned email/password accounts with bcrypt hashing
- Optional TOTP authenticator-app MFA with QR enrollment
- Server-side encrypted OAuth tokens
- Live Greenhouse public job ingestion
- Live Lever public job ingestion
- Google OAuth for Gmail + Calendar
- Provider application adapters for authorized Greenhouse/Lever employer credentials
- User-assisted apply fallback using the real employer application URL when third-party submission is not authorized
- Audit logs and global automation kill switch

## Important real-world boundary
Greenhouse's application endpoint requires Basic Auth using an application API key, and Lever's posting application endpoint requires an authorized API key. A consumer career product cannot legitimately submit to every employer without those employer-side authorizations. Careerly therefore supports real submissions when an authorized provider credential exists and otherwise opens the real application URL for user completion. This avoids fake success states and unauthorized automation.

## Setup
1. Copy `.env.example` to `.env`.
2. Set a strong `AUTH_SECRET` and `APP_ENCRYPTION_KEY`.
3. Set `DATABASE_URL` to a real PostgreSQL instance.
4. Configure Google OAuth redirect URI as `${NEXT_PUBLIC_APP_URL}/api/integrations/google/callback` and request the Gmail/Calendar scopes used by the app.
5. Install dependencies with `npm install`.
6. Run `npm run db:push` for a fresh database or `npx prisma migrate deploy` in a migration-based deployment.
7. Start with `npm run dev` or deploy the container.

## No seeded credentials
`prisma/seed.ts` does not create demo accounts or fake jobs. Users register their own account and choose their own password.
