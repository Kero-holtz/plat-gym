"use client"

import type { LucideIcon } from "lucide-react"
import {
  CalendarCheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DumbbellIcon,
  ScanLineIcon,
  TimerResetIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react"
import Link from "next/link"
import { AddMemberDialog } from "@/components/member-actions"
import { ErrorState, LoadingRows } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateLong, formatDateTime, formatMoney, formatTime } from "@/lib/dates"
import type { DashboardData } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

interface StatDefinition {
  label: string
  icon: LucideIcon
  value: (data: DashboardData) => string
  hint: string
}

const stats: StatDefinition[] = [
  { label: "Members", icon: UsersIcon, value: (data) => String(data.stats.members), hint: "All registered members" },
  { label: "Today's visits", icon: ScanLineIcon, value: (data) => String(data.stats.visitsToday), hint: "Check-ins recorded today" },
  { label: "Expiring soon", icon: TimerResetIcon, value: (data) => String(data.stats.expiringSoon), hint: "Next 14 days" },
  { label: "Today's PT", icon: DumbbellIcon, value: (data) => String(data.stats.bookingsToday), hint: "Non-cancelled bookings" },
  { label: "Today's revenue", icon: WalletCardsIcon, value: (data) => formatMoney(data.stats.revenueToday), hint: "Paid payments only" },
]

const quickLinks = [
  { href: "/members", label: "Members", detail: "Find, add, or renew", icon: UsersIcon },
  { href: "/personal-training", label: "Personal Training", detail: "Book a trainer", icon: DumbbellIcon },
  { href: "/bookings", label: "Bookings", detail: "Today's PT schedule", icon: CalendarCheckIcon },
  { href: "/payments", label: "Payments", detail: "Paid and pending", icon: CreditCardIcon },
]

export function DashboardView() {
  const { data, error, loading, reload } = useApiData<DashboardData>("/api/dashboard")

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Today's activity" description="Loading the front-desk overview…" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><LoadingRows count={5} /></div>
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? "No dashboard data."} retry={reload} />

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Today's activity"
        description={formatDateLong(data.today)}
        action={<AddMemberDialog onSuccess={reload} />}
      />

      <section aria-label="Today's statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={index === 4 ? "col-span-2 lg:col-span-1" : undefined}>
              <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                <CardDescription className="font-semibold text-foreground/70">{stat.label}</CardDescription>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon aria-hidden="true" /></span>
              </CardHeader>
              <CardContent>
                <p className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums">{stat.value(data)}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-3 text-sm font-bold">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="group flex min-h-20 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-accent/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Icon aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span>
                <ChevronRightIcon className="text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle>Expiring soon</CardTitle><CardDescription>Memberships ending in the next 14 days.</CardDescription></div>
            <Link href="/members?status=expiring" className="shrink-0 text-sm font-semibold text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.expiringMembers.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No memberships expire in the next 14 days.</p>
            ) : (
              <div className="divide-y">
                {data.expiringMembers.map((member) => (
                  <Link key={member.id} href={`/members/${member.id}`} className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block text-xs text-muted-foreground">{member.membershipType}</span></span>
                    <span className="hidden text-right sm:block"><span className="block text-xs font-semibold tabular-nums">{formatDate(member.expirationDate)}</span><span className="block text-[10px] text-muted-foreground">Expires</span></span>
                    <StatusBadge status={member.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Latest check-ins</CardTitle><CardDescription>Most recent visits recorded today.</CardDescription></CardHeader>
          <CardContent className="p-0">
            {data.recentVisits.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No visits recorded yet today.</p> : (
              <div className="divide-y">
                {data.recentVisits.map((visit) => (
                  <Link key={visit.id} href={`/members/${visit.memberId}`} className="flex min-h-14 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-success-soft text-success"><ScanLineIcon aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{visit.memberName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(visit.visitTime).split("·")[1]?.trim()}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div><CardTitle>Today&apos;s PT schedule</CardTitle><CardDescription>Upcoming and completed personal-training sessions.</CardDescription></div>
          <Link href="/bookings?scope=today" className="shrink-0 text-sm font-semibold text-primary hover:underline">Open bookings</Link>
        </CardHeader>
        <CardContent className="p-0">
          {data.todayBookings.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No PT bookings today.</p> : (
            <div className="divide-y">
              {data.todayBookings.map((booking) => (
                <div key={booking.id} className="grid min-h-15 grid-cols-[72px_1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[88px_1fr_1fr_auto]">
                  <span className="font-display text-xl font-bold tabular-nums">{formatTime(booking.time)}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{booking.memberName}</span><span className="block truncate text-xs text-muted-foreground sm:hidden">with {booking.trainerName}</span></span>
                  <span className="hidden truncate text-sm text-muted-foreground sm:block">{booking.trainerName}</span>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Badge variant="outline" className="sr-only">Dashboard date {formatDate(data.today)}</Badge>
    </div>
  )
}
