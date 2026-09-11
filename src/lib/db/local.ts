import "server-only"

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import Database from "better-sqlite3"
import { hashSync } from "bcryptjs"
import { addMembershipMonths, cairoDayBounds, dateOffset, nowIso, todayCairo } from "@/lib/dates"

const MEMBERSHIP_TYPES = [
  { id: "membership-monthly", name: "Monthly", months: 1, price: 900 },
  { id: "membership-3-months", name: "3 Months", months: 3, price: 2400 },
  { id: "membership-6-months", name: "6 Months", months: 6, price: 4300 },
  { id: "membership-yearly", name: "Yearly", months: 12, price: 7800 },
]

const MEMBER_NAMES = [
  "Ahmed Mohamed",
  "Omar Ali",
  "Youssef Hassan",
  "Mahmoud Ibrahim",
  "Mostafa Adel",
  "Karim Tarek",
  "Amr Khaled",
  "Mohamed Samir",
  "Hassan Hany",
  "Ali Wael",
  "Mariam Ahmed",
  "Nourhan Mahmoud",
  "Salma Mostafa",
  "Aya Mohamed",
  "Farida Omar",
  "Nada Hossam",
  "Dina Ashraf",
  "Menna Emad",
  "Rana Yasser",
  "Habiba Tamer",
  "Seif Ahmed",
  "Ziad Mohamed",
  "Abdelrahman Ali",
  "Khaled Mostafa",
  "Hossam Hassan",
  "Sherif Magdy",
  "Mona Adel",
  "Reem Tarek",
  "Laila Samir",
  "Hana Ibrahim",
  "Yara Khaled",
  "Malak Wael",
]

const TRAINERS = [
  { id: "trainer-mohamed", name: "Mohamed Ali", phone: "01090001001", specialization: "Strength & conditioning" },
  { id: "trainer-omar", name: "Omar Hassan", phone: "01190001002", specialization: "Weight loss & mobility" },
  { id: "trainer-salma", name: "Salma Adel", phone: "01290001003", specialization: "Functional training" },
  { id: "trainer-karim", name: "Karim Nasser", phone: "01590001004", specialization: "Bodybuilding" },
]

function phoneFor(index: number): string {
  const prefixes = ["010", "011", "012", "015"]
  return `${prefixes[index % prefixes.length]}${String(10000000 + index * 731).slice(-8)}`
}

function sqlitePath(): string {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH)
  return path.join(process.cwd(), "data", "plat-gym.db")
}

export function openLocalDatabase(): Database.Database {
  const file = sqlitePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("busy_timeout = 5000")
  createSchema(sqlite)
  if (process.env.PLAT_GYM_TEST_MODE === "true") {
    if (process.env.VERCEL) throw new Error("PLAT_GYM_TEST_MODE must never be enabled on Vercel.")
    seedTestData(sqlite)
  }
  return sqlite
}

function createSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      auth_user_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      role TEXT NOT NULL CHECK (role IN ('manager', 'receptionist')),
      password_hash TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      duration_months INTEGER NOT NULL CHECK (duration_months > 0),
      price REAL NOT NULL CHECK (price >= 0),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      membership_type_id TEXT NOT NULL REFERENCES membership_types(id),
      start_date TEXT NOT NULL,
      expiration_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (expiration_date >= start_date)
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      visit_time TEXT NOT NULL,
      recorded_by TEXT REFERENCES staff_users(id)
    );

    CREATE TABLE IF NOT EXISTS trainers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      specialization TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trainer_availability (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      CHECK (end_time > start_time),
      UNIQUE (trainer_id, weekday, start_time, end_time)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      trainer_id TEXT NOT NULL REFERENCES trainers(id),
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      price REAL NOT NULL CHECK (price >= 0),
      created_by TEXT REFERENCES staff_users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('membership', 'pt')),
      status TEXT NOT NULL CHECK (status IN ('paid', 'pending')),
      payment_date TEXT NOT NULL,
      recorded_by TEXT REFERENCES staff_users(id),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS members_name_idx ON members(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS members_expiration_idx ON members(expiration_date);
    CREATE INDEX IF NOT EXISTS visits_member_time_idx ON visits(member_id, visit_time DESC);
    CREATE INDEX IF NOT EXISTS visits_time_idx ON visits(visit_time DESC);
    CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings(booking_date, start_time);
    CREATE INDEX IF NOT EXISTS bookings_member_idx ON bookings(member_id);
    CREATE INDEX IF NOT EXISTS payments_date_status_idx ON payments(payment_date, status);
    CREATE INDEX IF NOT EXISTS payments_member_idx ON payments(member_id, payment_date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS trainer_booking_slot_unique
      ON bookings(trainer_id, booking_date, start_time)
      WHERE status <> 'cancelled';
  `)
}

function requiredTestValue(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required when PLAT_GYM_TEST_MODE=true.`)
  return value
}

function seedTestData(sqlite: Database.Database): void {
  const alreadySeeded = sqlite.prepare("SELECT value FROM schema_meta WHERE key = 'test_seed_v1'").get()
  if (alreadySeeded) return

  const seed = sqlite.transaction(() => {
    const createdAt = nowIso()
    const today = todayCairo()
    const managerId = "staff-test-manager"
    const receptionistId = "staff-test-reception"
    const managerEmail = requiredTestValue("TEST_MANAGER_EMAIL")
    const managerPassword = requiredTestValue("TEST_MANAGER_PASSWORD")
    const receptionistEmail = requiredTestValue("TEST_RECEPTIONIST_EMAIL")
    const receptionistPassword = requiredTestValue("TEST_RECEPTIONIST_PASSWORD")

    const insertStaff = sqlite.prepare(`
      INSERT INTO staff_users (id, auth_user_id, name, email, role, password_hash, active, created_at)
      VALUES (?, NULL, ?, ?, ?, ?, 1, ?)
    `)
    insertStaff.run(managerId, "Automated Test Manager", managerEmail, "manager", hashSync(managerPassword, 10), createdAt)
    insertStaff.run(
      receptionistId,
      "Automated Test Receptionist",
      receptionistEmail,
      "receptionist",
      hashSync(receptionistPassword, 10),
      createdAt,
    )

    const insertType = sqlite.prepare(`
      INSERT INTO membership_types (id, name, duration_months, price, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `)
    for (const type of MEMBERSHIP_TYPES) {
      insertType.run(type.id, type.name, type.months, type.price, createdAt)
    }

    const insertMember = sqlite.prepare(`
      INSERT INTO members (id, name, phone, membership_type_id, start_date, expiration_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertPayment = sqlite.prepare(`
      INSERT INTO payments (id, member_id, booking_id, amount, payment_type, status, payment_date, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const memberIds: string[] = []
    MEMBER_NAMES.forEach((name, index) => {
      const type = MEMBERSHIP_TYPES[index % MEMBERSHIP_TYPES.length]
      const id = `member-${String(index + 1).padStart(2, "0")}`
      memberIds.push(id)

      let startDate: string
      let expirationDate: string
      if (index < 3) {
        startDate = today
        expirationDate = addMembershipMonths(startDate, type.months)
      } else if (index < 21) {
        startDate = dateOffset(-(type.months * 30 - 18 - index), today)
        expirationDate = dateOffset(18 + index * 4, today)
      } else if (index < 27) {
        expirationDate = dateOffset(index - 20, today)
        startDate = dateOffset(-type.months * 30, expirationDate)
      } else {
        expirationDate = dateOffset(-(index - 25) * 3, today)
        startDate = dateOffset(-type.months * 30, expirationDate)
      }

      insertMember.run(
        id,
        name,
        phoneFor(index),
        type.id,
        startDate,
        expirationDate,
        index === 5 ? "Prefers morning visits" : null,
        createdAt,
        createdAt,
      )
      insertPayment.run(
        `payment-membership-${index + 1}`,
        id,
        null,
        type.price,
        "membership",
        index % 9 === 0 && index > 2 ? "pending" : "paid",
        index < 3 ? today : startDate,
        receptionistId,
        createdAt,
      )
    })

    const insertVisit = sqlite.prepare(`
      INSERT INTO visits (id, member_id, visit_time, recorded_by) VALUES (?, ?, ?, ?)
    `)
    const { start: todayStart } = cairoDayBounds(today)
    const startMs = new Date(todayStart).getTime()
    for (let index = 0; index < 18; index += 1) {
      const visitMs = startMs + (6 * 60 + index * 34) * 60_000
      insertVisit.run(`visit-today-${index + 1}`, memberIds[index], new Date(visitMs).toISOString(), receptionistId)
    }
    for (let index = 0; index < memberIds.length; index += 1) {
      for (let recent = 1; recent <= (index % 3) + 1; recent += 1) {
        const day = dateOffset(-(recent * 3 + (index % 4)), today)
        const { start } = cairoDayBounds(day)
        const visitMs = new Date(start).getTime() + (7 * 60 + (index * 17) % 600) * 60_000
        insertVisit.run(randomUUID(), memberIds[index], new Date(visitMs).toISOString(), receptionistId)
      }
    }

    const insertTrainer = sqlite.prepare(`
      INSERT INTO trainers (id, name, phone, specialization, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `)
    const insertAvailability = sqlite.prepare(`
      INSERT INTO trainer_availability (id, trainer_id, weekday, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const trainer of TRAINERS) {
      insertTrainer.run(trainer.id, trainer.name, trainer.phone, trainer.specialization, createdAt)
      for (let weekday = 0; weekday <= 6; weekday += 1) {
        const isFriday = weekday === 5
        insertAvailability.run(
          randomUUID(),
          trainer.id,
          weekday,
          isFriday ? "14:00" : "08:00",
          isFriday ? "20:00" : "21:00",
        )
      }
    }

    const insertBooking = sqlite.prepare(`
      INSERT INTO bookings (id, member_id, trainer_id, booking_date, start_time, status, price, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const bookingPlan = [
      { day: 0, trainer: 0, time: "09:00", member: 3, status: "completed" },
      { day: 0, trainer: 1, time: "10:00", member: 7, status: "scheduled" },
      { day: 0, trainer: 2, time: "11:00", member: 11, status: "scheduled" },
      { day: 0, trainer: 3, time: "12:00", member: 14, status: "scheduled" },
      { day: 0, trainer: 0, time: "17:00", member: 17, status: "scheduled" },
      { day: 0, trainer: 1, time: "18:00", member: 20, status: "scheduled" },
      { day: 1, trainer: 2, time: "09:00", member: 4, status: "scheduled" },
      { day: 1, trainer: 3, time: "15:00", member: 8, status: "scheduled" },
      { day: 2, trainer: 0, time: "10:00", member: 12, status: "scheduled" },
      { day: 2, trainer: 1, time: "16:00", member: 15, status: "scheduled" },
      { day: 3, trainer: 2, time: "18:00", member: 18, status: "scheduled" },
      { day: 4, trainer: 3, time: "19:00", member: 23, status: "scheduled" },
    ] as const

    bookingPlan.forEach((item, index) => {
      const bookingId = `booking-${index + 1}`
      const bookingDate = dateOffset(item.day, today)
      const price = index % 3 === 0 ? 450 : 400
      insertBooking.run(
        bookingId,
        memberIds[item.member],
        TRAINERS[item.trainer].id,
        bookingDate,
        item.time,
        item.status,
        price,
        receptionistId,
        createdAt,
        createdAt,
      )
      insertPayment.run(
        `payment-pt-${index + 1}`,
        memberIds[item.member],
        bookingId,
        price,
        "pt",
        index === 2 || index === 7 ? "pending" : "paid",
        item.day === 0 ? today : bookingDate,
        receptionistId,
        createdAt,
      )
    })

    sqlite.prepare("INSERT INTO schema_meta (key, value) VALUES ('test_seed_v1', ?)").run(createdAt)
  })

  seed()
}
