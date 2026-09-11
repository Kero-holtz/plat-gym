# PLAT GYM — Complete Project Context

Last updated: 11 September 2026  
Primary timezone: `Africa/Cairo`  
Repository: <https://github.com/Kero-holtz/plat-gym> (private)  
Production status: source complete; hosted Supabase and Vercel deployment still required

## 1. Product purpose

PLAT GYM is a focused daily operations system for a real gym reception desk. It replaces paper/manual tracking for:

1. Members and current memberships
2. Daily entry/check-in visits
3. Membership expiration and renewals
4. Personal-training availability and bookings
5. Membership and PT payments
6. Trainers and weekly availability
7. Manager-controlled membership plans

It is intentionally not a broad ERP, marketing platform, social app, workout planner, or advanced accounting product.

## 2. Intended users and authorization

### Manager

- Full operational access
- Create/edit trainers and availability
- Create/edit/activate/deactivate membership types
- All receptionist capabilities

### Receptionist

- Search, add, and edit members
- Record visits, including confirmed expired-member admission
- Renew memberships
- Create and manage PT bookings
- Record and update payments
- Read active trainers and plans
- Cannot mutate trainers or membership settings

Production requires two real owner-approved Supabase Auth users and matching `staff_profiles` records. There are no production/demo users in this repository.

## 3. Completed feature surface

### Dashboard

- Total registered members
- Visits within the current Cairo calendar day
- Memberships expiring from today through 14 days ahead
- Today's non-cancelled PT bookings
- Today's paid-only revenue in EGP
- Quick links to primary reception workflows
- Nearest-expiring member list
- Latest check-ins
- Today's PT schedule

### Members and profiles

- Search by normalized name or Egyptian mobile number
- All, Active, Expiring soon, and Expired filters
- Create member and initial membership payment transactionally
- Edit name, phone, and notes
- Detailed profile with current plan, dates, calculated status, visit totals/history, and payments
- One-click visit recording
- Explicit warning before recording an expired member's visit
- Renewal with plan, calculated expiration, amount, and Paid/Pending payment

### Personal training and bookings

- Member selection
- Active trainer selection
- Next-14-day date choice
- Availability derived from weekly trainer hours
- Hourly slots with past/occupied times disabled
- Displayed and persisted price
- Paid/Pending linked PT payment
- Race-safe trainer/date/time collision prevention
- Today, Upcoming, and All booking scopes
- Scheduled, Completed, and Cancelled status changes
- Cancelling releases a protected trainer slot

### Payments

- Membership and PT payment types
- Paid and Pending states
- EGP amount and payment date
- Name/phone search and status/type filters
- Dashboard revenue includes only Paid records dated today

### Trainers and settings

- Trainer name, phone, specialization, availability, active state
- Seven-day working-hours editor
- Database-managed Monthly, 3 Months, 6 Months, and Yearly plans
- Automatic inclusive expiration calculation with month-end clamping
- Manager-only mutations at both page and API layers

### Interface

- Responsive desktop sidebar and mobile bottom navigation
- Global member search with keyboard shortcut
- Installable PWA manifest
- Locally packaged fonts; no runtime CDN dependency
- Accessible labels, focus states, dialogs, alerts, status text, loading/error/empty states
- Warm neutral canvas with graphite navigation, cobalt actions, restrained semantic colors
- Reduced-motion and safe-area handling

The authoritative visual direction is in `design-system/plat-gym/MASTER.md`.

## 4. Architecture

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- shadcn/Base UI component primitives
- Kysely query builder
- Production PostgreSQL hosted by Supabase
- Supabase Auth with SSR cookie handling
- Vercel deployment target
- SQLite only for local development and an explicitly enabled automated-test fixture
- Vitest unit tests and Playwright production-mode E2E tests

Browser components call same-origin `/api/*` handlers. Every operational handler validates input, resolves the current staff profile, checks required role, and then calls repository/domain functions. Database credentials remain server-only.

See `docs/ARCHITECTURE.md` for the detailed request/data flow.

## 5. Production database

Authoritative SQL:

```text
supabase/migrations/20260911140840_initial_gym_schema.sql
```

It creates:

- `staff_profiles`
- `membership_types`
- `members`
- `visits`
- `trainers`
- `trainer_availability`
- `bookings`
- `payments`

It also installs constraints, indexes, row-level security, grants/policies, and the partial unique `trainer_booking_slot_unique` index. It inserts only the four initial membership plan definitions. It does not create staff accounts or operational sample records.

See `docs/DATABASE.md` for the data dictionary and policy model.

## 6. Authentication modes

### Production

Production is considered configured when both public Supabase runtime values exist. Supabase Auth verifies the session and RLS returns only the signed-in user's active `staff_profiles` row. The direct PostgreSQL connection is used only by authenticated server handlers.

Vercel builds require:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`

The build rejects missing values and rejects `PLAT_GYM_TEST_MODE=true`.

### Automated tests

Playwright explicitly sets `PLAT_GYM_TEST_MODE=true`, a test SQLite path, an isolated session secret, and `.invalid` test identities. The test database is rebuilt before every E2E suite. These identities are not production accounts and no test database is tracked or released.

## 7. Business invariants

- Egyptian mobile numbers must match supported `010`, `011`, `012`, or `015` formats.
- Member phone and trainer phone are unique.
- Membership expiration is the day before the matching monthly anniversary.
- A membership is active through its expiration date.
- Expiring means 0–14 calendar days remaining.
- Expired visits require an explicit override.
- Member creation/renewal and its payment are transactional.
- PT booking and linked payment are transactional.
- A trainer can have only one non-cancelled booking at a date/time, protected by both availability checks and a database unique index.
- Paid revenue includes only `status='paid'` records whose `payment_date` is the Cairo current date.
- Receptionists cannot mutate trainer or plan configuration.

## 8. Validation state

Latest validated release:

- ESLint: passed
- TypeScript: passed
- Unit tests: 4/4 passed
- Playwright: 7/7 passed
- Production build without local secrets: passed
- Vercel-shaped package build with placeholder connection values: passed
- Production dependency audit: zero known vulnerabilities
- SQLite fixture foreign-key check: zero problems
- Trainer double-booking verification: zero collisions
- Desktop/mobile screenshot review: completed

Full details are in `docs/VALIDATION_REPORT.md`.

## 9. GitHub and release state

- The private repository is `Kero-holtz/plat-gym`.
- `main` is the deployment branch.
- Source, SQL, tests, design system, project context, API/database docs, handoff, and assistant prompt are tracked.
- Secrets, `.env.local`, databases, dependencies, build output, test reports, and local screenshots are ignored.
- A portable ZIP is generated from tracked Git content, not from the working directory.

## 10. Remaining external work

1. Create/link the owner's Supabase project.
2. Apply the production migration.
3. Obtain Supabase URL, publishable key, and serverless PostgreSQL connection string.
4. Privately obtain the real manager and receptionist identities.
5. Run the trusted staff bootstrap once.
6. Import this repository into Vercel and configure runtime variables.
7. Set Supabase Auth production URLs and disable unwanted public sign-up/providers.
8. Deploy and smoke-test both roles.
9. Return the production URL and ownership details.

Exact instructions: `DEPLOYMENT_HANDOFF.md`  
Ready-to-forward prompt: `ASSISTANT_DEPLOYMENT_PROMPT.md`

## 11. Scope boundaries and known limitations

- Single branch, English interface, EGP currency, Cairo timezone
- Network required for writes; no offline synchronization
- No member deletion in the MVP
- No payroll, commissions, inventory, recurring billing, advanced accounting, exports, analytics charts, or customer app
- Current membership period lives on the member; payment history is retained, but there is no separate membership-period history table
- Staff provisioning is trusted-script based, not an in-app user-management screen
- Hosting backups, monitoring, SMTP, DNS, and secret rotation are operator responsibilities

## 12. Security rules for future work

- Never commit or paste secrets into source/docs/issues.
- Never expose the service-role key or `DATABASE_URL` to browser code.
- Never enable the test seed on Vercel.
- Never deploy SQLite to Vercel.
- Never bypass authenticated API handlers from client components.
- Keep manager restrictions in both UI and API handlers.
- Apply schema changes as new timestamped migrations; do not silently edit an already-applied production migration.
- Rerun lint, type-check, unit tests, E2E, verification, and production build after functional changes.
