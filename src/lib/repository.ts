import "server-only"

import { randomUUID } from "node:crypto"
import { sql, type Kysely, type Transaction } from "kysely"
import { addDays, format, parseISO } from "date-fns"
import { getDb, timestampToIso } from "@/lib/db"
import type { DatabaseSchema } from "@/lib/db/types"
import {
  addMembershipMonths,
  cairoDayBounds,
  EXPIRING_SOON_DAYS,
  isPastSlot,
  membershipStatus,
  nowIso,
  todayCairo,
  weekdayForDate,
} from "@/lib/dates"
import type {
  AvailableSlot,
  Booking,
  BookingStatus,
  DashboardData,
  MemberListItem,
  MemberProfile,
  MembershipStatus,
  MembershipType,
  Payment,
  PaymentStatus,
  PaymentType,
  Trainer,
  TrainerAvailability,
} from "@/lib/domain"

type DbExecutor = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "DomainError"
  }
}

function number(value: unknown): number {
  return Number(value ?? 0)
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === "23505" ||
    candidate.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    candidate.message?.includes("UNIQUE constraint failed") === true
  )
}

async function membershipTypeById(
  id: string,
  executor: DbExecutor = getDb(),
): Promise<MembershipType | null> {
  const row = await executor
    .selectFrom("membership_types")
    .select(["id", "name", "duration_months", "price", "active"])
    .where("id", "=", id)
    .executeTakeFirst()

  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    durationMonths: number(row.duration_months),
    price: number(row.price),
    active: number(row.active) === 1,
  }
}

export async function listMembershipTypes(activeOnly = true): Promise<MembershipType[]> {
  let query = getDb()
    .selectFrom("membership_types")
    .select(["id", "name", "duration_months", "price", "active"])
    .orderBy("duration_months", "asc")

  if (activeOnly) query = query.where("active", "=", 1)
  const rows = await query.execute()
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    durationMonths: number(row.duration_months),
    price: number(row.price),
    active: number(row.active) === 1,
  }))
}

interface MemberQuery {
  id?: string
  search?: string
  status?: MembershipStatus | "all"
}

async function loadMemberList(query: MemberQuery = {}): Promise<MemberListItem[]> {
  const db = getDb()
  let membersQuery = db
    .selectFrom("members as m")
    .innerJoin("membership_types as mt", "mt.id", "m.membership_type_id")
    .select([
      "m.id",
      "m.name",
      "m.phone",
      "m.membership_type_id",
      "m.start_date",
      "m.expiration_date",
      "mt.name as membership_type",
    ])

  if (query.id) membersQuery = membersQuery.where("m.id", "=", query.id)
  const search = query.search?.trim().toLowerCase()
  if (search) {
    membersQuery = membersQuery.where((eb) =>
      eb.or([
        eb(sql<string>`lower(m.name)`, "like", `%${search}%`),
        eb("m.phone", "like", `%${search}%`),
      ]),
    )
  }

  const memberRows = await membersQuery.orderBy("m.name", "asc").execute()
  if (memberRows.length === 0) return []
  const ids = memberRows.map((member) => member.id)

  const [visitRows, paymentRows] = await Promise.all([
    db
      .selectFrom("visits")
      .select(["member_id", "visit_time"])
      .where("member_id", "in", ids)
      .orderBy("visit_time", "desc")
      .execute(),
    db
      .selectFrom("payments")
      .select(["member_id", "status", "payment_date", "created_at"])
      .where("member_id", "in", ids)
      .where("payment_type", "=", "membership")
      .orderBy("payment_date", "desc")
      .orderBy("created_at", "desc")
      .execute(),
  ])

  const latestVisit = new Map<string, string>()
  for (const visit of visitRows) {
    if (!latestVisit.has(visit.member_id)) {
      const iso = timestampToIso(visit.visit_time)
      if (iso) latestVisit.set(visit.member_id, iso)
    }
  }

  const latestPayment = new Map<string, PaymentStatus>()
  for (const payment of paymentRows) {
    if (!latestPayment.has(payment.member_id)) latestPayment.set(payment.member_id, payment.status)
  }

  const today = todayCairo()
  const members = memberRows.map<MemberListItem>((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    membershipTypeId: row.membership_type_id,
    membershipType: row.membership_type,
    startDate: row.start_date,
    expirationDate: row.expiration_date,
    status: membershipStatus(row.expiration_date, today),
    lastVisit: latestVisit.get(row.id) ?? null,
    paymentStatus: latestPayment.get(row.id) ?? null,
  }))

  if (query.status && query.status !== "all") {
    const filtered = members.filter((member) => member.status === query.status)
    if (query.status === "expiring") {
      return filtered.sort((left, right) => left.expirationDate.localeCompare(right.expirationDate))
    }
    if (query.status === "expired") {
      return filtered.sort((left, right) => right.expirationDate.localeCompare(left.expirationDate))
    }
    return filtered
  }
  return members
}

export async function listMembers(query: Omit<MemberQuery, "id"> = {}): Promise<MemberListItem[]> {
  return loadMemberList(query)
}

export async function getMember(id: string): Promise<MemberProfile | null> {
  const [member] = await loadMemberList({ id })
  if (!member) return null

  const db = getDb()
  const [details, visitRows, paymentRows, totalRow, membershipType] = await Promise.all([
    db.selectFrom("members").select("notes").where("id", "=", id).executeTakeFirst(),
    db
      .selectFrom("visits")
      .select(["id", "visit_time"])
      .where("member_id", "=", id)
      .orderBy("visit_time", "desc")
      .limit(8)
      .execute(),
    db
      .selectFrom("payments as p")
      .innerJoin("members as m", "m.id", "p.member_id")
      .select([
        "p.id",
        "p.member_id",
        "m.name as member_name",
        "p.booking_id",
        "p.amount",
        "p.payment_type",
        "p.status",
        "p.payment_date",
      ])
      .where("p.member_id", "=", id)
      .orderBy("p.payment_date", "desc")
      .orderBy("p.created_at", "desc")
      .limit(10)
      .execute(),
    db
      .selectFrom("visits")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("member_id", "=", id)
      .executeTakeFirst(),
    membershipTypeById(member.membershipTypeId),
  ])

  const payments: Payment[] = paymentRows.map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    bookingId: row.booking_id,
    amount: number(row.amount),
    paymentType: row.payment_type,
    status: row.status,
    paymentDate: row.payment_date,
  }))
  const lastMembershipPayment = payments.find((payment) => payment.paymentType === "membership") ?? null

  return {
    ...member,
    notes: details?.notes ?? null,
    totalVisits: number(totalRow?.count),
    recentVisits: visitRows.map((row) => ({
      id: row.id,
      visitTime: timestampToIso(row.visit_time)!,
    })),
    membershipPrice: membershipType?.price ?? 0,
    amountPaid: lastMembershipPayment?.status === "paid" ? lastMembershipPayment.amount : 0,
    lastMembershipPayment,
    recentPayments: payments,
  }
}

export interface CreateMemberInput {
  name: string
  phone: string
  membershipTypeId: string
  startDate: string
  paymentStatus: PaymentStatus
  amount?: number
  notes?: string
}

export async function createMember(input: CreateMemberInput, actorId: string): Promise<MemberProfile> {
  const db = getDb()
  const id = randomUUID()

  try {
    await db.transaction().execute(async (trx) => {
      const type = await membershipTypeById(input.membershipTypeId, trx)
      if (!type || !type.active) throw new DomainError("Choose an active membership type.", "INVALID_MEMBERSHIP")
      const expirationDate = addMembershipMonths(input.startDate, type.durationMonths)
      const timestamp = nowIso()

      await trx
        .insertInto("members")
        .values({
          id,
          name: input.name.trim(),
          phone: input.phone.trim(),
          membership_type_id: type.id,
          start_date: input.startDate,
          expiration_date: expirationDate,
          notes: input.notes?.trim() || null,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute()

      await trx
        .insertInto("payments")
        .values({
          id: randomUUID(),
          member_id: id,
          booking_id: null,
          amount: input.amount ?? type.price,
          payment_type: "membership",
          status: input.paymentStatus,
          payment_date: input.startDate,
          recorded_by: actorId,
          created_at: timestamp,
        })
        .execute()
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("That phone number is already in use.", "PHONE_EXISTS", 409)
    throw error
  }

  return (await getMember(id))!
}

export interface UpdateMemberInput {
  name: string
  phone: string
  notes?: string
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<MemberProfile> {
  try {
    const result = await getDb()
      .updateTable("members")
      .set({
        name: input.name.trim(),
        phone: input.phone.trim(),
        notes: input.notes?.trim() || null,
        updated_at: nowIso(),
      })
      .where("id", "=", id)
      .executeTakeFirst()
    if (number(result.numUpdatedRows) === 0) throw new DomainError("Member not found.", "NOT_FOUND", 404)
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("That phone number is already in use.", "PHONE_EXISTS", 409)
    throw error
  }
  return (await getMember(id))!
}

export interface RenewMemberInput {
  membershipTypeId: string
  startDate: string
  paymentStatus: PaymentStatus
  amount?: number
}

export async function renewMember(
  id: string,
  input: RenewMemberInput,
  actorId: string,
): Promise<MemberProfile> {
  const db = getDb()
  await db.transaction().execute(async (trx) => {
    const [member, type] = await Promise.all([
      trx.selectFrom("members").select("id").where("id", "=", id).executeTakeFirst(),
      membershipTypeById(input.membershipTypeId, trx),
    ])
    if (!member) throw new DomainError("Member not found.", "NOT_FOUND", 404)
    if (!type || !type.active) throw new DomainError("Choose an active membership type.", "INVALID_MEMBERSHIP")

    const expirationDate = addMembershipMonths(input.startDate, type.durationMonths)
    const timestamp = nowIso()
    await trx
      .updateTable("members")
      .set({
        membership_type_id: type.id,
        start_date: input.startDate,
        expiration_date: expirationDate,
        updated_at: timestamp,
      })
      .where("id", "=", id)
      .execute()

    await trx
      .insertInto("payments")
      .values({
        id: randomUUID(),
        member_id: id,
        booking_id: null,
        amount: input.amount ?? type.price,
        payment_type: "membership",
        status: input.paymentStatus,
        payment_date: input.startDate,
        recorded_by: actorId,
        created_at: timestamp,
      })
      .execute()
  })

  return (await getMember(id))!
}

export async function addVisit(
  memberId: string,
  actorId: string,
  confirmExpired = false,
): Promise<{ id: string; visitTime: string }> {
  const member = await getDb()
    .selectFrom("members")
    .select(["id", "name", "expiration_date"])
    .where("id", "=", memberId)
    .executeTakeFirst()
  if (!member) throw new DomainError("Member not found.", "NOT_FOUND", 404)

  const status = membershipStatus(member.expiration_date)
  if (status === "expired" && !confirmExpired) {
    throw new DomainError(
      `${member.name}'s membership expired on ${member.expiration_date}.`,
      "EXPIRED_MEMBERSHIP",
      409,
      { expirationDate: member.expiration_date, memberName: member.name },
    )
  }

  const id = randomUUID()
  const visitTime = nowIso()
  await getDb()
    .insertInto("visits")
    .values({ id, member_id: memberId, visit_time: visitTime, recorded_by: actorId })
    .execute()
  return { id, visitTime }
}

export async function listTrainers(includeInactive = true): Promise<Trainer[]> {
  const db = getDb()
  let query = db
    .selectFrom("trainers")
    .select(["id", "name", "phone", "specialization", "active"])
    .orderBy("name", "asc")
  if (!includeInactive) query = query.where("active", "=", 1)

  const trainerRows = await query.execute()
  if (trainerRows.length === 0) return []
  const availabilityRows = await db
    .selectFrom("trainer_availability")
    .select(["id", "trainer_id", "weekday", "start_time", "end_time"])
    .where("trainer_id", "in", trainerRows.map((trainer) => trainer.id))
    .orderBy("weekday", "asc")
    .orderBy("start_time", "asc")
    .execute()

  const availability = new Map<string, TrainerAvailability[]>()
  for (const row of availabilityRows) {
    const list = availability.get(row.trainer_id) ?? []
    list.push({ id: row.id, weekday: row.weekday, startTime: row.start_time, endTime: row.end_time })
    availability.set(row.trainer_id, list)
  }

  return trainerRows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    specialization: row.specialization,
    active: number(row.active) === 1,
    availability: availability.get(row.id) ?? [],
  }))
}

export interface TrainerInput {
  name: string
  phone: string
  specialization: string
  active: boolean
  availability: Array<{ weekday: number; startTime: string; endTime: string }>
}

async function replaceAvailability(
  executor: DbExecutor,
  trainerId: string,
  availability: TrainerInput["availability"],
): Promise<void> {
  await executor.deleteFrom("trainer_availability").where("trainer_id", "=", trainerId).execute()
  if (availability.length === 0) return
  await executor
    .insertInto("trainer_availability")
    .values(
      availability.map((slot) => ({
        id: randomUUID(),
        trainer_id: trainerId,
        weekday: slot.weekday,
        start_time: slot.startTime,
        end_time: slot.endTime,
      })),
    )
    .execute()
}

export async function createTrainer(input: TrainerInput): Promise<Trainer> {
  const id = randomUUID()
  try {
    await getDb().transaction().execute(async (trx) => {
      await trx
        .insertInto("trainers")
        .values({
          id,
          name: input.name.trim(),
          phone: input.phone.trim(),
          specialization: input.specialization.trim(),
          active: input.active ? 1 : 0,
          created_at: nowIso(),
        })
        .execute()
      await replaceAvailability(trx, id, input.availability)
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("That trainer phone number is already in use.", "PHONE_EXISTS", 409)
    throw error
  }
  return (await listTrainers()).find((trainer) => trainer.id === id)!
}

export async function updateTrainer(id: string, input: TrainerInput): Promise<Trainer> {
  try {
    await getDb().transaction().execute(async (trx) => {
      const result = await trx
        .updateTable("trainers")
        .set({
          name: input.name.trim(),
          phone: input.phone.trim(),
          specialization: input.specialization.trim(),
          active: input.active ? 1 : 0,
        })
        .where("id", "=", id)
        .executeTakeFirst()
      if (number(result.numUpdatedRows) === 0) throw new DomainError("Trainer not found.", "NOT_FOUND", 404)
      await replaceAvailability(trx, id, input.availability)
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("That trainer phone number is already in use.", "PHONE_EXISTS", 409)
    throw error
  }
  return (await listTrainers()).find((trainer) => trainer.id === id)!
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

export async function getAvailableSlots(trainerId: string, date: string): Promise<AvailableSlot[]> {
  const db = getDb()
  const trainer = await db
    .selectFrom("trainers")
    .select(["id", "active"])
    .where("id", "=", trainerId)
    .executeTakeFirst()
  if (!trainer || number(trainer.active) !== 1) return []

  const weekday = weekdayForDate(date)
  const [availabilityRows, bookingRows] = await Promise.all([
    db
      .selectFrom("trainer_availability")
      .select(["start_time", "end_time"])
      .where("trainer_id", "=", trainerId)
      .where("weekday", "=", weekday)
      .execute(),
    db
      .selectFrom("bookings")
      .select("start_time")
      .where("trainer_id", "=", trainerId)
      .where("booking_date", "=", date)
      .where("status", "!=", "cancelled")
      .execute(),
  ])
  const booked = new Set(bookingRows.map((booking) => booking.start_time))
  const times = new Set<string>()
  for (const row of availabilityRows) {
    for (let value = timeToMinutes(row.start_time); value + 60 <= timeToMinutes(row.end_time); value += 60) {
      times.add(minutesToTime(value))
    }
  }

  return [...times]
    .sort()
    .map((time) => {
      if (booked.has(time)) return { time, available: false, reason: "booked" as const }
      if (isPastSlot(date, time)) return { time, available: false, reason: "past" as const }
      return { time, available: true }
    })
}

interface BookingQuery {
  scope?: "today" | "upcoming" | "all"
  status?: BookingStatus | "all"
}

export async function listBookings(query: BookingQuery = {}): Promise<Booking[]> {
  const today = todayCairo()
  let bookingQuery = getDb()
    .selectFrom("bookings as b")
    .innerJoin("members as m", "m.id", "b.member_id")
    .innerJoin("trainers as t", "t.id", "b.trainer_id")
    .select([
      "b.id",
      "b.member_id",
      "m.name as member_name",
      "b.trainer_id",
      "t.name as trainer_name",
      "b.booking_date",
      "b.start_time",
      "b.status",
      "b.price",
    ])

  if (query.scope === "today") bookingQuery = bookingQuery.where("b.booking_date", "=", today)
  if (query.scope === "upcoming" || !query.scope) bookingQuery = bookingQuery.where("b.booking_date", ">=", today)
  if (query.status && query.status !== "all") bookingQuery = bookingQuery.where("b.status", "=", query.status)

  const rows = await bookingQuery
    .orderBy("b.booking_date", "asc")
    .orderBy("b.start_time", "asc")
    .execute()
  if (rows.length === 0) return []

  const paymentRows = await getDb()
    .selectFrom("payments")
    .select(["booking_id", "status"])
    .where("booking_id", "in", rows.map((row) => row.id))
    .orderBy("created_at", "desc")
    .execute()
  const paymentStatus = new Map<string, PaymentStatus>()
  for (const row of paymentRows) {
    if (row.booking_id && !paymentStatus.has(row.booking_id)) paymentStatus.set(row.booking_id, row.status)
  }

  return rows.map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name,
    date: row.booking_date,
    time: row.start_time,
    status: row.status,
    price: number(row.price),
    paymentStatus: paymentStatus.get(row.id) ?? null,
  }))
}

export interface CreateBookingInput {
  memberId: string
  trainerId: string
  date: string
  time: string
  price: number
  paymentStatus: PaymentStatus
}

export async function createBooking(input: CreateBookingInput, actorId: string): Promise<Booking> {
  const [member, trainer, slots] = await Promise.all([
    getDb().selectFrom("members").select("id").where("id", "=", input.memberId).executeTakeFirst(),
    getDb().selectFrom("trainers").select(["id", "active"]).where("id", "=", input.trainerId).executeTakeFirst(),
    getAvailableSlots(input.trainerId, input.date),
  ])
  if (!member) throw new DomainError("Choose a valid member.", "INVALID_MEMBER")
  if (!trainer || number(trainer.active) !== 1) throw new DomainError("Choose an active trainer.", "INVALID_TRAINER")
  const selectedSlot = slots.find((slot) => slot.time === input.time)
  if (!selectedSlot?.available) {
    throw new DomainError("That trainer is no longer available at this time.", "DOUBLE_BOOKING", 409)
  }

  const id = randomUUID()
  try {
    await getDb().transaction().execute(async (trx) => {
      const timestamp = nowIso()
      await trx
        .insertInto("bookings")
        .values({
          id,
          member_id: input.memberId,
          trainer_id: input.trainerId,
          booking_date: input.date,
          start_time: input.time,
          status: "scheduled",
          price: input.price,
          created_by: actorId,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute()
      await trx
        .insertInto("payments")
        .values({
          id: randomUUID(),
          member_id: input.memberId,
          booking_id: id,
          amount: input.price,
          payment_type: "pt",
          status: input.paymentStatus,
          payment_date: todayCairo(),
          recorded_by: actorId,
          created_at: timestamp,
        })
        .execute()
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("That trainer already has a booking at this time.", "DOUBLE_BOOKING", 409)
    }
    throw error
  }

  return (await listBookings({ scope: "all" })).find((booking) => booking.id === id)!
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actorId: string,
): Promise<Booking> {
  await getDb().transaction().execute(async (trx) => {
    const booking = await trx
      .selectFrom("bookings")
      .select(["id", "member_id", "price"])
      .where("id", "=", id)
      .executeTakeFirst()
    if (!booking) throw new DomainError("Booking not found.", "NOT_FOUND", 404)

    await trx
      .updateTable("bookings")
      .set({ status, updated_at: nowIso() })
      .where("id", "=", id)
      .execute()

    if (status === "completed") {
      const payment = await trx
        .selectFrom("payments")
        .select("id")
        .where("booking_id", "=", id)
        .executeTakeFirst()
      if (!payment) {
        await trx
          .insertInto("payments")
          .values({
            id: randomUUID(),
            member_id: booking.member_id,
            booking_id: id,
            amount: number(booking.price),
            payment_type: "pt",
            status: "pending",
            payment_date: todayCairo(),
            recorded_by: actorId,
            created_at: nowIso(),
          })
          .execute()
      }
    }
  })

  return (await listBookings({ scope: "all" })).find((booking) => booking.id === id)!
}

interface PaymentQuery {
  status?: PaymentStatus | "all"
  type?: PaymentType | "all"
  search?: string
}

export async function listPayments(query: PaymentQuery = {}): Promise<Payment[]> {
  let paymentsQuery = getDb()
    .selectFrom("payments as p")
    .innerJoin("members as m", "m.id", "p.member_id")
    .select([
      "p.id",
      "p.member_id",
      "m.name as member_name",
      "p.booking_id",
      "p.amount",
      "p.payment_type",
      "p.status",
      "p.payment_date",
    ])
  if (query.status && query.status !== "all") paymentsQuery = paymentsQuery.where("p.status", "=", query.status)
  if (query.type && query.type !== "all") paymentsQuery = paymentsQuery.where("p.payment_type", "=", query.type)
  const search = query.search?.trim().toLowerCase()
  if (search) {
    paymentsQuery = paymentsQuery.where((eb) =>
      eb.or([
        eb(sql<string>`lower(m.name)`, "like", `%${search}%`),
        eb("m.phone", "like", `%${search}%`),
      ]),
    )
  }

  const rows = await paymentsQuery
    .orderBy("p.payment_date", "desc")
    .orderBy("p.created_at", "desc")
    .execute()
  return rows.map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    bookingId: row.booking_id,
    amount: number(row.amount),
    paymentType: row.payment_type,
    status: row.status,
    paymentDate: row.payment_date,
  }))
}

export interface CreatePaymentInput {
  memberId: string
  bookingId?: string | null
  amount: number
  paymentType: PaymentType
  status: PaymentStatus
  paymentDate: string
}

export async function createPayment(input: CreatePaymentInput, actorId: string): Promise<Payment> {
  const member = await getDb().selectFrom("members").select("id").where("id", "=", input.memberId).executeTakeFirst()
  if (!member) throw new DomainError("Choose a valid member.", "INVALID_MEMBER")

  if (input.bookingId) {
    const booking = await getDb()
      .selectFrom("bookings")
      .select(["id", "member_id"])
      .where("id", "=", input.bookingId)
      .executeTakeFirst()
    if (!booking || booking.member_id !== input.memberId) {
      throw new DomainError("The selected booking does not belong to this member.", "INVALID_BOOKING")
    }
  }

  const id = randomUUID()
  await getDb()
    .insertInto("payments")
    .values({
      id,
      member_id: input.memberId,
      booking_id: input.bookingId ?? null,
      amount: input.amount,
      payment_type: input.paymentType,
      status: input.status,
      payment_date: input.paymentDate,
      recorded_by: actorId,
      created_at: nowIso(),
    })
    .execute()
  return (await listPayments()).find((payment) => payment.id === id)!
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<Payment> {
  const result = await getDb()
    .updateTable("payments")
    .set({ status })
    .where("id", "=", id)
    .executeTakeFirst()
  if (number(result.numUpdatedRows) === 0) throw new DomainError("Payment not found.", "NOT_FOUND", 404)
  return (await listPayments()).find((payment) => payment.id === id)!
}

export async function getDashboard(): Promise<DashboardData> {
  const db = getDb()
  const today = todayCairo()
  const expiringEnd = format(addDays(parseISO(today), EXPIRING_SOON_DAYS), "yyyy-MM-dd")
  const { start, end } = cairoDayBounds(today)

  const [
    memberCount,
    visitCount,
    expiringCount,
    bookingCount,
    revenue,
    expiringMembers,
    recentVisitRows,
    todayBookings,
  ] = await Promise.all([
    db.selectFrom("members").select(({ fn }) => fn.countAll<number>().as("count")).executeTakeFirst(),
    db
      .selectFrom("visits")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("visit_time", ">=", start)
      .where("visit_time", "<", end)
      .executeTakeFirst(),
    db
      .selectFrom("members")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("expiration_date", ">=", today)
      .where("expiration_date", "<=", expiringEnd)
      .executeTakeFirst(),
    db
      .selectFrom("bookings")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("booking_date", "=", today)
      .where("status", "!=", "cancelled")
      .executeTakeFirst(),
    db
      .selectFrom("payments")
      .select(({ fn }) => fn.sum<number>("amount").as("total"))
      .where("payment_date", "=", today)
      .where("status", "=", "paid")
      .executeTakeFirst(),
    loadMemberList({ status: "expiring" }),
    db
      .selectFrom("visits as v")
      .innerJoin("members as m", "m.id", "v.member_id")
      .select(["v.id", "v.member_id", "m.name as member_name", "v.visit_time"])
      .where("v.visit_time", ">=", start)
      .where("v.visit_time", "<", end)
      .orderBy("v.visit_time", "desc")
      .limit(6)
      .execute(),
    listBookings({ scope: "today" }),
  ])

  return {
    today,
    stats: {
      members: number(memberCount?.count),
      visitsToday: number(visitCount?.count),
      expiringSoon: number(expiringCount?.count),
      bookingsToday: number(bookingCount?.count),
      revenueToday: number(revenue?.total),
    },
    expiringMembers: expiringMembers.slice(0, 6),
    recentVisits: recentVisitRows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.member_name,
      visitTime: timestampToIso(row.visit_time)!,
    })),
    todayBookings: todayBookings.slice(0, 6),
  }
}

export interface MembershipTypeInput {
  name: string
  durationMonths: number
  price: number
  active: boolean
}

export async function createMembershipType(input: MembershipTypeInput): Promise<MembershipType> {
  const id = randomUUID()
  try {
    await getDb()
      .insertInto("membership_types")
      .values({
        id,
        name: input.name.trim(),
        duration_months: input.durationMonths,
        price: input.price,
        active: input.active ? 1 : 0,
        created_at: nowIso(),
      })
      .execute()
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("A membership type with this name already exists.", "NAME_EXISTS", 409)
    throw error
  }
  return (await membershipTypeById(id))!
}

export async function updateMembershipType(
  id: string,
  input: MembershipTypeInput,
): Promise<MembershipType> {
  try {
    const result = await getDb()
      .updateTable("membership_types")
      .set({
        name: input.name.trim(),
        duration_months: input.durationMonths,
        price: input.price,
        active: input.active ? 1 : 0,
      })
      .where("id", "=", id)
      .executeTakeFirst()
    if (number(result.numUpdatedRows) === 0) throw new DomainError("Membership type not found.", "NOT_FOUND", 404)
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("A membership type with this name already exists.", "NAME_EXISTS", 409)
    throw error
  }
  return (await membershipTypeById(id))!
}
