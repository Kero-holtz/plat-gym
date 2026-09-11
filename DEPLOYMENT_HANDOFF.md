# PLAT GYM — Production Deployment Handoff

This guide deploys the supplied source to a **new, clean Supabase project** and **Vercel**. No demo accounts or operational sample records are included.

## 1. Collect owner-approved values

Before starting, obtain these privately from the gym owner. Do not invent public credentials and do not place secrets in chat, Git, screenshots, tickets, or documentation.

- GitHub organization/account and repository visibility
- Supabase organization, project name, region, and a strong database password
- Real manager: name, email, unique strong password
- Real receptionist: name, email, different unique strong password
- Final Vercel project/domain name

Use a password manager. The two staff accounts must not share a password.

## 2. Verify the release locally

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run verify
npm run build
```

Expected result: lint/typecheck/build pass, 4 unit tests pass, 7 Playwright scenarios pass, and data verification reports no foreign-key or double-booking problems.

The E2E suite creates only `data/plat-gym-test.db`. Never upload that file.

## 3. Use the existing private repository

The clean source is already published at:

```text
https://github.com/Kero-holtz/plat-gym
```

Clone that private repository from the owner's GitHub account and deploy its `main` branch. Do not create a second repository. The ZIP is a portable backup and intentionally excludes `.git`, secrets, dependencies, databases, build output, and test reports.

Before deploying or pushing a necessary fix, confirm:

```bash
git status --short
git remote -v
git ls-files | grep -E '(^|/)(\.env|data/|node_modules/|\.next/)' && echo "STOP: sensitive/generated file tracked" || true
```

Any necessary deployment correction must be committed to this repository and pushed to `main` after the complete validation suite passes.

## 4. Create the Supabase project

Create a clean hosted Supabase project in the owner's organization. Store the database password securely.

### Preferred: tracked CLI migration

```bash
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref YOUR_PROJECT_REF
npx --yes supabase@latest db push
```

Review the diff before approving it. The only migration is:

```text
supabase/migrations/20260911140840_initial_gym_schema.sql
```

### Alternative: Supabase SQL Editor

Open the migration file, copy its complete contents into a new SQL Editor query, review it, and run it once against the new project. Do not paste any other seed SQL.

### Confirm the database

The following tables should exist:

- `staff_profiles`
- `membership_types`
- `members`
- `visits`
- `trainers`
- `trainer_availability`
- `bookings`
- `payments`

Confirm that:

- RLS is enabled on every public table.
- `membership_types` contains exactly the four initial plans.
- `staff_profiles` and all operational tables are otherwise empty.
- The partial unique index `trainer_booking_slot_unique` exists.

## 5. Collect runtime connection values

From Supabase project settings, obtain:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
DATABASE_URL=YOUR_POSTGRES_CONNECTION_STRING
DB_SSL=true
DB_POOL_SIZE=5
```

Use the Supabase pooler connection string recommended for serverless workloads. URL-encode special characters in the database password. The database connection string is server-only even though its variable name does not contain `SECRET`.

Do not use the service-role key as the publishable key.

## 6. Create the two real staff accounts

The repository includes an idempotent trusted bootstrap script. Run it from a trusted machine, not from browser code and not as part of every deployment.

Create a temporary protected file:

```bash
umask 077
cat > .env.bootstrap <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
BOOTSTRAP_ADMIN_EMAIL=REAL_MANAGER_EMAIL
BOOTSTRAP_ADMIN_NAME=REAL_MANAGER_NAME
BOOTSTRAP_ADMIN_PASSWORD=REAL_UNIQUE_STRONG_PASSWORD
BOOTSTRAP_RECEPTIONIST_EMAIL=REAL_RECEPTIONIST_EMAIL
BOOTSTRAP_RECEPTIONIST_NAME=REAL_RECEPTIONIST_NAME
BOOTSTRAP_RECEPTIONIST_PASSWORD=ANOTHER_UNIQUE_STRONG_PASSWORD
EOF

set -a
. ./.env.bootstrap
set +a
npm run db:bootstrap:supabase
unset SUPABASE_SERVICE_ROLE_KEY BOOTSTRAP_ADMIN_PASSWORD BOOTSTRAP_RECEPTIONIST_PASSWORD
rm -f .env.bootstrap
```

Expected output lists one ready manager and one ready receptionist. Confirm both users exist in Supabase Authentication and both matching rows exist in `staff_profiles`.

The script updates passwords if rerun, so rerun it only intentionally.

**Never add `SUPABASE_SERVICE_ROLE_KEY` or either bootstrap password to Vercel.**

## 7. Configure Vercel

Import the GitHub repository into the owner's Vercel account.

Use:

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: Next.js default
- Node.js: 20 or newer

Add these variables to Production and any Preview environment that should work:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
DATABASE_URL=...
DB_SSL=true
DB_POOL_SIZE=5
```

Do **not** set any of the following on Vercel:

- `SUPABASE_SERVICE_ROLE_KEY`
- `BOOTSTRAP_*`
- `SESSION_SECRET`
- `SQLITE_PATH`
- `PLAT_GYM_TEST_MODE`
- `TEST_*`

The build intentionally stops if required production variables are missing or test mode is enabled.

Deploy and save the deployment URL.

## 8. Configure Supabase Auth URLs

In Supabase Authentication URL settings:

- Set **Site URL** to the final HTTPS production URL.
- Add the final production URL to allowed redirect URLs.
- Add only intentional Vercel preview URLs if previews need authentication.

The app uses email/password staff authentication; public sign-up is not exposed by the application. Disable unwanted Auth providers and public email sign-up in the Supabase dashboard if they are enabled by project defaults.

## 9. Production smoke test

Use a private/incognito browser and verify:

### Both roles

- `/login` loads over HTTPS with no prefilled credentials or demo controls.
- Invalid credentials show a generic error.
- Real credentials sign in and Sign out works.
- No console errors or failed application API calls.
- Mobile layout has no horizontal overflow.

### Manager

- Dashboard opens with zero operational records on the clean database.
- Four plans appear under Gym settings.
- Trainers can be created and availability saved.
- Member add/edit/profile/renew/check-in works with an owner-approved real record.
- PT availability, booking, status update, and linked payment work.
- Paid-only revenue updates correctly.

### Receptionist

- Members, visits, bookings, and payments work.
- Direct access to `/settings` redirects to Dashboard.
- Trainer and plan mutation APIs return HTTP 403.

### Database

- No sample members, sample trainers, fake transactions, or automated-test users exist.
- A trainer cannot hold two non-cancelled bookings at the same date/time.
- Cancelling a booking releases its slot.
- `recorded_by`/`created_by` values reference the signed-in staff profile.

If smoke testing requires records, use owner-approved initial operational data—do not create undeletable fake members in production.

## 10. Final owner handoff

Give the owner:

- Production URL
- Private repository URL
- Supabase project reference and owning organization
- Vercel project and owning team
- Manager and receptionist emails (passwords through the password manager only)
- Date/time and result of the smoke test
- Backup/monitoring responsibility
- Any custom domain and DNS status

Require password rotation after first sign-in if credentials were handled by the deployer.

## Troubleshooting

- **Vercel build says variables are missing:** add all three required runtime values to the environment being built and redeploy.
- **Database connection error:** use the correct Supabase pooler URL, URL-encode the password, and keep `DB_SSL=true`.
- **“This account does not have staff access”:** rerun the trusted bootstrap with the exact Auth email and verify the matching active `staff_profiles` row.
- **RLS/profile query fails:** confirm the migration completed and the profile ID exactly matches `auth.users.id`.
- **A deployment starts using SQLite:** stop immediately. Production code is designed to reject this; check that the correct build/source and environment were deployed.
- **Trainer slot conflict:** this is expected protection. Choose another slot or cancel the existing booking first.
