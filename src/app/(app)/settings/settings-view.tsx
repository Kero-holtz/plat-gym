"use client"

import { LockKeyholeIcon } from "lucide-react"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback"
import { MembershipTypeDialog } from "@/components/membership-type-actions"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/dates"
import type { MembershipType } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

export function SettingsView() {
  const { data, error, loading, reload } = useApiData<{ membershipTypes: MembershipType[] }>("/api/membership-types?includeInactive=1")
  const types = data?.membershipTypes ?? []
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gym settings" description="Manager-only membership configuration." action={<MembershipTypeDialog onSuccess={reload} />} />
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm"><LockKeyholeIcon className="mt-0.5 text-muted-foreground" aria-hidden="true" /><div><p className="font-semibold">Sensitive settings</p><p className="mt-0.5 text-muted-foreground">Receptionist accounts cannot change membership prices or durations.</p></div></div>
      {error ? <ErrorState message={error} retry={reload} /> : null}
      {loading && !data ? <LoadingRows count={4} /> : null}
      {!loading && !error && types.length === 0 ? <EmptyState title="No membership types" description="Add the first type to create memberships." action={<MembershipTypeDialog onSuccess={reload} />} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {types.map((type) => (
          <Card key={type.id} className={!type.active ? "opacity-70" : undefined}>
            <CardHeader><div className="flex items-start justify-between gap-2"><CardTitle>{type.name}</CardTitle><Badge variant={type.active ? "outline" : "secondary"}>{type.active ? "Active" : "Inactive"}</Badge></div><CardDescription>{type.durationMonths} month{type.durationMonths === 1 ? "" : "s"}</CardDescription></CardHeader>
            <CardContent><p className="font-display text-3xl font-bold tabular-nums">{formatMoney(type.price)}</p><div className="mt-4 border-t pt-4"><MembershipTypeDialog type={type} onSuccess={reload} /></div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
