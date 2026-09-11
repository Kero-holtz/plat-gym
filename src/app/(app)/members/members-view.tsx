"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { ExternalLinkIcon, SearchIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { AddMemberDialog, AddVisitButton, EditMemberDialog, RenewMemberDialog } from "@/components/member-actions"
import { ErrorState, LoadingRows, EmptyState } from "@/components/feedback"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatDateTime, todayCairo } from "@/lib/dates"
import type { MemberListItem, MembershipStatus } from "@/lib/domain"
import { useApiData } from "@/hooks/use-api-data"

const statusTabs = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
] as const

type StatusFilter = MembershipStatus | "all"

function lastVisitLabel(value: string | null): string {
  if (!value) return "No visits"
  const current = todayCairo()
  const visitDay = todayCairo(new Date(value))
  if (visitDay === current) return `Today · ${formatDateTime(value).split("·")[1]?.trim()}`
  return formatDateTime(value)
}

export function MembersView({ initialStatus }: { initialStatus: StatusFilter }) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const url = useMemo(() => {
    const params = new URLSearchParams({ status })
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim())
    return `/api/members?${params}`
  }, [deferredSearch, status])
  const { data, error, loading, reload } = useApiData<{ members: MemberListItem[] }>(url)
  const members = data?.members ?? []

  function changeStatus(value: string | number | null) {
    if (typeof value !== "string") return
    const next = value as StatusFilter
    setStatus(next)
    const target = next === "all" ? "/members" : `/members?status=${next}`
    window.history.replaceState(null, "", target)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Search, check status, record visits, and renew memberships."
        action={<AddMemberDialog onSuccess={reload} />}
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search members"
            placeholder="Search by name or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9 pr-10"
          />
          {search ? (
            <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setSearch("")} aria-label="Clear search">
              <XIcon />
            </Button>
          ) : null}
        </div>
        <Tabs value={status} onValueChange={changeStatus}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            {statusTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{loading ? "Loading members…" : `${members.length} member${members.length === 1 ? "" : "s"}`}</p>
        {deferredSearch ? <p className="text-xs text-muted-foreground">Results for “{deferredSearch}”</p> : null}
      </div>

      {error ? <ErrorState message={error} retry={reload} /> : null}
      {loading && !data ? <LoadingRows count={7} /> : null}
      {!loading && !error && members.length === 0 ? (
        <EmptyState
          title="No members found"
          description={search ? "Try a different name, phone number, or status filter." : "Add the first member to start using the gym register."}
          action={!search && status === "all" ? <AddMemberDialog onSuccess={reload} /> : undefined}
        />
      ) : null}

      {members.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className="content-auto">
                    <TableCell>
                      <Link href={`/members/${member.id}`} className="font-semibold hover:text-primary hover:underline">{member.name}</Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">{member.phone}</span>
                    </TableCell>
                    <TableCell><span className="block text-sm font-medium">{member.membershipType}</span><StatusBadge status={member.status} className="mt-1" /></TableCell>
                    <TableCell className="font-medium tabular-nums">{formatDate(member.expirationDate)}</TableCell>
                    <TableCell className="max-w-40 text-xs text-muted-foreground">{lastVisitLabel(member.lastVisit)}</TableCell>
                    <TableCell>{member.paymentStatus ? <StatusBadge status={member.paymentStatus} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <AddVisitButton member={member} compact onSuccess={reload} />
                        <RenewMemberDialog member={member} onSuccess={reload} />
                        <EditMemberDialog member={member} onSuccess={reload} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {members.map((member) => (
              <article key={member.id} className="rounded-xl border bg-card p-4 content-auto">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/members/${member.id}`} className="block truncate text-base font-bold hover:text-primary">{member.name}</Link>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{member.phone}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3 text-xs">
                  <div><dt className="text-muted-foreground">Membership</dt><dd className="mt-0.5 font-semibold">{member.membershipType}</dd></div>
                  <div><dt className="text-muted-foreground">Expires</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDate(member.expirationDate)}</dd></div>
                  <div><dt className="text-muted-foreground">Last visit</dt><dd className="mt-0.5 font-semibold">{lastVisitLabel(member.lastVisit)}</dd></div>
                  <div><dt className="text-muted-foreground">Payment</dt><dd className="mt-0.5">{member.paymentStatus ? <StatusBadge status={member.paymentStatus} /> : "—"}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AddVisitButton member={member} onSuccess={reload} />
                  <RenewMemberDialog member={member} onSuccess={reload} />
                  <Button variant="ghost" render={<Link href={`/members/${member.id}`} />}>
                    Open <ExternalLinkIcon data-icon="inline-end" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
