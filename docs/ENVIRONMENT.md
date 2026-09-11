# Environment Variables

No values are committed. `.env.example` contains names only.

## Vercel runtime

| Variable | Required | Exposure | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser-safe project URL | Supabase Auth/Data API endpoint |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | browser-safe publishable key | Supabase Auth client authorization |
| `DATABASE_URL` | yes | server-only secret | PostgreSQL/pooler connection |
| `DB_SSL` | recommended | server | Set `true` for hosted Supabase |
| `DB_POOL_SIZE` | recommended | server | Defaults to 5 |

The `NEXT_PUBLIC` prefix is appropriate only for the project URL and publishable key. It must never be used for the service-role key or database URL.

## Trusted one-time staff bootstrap

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Auth creation and profile upsert |
| `BOOTSTRAP_ADMIN_EMAIL` | Real manager email |
| `BOOTSTRAP_ADMIN_NAME` | Real manager display name |
| `BOOTSTRAP_ADMIN_PASSWORD` | Real manager initial password |
| `BOOTSTRAP_RECEPTIONIST_EMAIL` | Real receptionist email |
| `BOOTSTRAP_RECEPTIONIST_NAME` | Real receptionist display name |
| `BOOTSTRAP_RECEPTIONIST_PASSWORD` | Real receptionist initial password |

These values are loaded temporarily on a trusted machine, used by `npm run db:bootstrap:supabase`, then removed. Do not add them to Vercel.

## Automated tests only

The Playwright configuration supplies these to its isolated web server:

- `PLAT_GYM_TEST_MODE=true`
- `SQLITE_PATH`
- `SESSION_SECRET`
- `SESSION_COOKIE_SECURE=false`
- `TEST_MANAGER_EMAIL`
- `TEST_MANAGER_PASSWORD`
- `TEST_RECEPTIONIST_EMAIL`
- `TEST_RECEPTIONIST_PASSWORD`

Do not set any of them on Vercel. Test identities use the reserved `.invalid` domain and are not Supabase users.

## Forbidden combinations

- Vercel + `PLAT_GYM_TEST_MODE=true`: configuration fails intentionally.
- Vercel without Supabase URL, publishable key, or `DATABASE_URL`: build fails intentionally.
- Service-role key in a `NEXT_PUBLIC_*` variable: credential exposure; rotate immediately.
- SQLite path on Vercel: unsupported ephemeral storage; do not deploy.
