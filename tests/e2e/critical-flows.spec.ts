import path from "node:path"
import Database from "better-sqlite3"
import { addDays, format, parseISO, subMonths } from "date-fns"
import { fromZonedTime } from "date-fns-tz"
import { expect, test, type Page } from "@playwright/test"

async function login(page: Page, role: "manager" | "receptionist" = "manager") {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(role === "manager" ? "admin@platgym.eg" : "reception@platgym.eg")
  await page.getByLabel("Password", { exact: true }).fill(role === "manager" ? "PlatGym2026!" : "Reception2026!")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: "Today's activity" })).toBeVisible()
}

test("staff login and responsive dashboard are usable", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await login(page)
  await expect(page.getByText("Paid payments only")).toBeVisible()
  await expect(page.getByRole("link", { name: /Members/ }).first()).toBeVisible()
  await expect(page.getByText("Expiring soon", { exact: true }).first()).toBeVisible()
  expect(errors).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test("member lifecycle: add, search, edit, visit, renew, expired warning, and expiring state", async ({ page }) => {
  await login(page)
  const request = page.context().request
  const dashboardBefore = await (await request.get("/api/dashboard")).json()
  const types = (await (await request.get("/api/membership-types")).json()).membershipTypes
  const monthly = types.find((item: { name: string }) => item.name === "Monthly")
  expect(monthly).toBeTruthy()

  const activeResponse = await request.post("/api/members", {
    data: {
      name: "Test Member Active",
      phone: "01055550001",
      membershipTypeId: monthly.id,
      startDate: dashboardBefore.today,
      paymentStatus: "paid",
      amount: monthly.price,
      notes: "Playwright member",
    },
  })
  expect(activeResponse.status()).toBe(201)
  const active = (await activeResponse.json()).member
  expect(active.status).toBe("active")

  const search = await (await request.get("/api/members?search=55550001&status=all")).json()
  expect(search.members).toHaveLength(1)
  expect(search.members[0].name).toBe("Test Member Active")

  const editedResponse = await request.patch(`/api/members/${active.id}`, {
    data: { name: "Test Member Edited", phone: "01055550001", notes: "Updated note" },
  })
  expect(editedResponse.ok()).toBeTruthy()
  expect((await editedResponse.json()).member.name).toBe("Test Member Edited")

  const visitResponse = await request.post(`/api/members/${active.id}/visit`, { data: { confirmExpired: false } })
  expect(visitResponse.status()).toBe(201)
  const dashboardAfterVisit = await (await request.get("/api/dashboard")).json()
  expect(dashboardAfterVisit.stats.members).toBe(dashboardBefore.stats.members + 1)
  expect(dashboardAfterVisit.stats.visitsToday).toBe(dashboardBefore.stats.visitsToday + 1)

  const renewStart = format(addDays(parseISO(active.expirationDate), 1), "yyyy-MM-dd")
  const renewResponse = await request.post(`/api/members/${active.id}/renew`, {
    data: {
      membershipTypeId: monthly.id,
      startDate: renewStart,
      paymentStatus: "pending",
      amount: monthly.price,
    },
  })
  expect(renewResponse.ok()).toBeTruthy()
  const renewed = (await renewResponse.json()).member
  expect(renewed.expirationDate > active.expirationDate).toBeTruthy()
  expect(renewed.lastMembershipPayment.status).toBe("pending")

  const expiredResponse = await request.post("/api/members", {
    data: {
      name: "Test Member Expired",
      phone: "01155550002",
      membershipTypeId: monthly.id,
      startDate: "2025-01-01",
      paymentStatus: "paid",
      amount: monthly.price,
    },
  })
  const expired = (await expiredResponse.json()).member
  expect(expired.status).toBe("expired")
  const blockedVisit = await request.post(`/api/members/${expired.id}/visit`, { data: { confirmExpired: false } })
  expect(blockedVisit.status()).toBe(409)
  expect((await blockedVisit.json()).code).toBe("EXPIRED_MEMBERSHIP")
  expect((await request.post(`/api/members/${expired.id}/visit`, { data: { confirmExpired: true } })).status()).toBe(201)

  const targetExpiry = addDays(parseISO(dashboardBefore.today), 7)
  const expiringStart = format(subMonths(addDays(targetExpiry, 1), 1), "yyyy-MM-dd")
  const expiringResponse = await request.post("/api/members", {
    data: {
      name: "Test Member Expiring",
      phone: "01255550003",
      membershipTypeId: monthly.id,
      startDate: expiringStart,
      paymentStatus: "paid",
      amount: monthly.price,
    },
  })
  expect((await expiringResponse.json()).member.status).toBe("expiring")

  await page.goto("/members")
  await page.getByLabel("Search members").fill("Test Member Edited")
  await expect(page.getByRole("link", { name: "Test Member Edited" }).first()).toBeVisible()
})

test("PT booking prevents trainer double-booking and records completion payment", async ({ page }) => {
  await login(page)
  const request = page.context().request
  const dashboard = await (await request.get("/api/dashboard")).json()
  const members = (await (await request.get("/api/members?status=active")).json()).members
  const trainers = (await (await request.get("/api/trainers")).json()).trainers
  expect(members.length).toBeGreaterThan(2)
  expect(trainers.length).toBeGreaterThan(0)

  let selected: { date: string; time: string } | null = null
  for (let offset = 1; offset <= 14 && !selected; offset += 1) {
    const date = format(addDays(parseISO(dashboard.today), offset), "yyyy-MM-dd")
    const result = await (await request.get(`/api/availability?trainerId=${trainers[0].id}&date=${date}`)).json()
    const slot = result.slots.find((item: { available: boolean }) => item.available)
    if (slot) selected = { date, time: slot.time }
  }
  expect(selected).toBeTruthy()

  const firstResponse = await request.post("/api/bookings", {
    data: {
      memberId: members[0].id,
      trainerId: trainers[0].id,
      date: selected!.date,
      time: selected!.time,
      price: 475,
      paymentStatus: "pending",
    },
  })
  expect(firstResponse.status()).toBe(201)
  const first = (await firstResponse.json()).booking

  const doubleResponse = await request.post("/api/bookings", {
    data: {
      memberId: members[1].id,
      trainerId: trainers[0].id,
      date: selected!.date,
      time: selected!.time,
      price: 475,
      paymentStatus: "paid",
    },
  })
  expect(doubleResponse.status()).toBe(409)
  expect((await doubleResponse.json()).code).toBe("DOUBLE_BOOKING")

  const completed = await request.patch(`/api/bookings/${first.id}`, { data: { status: "completed" } })
  expect(completed.ok()).toBeTruthy()
  expect((await completed.json()).booking.status).toBe("completed")
  const payments = (await (await request.get(`/api/payments?type=pt&search=${encodeURIComponent(members[0].name)}`)).json()).payments
  expect(payments.some((payment: { bookingId: string }) => payment.bookingId === first.id)).toBeTruthy()

  const cancelled = await request.patch(`/api/bookings/${first.id}`, { data: { status: "cancelled" } })
  expect((await cancelled.json()).booking.status).toBe("cancelled")
  const replacement = await request.post("/api/bookings", {
    data: {
      memberId: members[1].id,
      trainerId: trainers[0].id,
      date: selected!.date,
      time: selected!.time,
      price: 475,
      paymentStatus: "paid",
    },
  })
  expect(replacement.status()).toBe(201)
})

test("pending and paid payments drive revenue, and dashboard aggregates match the relational database", async ({ page }) => {
  await login(page)
  const request = page.context().request
  const before = await (await request.get("/api/dashboard")).json()
  const member = (await (await request.get("/api/members?status=active")).json()).members[0]

  const pendingResponse = await request.post("/api/payments", {
    data: {
      memberId: member.id,
      amount: 321,
      paymentType: "membership",
      status: "pending",
      paymentDate: before.today,
    },
  })
  expect(pendingResponse.status()).toBe(201)
  const payment = (await pendingResponse.json()).payment
  const afterPending = await (await request.get("/api/dashboard")).json()
  expect(afterPending.stats.revenueToday).toBe(before.stats.revenueToday)

  expect((await request.patch(`/api/payments/${payment.id}`, { data: { status: "paid" } })).ok()).toBeTruthy()
  const afterPaid = await (await request.get("/api/dashboard")).json()
  expect(afterPaid.stats.revenueToday).toBe(before.stats.revenueToday + 321)

  const db = new Database(path.resolve("data/plat-gym-test.db"), { readonly: true })
  const nextDate = format(addDays(parseISO(afterPaid.today), 1), "yyyy-MM-dd")
  const start = fromZonedTime(`${afterPaid.today}T00:00:00`, "Africa/Cairo").toISOString()
  const end = fromZonedTime(`${nextDate}T00:00:00`, "Africa/Cairo").toISOString()
  const stats = {
    members: Number((db.prepare("select count(*) as value from members").get() as { value: number }).value),
    visitsToday: Number((db.prepare("select count(*) as value from visits where visit_time >= ? and visit_time < ?").get(start, end) as { value: number }).value),
    expiringSoon: Number((db.prepare("select count(*) as value from members where expiration_date >= ? and expiration_date <= date(?, '+14 days')").get(afterPaid.today, afterPaid.today) as { value: number }).value),
    bookingsToday: Number((db.prepare("select count(*) as value from bookings where booking_date = ? and status <> 'cancelled'").get(afterPaid.today) as { value: number }).value),
    revenueToday: Number((db.prepare("select coalesce(sum(amount), 0) as value from payments where payment_date = ? and status = 'paid'").get(afterPaid.today) as { value: number }).value),
  }
  expect(afterPaid.stats.members).toBe(stats.members)
  expect(afterPaid.stats.visitsToday).toBe(stats.visitsToday)
  expect(afterPaid.stats.expiringSoon).toBe(stats.expiringSoon)
  expect(afterPaid.stats.bookingsToday).toBe(stats.bookingsToday)
  expect(afterPaid.stats.revenueToday).toBe(stats.revenueToday)
  db.close()
})

test("receptionist can operate the desk but cannot modify sensitive settings", async ({ page }) => {
  await login(page, "receptionist")
  const request = page.context().request
  const blocked = await request.post("/api/trainers", {
    data: {
      name: "Blocked Trainer",
      phone: "01555550004",
      specialization: "Test",
      active: true,
      availability: [{ weekday: 0, startTime: "08:00", endTime: "09:00" }],
    },
  })
  expect(blocked.status()).toBe(403)

  await page.goto("/settings")
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("link", { name: "Members", exact: true }).first().click()
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible()
})

test("member dialogs complete add, visit, edit, and renewal through the UI", async ({ page }) => {
  await login(page)
  await page.goto("/members")
  await page.getByRole("button", { name: "Add member", exact: true }).click()
  const addDialog = page.getByRole("dialog", { name: "Add member" })
  await addDialog.getByLabel("Full name").fill("UI Flow Member")
  await addDialog.getByLabel("Phone number").fill("01055550011")
  await expect(addDialog.getByRole("button", { name: "Add member", exact: true })).toBeEnabled()
  await addDialog.getByRole("button", { name: "Add member", exact: true }).click()
  await expect(addDialog).toBeHidden()

  await page.getByLabel("Search members").fill("UI Flow Member")
  await page.getByRole("link", { name: "UI Flow Member" }).first().click()
  await expect(page.getByRole("heading", { name: "UI Flow Member" })).toBeVisible()

  await page.getByRole("button", { name: "Add visit", exact: true }).click()
  await expect(page.getByText("Visit recorded for UI Flow Member.")).toBeVisible()

  await page.getByRole("button", { name: "Edit", exact: true }).click()
  const editDialog = page.getByRole("dialog", { name: "Edit member" })
  await editDialog.getByLabel("Notes").fill("UI path checked")
  await editDialog.getByRole("button", { name: "Save changes" }).click()
  await expect(editDialog).toBeHidden()

  await page.getByRole("button", { name: "Renew", exact: true }).click()
  const renewDialog = page.getByRole("dialog", { name: "Renew membership" })
  await renewDialog.getByRole("button", { name: "Renew membership", exact: true }).click()
  await expect(renewDialog).toBeHidden()
  await expect(page.getByText("UI path checked")).toBeVisible()

  await page.goto("/members")
  await page.getByLabel("Search members").fill("Hana Ibrahim")
  const expiredRow = page.getByRole("row").filter({ hasText: "Hana Ibrahim" })
  await expiredRow.getByRole("button", { name: "Add visit" }).click()
  const expiredWarning = page.getByRole("alertdialog", { name: "Membership expired" })
  await expect(expiredWarning).toBeVisible()
  await expiredWarning.getByRole("button", { name: "Go back" }).click()
  await expect(expiredWarning).toBeHidden()
})

test("PT wizard and payment form save real records through the UI", async ({ page }) => {
  await login(page)
  await page.goto("/personal-training")
  await page.getByLabel("Member", { exact: true }).click()
  await page.getByRole("option").first().click()
  await page.getByRole("button", { name: /Mohamed Ali/ }).click()
  const dashboard = await (await page.context().request.get("/api/dashboard")).json()
  await page.getByRole("button", { name: "Choose date" }).click()
  const tomorrowLabel = format(addDays(parseISO(dashboard.today), 1), "EEE d MMM")
  const dateButton = page.getByRole("button", { name: tomorrowLabel })
  await expect(dateButton).toBeEnabled()
  await dateButton.click()
  const timeButton = page.getByRole("button", { name: /\d{1,2}:\d{2} (AM|PM)/ }).first()
  await expect(timeButton).toBeEnabled()
  await timeButton.click()
  await page.getByRole("button", { name: /Confirm · EGP/ }).click()
  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible()

  await page.goto("/payments")
  await page.getByRole("button", { name: "Record payment", exact: true }).click()
  const paymentDialog = page.getByRole("dialog", { name: "Record payment" })
  await paymentDialog.getByLabel("Member", { exact: true }).click()
  await page.getByRole("option").first().click()
  await paymentDialog.getByLabel("Amount (EGP)").fill("250")
  await paymentDialog.getByRole("button", { name: "Record payment", exact: true }).click()
  await expect(paymentDialog).toBeHidden()
  await expect(page.getByText("Payment recorded.")).toBeVisible()
})
