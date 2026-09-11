# Supabase Production Assets

## Apply

Use the linked Supabase CLI workflow:

```bash
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref YOUR_PROJECT_REF
npx --yes supabase@latest db push
```

Or review and run the complete migration once in the Supabase SQL Editor:

```text
migrations/20260911140840_initial_gym_schema.sql
```

## Contents

The migration creates the complete production schema, indexes, grants, and RLS policies. It inserts only four initial membership plan definitions.

It intentionally does **not** contain:

- staff/Auth users
- members
- trainers or availability
- visits
- bookings
- payments
- automated-test records

Real staff users are provisioned from a trusted machine with:

```bash
npm run db:bootstrap:supabase
```

Follow the protected temporary-environment procedure in `../DEPLOYMENT_HANDOFF.md`.

## Important

- Do not enable production seed data.
- Do not expose the service-role key.
- Do not edit this initial migration after it has been applied; add a new timestamped migration.
- Confirm RLS is enabled on all eight public tables.
- Use the serverless-safe Supabase pooler connection string for Vercel.
