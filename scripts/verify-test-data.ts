import path from "node:path"
import Database from "better-sqlite3"
import { addDays, format, parseISO } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

const dbPath = path.resolve(process.env.SQLITE_PATH ?? "./data/plat-gym-test.db")
const db = new Database(dbPath, { readonly: true })
const zone = "Africa/Cairo"
const today = formatInTimeZone(new Date(), zone, "yyyy-MM-dd")
const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd")
const start = fromZonedTime(`${today}T00:00:00`, zone).toISOString()
const end = fromZonedTime(`${tomorrow}T00:00:00`, zone).toISOString()
const expiringEnd = format(addDays(parseISO(today), 14), "yyyy-MM-dd")

function value(sql: string, ...parameters: unknown[]): number {
  const row = db.prepare(sql).get(...parameters) as { value: number }
  return Number(row.value ?? 0)
}

const snapshot = {
  today,
  members: value("select count(*) as value from members"),
  visitsToday: value("select count(*) as value from visits where visit_time >= ? and visit_time < ?", start, end),
  expiringSoon: value("select count(*) as value from members where expiration_date >= ? and expiration_date <= ?", today, expiringEnd),
  bookingsToday: value("select count(*) as value from bookings where booking_date = ? and status <> 'cancelled'", today),
  revenueToday: value("select coalesce(sum(amount), 0) as value from payments where payment_date = ? and status = 'paid'", today),
}

const foreignKeyProblems = db.pragma("foreign_key_check") as unknown[]
const doubleBookings = db.prepare(`
  select trainer_id, booking_date, start_time, count(*) as count
  from bookings where status <> 'cancelled'
  group by trainer_id, booking_date, start_time
  having count(*) > 1
`).all()

if (snapshot.members < 20) throw new Error(`Expected at least 20 isolated test members, found ${snapshot.members}`)
if (foreignKeyProblems.length) throw new Error(`Foreign-key problems: ${JSON.stringify(foreignKeyProblems)}`)
if (doubleBookings.length) throw new Error(`Double bookings: ${JSON.stringify(doubleBookings)}`)

console.log(JSON.stringify({ ...snapshot, foreignKeyProblems: 0, doubleBookings: 0 }, null, 2))
db.close()
