# PLAT GYM

A responsive gym-reception operations MVP for managing members, visits, membership expiry, personal-training bookings, payments, trainers, and membership plans.

## Handoff status

- **Application:** complete and validated locally
- **Live URL:** not provisioned in this checkout; Vercel credentials are required
- **Remote repository:** not provisioned in this checkout; the project is ready to push
- **Production database:** migration is ready; a hosted Supabase project is required
- **Production schema:** [`supabase/migrations/20260911140840_initial_gym_schema.sql`](supabase/migrations/20260911140840_initial_gym_schema.sql)

No production credentials are committed. Development demo data is isolated in a local SQLite database and is not included in the production migration.

## Implemented workflows

- **Dashboard:** members, Cairo-day visits, memberships expiring in 14 days, today's non-cancelled PT bookings, paid revenue in EGP, quick links, expiring members, latest check-ins, and today's PT schedule.
- **Members:** name/phone search; active, expiring, and expired filters; add, edit, profile, renewal, and one-click visit recording.
- **Visits:** automatic current timestamp, immediate dashboard/profile updates, and a confirmation warning before admitting an expired member.
- **Personal training:** member, trainer, date, live available-slot, price, and payment-status flow; trainer-slot collisions are blocked in both application logic and the database.
- **Bookings:** today/upcoming views and Scheduled, Completed, and Cancelled status updates.
- **Payments:** membership/PT records, Paid/Pending states, EGP amount/date, filters, and paid-only daily revenue.
- **Trainers:** contact details, specialization, weekly availability, and active status. Manager-only editing.
- **Settings:** database-managed Monthly, 3 Months, 6 Months, and Yearly plans with automatic expiration calculation. Manager only.
- **Authentication:** manager and receptionist accounts. Receptionists can operate the front desk but cannot change trainers or membership settings.
- **Responsive/PWA:** desktop sidebar, mobile bottom navigation, safe-area handling, manifest, installable standalone display, and touch-friendly dialogs/forms.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- shadcn/Base UI primitives
- Kysely with PostgreSQL in production and SQLite for isolated development/demo mode
- Supabase PostgreSQL and Supabase Auth for production
- Vitest and Playwright
- Vercel-ready deployment

## Local demo

### Requirements

- Node.js 20 or newer
- npm

### Start

```bash
npm ci
cp .env.example .env.local
```

Set a random `SESSION_SECRET` of at least 32 bytes in `.env.local`, for example:

```bash
openssl rand -base64 48
```

Keep these development values enabled:

```dotenv
SQLITE_PATH=./data/plat-gym.db
SEED_DEMO_DATA=true
```

Then run:

```bash
npm run dev
```

Open <http://localhost:3000>.

### Development-only accounts

| Role | Email | Password |
|---|---|---|
| Manager | `admin@platgym.eg` | `PlatGym2026!` |
| Receptionist | `reception@platgym.eg` | `Reception2026!` |

These credentials are intentionally limited to local seeded demo mode. Use different passwords for production.

The local seed creates 32 Egyptian members across active/expiring/expired states, four trainers with schedules, visits, PT bookings, and paid/pending payments. Delete `data/plat-gym.db*` to rebuild the demo database on the next start.

## Production setup: Supabase + Vercel

### 1. Create the Supabase database

Create a Supabase project and apply:

```text
supabase/migrations/20260911140840_initial_gym_schema.sql
```

You can use the Supabase SQL editor or an authenticated Supabase CLI. The migration creates only the schema and four base membership plans—never demo members or transactions.

### 2. Provision staff accounts

On a trusted machine, set these variables temporarily:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
BOOTSTRAP_ADMIN_PASSWORD=use-a-unique-strong-password
BOOTSTRAP_RECEPTIONIST_PASSWORD=use-another-unique-strong-password
```

Optional name/email overrides are documented in `.env.example`. Then run:

```bash
npm run db:bootstrap:supabase
```

The script idempotently creates/updates the two Supabase Auth users and their `staff_profiles` rows. Remove the service-role key from the shell afterward. **Never expose it to browser code or store it as a public environment variable.**

### 3. Configure Vercel

Set these production environment variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION_STRING
DB_SSL=true
DB_POOL_SIZE=5
```

Use the Supabase pooler connection string when appropriate for serverless hosting. Do not enable `SEED_DEMO_DATA` in production and do not deploy with SQLite: Vercel's filesystem is ephemeral.

Deploy with the standard settings:

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output: Next.js default

After deployment, set the Supabase Auth site URL/allowed redirect URLs to the final HTTPS domain and smoke-test both staff roles.

## Data model and security

Core relationships:

- `auth.users` 1:1 `staff_profiles`
- `membership_types` 1:N `members`
- `members` 1:N `visits`
- `members` 1:N `bookings`
- `trainers` 1:N `trainer_availability`
- `trainers` 1:N `bookings`
- `members` 1:N `payments`
- `bookings` 0..1:N `payments`

The production migration includes UUID primary keys, foreign keys, validation checks, search/operations indexes, a partial unique trainer/date/time index for race-safe collision prevention, least-privilege grants, and row-level security policies. Server handlers also authenticate every operation and enforce manager-only settings/trainer mutations.

Operational date boundaries use `Africa/Cairo`. Money is stored as PostgreSQL `numeric(10,2)` and displayed in EGP. Membership expiration is inclusive and calculated as the day before the matching monthly anniversary, with month-end clamping.

## Validation

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run verify
```

The Playwright suite validates:

- responsive staff login and dashboard
- member creation, search, edit, visit, renewal, statuses, and expired-member warning
- PT booking, trainer collision prevention, completion/cancellation, and payment linkage
- pending-versus-paid revenue behavior
- every dashboard aggregate against direct relational database queries
- receptionist authorization boundaries
- real UI submission paths for member, visit, renewal, PT booking, and payment forms

## Short manager guide

1. **Start the day on Dashboard** to review expirations, check-ins, PT sessions, and paid revenue.
2. **Find a member** from the top search or Members page. Use **Add visit** at check-in; only override an expired warning after confirming with the member.
3. **Renew** from the member row/profile, choose the plan and payment state, and confirm the amount.
4. **Book PT** by choosing a member and trainer, then selecting an enabled date and available time. The shown price is saved with a linked payment record.
5. **Manage sessions** in Bookings. Mark sessions Completed or Cancelled as needed.
6. **Reconcile money** in Payments. Pending records do not count toward dashboard revenue until marked Paid.
7. Managers can maintain trainer availability and plan pricing. Receptionists cannot change those sensitive settings.

## Known MVP limitations

- Single gym/branch, one currency (EGP), English interface, and Cairo timezone.
- The PWA shell is installable but operational writes require a network connection; there is no offline synchronization.
- No member deletion, payroll, commissions, inventory, advanced accounting, recurring billing, analytics charts, exports, or customer-facing app.
- Current membership dates live on the member record; renewal payment history is retained, but there is no separate historical membership-period ledger.
- Staff account administration is performed with the trusted bootstrap script rather than an in-app user-management screen.
- Backups, monitoring, custom domain, SMTP, and production secret rotation are hosting/operator responsibilities.
