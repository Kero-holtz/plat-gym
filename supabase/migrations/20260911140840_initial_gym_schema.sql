-- PLAT GYM initial production schema.
-- Demo data is intentionally not included in this migration.

create extension if not exists pgcrypto;

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('manager', 'receptionist')),
  active smallint not null default 1 check (active in (0, 1)),
  created_at timestamptz not null default now()
);

create table public.membership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_months integer not null check (duration_months > 0 and duration_months <= 60),
  price numeric(10, 2) not null check (price >= 0),
  active smallint not null default 1 check (active in (0, 1)),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^01[0125][0-9]{8}$'),
  membership_type_id uuid not null references public.membership_types(id),
  start_date date not null,
  expiration_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiration_date >= start_date)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  visit_time timestamptz not null default now(),
  recorded_by uuid references public.staff_profiles(id)
);

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^01[0125][0-9]{8}$'),
  specialization text not null,
  active smallint not null default 1 check (active in (0, 1)),
  created_at timestamptz not null default now()
);

create table public.trainer_availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (trainer_id, weekday, start_time, end_time)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  trainer_id uuid not null references public.trainers(id),
  booking_date date not null,
  start_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  price numeric(10, 2) not null check (price >= 0),
  created_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  payment_type text not null check (payment_type in ('membership', 'pt')),
  status text not null check (status in ('paid', 'pending')),
  payment_date date not null,
  recorded_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now()
);

-- Initial gym configuration (not demo/member data). Managers can change it in Settings.
insert into public.membership_types (id, name, duration_months, price, active) values
  ('10000000-0000-4000-8000-000000000001', 'Monthly', 1, 900, 1),
  ('10000000-0000-4000-8000-000000000003', '3 Months', 3, 2400, 1),
  ('10000000-0000-4000-8000-000000000006', '6 Months', 6, 4300, 1),
  ('10000000-0000-4000-8000-000000000012', 'Yearly', 12, 7800, 1);

-- Search, expiry, daily operations, and foreign-key indexes.
create index members_name_lower_idx on public.members (lower(name));
create index members_expiration_idx on public.members (expiration_date);
create index members_membership_type_idx on public.members (membership_type_id);
create index visits_member_time_idx on public.visits (member_id, visit_time desc);
create index visits_time_idx on public.visits (visit_time desc);
create index bookings_date_time_idx on public.bookings (booking_date, start_time);
create index bookings_member_idx on public.bookings (member_id);
create index bookings_trainer_idx on public.bookings (trainer_id);
create index payments_date_status_idx on public.payments (payment_date, status);
create index payments_member_date_idx on public.payments (member_id, payment_date desc);
create index payments_booking_idx on public.payments (booking_id) where booking_id is not null;
create index availability_trainer_weekday_idx on public.trainer_availability (trainer_id, weekday);

-- This is the authoritative race-safe trainer double-booking guard.
create unique index trainer_booking_slot_unique
  on public.bookings (trainer_id, booking_date, start_time)
  where status <> 'cancelled';

-- Lock every Data API table down before adding narrowly scoped grants/policies.
alter table public.staff_profiles enable row level security;
alter table public.membership_types enable row level security;
alter table public.members enable row level security;
alter table public.visits enable row level security;
alter table public.trainers enable row level security;
alter table public.trainer_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

revoke all on table public.staff_profiles from anon, authenticated;
revoke all on table public.membership_types from anon, authenticated;
revoke all on table public.members from anon, authenticated;
revoke all on table public.visits from anon, authenticated;
revoke all on table public.trainers from anon, authenticated;
revoke all on table public.trainer_availability from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

-- Staff can read their own profile. Staff provisioning remains service-role only.
grant select on table public.staff_profiles to authenticated;
create policy "staff can read own profile"
on public.staff_profiles for select
to authenticated
using (id = (select auth.uid()));

-- All active staff can read operational data.
grant select on table public.membership_types, public.members, public.visits,
  public.trainers, public.trainer_availability, public.bookings, public.payments
  to authenticated;

create policy "active staff read membership types"
on public.membership_types for select to authenticated
using (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active = 1
));
create policy "active staff read members"
on public.members for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));
create policy "active staff read visits"
on public.visits for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));
create policy "active staff read trainers"
on public.trainers for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));
create policy "active staff read availability"
on public.trainer_availability for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));
create policy "active staff read bookings"
on public.bookings for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));
create policy "active staff read payments"
on public.payments for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1));

-- Manager and receptionist operational write access.
grant insert, update on table public.members, public.bookings, public.payments to authenticated;
grant insert on table public.visits to authenticated;

create policy "staff create members"
on public.members for insert to authenticated
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')));
create policy "staff update members"
on public.members for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')));

create policy "staff record visits"
on public.visits for insert to authenticated
with check (
  recorded_by = (select auth.uid()) and
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist'))
);

create policy "staff create bookings"
on public.bookings for insert to authenticated
with check (
  created_by = (select auth.uid()) and
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist'))
);
create policy "staff update bookings"
on public.bookings for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')));

create policy "staff create payments"
on public.payments for insert to authenticated
with check (
  recorded_by = (select auth.uid()) and
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist'))
);
create policy "staff update payments"
on public.payments for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role in ('manager', 'receptionist')));

-- Manager-only configuration writes.
grant insert, update on table public.membership_types, public.trainers, public.trainer_availability to authenticated;
grant delete on table public.trainer_availability to authenticated;

create policy "managers create membership types"
on public.membership_types for insert to authenticated
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));
create policy "managers update membership types"
on public.membership_types for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));

create policy "managers create trainers"
on public.trainers for insert to authenticated
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));
create policy "managers update trainers"
on public.trainers for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));

create policy "managers create availability"
on public.trainer_availability for insert to authenticated
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));
create policy "managers update availability"
on public.trainer_availability for update to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));
create policy "managers delete availability"
on public.trainer_availability for delete to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active = 1 and p.role = 'manager'));
