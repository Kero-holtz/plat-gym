# Validation Report

Release validation date: 11 September 2026  
Environment: Node.js 20, production-mode Next.js server for E2E  
Result: no known defect in the validated MVP flows

## Final command results

| Check | Command | Result |
|---|---|---|
| Dependencies | `npm ci` | lockfile-backed installation |
| Lint | `npm run lint` | passed |
| TypeScript | `npm run typecheck` | passed |
| Unit tests | `npm run test:unit` | 4/4 passed |
| E2E tests | `npm run test:e2e` | 7/7 passed |
| Relational fixture | `npm run verify` | 0 FK problems, 0 double bookings |
| Production build | `npm run build` | passed without local secrets |
| Vercel package smoke | build with required placeholder variable shapes | passed |
| Dependency security | `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| ZIP integrity | `unzip -t` | passed |
| Secret/generated scan | archive and tracked paths | clean |

## Unit coverage

`tests/unit/dates.test.ts` verifies:

1. Membership expiry is inclusive and ends one day before the monthly anniversary.
2. Month-end dates clamp correctly.
3. Active/expiring/expired status boundaries are correct.
4. Renewal starts after an active membership or today after an expired membership.

## E2E scenarios

`tests/e2e/critical-flows.spec.ts` runs Chromium against a freshly built `next start` server and a freshly reset isolated SQLite fixture.

1. **Authentication and responsiveness**
   - Login fields are blank.
   - No demo-account controls exist.
   - Manager login succeeds.
   - Dashboard and critical content render.
   - Mobile navigation appears at 390×844.
   - No horizontal document overflow or console errors.

2. **Member lifecycle**
   - Create member and initial membership/payment.
   - Search by phone.
   - Edit profile.
   - Record visit and verify dashboard increments.
   - Renew and verify expiration/payment.
   - Block unconfirmed expired visit and allow confirmed visit.
   - Verify expiring status.

3. **PT invariants**
   - Find a real available slot.
   - Create booking.
   - Reject a second member in the same trainer slot.
   - Complete booking and confirm linked payment.
   - Cancel and verify a replacement can use the released slot.

4. **Payments and dashboard aggregates**
   - Pending payment does not affect revenue.
   - Marking Paid increases revenue by the exact amount.
   - Members, visits, expirations, bookings, and revenue are each compared to direct SQLite queries.

5. **Authorization**
   - Receptionist login succeeds.
   - Receptionist trainer mutation returns 403.
   - Receptionist direct settings navigation redirects.
   - Normal reception desk access remains available.

6. **Member dialogs through UI**
   - Add, search/open, visit, edit, and renew via visible controls.
   - Expired warning dialog is visible and cancellable.

7. **PT and payment forms through UI**
   - Complete member/trainer/date/time/confirmation wizard.
   - Verify semantic booking confirmation.
   - Record payment through the actual dialog.

## Visual review

Reviewed at:

- 1440×1000 desktop operational views
- 390×844 mobile dashboard, members, PT, payments, and login

Observed qualities:

- Strong hierarchy and restrained operations-focused style
- Table/card transformations work at mobile width
- Fixed mobile navigation and safe bottom padding behave correctly
- Actions remain visible and touch-friendly
- No horizontal overflow
- Clean login has no prefilled credentials or demo panel

## Production safeguards verified

- `.env.local` and databases are not tracked.
- Production Supabase migration has no staff or operational sample rows.
- Supabase seeding is disabled.
- Test fixture runs only with explicit `PLAT_GYM_TEST_MODE=true`.
- Test mode is rejected on Vercel.
- Required Vercel database/Auth variables are checked during configuration load.
- Vercel upload exclusions do not break the production build.

## What requires hosted verification

The following can only be completed after external deployment:

- Supabase migration execution against the owner's project
- Real manager/receptionist Auth provisioning
- Hosted PostgreSQL connectivity
- Vercel HTTPS and final domain
- Hosted role smoke test
- Owner-controlled backups, monitoring, and DNS

Use `DEPLOYMENT_HANDOFF.md` for those steps.
