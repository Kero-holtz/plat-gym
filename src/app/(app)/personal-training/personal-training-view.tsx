"use client"

import { useMemo, useState } from "react"
import { addDays, format, parseISO } from "date-fns"
import { CalendarCheckIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, DumbbellIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { ErrorState, LoadingRows } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { apiFetch, ClientApiError } from "@/lib/client-api"
import { formatDateLong, formatMoney, formatTime, todayCairo } from "@/lib/dates"
import type { AvailableSlot, Booking, MemberListItem, PaymentStatus, Trainer } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

const steps = ["Member & trainer", "Date", "Time", "Confirm"]
const paymentItems = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
]

interface DateOption {
  date: string
  slots: AvailableSlot[]
  available: boolean
}

const EMPTY_MEMBERS: MemberListItem[] = []
const EMPTY_TRAINERS: Trainer[] = []

export function PersonalTrainingView() {
  const membersState = useApiData<{ members: MemberListItem[] }>("/api/members?status=all")
  const trainersState = useApiData<{ trainers: Trainer[] }>("/api/trainers")
  const [step, setStep] = useState(1)
  const [memberId, setMemberId] = useState("")
  const [trainerId, setTrainerId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [price, setPrice] = useState("400")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid")
  const [dates, setDates] = useState<DateOption[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)

  const members = membersState.data?.members ?? EMPTY_MEMBERS
  const trainers = trainersState.data?.trainers ?? EMPTY_TRAINERS
  const selectedMember = members.find((member) => member.id === memberId)
  const selectedTrainer = trainers.find((trainer) => trainer.id === trainerId)
  const selectedDate = dates.find((option) => option.date === date)
  const memberItems = useMemo(
    () => members.map((member) => ({ value: member.id, label: `${member.name} · ${member.phone}` })),
    [members],
  )

  async function nextFromTrainer() {
    if (!memberId || !trainerId) {
      setError("Choose both a member and a trainer.")
      return
    }
    setError(null)
    setLoadingDates(true)
    setStep(2)
    const start = parseISO(todayCairo())
    const options = Array.from({ length: 14 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"))
    try {
      const result = await Promise.all(
        options.map(async (candidate) => {
          const response = await apiFetch<{ slots: AvailableSlot[] }>(
            `/api/availability?trainerId=${encodeURIComponent(trainerId)}&date=${candidate}`,
          )
          return {
            date: candidate,
            slots: response.slots,
            available: response.slots.some((slot) => slot.available),
          }
        }),
      )
      setDates(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load trainer availability.")
    } finally {
      setLoadingDates(false)
    }
  }

  function chooseDate(value: string) {
    setDate(value)
    setTime("")
    setError(null)
    setStep(3)
  }

  function chooseTime(value: string) {
    setTime(value)
    setError(null)
    setStep(4)
  }

  async function confirmBooking() {
    setSubmitting(true)
    setError(null)
    try {
      const { booking } = await apiFetch<{ booking: Booking }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          memberId,
          trainerId,
          date,
          time,
          price: Number(price),
          paymentStatus,
        }),
      })
      setCreated(booking)
      toast.add({ type: "success", description: "PT booking confirmed." })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create booking.")
      if (caught instanceof ClientApiError && caught.code === "DOUBLE_BOOKING") {
        setStep(3)
        const result = await apiFetch<{ slots: AvailableSlot[] }>(`/api/availability?trainerId=${encodeURIComponent(trainerId)}&date=${date}`).catch(() => null)
        if (result) setDates((items) => items.map((item) => item.date === date ? { ...item, slots: result.slots } : item))
      }
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep(1)
    setMemberId("")
    setTrainerId("")
    setDate("")
    setTime("")
    setPrice("400")
    setPaymentStatus("paid")
    setCreated(null)
    setError(null)
    setDates([])
  }

  if ((membersState.loading && !membersState.data) || (trainersState.loading && !trainersState.data)) {
    return <LoadingRows count={6} />
  }
  if (membersState.error || trainersState.error) {
    return <ErrorState message={membersState.error ?? trainersState.error ?? "Could not load booking information."} retry={() => { membersState.reload(); trainersState.reload() }} />
  }

  if (created) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 pt-4">
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-success" aria-hidden="true" />
          <CardHeader className="items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success"><CheckIcon aria-hidden="true" /></span>
            <h1 className="mt-2 text-xl font-bold tracking-tight">Booking confirmed</h1>
            <CardDescription>The PT session and its payment record were saved.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Member</dt><dd className="mt-1 font-bold">{created.memberName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Trainer</dt><dd className="mt-1 font-bold">{created.trainerName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-1 font-bold">{formatDateLong(created.date)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Time</dt><dd className="mt-1 font-bold">{formatTime(created.time)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Price</dt><dd className="mt-1 font-bold">{formatMoney(created.price)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={created.status} /></dd></div>
            </dl>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" render={<Link href="/bookings?scope=upcoming" />}><CalendarCheckIcon data-icon="inline-start" />View bookings</Button>
              <Button className="flex-1" variant="outline" onClick={reset}>Book another</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Book personal training" description="Choose a member, trainer, date, and an available time." />

      <ol className="grid grid-cols-4 gap-1 rounded-xl border bg-card p-2" aria-label="Booking progress">
        {steps.map((label, index) => {
          const value = index + 1
          const current = step === value
          const complete = step > value
          return (
            <li key={label} className="min-w-0">
              <button
                type="button"
                onClick={() => complete && setStep(value)}
                disabled={!complete}
                aria-current={current ? "step" : undefined}
                className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center disabled:cursor-default sm:flex-row sm:justify-center sm:gap-2"
              >
                <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-primary text-primary-foreground" : complete ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
                  {complete ? <CheckIcon className="size-3.5" aria-hidden="true" /> : value}
                </span>
                <span className={`truncate text-[10px] font-semibold sm:text-xs ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <Card className="mx-auto w-full max-w-3xl">
        {step === 1 ? (
          <>
            <CardHeader><CardTitle>Choose member and trainer</CardTitle><CardDescription>Select who the session is for, then pick an active trainer.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Field>
                <FieldLabel htmlFor="pt-member">Member</FieldLabel>
                <Select items={memberItems} value={memberId} onValueChange={(value) => value && setMemberId(value)}>
                  <SelectTrigger id="pt-member" className="w-full"><SelectValue placeholder="Choose a member" /></SelectTrigger>
                  <SelectContent><SelectGroup>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name} · {member.phone}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
                {selectedMember ? <FieldDescription className="flex items-center gap-2">Membership <StatusBadge status={selectedMember.status} /></FieldDescription> : null}
              </Field>

              <FieldGroup>
                <FieldLabel>Trainer</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {trainers.map((trainer) => {
                    const selected = trainer.id === trainerId
                    return (
                      <button
                        type="button"
                        key={trainer.id}
                        onClick={() => { setTrainerId(trainer.id); setDate(""); setTime(""); setDates([]); setError(null) }}
                        aria-pressed={selected}
                        className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary bg-accent" : "bg-card hover:border-primary/35"}`}
                      >
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}><UserRoundIcon aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block font-bold">{trainer.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{trainer.specialization}</span></span>
                        {selected ? <CheckIcon className="text-primary" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              </FieldGroup>
              {error ? <FieldError role="alert">{error}</FieldError> : null}
              <div className="flex justify-end"><Button onClick={nextFromTrainer}>Choose date<ChevronRightIcon data-icon="inline-end" /></Button></div>
            </CardContent>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <CardHeader><CardTitle>Choose a date</CardTitle><CardDescription>Showing the next 14 days for {selectedTrainer?.name}.</CardDescription></CardHeader>
            <CardContent>
              {loadingDates ? <LoadingRows count={4} /> : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {dates.map((option) => (
                    <Button
                      key={option.date}
                      type="button"
                      variant="outline"
                      disabled={!option.available}
                      onClick={() => chooseDate(option.date)}
                      className="h-auto min-h-16 flex-col gap-0.5 py-2"
                    >
                      <span className="text-xs text-muted-foreground">{format(parseISO(option.date), "EEE")}</span>
                      <span className="font-bold">{format(parseISO(option.date), "d MMM")}</span>
                      {!option.available ? <span className="text-[9px] text-muted-foreground">Unavailable</span> : null}
                    </Button>
                  ))}
                </div>
              )}
              {error ? <FieldError className="mt-4" role="alert">{error}</FieldError> : null}
              <div className="mt-6"><Button variant="outline" onClick={() => setStep(1)}><ChevronLeftIcon data-icon="inline-start" />Back</Button></div>
            </CardContent>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <CardHeader><CardTitle>Choose a time</CardTitle><CardDescription>{selectedTrainer?.name} · {date ? formatDateLong(date) : ""}</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {(selectedDate?.slots ?? []).map((slot) => (
                  <Button
                    key={slot.time}
                    type="button"
                    variant="outline"
                    disabled={!slot.available}
                    onClick={() => chooseTime(slot.time)}
                    className="h-11 tabular-nums"
                    title={!slot.available ? (slot.reason === "booked" ? "Already booked" : "Time has passed") : undefined}
                  >
                    {formatTime(slot.time)}
                  </Button>
                ))}
              </div>
              {(selectedDate?.slots ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No working hours are configured for this date.</p> : null}
              <p className="mt-3 text-xs text-muted-foreground">Unavailable times are disabled. Each session is 60 minutes.</p>
              {error ? <FieldError className="mt-4" role="alert">{error}</FieldError> : null}
              <div className="mt-6"><Button variant="outline" onClick={() => setStep(2)}><ChevronLeftIcon data-icon="inline-start" />Back</Button></div>
            </CardContent>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <CardHeader><CardTitle>Confirm booking</CardTitle><CardDescription>Check the session details before saving.</CardDescription></CardHeader>
            <CardContent>
              <dl className="grid gap-4 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Member</dt><dd className="mt-1 font-bold">{selectedMember?.name}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Trainer</dt><dd className="mt-1 font-bold">{selectedTrainer?.name}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-1 font-bold">{date ? formatDateLong(date) : "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Time</dt><dd className="mt-1 font-bold">{time ? formatTime(time) : "—"}</dd></div>
              </dl>
              <FieldGroup className="mt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="pt-price">Price (EGP)</FieldLabel>
                    <Input id="pt-price" type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="pt-payment">Payment status</FieldLabel>
                    <Select items={paymentItems} value={paymentStatus} onValueChange={(value) => value && setPaymentStatus(value as PaymentStatus)}>
                      <SelectTrigger id="pt-payment" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>{paymentItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                  </Field>
                </div>
                <FieldDescription>A linked PT payment record will be created automatically.</FieldDescription>
                {error ? <FieldError role="alert">{error}</FieldError> : null}
              </FieldGroup>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ChevronLeftIcon data-icon="inline-start" />Back</Button>
                <Button onClick={confirmBooking} disabled={submitting || Number(price) <= 0}>
                  <DumbbellIcon data-icon="inline-start" />{submitting ? "Confirming…" : `Confirm · ${formatMoney(Number(price) || 0)}`}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}
      </Card>
    </div>
  )
}
