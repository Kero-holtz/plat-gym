"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, UserRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch } from "@/lib/client-api"
import type { MemberListItem } from "@/lib/domain"

export function QuickMemberSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!open || loaded) return
    apiFetch<{ members: MemberListItem[] }>("/api/members")
      .then((result) => {
        setMembers(result.members)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [loaded, open])

  function selectMember(id: string) {
    setOpen(false)
    router.push(`/members/${id}`)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-10 justify-start bg-card text-muted-foreground shadow-none sm:w-72"
        onClick={() => setOpen(true)}
        aria-label="Find a member"
      >
        <SearchIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Find member by name or phone</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Find a member"
        description="Search members by name or phone number."
        className="sm:max-w-lg"
        showCloseButton
      >
        <Command>
          <CommandInput placeholder="Type a name or phone number…" autoFocus />
          <CommandList className="max-h-96">
            <CommandEmpty>{loaded ? "No member found." : "Loading members…"}</CommandEmpty>
            <CommandGroup heading="Members">
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.name} ${member.phone}`}
                  onSelect={() => selectMember(member.id)}
                  className="min-h-12"
                >
                  <UserRoundIcon aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">{member.phone}</span>
                  </span>
                  <StatusBadge status={member.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
