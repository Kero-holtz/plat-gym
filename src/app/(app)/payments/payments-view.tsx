"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { CircleDollarSignIcon, Clock3Icon, SearchIcon, WalletCardsIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { AddPaymentDialog } from "@/components/payment-actions"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/client-api"
import { formatDate, formatMoney } from "@/lib/dates"
import type { Payment, PaymentStatus, PaymentType } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

const EMPTY_PAYMENTS: Payment[] = []

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
]
const typeItems = [
  { value: "all", label: "All types" },
  { value: "membership", label: "Membership" },
  { value: "pt", label: "Personal training" },
]

function PaymentStatusControl({ payment, onChange }: { payment: Payment; onChange: () => void }) {
  const [updating, setUpdating] = useState(false)
  async function update(value: string | null) {
    if (!value || value === payment.status) return
    setUpdating(true)
    try {
      await apiFetch(`/api/payments/${payment.id}`, { method: "PATCH", body: JSON.stringify({ status: value }) })
      toast.add({ type: "success", description: value === "paid" ? "Payment marked paid." : "Payment marked pending." })
      onChange()
    } catch (caught) {
      toast.add({ type: "error", description: caught instanceof Error ? caught.message : "Could not update payment." })
    } finally {
      setUpdating(false)
    }
  }
  return (
    <Select items={statusItems.slice(1)} value={payment.status} onValueChange={update} disabled={updating}>
      <SelectTrigger aria-label={`Payment status for ${payment.memberName}`} className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectGroup></SelectContent>
    </Select>
  )
}

export function PaymentsView() {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<PaymentStatus | "all">("all")
  const [type, setType] = useState<PaymentType | "all">("all")
  const url = useMemo(() => {
    const params = new URLSearchParams({ status, type })
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim())
    return `/api/payments?${params}`
  }, [deferredSearch, status, type])
  const { data, error, loading, reload } = useApiData<{ payments: Payment[] }>(url)
  const payments = data?.payments ?? EMPTY_PAYMENTS
  const totals = useMemo(() => payments.reduce((result, payment) => {
    if (payment.status === "paid") result.paid += payment.amount
    else result.pending += payment.amount
    return result
  }, { paid: 0, pending: 0 }), [payments])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" description="Basic membership and PT payment status—nothing more." action={<AddPaymentDialog onSuccess={reload} />} />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Payment summary">
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardDescription>Paid in this view</CardDescription><CircleDollarSignIcon className="text-success" aria-hidden="true" /></CardHeader><CardContent><p className="font-display text-3xl font-bold tabular-nums">{formatMoney(totals.paid)}</p></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardDescription>Pending in this view</CardDescription><Clock3Icon className="text-warning" aria-hidden="true" /></CardHeader><CardContent><p className="font-display text-3xl font-bold tabular-nums">{formatMoney(totals.pending)}</p></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardDescription>Records shown</CardDescription><WalletCardsIcon className="text-primary" aria-hidden="true" /></CardHeader><CardContent><p className="font-display text-3xl font-bold tabular-nums">{payments.length}</p></CardContent></Card>
      </section>

      <div className="grid gap-3 rounded-xl border bg-card p-3 lg:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Search payments" placeholder="Search by member name or phone" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9 pr-10" />
          {search ? <Button variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setSearch("")} aria-label="Clear search"><XIcon /></Button> : null}
        </div>
        <Select items={typeItems} value={type} onValueChange={(value) => value && setType(value as PaymentType | "all")}>
          <SelectTrigger aria-label="Filter payment type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>{typeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
        <Select items={statusItems} value={status} onValueChange={(value) => value && setStatus(value as PaymentStatus | "all")}>
          <SelectTrigger aria-label="Filter payment status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>{statusItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} retry={reload} /> : null}
      {loading && !data ? <LoadingRows count={7} /> : null}
      {!loading && !error && payments.length === 0 ? <EmptyState title="No payments found" description="Try different filters, or record a new payment." action={<AddPaymentDialog onSuccess={reload} />} /> : null}

      {payments.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Linked to</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="content-auto">
                    <TableCell><Link href={`/members/${payment.memberId}`} className="font-semibold hover:text-primary hover:underline">{payment.memberName}</Link></TableCell>
                    <TableCell>{payment.paymentType === "membership" ? "Membership" : "Personal training"}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="font-bold tabular-nums">{formatMoney(payment.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{payment.bookingId ? "PT booking" : "Member"}</TableCell>
                    <TableCell><div className="flex justify-end"><PaymentStatusControl payment={payment} onChange={reload} /></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {payments.map((payment) => (
              <article key={payment.id} className="rounded-xl border bg-card p-4 content-auto">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/members/${payment.memberId}`} className="truncate font-bold hover:text-primary">{payment.memberName}</Link><p className="mt-0.5 text-xs text-muted-foreground">{payment.paymentType === "membership" ? "Membership" : "Personal training"} · {formatDate(payment.paymentDate)}</p></div><p className="shrink-0 font-display text-xl font-bold tabular-nums">{formatMoney(payment.amount)}</p></div>
                <div className="mt-4 flex items-center justify-between border-t pt-3"><StatusBadge status={payment.status} /><PaymentStatusControl payment={payment} onChange={reload} /></div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
