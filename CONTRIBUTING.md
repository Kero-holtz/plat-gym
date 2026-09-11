# Contributing to PLAT GYM

This is an operational application for a real reception desk. Keep changes focused, secure, and easy to use.

## Workflow

1. Branch from current `main`.
2. Make the smallest coherent change.
3. Never commit credentials, databases, build output, or generated reports.
4. Add/update tests for business rules and visible workflows.
5. Run the complete validation suite.
6. Open a pull request describing behavior, migration impact, role impact, and mobile impact.
7. Merge only after CI passes and the owner approves production-facing changes.

## Required checks

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run verify
npm run build
```

## Database changes

- Add a new timestamped file under `supabase/migrations`.
- Do not edit a migration already applied to production.
- Preserve foreign keys and normalized relationships.
- Consider both direct server authorization and RLS.
- Add collision/constraint tests for database invariants.
- Never include production or sample operational data in a migration.

## Authorization changes

For every change, test both manager and receptionist behavior. Hiding a button is not authorization; enforce the rule in route handlers and RLS where applicable.

## Interface changes

- Follow `design-system/plat-gym/MASTER.md`.
- Preserve keyboard access, labels, focus visibility, and reduced motion.
- Check 390 px mobile and 1440 px desktop layouts.
- Avoid generic dashboard widgets, excessive animation, and scope expansion.
- Every visible action must complete a real mutation/navigation or be removed.

## Security

- Use environment variables for secrets.
- Never expose `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Never enable `PLAT_GYM_TEST_MODE` on Vercel.
- Use a clean owner-approved production record for smoke tests; there is no member delete in the MVP.
