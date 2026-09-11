import type { ColumnType } from "kysely"

export type Timestamp = ColumnType<string | Date, string, string>

export interface StaffUsersTable {
  id: string
  auth_user_id: string | null
  name: string
  email: string
  role: "manager" | "receptionist"
  password_hash: string | null
  active: number
  created_at: Timestamp
}

export interface MembershipTypesTable {
  id: string
  name: string
  duration_months: number
  price: number
  active: number
  created_at: Timestamp
}

export interface MembersTable {
  id: string
  name: string
  phone: string
  membership_type_id: string
  start_date: string
  expiration_date: string
  notes: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface VisitsTable {
  id: string
  member_id: string
  visit_time: Timestamp
  recorded_by: string | null
}

export interface TrainersTable {
  id: string
  name: string
  phone: string
  specialization: string
  active: number
  created_at: Timestamp
}

export interface TrainerAvailabilityTable {
  id: string
  trainer_id: string
  weekday: number
  start_time: string
  end_time: string
}

export interface BookingsTable {
  id: string
  member_id: string
  trainer_id: string
  booking_date: string
  start_time: string
  status: "scheduled" | "completed" | "cancelled"
  price: number
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface PaymentsTable {
  id: string
  member_id: string
  booking_id: string | null
  amount: number
  payment_type: "membership" | "pt"
  status: "paid" | "pending"
  payment_date: string
  recorded_by: string | null
  created_at: Timestamp
}

export interface DatabaseSchema {
  staff_users: StaffUsersTable
  membership_types: MembershipTypesTable
  members: MembersTable
  visits: VisitsTable
  trainers: TrainersTable
  trainer_availability: TrainerAvailabilityTable
  bookings: BookingsTable
  payments: PaymentsTable
}
