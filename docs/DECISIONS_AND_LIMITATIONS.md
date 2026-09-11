# Decisions and MVP Boundaries

## Product decisions

### Reception-first information architecture

Primary navigation follows daily desk frequency: Dashboard, Members, Bookings, Personal Training, Payments, Trainers. Sensitive plan settings live in the manager menu rather than taking a permanent navigation slot.

### No generic admin template

The UI uses a compact operations-specific system: warm canvas, graphite navigation, cobalt primary actions, green success, amber warning, and red expiry/error states. It avoids charts, oversized cards, animation-heavy marketing patterns, and unused dashboard widgets.

### Current membership on the member row

The MVP stores the current plan and dates directly on `members`. This keeps the most common read and renewal flow simple. Membership payment history remains available, but full historical membership-period modeling is deferred.

### Payments are operational records, not accounting

Payments track type, status, amount, and date. Revenue is the sum of today's Paid records. There are no ledgers, refunds, invoices, tax, expense, payroll, or reconciliation modules.

### Server-side business invariants

The UI helps users choose valid values, but API/repository/database layers remain authoritative. Expired visit confirmation, trainer collision prevention, role restrictions, and transactional writes do not rely on hidden/disabled buttons alone.

### Cairo calendar dates

Visits use timezone-aware day bounds. Membership, booking, and payment dates are business calendar dates, avoiding accidental UTC date shifts at reception.

### Supabase for production, SQLite for tests

Production uses durable PostgreSQL and Supabase Auth. SQLite exists to run reliable, isolated, realistic automated tests without external credentials. It is explicitly gated and excluded from Vercel.

## Security decisions

- No public sign-up UI
- Active staff profile required after Auth login
- Manager restrictions in UI, API, and RLS
- Service-role key used only by a trusted bootstrap script
- Direct PostgreSQL connection used only on the server
- SameSite, HTTP-only local test cookie; Supabase cookie SSR in production
- RLS and least-privilege grants on all public tables
- Partial unique index provides race-safe PT collision protection
- Vercel build guard rejects missing production services/test mode
- No secrets or databases tracked

## Deferred scope

The following were intentionally excluded:

- AI chat or automation
- WhatsApp/marketing campaigns
- Workout and nutrition plans
- Customer mobile application
- Multi-branch support
- Inventory and product sales
- Payroll and trainer commissions
- Full accounting, expenses, tax, or invoices
- Complex subscription billing or payment gateway
- Loyalty/social features
- Advanced analytics/charts
- Exports and bulk imports
- Member deletion and record restoration
- In-app staff administration
- Offline write synchronization

## Known limitations

1. Single gym and one timezone/currency.
2. English-only UI.
3. Current membership period is overwritten on renewal; payment history remains.
4. No member deletion can make production smoke data permanent, so only owner-approved records should be used.
5. PWA is installable but not offline-capable for operations.
6. Backups, monitoring, DNS, SMTP, and secret rotation depend on hosting/operator setup.
7. The hosted Supabase and Vercel paths require final verification after deployment.

## Rules for extending

- Preserve normalized relationships; do not copy trainer/member names into transaction tables.
- Add migrations instead of editing applied schema.
- Add API and role tests with each permission change.
- Keep front-desk actions reachable within one or two interactions.
- Prefer searchable lists and focused summaries over charts.
- Preserve mobile operation cards for narrow screens.
- Avoid expanding scope without a concrete daily gym workflow.
