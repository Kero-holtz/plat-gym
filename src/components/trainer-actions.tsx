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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/client-api"
import type { Trainer } from "@/lib/domain"

const days = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
]

export function TrainerDialog({ trainer, onSuccess }: { trainer?: Trainer; onSuccess?: (trainer: Trainer) => void }) {
  const editing = Boolean(trainer)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(trainer?.name ?? "")
  const [phone, setPhone] = useState(trainer?.phone ?? "")
  const [specialization, setSpecialization] = useState(trainer?.specialization ?? "")
  const [active, setActive] = useState(trainer?.active ?? true)
  const [selectedDays, setSelectedDays] = useState<string[]>(
    trainer ? [...new Set(trainer.availability.map((item) => String(item.weekday)))] : ["0", "1", "2", "3", "4", "6"],
  )
  const [startTime, setStartTime] = useState(trainer?.availability[0]?.startTime ?? "08:00")
  const [endTime, setEndTime] = useState(trainer?.availability[0]?.endTime ?? "21:00")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const availability = selectedDays.map((day) => ({ weekday: Number(day), startTime, endTime }))
      const url = editing ? `/api/trainers/${trainer!.id}` : "/api/trainers"
      const method = editing ? "PATCH" : "POST"
      const result = await apiFetch<{ trainer: Trainer }>(url, {
        method,
        body: JSON.stringify({ name, phone, specialization, active, availability }),
      })
      toast.add({ type: "success", description: editing ? "Trainer updated." : "Trainer added." })
      setOpen(false)
      onSuccess?.(result.trainer)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save trainer.")
    } finally {
      setSubmitting(false)
    }
  }

  const formId = editing ? `edit-trainer-${trainer!.id}` : "add-trainer"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={editing ? "outline" : "default"} className={editing ? undefined : "h-10"} />}>
        {editing ? <PencilIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        {editing ? "Edit" : "Add trainer"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit trainer" : "Add trainer"}</DialogTitle><DialogDescription>Keep contact details, working days, and active status current.</DialogDescription></DialogHeader>
        <form id={formId} onSubmit={submit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel htmlFor={`${formId}-name`}>Full name</FieldLabel><Input id={`${formId}-name`} value={name} onChange={(event) => setName(event.target.value)} required /></Field>
              <Field><FieldLabel htmlFor={`${formId}-phone`}>Phone number</FieldLabel><Input id={`${formId}-phone`} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="01012345678" required /></Field>
            </div>
            <Field><FieldLabel htmlFor={`${formId}-specialization`}>Specialization</FieldLabel><Input id={`${formId}-specialization`} value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Strength & conditioning" required /></Field>
            <Field>
              <FieldLabel>Working days</FieldLabel>
              <ToggleGroup value={selectedDays} onValueChange={setSelectedDays} multiple variant="outline" spacing={1} className="grid grid-cols-4 sm:grid-cols-7">
                {days.map((day) => <ToggleGroupItem key={day.value} value={day.value} aria-label={day.label}>{day.label}</ToggleGroupItem>)}
              </ToggleGroup>
              <FieldDescription>PT slots are generated in 60-minute blocks.</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel htmlFor={`${formId}-start`}>Starts at</FieldLabel><Input id={`${formId}-start`} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></Field>
              <Field><FieldLabel htmlFor={`${formId}-end`}>Ends at</FieldLabel><Input id={`${formId}-end`} type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></Field>
            </div>
            <Field orientation="horizontal" className="rounded-xl border bg-muted/60 p-3">
              <div className="min-w-0 flex-1"><FieldLabel htmlFor={`${formId}-active`}>Active trainer</FieldLabel><FieldDescription>Inactive trainers cannot receive new bookings.</FieldDescription></div>
              <Switch id={`${formId}-active`} checked={active} onCheckedChange={setActive} />
            </Field>
            {error ? <FieldError role="alert">{error}</FieldError> : null}
          </FieldGroup>
        </form>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form={formId} disabled={submitting || selectedDays.length === 0}>{submitting ? "Saving…" : "Save trainer"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
