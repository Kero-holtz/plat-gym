# Architecture

## System overview

```text
Browser / installed PWA
        |
        | HTTPS, same-origin JSON
        v
Next.js App Router on Vercel
  - Server Components: protected page shell and redirects
  - Client Components: interactive lists, forms, dialogs, filters
  - Route Handlers: authentication, validation, authorization
        |
        +--------------------+
        |                    |
        v                    v
Supabase Auth          Kysely repository
(cookie SSR session)         |
                             v
                    Supabase PostgreSQL
```

The browser never receives the PostgreSQL connection string or service-role key. Client components call only same-origin route handlers.

## Runtime layers

### Presentation

- `src/app/(app)/*` contains protected operational routes.
- `src/components/*` contains reusable product actions and shell components.
- `src/components/ui/*` contains local shadcn/Base UI primitives.
- `src/app/globals.css` defines theme tokens, typography, focus behavior, responsive foundations, and semantic colors.

Most pages load through a small `useApiData` hook and render explicit loading, error, empty, and populated states. Mutations use `apiFetch`, surface errors, show toast feedback, and reload the affected view.

### Authentication and authorization

- `src/proxy.ts` refreshes Supabase cookie sessions when production Supabase variables exist.
- `src/lib/supabase/server.ts` creates the cookie-backed server client.
- `src/lib/auth.ts` resolves the current active staff profile and enforces optional roles.
- Protected layout redirects unauthenticated users to `/login`.
- Manager-only pages also redirect receptionists.
- Route handlers call `requireUser()` or `requireUser(["manager"])` independently of UI visibility.

### Validation and API errors

- `src/lib/validation.ts` holds Zod schemas.
- `src/lib/api.ts` normalizes Zod, authentication, domain, and unexpected errors into JSON responses.
- `src/lib/client-api.ts` translates non-2xx responses into client errors with stable codes.

Expected domain failures—duplicate phone, expired membership, occupied trainer slot, unauthorized setting change—are deliberate user-facing responses, not unhandled exceptions.

### Domain and persistence

- `src/lib/dates.ts` owns Cairo-day boundaries, expiration math, money/date formatting, and slot-time helpers.
- `src/lib/domain.ts` owns shared contracts and status types.
- `src/lib/repository.ts` owns database queries, transactions, and domain invariants.
- `src/lib/db/index.ts` selects PostgreSQL when `DATABASE_URL` is configured and otherwise permits local SQLite outside Vercel.
- `src/lib/db/local.ts` contains the equivalent local schema and an explicitly gated automated-test fixture.

## Data and mutation flow

Example: member renewal

```text
Renew dialog
  -> POST /api/members/:id/renew
  -> validate request
  -> require active manager/receptionist
  -> repository transaction
       1. validate member and active plan
       2. calculate expiration
       3. update current membership fields
       4. insert membership payment
  -> return updated member profile
  -> close dialog, notify, reload page
```

Example: PT booking

```text
Wizard requests /api/availability for trainer/date
  -> repository derives slots from weekly availability
  -> removes past and occupied slots
User confirms booking
  -> POST /api/bookings
  -> validate member/trainer/slot/price/status
  -> transaction inserts booking + linked payment
  -> partial unique DB index catches race collisions
  -> return confirmed booking
```

## Timezone model

- Gym timezone: `Africa/Cairo`
- Timestamps are stored as UTC ISO strings locally and `timestamptz` in PostgreSQL.
- Daily visit bounds convert Cairo midnight to UTC.
- Operational dates (`booking_date`, `payment_date`, membership dates) are calendar dates.
- UI formatting converts timestamps back to Cairo time.

## Money model

- Production amounts: `numeric(10,2)`
- Shared contracts expose numeric values to the UI.
- Currency display is EGP.
- Dashboard revenue is a date/status aggregate, not a cached duplicate.

## Responsive model

- Desktop: fixed graphite sidebar and sticky top utility bar.
- Mobile: compact top bar and six-item safe-area-aware bottom navigation.
- Data tables convert to operation cards on narrow screens.
- Forms/dialogs stack fields and preserve touch target sizes.
- The content frame is capped for large displays and has no horizontal mobile overflow.

## Deployment boundary

Vercel hosts only application code. Supabase owns durable Auth and PostgreSQL data. SQLite, automated-test identities, reports, and artifacts are excluded from Vercel. `next.config.ts` fails a Vercel build when required Supabase/PostgreSQL values are missing or test mode is enabled.
