# API Reference

All operational endpoints require an authenticated active staff session. JSON request bodies are validated with Zod. Error responses use a message and, for expected domain failures, a stable `code`.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in with staff email/password |
| POST | `/api/auth/logout` | Clear Supabase or local test session |

Login body:

```json
{ "email": "staff@example.com", "password": "private-password" }
```

## Dashboard

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Current Cairo date, five metrics, expiring members, latest visits, today's bookings |

## Members

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/members?search=&status=` | Search/list members |
| POST | `/api/members` | Create member and initial payment |
| GET | `/api/members/:id` | Detailed profile |
| PATCH | `/api/members/:id` | Edit identity/contact/notes |
| POST | `/api/members/:id/visit` | Record current visit |
| POST | `/api/members/:id/renew` | Renew membership and create payment |

Create member:

```json
{
  "name": "Member Name",
  "phone": "01012345678",
  "membershipTypeId": "uuid",
  "startDate": "2026-09-11",
  "paymentStatus": "paid",
  "amount": 900,
  "notes": "Optional"
}
```

Visit body:

```json
{ "confirmExpired": false }
```

An expired member returns HTTP 409 and `EXPIRED_MEMBERSHIP` until submitted with `confirmExpired: true`.

Renew body:

```json
{
  "membershipTypeId": "uuid",
  "startDate": "2026-10-11",
  "paymentStatus": "pending",
  "amount": 900
}
```

## Trainers

| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | `/api/trainers` | Active trainers | staff |
| GET | `/api/trainers?includeInactive=true` | All trainers | manager |
| POST | `/api/trainers` | Create trainer and availability | manager |
| PATCH | `/api/trainers/:id` | Update trainer and replace availability | manager |

Trainer availability item:

```json
{ "weekday": 0, "startTime": "08:00", "endTime": "21:00" }
```

## Availability and bookings

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/availability?trainerId=&date=` | Derived hourly slots |
| GET | `/api/bookings?scope=&status=` | List today/upcoming/all bookings |
| POST | `/api/bookings` | Create booking and linked PT payment |
| PATCH | `/api/bookings/:id` | Set scheduled/completed/cancelled status |

Create booking:

```json
{
  "memberId": "uuid",
  "trainerId": "uuid",
  "date": "2026-09-12",
  "time": "08:00",
  "price": 400,
  "paymentStatus": "pending"
}
```

An occupied slot returns HTTP 409 and `DOUBLE_BOOKING`.

## Payments

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/payments?search=&status=&type=` | List/filter payments |
| POST | `/api/payments` | Record payment |
| PATCH | `/api/payments/:id` | Change Paid/Pending status |

Create payment:

```json
{
  "memberId": "uuid",
  "bookingId": null,
  "amount": 900,
  "paymentType": "membership",
  "status": "paid",
  "paymentDate": "2026-09-11"
}
```

## Membership types

| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | `/api/membership-types` | Active plans | staff |
| GET | `/api/membership-types?includeInactive=true` | All plans | manager |
| POST | `/api/membership-types` | Create plan | manager |
| PATCH | `/api/membership-types/:id` | Edit/activate/deactivate plan | manager |

Expected authorization failures return HTTP 401 for no session and HTTP 403 for insufficient role.
