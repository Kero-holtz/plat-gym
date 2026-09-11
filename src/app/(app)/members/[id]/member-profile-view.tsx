"use client"

import { ArrowLeftIcon, CalendarDaysIcon, CreditCardIcon, HistoryIcon, PhoneIcon, ScanLineIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { AddVisitButton, EditMemberDialog, RenewMemberDialog } from "@/components/member-actions"
import { ErrorState, LoadingRows } from "@/components/feedback"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatDateTime, formatMoney } from "@/lib/dates"
import type { MemberProfile } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

export function MemberProfileView({ memberId }: { memberId: string }) {
  const { data, error, loading, reload } = useApiData<{ member: MemberProfile }>(`/api/members/${memberId}`)
  const member = data?.member

  if (loading && !member) return <LoadingRows count={6} />
  if (error || !member) return <ErrorState message={error ?? "Member not found."} retry={reload} />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/members" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden="true" /> Back to members
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{member.name}</h1>
              <StatusBadge status={member.status} />
            </div>
            <a href={`tel:${member.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <PhoneIcon aria-hidden="true" /> {member.phone}
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddVisitButton member={member} onSuccess={reload} />
            <EditMemberDialog member={member} onSuccess={reload} />
            <RenewMemberDialog member={member} onSuccess={reload} />
          </div>
        </div>
      </div>

      {member.status === "expired" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-danger-soft p-4 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 shrink-0" aria-hidden="true" />
          <div><p className="font-bold">Membership expired</p><p className="mt-0.5 text-foreground/70">Expired on {formatDate(member.expirationDate)}. Renew before the next visit when possible.</p></div>
        </div>
      ) : member.status === "expiring" ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
          <CalendarDaysIcon className="mt-0.5 shrink-0" aria-hidden="true" />
          <div><p className="font-bold">Renewal due soon</p><p className="mt-0.5 text-foreground/70">This membership expires on {formatDate(member.expirationDate)}.</p></div>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Member summary">
        <Card><CardHeader className="pb-2"><CardDescription>Membership</CardDescription></CardHeader><CardContent><p className="font-bold">{member.membershipType}</p><p className="mt-1 text-xs text-muted-foreground">Started {formatDate(member.startDate)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Expiration</CardDescription></CardHeader><CardContent><p className="font-bold tabular-nums">{formatDate(member.expirationDate)}</p><StatusBadge status={member.status} className="mt-1.5" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total visits</CardDescription></CardHeader><CardContent><p className="font-display text-3xl font-bold tabular-nums">{member.totalVisits}</p><p className="mt-1 text-xs text-muted-foreground">Last: {member.lastVisit ? formatDateTime(member.lastVisit) : "No visits"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current payment</CardDescription></CardHeader><CardContent><p className="font-bold">{formatMoney(member.amountPaid)} / {formatMoney(member.membershipPrice)}</p>{member.lastMembershipPayment ? <StatusBadge status={member.lastMembershipPayment.status} className="mt-1.5" /> : <p className="mt-1 text-xs text-muted-foreground">No payment record</p>}</CardContent></Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader><div className="flex items-center gap-2"><ScanLineIcon className="text-primary" aria-hidden="true" /><CardTitle>Visit activity</CardTitle></div><CardDescription>Latest gym check-ins.</CardDescription></CardHeader>
          <CardContent className="p-0">
            {member.recentVisits.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No visits recorded yet.</p> : (
              <ol className="divide-y">
                {member.recentVisits.map((visit, index) => (
                  <li key={visit.id} className="flex min-h-14 items-center gap-3 px-5 py-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold">{formatDateTime(visit.visitTime)}</span>
                    {index === 0 ? <span className="text-[10px] font-bold uppercase tracking-wider text-success">Latest</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><CreditCardIcon className="text-primary" aria-hidden="true" /><CardTitle>Payments</CardTitle></div><CardDescription>Membership and PT payment history.</CardDescription></CardHeader>
          <CardContent className="p-0">
            {member.recentPayments.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No payments recorded.</p> : (
              <div className="divide-y">
                {member.recentPayments.map((payment) => (
                  <div key={payment.id} className="grid min-h-15 grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_120px_100px_auto]">
                    <div><p className="text-sm font-semibold">{payment.paymentType === "membership" ? "Membership" : "Personal training"}</p><p className="text-xs text-muted-foreground sm:hidden">{formatDate(payment.paymentDate)}</p></div>
                    <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">{formatDate(payment.paymentDate)}</span>
                    <span className="hidden text-right text-sm font-bold tabular-nums sm:block">{formatMoney(payment.amount)}</span>
                    <div className="text-right"><p className="mb-1 text-sm font-bold tabular-nums sm:hidden">{formatMoney(payment.amount)}</p><StatusBadge status={payment.status} /></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><HistoryIcon className="text-primary" aria-hidden="true" /><CardTitle>Member information</CardTitle></div></CardHeader>
        <CardContent>
          <dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Full name</dt><dd className="mt-1 font-semibold">{member.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-1 font-semibold tabular-nums">{member.phone}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Start date</dt><dd className="mt-1 font-semibold tabular-nums">{formatDate(member.startDate)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Expiration date</dt><dd className="mt-1 font-semibold tabular-nums">{formatDate(member.expirationDate)}</dd></div>
          </dl>
          {member.notes ? <><Separator className="my-5" /><div><p className="text-xs text-muted-foreground">Front-desk note</p><p className="mt-1 text-sm">{member.notes}</p></div></> : null}
        </CardContent>
      </Card>
    </div>
  )
}
