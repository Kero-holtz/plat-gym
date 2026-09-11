"use client"

import { CalendarClockIcon, DumbbellIcon, PhoneIcon, ShieldIcon } from "lucide-react"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { TrainerDialog } from "@/components/trainer-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTime } from "@/lib/dates"
import type { Trainer, TrainerAvailability } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function availabilityGroups(items: TrainerAvailability[]) {
  const groups = new Map<string, number[]>()
  for (const item of items) {
    const key = `${item.startTime}-${item.endTime}`
    groups.set(key, [...(groups.get(key) ?? []), item.weekday])
  }
  return [...groups.entries()].map(([key, weekdays]) => {
    const [start, end] = key.split("-")
    const names = weekdays.sort().map((day) => dayNames[day])
    const days = weekdays.length === 7 ? "Every day" : names.join(", ")
    return `${days} · ${formatTime(start)}–${formatTime(end)}`
  })
}

export function TrainersView({ canManage }: { canManage: boolean }) {
  const url = canManage ? "/api/trainers?includeInactive=1" : "/api/trainers"
  const { data, error, loading, reload } = useApiData<{ trainers: Trainer[] }>(url)
  const trainers = data?.trainers ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trainers"
        description="Contact details, specialties, working hours, and booking status."
        action={canManage ? <TrainerDialog onSuccess={reload} /> : undefined}
      />

      {!canManage ? (
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
          <ShieldIcon className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div><p className="font-semibold">View-only access</p><p className="mt-0.5 text-muted-foreground">Only a manager can change trainer records or availability.</p></div>
        </div>
      ) : null}

      {error ? <ErrorState message={error} retry={reload} /> : null}
      {loading && !data ? <LoadingRows count={4} /> : null}
      {!loading && !error && trainers.length === 0 ? <EmptyState title="No trainers yet" description="Add a trainer before creating PT bookings." action={canManage ? <TrainerDialog onSuccess={reload} /> : undefined} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trainers.map((trainer) => (
          <Card key={trainer.id} className={!trainer.active ? "opacity-70" : undefined}>
            <CardHeader className="flex-row items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><DumbbellIcon aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><CardTitle className="truncate">{trainer.name}</CardTitle><Badge variant={trainer.active ? "outline" : "secondary"}>{trainer.active ? "Active" : "Inactive"}</Badge></div><CardDescription className="mt-1">{trainer.specialization}</CardDescription></div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <a href={`tel:${trainer.phone}`} className="flex items-center gap-2 text-sm font-semibold hover:text-primary"><PhoneIcon className="text-muted-foreground" aria-hidden="true" />{trainer.phone}</a>
              <div className="flex items-start gap-2 text-xs text-muted-foreground"><CalendarClockIcon className="mt-0.5 shrink-0" aria-hidden="true" /><div className="flex flex-col gap-1">{availabilityGroups(trainer.availability).map((line) => <span key={line}>{line}</span>)}</div></div>
              {canManage ? <div className="border-t pt-4"><TrainerDialog trainer={trainer} onSuccess={reload} /></div> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
