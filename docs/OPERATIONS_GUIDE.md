# PLAT GYM Staff Operations Guide

## Sign in and sign out

1. Open the production HTTPS URL.
2. Enter the staff email and password provided privately by the manager.
3. Press **Sign in**.
4. Use the avatar menu in the top-right and choose **Sign out** when leaving the desk.

Never share accounts. Manager and receptionist access are intentionally different.

## Daily opening routine

On **Dashboard**, review:

- Today's visits
- Memberships expiring soon
- Today's PT count and schedule
- Today's paid revenue
- Latest check-ins

Contact or speak with expiring members according to the gym's normal process; the application does not send messages automatically.

## Find or open a member

- Press the top member search or `Ctrl/Command + K`.
- Type part of the member name or phone.
- Select the result to open the profile.

Alternatively, use **Members** and the status filters.

## Add a member

1. Open **Members** and press **Add member**.
2. Enter the full name and Egyptian mobile number.
3. Choose the membership type and start date.
4. Confirm the amount and choose Paid or Pending.
5. Add optional reception notes.
6. Save.

The current membership and initial payment are saved together. If the phone already exists, open the existing member rather than creating a duplicate.

## Record a visit

Press **Add visit** from the member list or profile.

- Active/expiring membership: the visit is recorded immediately with the current time.
- Expired membership: a warning shows the expiration date. Choose **Go back** or, only after confirming gym policy, **Record anyway**.

The member's last visit, visit history, visit total, latest check-ins, and dashboard count update from the same visit record.

## Edit a member

Open the member profile or use **Edit** from the desktop member list. Update name, phone, or notes and save. Membership dates are changed through **Renew**, not Edit.

## Renew a membership

1. Press **Renew**.
2. Choose the new plan.
3. Review the suggested start date.
4. Confirm amount and Paid/Pending state.
5. Save.

For a current membership, the suggested period begins the day after expiration. For an expired membership, it begins today. Expiration is calculated automatically.

## Book personal training

1. Open **Personal Training**.
2. Choose the member.
3. Choose an active trainer.
4. Choose an enabled date.
5. Choose an available time.
6. Review member, trainer, date, time, price, and payment state.
7. Confirm.

Disabled slots are outside trainer hours, in the past, or already occupied. If another receptionist takes the same slot first, the application rejects the collision and asks for another slot.

## Manage bookings

Open **Bookings** and choose Today, Upcoming, or All.

- **Scheduled:** planned session
- **Completed:** session occurred
- **Cancelled:** session will not occur; the trainer slot becomes available again

Keep status current so the schedule and dashboard remain accurate.

## Manage payments

Open **Payments** to search/filter membership and PT records.

- **Pending** does not count toward dashboard revenue.
- **Paid** counts on its payment date.

Use **Record payment** for an additional payment record. Verify member, type, amount, date, and status before saving.

## Manager: trainers

Managers can add/edit trainer contact information, specialization, active state, working days, and daily start/end times. Receptionists have read-only operational access to active trainers.

Deactivate a trainer instead of changing historical bookings. Existing booking records remain linked.

## Manager: plans

Open the avatar menu and choose **Gym settings**.

Managers can change plan name, duration, price, and active status. Deactivating a plan prevents new selection but does not remove existing member references.

## End-of-day routine

1. Review today's bookings and update completed/cancelled sessions.
2. Review Pending payments and update only those actually received.
3. Compare Dashboard paid revenue with the gym's cash/payment process.
4. Sign out.

## Troubleshooting

- **Cannot sign in:** confirm exact email/password; ask the owner/deployer to verify the active Supabase staff profile.
- **Member not found:** search by phone digits and check all statuses.
- **Phone already used:** open the existing member.
- **Trainer slot unavailable:** choose another time or verify/cancel the existing booking.
- **Settings unavailable:** receptionist accounts are intentionally blocked.
- **Dashboard not updating:** refresh once; if an API error remains, report the time, page, action, and message to the technical owner without sharing passwords.
