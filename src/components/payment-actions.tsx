"use client"

import { useEffect, useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { apiFetch } from "@/lib/client-api"
import { todayCairo } from "@/lib/dates"
import type { MemberListItem, Payment, PaymentStatus, PaymentType } from "@/lib/domain"

const typeItems = [
  { value: "membership", label: "Membership" },
  { value: "pt", label: "Personal training" },
]
const statusItems = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
]

export function AddPaymentDialog({ onSuccess }: { onSuccess?: (payment: Payment) => void }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [memberId, setMemberId] = useState("")
  const [paymentType, setPaymentType] = useState<PaymentType>("membership")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<PaymentStatus>("paid")
  const [paymentDate, setPaymentDate] = useState(todayCairo())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || members.length) return
    apiFetch<{ members: MemberListItem[] }>("/api/members")
      .then((result) => setMembers(result.members))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load members."))
  }, [members.length, open])

  const memberItems = useMemo(() => members.map((member) => ({ value: member.id, label: `${member.name} · ${member.phone}` })), [members])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { payment } = await apiFetch<{ payment: Payment }>("/api/payments", {
        method: "POST",
        body: JSON.stringify({ memberId, amount: Number(amount), paymentType, status, paymentDate }),
      })
      toast.add({ type: "success", description: "Payment recorded." })
      setOpen(false)
      setMemberId("")
      setAmount("")
      setStatus("paid")
      setPaymentDate(todayCairo())
      onSuccess?.(payment)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record payment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10" />}><PlusIcon data-icon="inline-start" />Record payment</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Add a basic membership or PT payment.</DialogDescription></DialogHeader>
        <form id="add-payment-form" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="payment-member">Member</FieldLabel>
              <Select items={memberItems} value={memberId} onValueChange={(value) => value && setMemberId(value)}>
                <SelectTrigger id="payment-member" className="w-full"><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent><SelectGroup>{memberItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="payment-type">Payment type</FieldLabel>
                <Select items={typeItems} value={paymentType} onValueChange={(value) => value && setPaymentType(value as PaymentType)}>
                  <SelectTrigger id="payment-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{typeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-amount">Amount (EGP)</FieldLabel>
                <Input id="payment-amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="payment-date">Date</FieldLabel>
                <Input id="payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-status">Status</FieldLabel>
                <Select items={statusItems} value={status} onValueChange={(value) => value && setStatus(value as PaymentStatus)}>
                  <SelectTrigger id="payment-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{statusItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
            </div>
            {error ? <FieldError role="alert">{error}</FieldError> : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-payment-form" disabled={submitting || !memberId || Number(amount) <= 0}>{submitting ? "Saving…" : "Record payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
