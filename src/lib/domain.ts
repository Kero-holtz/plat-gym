export type StaffRole = "manager" | "receptionist"
export type MembershipStatus = "active" | "expiring" | "expired"
export type PaymentStatus = "paid" | "pending"
export type PaymentType = "membership" | "pt"
export type BookingStatus = "scheduled" | "completed" | "cancelled"

export interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
}

export interface MembershipType {
  id: string
  name: string
  durationMonths: number
  price: number
  active: boolean
}

export interface MemberListItem {
  id: string
  name: string
  phone: string
  membershipTypeId: string
  membershipType: string
  startDate: string
  expirationDate: string
  status: MembershipStatus
  lastVisit: string | null
  paymentStatus: PaymentStatus | null
}

export interface Visit {
  id: string
  visitTime: string
}

export interface Payment {
  id: string
  memberId: string
  memberName: string
  bookingId: string | null
  amount: number
  paymentType: PaymentType
  status: PaymentStatus
  paymentDate: string
}

export interface MemberProfile extends MemberListItem {
  notes: string | null
  totalVisits: number
  recentVisits: Visit[]
  membershipPrice: number
  amountPaid: number
  lastMembershipPayment: Payment | null
  recentPayments: Payment[]
}

export interface TrainerAvailability {
  id?: string
  weekday: number
  startTime: string
  endTime: string
}

export interface Trainer {
  id: string
  name: string
  phone: string
  specialization: string
  active: boolean
  availability: TrainerAvailability[]
}

export interface Booking {
  id: string
  memberId: string
  memberName: string
  trainerId: string
  trainerName: string
  date: string
  time: string
  status: BookingStatus
  price: number
  paymentStatus: PaymentStatus | null
}

export interface DashboardData {
  today: string
  stats: {
    members: number
    visitsToday: number
    expiringSoon: number
    bookingsToday: number
    revenueToday: number
  }
  expiringMembers: MemberListItem[]
  recentVisits: Array<{
    id: string
    memberId: string
    memberName: string
    visitTime: string
  }>
  todayBookings: Booking[]
}

export interface AvailableSlot {
  time: string
  available: boolean
  reason?: "booked" | "past"
}

export interface ApiError {
  error: string
  code?: string
  details?: Record<string, unknown>
}
