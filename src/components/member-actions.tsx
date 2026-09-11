"use client"

import { useEffect, useMemo, useState } from "react"
import { PencilIcon, PlusIcon, RefreshCwIcon, ScanLineIcon, TriangleAlertIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { apiFetch, ClientApiError } from "@/lib/client-api"
import { addMembershipMonths, formatDate, suggestedRenewalStart, todayCairo } from "@/lib/dates"
import type { MemberListItem, MemberProfile, MembershipType, PaymentStatus } from "@/lib/domain"

function paymentItems() {
  return [
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
  ]
}

function FormMessage({ message }: { message: string | null }) {
  return message ? <FieldError role="alert">{message}</FieldError> : null
}

export function AddMemberDialog({ onSuccess }: { onSuccess?: (member: MemberProfile) => void }) {
  const [open, setOpen] = useState(false)
  const [types, setTypes] = useState<MembershipType[]>([])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [membershipTypeId, setMembershipTypeId] = useState("")
  const [startDate, setStartDate] = useState(todayCairo())
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || types.length > 0) return
    apiFetch<{ membershipTypes: MembershipType[] }>("/api/membership-types")
      .then(({ membershipTypes }) => {
        setTypes(membershipTypes)
        if (membershipTypes[0]) {
          setMembershipTypeId(membershipTypes[0].id)
          setAmount(String(membershipTypes[0].price))
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load membership types."))
  }, [open, types.length])

  const selectedType = types.find((type) => type.id === membershipTypeId)
  const expirationDate = selectedType ? addMembershipMonths(startDate, selectedType.durationMonths) : null
  const typeItems = useMemo(() => types.map((type) => ({ value: type.id, label: `${type.name} · EGP ${type.price}` })), [types])

  function chooseType(value: string | null) {
    if (!value) return
    setMembershipTypeId(value)
    const next = types.find((type) => type.id === value)
    if (next) setAmount(String(next.price))
  }

  function reset() {
    setName("")
    setPhone("")
    setNotes("")
    setStartDate(todayCairo())
    setPaymentStatus("paid")
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { member } = await apiFetch<{ member: MemberProfile }>("/api/members", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          membershipTypeId,
          startDate,
          paymentStatus,
          amount: Number(amount),
          notes,
        }),
      })
      toast.add({ type: "success", description: `${member.name} was added.` })
      setOpen(false)
      reset()
      onSuccess?.(member)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add member.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10" />}>
        <PlusIcon data-icon="inline-start" />
        Add member
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>Create the membership and record its first payment.</DialogDescription>
        </DialogHeader>
        <form id="add-member-form" onSubmit={submit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="add-member-name">Full name</FieldLabel>
                <Input id="add-member-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-member-phone">Phone number</FieldLabel>
                <Input id="add-member-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="01012345678" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="add-membership-type">Membership type</FieldLabel>
              <Select items={typeItems} value={membershipTypeId} onValueChange={chooseType}>
                <SelectTrigger id="add-membership-type" className="w-full">
                  <SelectValue placeholder="Choose a membership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {typeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="add-start-date">Start date</FieldLabel>
                <Input id="add-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
              </Field>
              <Field>
                <FieldLabel>Expiration date</FieldLabel>
                <div className="flex h-8 items-center rounded-lg border bg-muted px-3 text-sm font-semibold tabular-nums sm:h-8">
                  {expirationDate ? formatDate(expirationDate) : "Choose a type"}
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="add-amount">Membership amount (EGP)</FieldLabel>
                <Input id="add-amount" type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-payment-status">Payment status</FieldLabel>
                <Select items={paymentItems()} value={paymentStatus} onValueChange={(value) => value && setPaymentStatus(value as PaymentStatus)}>
                  <SelectTrigger id="add-payment-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{paymentItems().map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="add-member-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
              <Textarea id="add-member-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Accessibility needs or a useful front-desk note" />
            </Field>
            <FormMessage message={error} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-member-form" disabled={submitting || !membershipTypeId}>
            {submitting ? "Adding…" : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditMemberDialog({ member, onSuccess }: { member: MemberListItem & { notes?: string | null }; onSuccess?: (member: MemberProfile) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone)
  const [notes, setNotes] = useState(member.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { member: updated } = await apiFetch<{ member: MemberProfile }>(`/api/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, phone, notes }),
      })
      toast.add({ type: "success", description: "Member details updated." })
      setOpen(false)
      onSuccess?.(updated)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update member.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PencilIcon data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>Update contact details and the front-desk note.</DialogDescription>
        </DialogHeader>
        <form id={`edit-member-${member.id}`} onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-name-${member.id}`}>Full name</FieldLabel>
              <Input id={`edit-name-${member.id}`} value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-phone-${member.id}`}>Phone number</FieldLabel>
              <Input id={`edit-phone-${member.id}`} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-notes-${member.id}`}>Notes</FieldLabel>
              <Textarea id={`edit-notes-${member.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </Field>
            <FormMessage message={error} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form={`edit-member-${member.id}`} disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RenewMemberDialog({ member, onSuccess }: { member: MemberListItem; onSuccess?: (member: MemberProfile) => void }) {
  const [open, setOpen] = useState(false)
  const [types, setTypes] = useState<MembershipType[]>([])
  const [membershipTypeId, setMembershipTypeId] = useState(member.membershipTypeId)
  const [startDate, setStartDate] = useState(suggestedRenewalStart(member.expirationDate))
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || types.length > 0) return
    apiFetch<{ membershipTypes: MembershipType[] }>("/api/membership-types")
      .then(({ membershipTypes }) => {
        setTypes(membershipTypes)
        const selected = membershipTypes.find((type) => type.id === member.membershipTypeId) ?? membershipTypes[0]
        if (selected) {
          setMembershipTypeId(selected.id)
          setAmount(String(selected.price))
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load memberships."))
  }, [member.membershipTypeId, open, types.length])

  const typeItems = types.map((type) => ({ value: type.id, label: `${type.name} · EGP ${type.price}` }))
  const selectedType = types.find((type) => type.id === membershipTypeId)
  const expirationDate = selectedType ? addMembershipMonths(startDate, selectedType.durationMonths) : null

  function chooseType(value: string | null) {
    if (!value) return
    setMembershipTypeId(value)
    const type = types.find((candidate) => candidate.id === value)
    if (type) setAmount(String(type.price))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { member: updated } = await apiFetch<{ member: MemberProfile }>(`/api/members/${member.id}/renew`, {
        method: "POST",
        body: JSON.stringify({ membershipTypeId, startDate, paymentStatus, amount: Number(amount) }),
      })
      toast.add({ type: "success", description: `${member.name}'s membership was renewed.` })
      setOpen(false)
      onSuccess?.(updated)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not renew membership.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <RefreshCwIcon data-icon="inline-start" />
        Renew
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew membership</DialogTitle>
          <DialogDescription>{member.name} currently expires {formatDate(member.expirationDate)}.</DialogDescription>
        </DialogHeader>
        <form id={`renew-${member.id}`} onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`renew-type-${member.id}`}>Membership type</FieldLabel>
              <Select items={typeItems} value={membershipTypeId} onValueChange={chooseType}>
                <SelectTrigger id={`renew-type-${member.id}`} className="w-full"><SelectValue placeholder="Choose a membership" /></SelectTrigger>
                <SelectContent><SelectGroup>{typeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`renew-start-${member.id}`}>New start date</FieldLabel>
                <Input id={`renew-start-${member.id}`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>New expiration</FieldLabel>
                <div className="flex h-8 items-center rounded-lg border bg-muted px-3 text-sm font-semibold tabular-nums">{expirationDate ? formatDate(expirationDate) : "—"}</div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`renew-amount-${member.id}`}>Amount (EGP)</FieldLabel>
                <Input id={`renew-amount-${member.id}`} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`renew-payment-${member.id}`}>Payment status</FieldLabel>
                <Select items={paymentItems()} value={paymentStatus} onValueChange={(value) => value && setPaymentStatus(value as PaymentStatus)}>
                  <SelectTrigger id={`renew-payment-${member.id}`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{paymentItems().map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
            </div>
            <FormMessage message={error} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form={`renew-${member.id}`} disabled={submitting || !membershipTypeId}>{submitting ? "Renewing…" : "Renew membership"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddVisitButton({ member, onSuccess, compact = false }: { member: MemberListItem; onSuccess?: () => void; compact?: boolean }) {
  const [warningOpen, setWarningOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function record(confirmExpired: boolean) {
    setSubmitting(true)
    try {
      await apiFetch(`/api/members/${member.id}/visit`, {
        method: "POST",
        body: JSON.stringify({ confirmExpired }),
      })
      setWarningOpen(false)
      toast.add({ type: "success", description: `Visit recorded for ${member.name}.` })
      onSuccess?.()
    } catch (caught) {
      if (caught instanceof ClientApiError && caught.code === "EXPIRED_MEMBERSHIP") {
        setWarningOpen(true)
      } else {
        toast.add({ type: "error", description: caught instanceof Error ? caught.message : "Could not record visit." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  function click() {
    if (member.status === "expired") setWarningOpen(true)
    else void record(false)
  }

  return (
    <>
      <Button variant="outline" size={compact ? "sm" : "default"} onClick={click} disabled={submitting}>
        <ScanLineIcon data-icon="inline-start" />
        {submitting ? "Adding…" : "Add visit"}
      </Button>
      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning-soft text-warning"><TriangleAlertIcon aria-hidden="true" /></AlertDialogMedia>
            <AlertDialogTitle>Membership expired</AlertDialogTitle>
            <AlertDialogDescription>
              {member.name}&apos;s membership expired on {formatDate(member.expirationDate)}. Record this visit anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void record(true)} disabled={submitting}>Record anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
