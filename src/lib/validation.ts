import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.")
const phone = z
  .string()
  .trim()
  .regex(/^01[0125]\d{8}$/, "Enter an 11-digit Egyptian mobile number.")
const money = z.coerce.number().finite().min(0, "Amount cannot be negative.").max(1_000_000)

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

export const memberCreateSchema = z.object({
  name: z.string().trim().min(3, "Enter the member's full name.").max(100),
  phone,
  membershipTypeId: z.string().min(1, "Choose a membership type."),
  startDate: isoDate,
  paymentStatus: z.enum(["paid", "pending"]),
  amount: money.optional(),
  notes: z.string().trim().max(500).optional(),
})

export const memberUpdateSchema = z.object({
  name: z.string().trim().min(3, "Enter the member's full name.").max(100),
  phone,
  notes: z.string().trim().max(500).optional(),
})

export const memberRenewSchema = z.object({
  membershipTypeId: z.string().min(1, "Choose a membership type."),
  startDate: isoDate,
  paymentStatus: z.enum(["paid", "pending"]),
  amount: money.optional(),
})

export const visitSchema = z.object({
  confirmExpired: z.boolean().optional().default(false),
})

const availabilitySchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "Availability end time must be after start time.",
  })

export const trainerSchema = z.object({
  name: z.string().trim().min(3, "Enter the trainer's full name.").max(100),
  phone,
  specialization: z.string().trim().min(2, "Enter a specialization.").max(120),
  active: z.boolean(),
  availability: z.array(availabilitySchema).min(1, "Choose at least one working day."),
})

export const bookingCreateSchema = z.object({
  memberId: z.string().min(1, "Choose a member."),
  trainerId: z.string().min(1, "Choose a trainer."),
  date: isoDate,
  time,
  price: money.refine((value) => value > 0, "Price must be greater than zero."),
  paymentStatus: z.enum(["paid", "pending"]),
})

export const bookingStatusSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]),
})

export const paymentCreateSchema = z.object({
  memberId: z.string().min(1, "Choose a member."),
  bookingId: z.string().nullable().optional(),
  amount: money.refine((value) => value > 0, "Amount must be greater than zero."),
  paymentType: z.enum(["membership", "pt"]),
  status: z.enum(["paid", "pending"]),
  paymentDate: isoDate,
})

export const paymentStatusSchema = z.object({
  status: z.enum(["paid", "pending"]),
})

export const membershipTypeSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(60),
  durationMonths: z.coerce.number().int().min(1).max(60),
  price: money,
  active: z.boolean(),
})
