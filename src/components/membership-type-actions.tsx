"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/client-api"
import type { MembershipType } from "@/lib/domain"

export function MembershipTypeDialog({ type, onSuccess }: { type?: MembershipType; onSuccess?: () => void }) {
  const editing = Boolean(type)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(type?.name ?? "")
  const [durationMonths, setDurationMonths] = useState(String(type?.durationMonths ?? 1))
  const [price, setPrice] = useState(String(type?.price ?? ""))
  const [active, setActive] = useState(type?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formId = editing ? `membership-type-${type!.id}` : "new-membership-type"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(editing ? `/api/membership-types/${type!.id}` : "/api/membership-types", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name, durationMonths: Number(durationMonths), price: Number(price), active }),
      })
      toast.add({ type: "success", description: editing ? "Membership type updated." : "Membership type added." })
      setOpen(false)
      onSuccess?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save membership type.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={editing ? "outline" : "default"} />}>
        {editing ? <PencilIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        {editing ? "Edit" : "Add type"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Edit membership type" : "Add membership type"}</DialogTitle><DialogDescription>Expiration dates use this duration automatically.</DialogDescription></DialogHeader>
        <form id={formId} onSubmit={submit}>
          <FieldGroup>
            <Field><FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel><Input id={`${formId}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Monthly" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field><FieldLabel htmlFor={`${formId}-duration`}>Duration (months)</FieldLabel><Input id={`${formId}-duration`} type="number" min="1" value={durationMonths} onChange={(event) => setDurationMonths(event.target.value)} /></Field>
              <Field><FieldLabel htmlFor={`${formId}-price`}>Price (EGP)</FieldLabel><Input id={`${formId}-price`} type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
            </div>
            <Field orientation="horizontal" className="rounded-xl border bg-muted/60 p-3"><div className="min-w-0 flex-1"><FieldLabel htmlFor={`${formId}-active`}>Active</FieldLabel><FieldDescription>Inactive types stay on existing members but cannot be sold.</FieldDescription></div><Switch id={`${formId}-active`} checked={active} onCheckedChange={setActive} /></Field>
            {error ? <FieldError role="alert">{error}</FieldError> : null}
          </FieldGroup>
        </form>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form={formId} disabled={submitting}>{submitting ? "Saving…" : "Save type"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
