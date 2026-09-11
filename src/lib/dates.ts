import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import type { MembershipStatus } from "@/lib/domain"

export const GYM_TIME_ZONE = "Africa/Cairo"
export const EXPIRING_SOON_DAYS = 14

export function todayCairo(now = new Date()): string {
  return formatInTimeZone(now, GYM_TIME_ZONE, "yyyy-MM-dd")
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function cairoDayBounds(date: string): { start: string; end: string } {
  const start = fromZonedTime(`${date}T00:00:00`, GYM_TIME_ZONE)
  const endDate = format(addDays(parseISO(date), 1), "yyyy-MM-dd")
  const end = fromZonedTime(`${endDate}T00:00:00`, GYM_TIME_ZONE)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function addMembershipMonths(startDate: string, months: number): string {
  const [year, month, day] = startDate.split("-").map(Number)
  const targetIndex = month - 1 + months
  const targetYear = year + Math.floor(targetIndex / 12)
  const targetMonth = ((targetIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const anniversary = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
  return format(subDays(anniversary, 1), "yyyy-MM-dd")
}

export function membershipStatus(
  expirationDate: string,
  today = todayCairo(),
): MembershipStatus {
  const days = differenceInCalendarDays(parseISO(expirationDate), parseISO(today))
  if (days < 0) return "expired"
  if (days <= EXPIRING_SOON_DAYS) return "expiring"
  return "active"
}

export function suggestedRenewalStart(expirationDate: string, today = todayCairo()): string {
  if (membershipStatus(expirationDate, today) === "expired") return today
  return format(addDays(parseISO(expirationDate), 1), "yyyy-MM-dd")
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—"
  return format(parseISO(date), "dd/MM/yyyy")
}

export function formatDateLong(date: string): string {
  return format(parseISO(date), "EEEE, d MMMM yyyy")
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  return formatInTimeZone(date, GYM_TIME_ZONE, "dd/MM/yyyy · h:mm a")
}

export function formatTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number)
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes))
  return format(date, "h:mm a")
}

export function formatMoney(amount: number): string {
  return `EGP ${new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)}`
}

export function weekdayForDate(date: string): number {
  return parseISO(date).getDay()
}

export function isPastSlot(date: string, time: string, now = new Date()): boolean {
  const slot = fromZonedTime(`${date}T${time}:00`, GYM_TIME_ZONE)
  return slot.getTime() <= now.getTime()
}

export function dateOffset(days: number, from = todayCairo()): string {
  return format(addDays(parseISO(from), days), "yyyy-MM-dd")
}
