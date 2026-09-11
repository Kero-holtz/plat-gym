# Project File Map

## Handoff and context

| Path | Purpose |
|---|---|
| `README.md` | Product overview, setup, validation, and manager quick guide |
| `PROJECT_CONTEXT.md` | Complete sanitized project context and current state |
| `DEPLOYMENT_HANDOFF.md` | Exact Supabase/GitHub/Vercel deployment procedure |
| `ASSISTANT_DEPLOYMENT_PROMPT.md` | Forwardable deployment-assistant instructions |
| `docs/ARCHITECTURE.md` | Runtime layers and request/data flow |
| `docs/DATABASE.md` | ER model, data dictionary, indexes, and RLS |
| `docs/API_REFERENCE.md` | Endpoint and payload reference |
| `docs/ENVIRONMENT.md` | Runtime, bootstrap, and automated-test variable boundaries |
| `docs/OPERATIONS_GUIDE.md` | Detailed manager/receptionist instructions |
| `docs/VALIDATION_REPORT.md` | Test, build, security, and visual review evidence |
| `docs/DECISIONS_AND_LIMITATIONS.md` | Scope, architecture choices, and extension rules |
| `docs/PROJECT_HISTORY.md` | Sanitized implementation and validation history |
| `docs/FILE_MAP.md` | This repository map |
| `CONTRIBUTING.md` | Safe branch, migration, test, UI, and security workflow |
| `CHANGELOG.md` | Release history |
| `design-system/plat-gym/MASTER.md` | Authoritative UI design system |
| `docs/screenshots/login-*.png` | Clean desktop/mobile production-login references |

## Application routes

| Path | Purpose |
|---|---|
| `src/app/login` | Clean staff authentication |
| `src/app/(app)/layout.tsx` | Protected shell |
| `src/app/(app)/dashboard` | Operational overview |
| `src/app/(app)/members` | Member directory and actions |
| `src/app/(app)/members/[id]` | Detailed member profile |
| `src/app/(app)/personal-training` | Four-step PT wizard |
| `src/app/(app)/bookings` | Booking scopes and statuses |
| `src/app/(app)/payments` | Payment summaries, filters, and mutations |
| `src/app/(app)/trainers` | Trainer cards and manager editor |
| `src/app/(app)/settings` | Manager-only membership plans |
| `src/app/manifest.ts` | PWA manifest |

## API routes

| Directory | Purpose |
|---|---|
| `src/app/api/auth` | Login/logout |
| `src/app/api/dashboard` | Aggregates and activity lists |
| `src/app/api/members` | CRUD, visit, renewal |
| `src/app/api/availability` | Trainer slots |
| `src/app/api/bookings` | Booking create/list/status |
| `src/app/api/payments` | Payment create/list/status |
| `src/app/api/trainers` | Manager trainer configuration |
| `src/app/api/membership-types` | Plan reads and manager mutations |

## Core libraries

| Path | Purpose |
|---|---|
| `src/lib/auth.ts` | Local test/Supabase identity and role guards |
| `src/lib/supabase/server.ts` | SSR Supabase client |
| `src/lib/db/index.ts` | PostgreSQL/SQLite dialect selection |
| `src/lib/db/types.ts` | Typed relational schema |
| `src/lib/db/local.ts` | Local schema and gated E2E fixture |
| `src/lib/repository.ts` | Queries, transactions, and invariants |
| `src/lib/validation.ts` | Zod request schemas |
| `src/lib/api.ts` | Server error normalization |
| `src/lib/client-api.ts` | Browser API error handling |
| `src/lib/dates.ts` | Cairo dates and membership math |
| `src/lib/domain.ts` | Shared contracts/status types |

## Product components

| Path | Purpose |
|---|---|
| `src/components/app-shell.tsx` | Desktop/mobile navigation and staff menu |
| `src/components/quick-member-search.tsx` | Global member command search |
| `src/components/member-actions.tsx` | Add/edit/renew/visit workflows |
| `src/components/payment-actions.tsx` | Record/update payments |
| `src/components/trainer-actions.tsx` | Trainer/availability forms |
| `src/components/membership-type-actions.tsx` | Plan forms |
| `src/components/status-badge.tsx` | Semantic operational statuses |
| `src/components/ui` | Local accessible UI primitives |

## Database and deployment

| Path | Purpose |
|---|---|
| `supabase/migrations/20260911140840_initial_gym_schema.sql` | Complete production schema/RLS migration |
| `supabase/config.toml` | Supabase project config; production seed disabled |
| `scripts/bootstrap-supabase.ts` | Trusted real staff Auth/profile provisioning |
| `.env.example` | Runtime/bootstrap variable names without values |
| `.vercelignore` | Excludes non-runtime files from deployment |
| `next.config.ts` | Native packages, security headers, Vercel env guard |
| `src/proxy.ts` | Supabase session refresh proxy |

## Tests

| Path | Purpose |
|---|---|
| `tests/unit/dates.test.ts` | Membership date/status boundary tests |
| `tests/e2e/critical-flows.spec.ts` | Seven complete operational scenarios |
| `tests/e2e/test-credentials.ts` | `.invalid` automated-only identities |
| `playwright.config.ts` | Production-mode isolated E2E server |
| `vitest.config.mts` | Unit test setup |
| `scripts/verify-test-data.ts` | Direct relational integrity/aggregate checks |
| `.github/workflows/ci.yml` | GitHub quality/build and production-mode E2E automation |

## Intentionally absent

- `.env.local` and credentials
- Production or local database files
- Demo staff accounts
- `node_modules`, `.next`, reports, and generated screenshots
- Hosted Supabase project IDs/keys
- Vercel project metadata
- Downloaded agent skills
