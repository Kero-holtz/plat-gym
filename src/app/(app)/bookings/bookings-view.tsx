"use client"

import { useMemo, useState } from "react"
import { CalendarPlusIcon, DumbbellIcon } from "lucide-react"
import Link from "next/link"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/client-api"
import { formatDate, formatMoney, formatTime } from "@/lib/dates"
import type { Booking, BookingStatus } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

const statusItems = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function BookingStatusControl({ booking, onChange }: { booking: Booking; onChange: () => void }) {
  const [updating, setUpdating] = useState(false)

  async function update(value: string | null) {
    if (!value || value === booking.status) return
    setUpdating(true)
    try {
      await apiFetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      })
      toast.add({ type: "success", description: `Booking marked ${value}.` })
      onChange()
    } catch (caught) {
      toast.add({ type: "error", description: caught instanceof Error ? caught.message : "Could not update booking." })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Select items={statusItems} value={booking.status} onValueChange={update} disabled={updating}>
      <SelectTrigger aria-label={`Status for ${booking.memberName}`} className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{statusItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  )
}

export function BookingsView({ initialScope }: { initialScope: "today" | "upcoming" | "all" }) {
  const [scope, setScope] = useState(initialScope)
  const [status, setStatus] = useState<BookingStatus | "all">("all")
  const url = useMemo(() => `/api/bookings?scope=${scope}&status=${status}`, [scope, status])
  const { data, error, loading, reload } = useApiData<{ bookings: Booking[] }>(url)
  const bookings = data?.bookings ?? []

  function changeScope(value: string | number | null) {
    if (typeof value !== "string") return
    const next = value as typeof scope
    setScope(next)
    window.history.replaceState(null, "", next === "today" ? "/bookings" : `/bookings?scope=${next}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PT bookings"
        description="See the schedule and keep each session status current."
        action={
          <Button render={<Link href="/personal-training" />} className="h-10">
            <CalendarPlusIcon data-icon="inline-start" /> New booking
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={scope} onValueChange={changeScope}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select items={[{ value: "all", label: "All statuses" }, ...statusItems]} value={status} onValueChange={(value) => value && setStatus(value as BookingStatus | "all")}>
          <SelectTrigger aria-label="Filter by booking status" className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{statusItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
      </div>

      <p className="text-sm font-semibold">{loading ? "Loading bookings…" : `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}</p>
      {error ? <ErrorState message={error} retry={reload} /> : null}
      {loading && !data ? <LoadingRows count={6} /> : null}
      {!loading && !error && bookings.length === 0 ? (
        <EmptyState
          title="No bookings here"
          description="There are no PT sessions matching this date and status."
          action={<Button render={<Link href="/personal-training" />}><CalendarPlusIcon data-icon="inline-start" />Book PT session</Button>}
        />
      ) : null}

      {bookings.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Date & time</TableHead><TableHead>Member</TableHead><TableHead>Trainer</TableHead><TableHead>Price</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="content-auto">
                    <TableCell><span className="block font-semibold tabular-nums">{formatDate(booking.date)}</span><span className="text-xs text-muted-foreground">{formatTime(booking.time)}</span></TableCell>
                    <TableCell><Link href={`/members/${booking.memberId}`} className="font-semibold hover:text-primary hover:underline">{booking.memberName}</Link></TableCell>
                    <TableCell>{booking.trainerName}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatMoney(booking.price)}</TableCell>
                    <TableCell>{booking.paymentStatus ? <StatusBadge status={booking.paymentStatus} /> : "—"}</TableCell>
                    <TableCell><div className="flex justify-end"><BookingStatusControl booking={booking} onChange={reload} /></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-xl border bg-card p-4 content-auto">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><DumbbellIcon aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-bold">{booking.memberName}</p><p className="text-xs text-muted-foreground">with {booking.trainerName}</p></div>
                  <StatusBadge status={booking.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs">
                  <div><dt className="text-muted-foreground">Date</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDate(booking.date)}</dd></div>
                  <div><dt className="text-muted-foreground">Time</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatTime(booking.time)}</dd></div>
                  <div><dt className="text-muted-foreground">Price</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(booking.price)}</dd></div>
                  <div><dt className="text-muted-foreground">Payment</dt><dd className="mt-0.5">{booking.paymentStatus ? <StatusBadge status={booking.paymentStatus} /> : "—"}</dd></div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-muted-foreground">Change status</span><BookingStatusControl booking={booking} onChange={reload} /></div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
