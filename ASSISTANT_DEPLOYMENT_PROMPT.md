# Prompt to send to the deployment assistant

I am giving you `PLAT-GYM-production-ready.zip`. You are responsible for the remaining external deployment work only. The application itself is already implemented and validated. Work inside my existing GitHub, Supabase, and Vercel accounts/organizations; do not create personal accounts on my behalf.

## Goal

Publish PLAT GYM as a secure production application using:

- a private GitHub repository
- a new clean Supabase PostgreSQL/Auth project (or the existing project I explicitly identify)
- Vercel

Read `README.md` and follow `DEPLOYMENT_HANDOFF.md` exactly before changing anything.

## Non-negotiable rules

1. Do not add demo accounts, test users, sample members, sample trainers, sample bookings, sample visits, or fake payments to production.
2. Do not upload any SQLite database, `.env` file, test report, screenshot artifact, `node_modules`, `.next`, or secret.
3. Never expose the Supabase service-role key, PostgreSQL connection string, staff passwords, or database password in client code, Git, chat, logs, screenshots, or public environment variables.
4. Never put `SUPABASE_SERVICE_ROLE_KEY`, `BOOTSTRAP_*`, `SESSION_SECRET`, `SQLITE_PATH`, `PLAT_GYM_TEST_MODE`, or `TEST_*` in Vercel.
5. Use two real owner-approved staff identities: one manager and one receptionist. Ask me privately for their names, emails, and unique passwords. Do not invent public credentials.
6. Apply only `supabase/migrations/20260911140840_initial_gym_schema.sql`. It creates the schema and four base plans but no operational data.
7. Preserve the existing responsive design and business rules. Do not replace the UI, remove security checks, or make unrelated feature changes.
8. If a deployment issue requires a code change, explain it first, make the smallest safe fix, rerun all validation, and commit it clearly.
9. Do not call the work complete until the production URL is tested with both roles.

## Required execution

1. Unzip the project and run:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm run test:unit
   npm run test:e2e
   npm run verify
   npm run build
   ```

   Expected: lint/typecheck/build pass, 4 unit tests pass, and 7 E2E tests pass.

2. Create a private GitHub repository in my chosen account/organization, commit the clean source, and push `main`. Verify no secret/generated files are tracked.

3. Create/link the Supabase project and apply the migration with `supabase db push` or run the complete migration once in Supabase SQL Editor. Confirm all eight public tables, foreign keys, indexes, RLS policies, grants, and `trainer_booking_slot_unique` exist. Confirm only the four membership plans contain rows.

4. Privately obtain my real manager and receptionist details. Run `npm run db:bootstrap:supabase` from a trusted machine using a temporary protected environment file as documented. Delete the temporary file immediately. Confirm the two Auth users and matching active `staff_profiles` rows. Do not deploy the service-role key.

5. Import the private repository into Vercel and configure only:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   DATABASE_URL=...
   DB_SSL=true
   DB_POOL_SIZE=5
   ```

   Use the Supabase serverless pooler connection string and Node.js 20+.

6. Deploy, set Supabase Auth Site URL/allowed redirects to the final HTTPS domain, and disable unwanted public sign-up/providers.

7. Smoke-test production in desktop and mobile widths:

   - blank, unprefilled login; invalid login; both real staff logins; sign-out
   - manager settings access and receptionist settings denial
   - dashboard zero/real counts without fake data
   - member add/search/edit/profile/check-in/expired warning/renewal
   - trainer availability and PT booking slot selection
   - double-book prevention, cancellation slot release, and booking status updates
   - paid/pending payments and paid-only dashboard revenue
   - no horizontal mobile overflow, console errors, or failed API calls

   Use only owner-approved initial operational records. Do not leave fake records in production.

8. Return a final handoff containing:

   - production URL
   - private repository URL
   - Supabase project reference/owner
   - Vercel project/team
   - commit hash deployed
   - migration status
   - both staff emails (never include passwords in the report)
   - full validation and smoke-test results
   - environment-variable names configured, without values
   - custom-domain/DNS status
   - any remaining limitation or warning

If anything is blocked, stop and tell me the exact account permission, secret, or owner decision required. Never work around missing production configuration with SQLite or demo credentials.
