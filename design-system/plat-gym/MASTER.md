# PLAT GYM — Product Design System

**Product:** Internal gym operations web app  
**Primary users:** Receptionist (fast, repetitive daily workflows), Manager (oversight + settings)  
**Design read:** Compact, professional operations tool; high scanability, restrained motion, mobile-first controls.  
**Dials:** Variance 3/10 · Motion 2/10 · Density 8/10

> The first automated search incorrectly classified the product as an LMS and suggested a marketing pattern and scholarly fonts. Those recommendations were rejected. This file is the verified product-specific source of truth.

## Product principles

1. **Status in three seconds.** Name, membership state, expiry, last visit, and payment state remain visible without opening extra UI.
2. **One-tap common actions.** Add visit, renew, book PT, and mark paid require the minimum safe confirmation.
3. **Warnings, not roadblocks.** Expired memberships trigger an explicit warning before a visit; staff can still proceed.
4. **No decorative analytics.** Use exact counts, lists, and operational queues—not charts.
5. **Mobile is a working surface.** 44px minimum touch targets, bottom navigation, stacked cards instead of squeezed tables.

## Visual language

- **Foundation:** Swiss/utility layout with a graphite navigation rail and warm neutral work surface.
- **Primary:** `#2647D7` cobalt; used for principal actions and focus.
- **Ink:** `#171A1F`; sidebar and high-emphasis text.
- **Canvas:** `#F5F4F0`; warm off-white reduces glare at reception.
- **Surface:** `#FFFFFF`.
- **Border:** `#DDDCD6`.
- **Muted text:** `#62656C`.
- **Success:** `#147D64`; **Warning:** `#B36B00`; **Danger:** `#C83D4A`.
- **Brand detail:** a narrow platinum rule / block, never gradients or faux-metal effects.

## Typography

- **UI/body:** Manrope Variable, 400–700, self-hosted from npm.
- **Brand/numeric display:** Barlow Condensed, 600–700, self-hosted from npm.
- Tabular values use `font-variant-numeric: tabular-nums`.
- Default body size 14px desktop / 15–16px form controls on mobile.

## Shape and elevation

- Inputs and buttons: 8px radius.
- Cards and dialogs: 12px radius.
- Status badges: full pill.
- Border-first hierarchy; only overlays and the fixed sidebar use subtle shadows.

## Layout

- Desktop: 248px fixed sidebar, sticky 68px header, content max 1440px.
- Tablet: collapsible sheet navigation.
- Mobile: compact top bar + six-item bottom navigation; content receives bottom safe-area padding.
- Page header places title/context left and one primary action right; actions stack on narrow screens.
- Tables become purpose-built member/booking/payment cards below 768px.

## Interaction

- State changes: 150ms color/border transitions only.
- No entrance animation for dashboard data.
- Use skeletons during loading and inline error/empty states.
- Every icon-only control has an accessible label.
- Focus rings use cobalt and remain visible on all surfaces.
- Respect `prefers-reduced-motion`.

## Component rules

- Use shadcn components with Base UI primitives and semantic color tokens.
- Forms use `FieldGroup` + `Field` + persistent labels.
- Dialogs always include title and description.
- Select items always live inside `SelectGroup`.
- Destructive or irreversible actions require `AlertDialog`; reversible status updates do not.
- Toasts report completed transient actions; validation errors stay next to the form.

## Copy rules

- Use staff language: “Add visit”, “Renew membership”, “Mark paid”, “Cancel booking”.
- Dates display as `dd/MM/yyyy`; stored as ISO dates.
- Currency displays as `EGP 1,200`.
- Avoid jargon such as “entity”, “record mutation”, or “CRM”.

## Pre-flight checklist

- [ ] Dashboard counts come from persisted records.
- [ ] All shown controls perform an implemented action.
- [ ] 375px, 768px, 1024px, and 1440px layouts checked.
- [ ] Keyboard focus, labels, dialog titles, and contrast checked.
- [ ] Expired-visit warning and trainer double-booking are enforced server-side.
- [ ] Paid-only revenue matches payment records for the selected day.
