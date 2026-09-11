"use client"

import type { LucideIcon } from "lucide-react"
import {
  CalendarCheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  DumbbellIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundCogIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BrandMark } from "@/components/brand-mark"
import { QuickMemberSearch } from "@/components/quick-member-search"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { StaffUser } from "@/lib/domain"

interface NavItem {
  href: string
  label: string
  mobileLabel: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboardIcon },
  { href: "/members", label: "Members", mobileLabel: "Members", icon: UsersIcon },
  { href: "/bookings", label: "Bookings", mobileLabel: "Bookings", icon: CalendarCheckIcon },
  { href: "/personal-training", label: "Personal Training", mobileLabel: "PT", icon: DumbbellIcon },
  { href: "/payments", label: "Payments", mobileLabel: "Payments", icon: CreditCardIcon },
  { href: "/trainers", label: "Trainers", mobileLabel: "Trainers", icon: UserRoundCogIcon },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function AppShell({ user, children }: { user: StaffUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-62 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-18 items-center border-b border-sidebar-border px-5">
          <BrandMark />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-0.5 text-xs capitalize text-sidebar-foreground/55">{user.role}</p>
        </div>
      </aside>

      <div className="md:pl-62">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 md:h-18 lg:px-8">
          <div className="md:hidden">
            <BrandMark compact />
          </div>
          <div className="min-w-0 flex-1">
            <QuickMemberSearch />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Open staff menu" />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">{user.name}</span>
              <ChevronDownIcon className="hidden lg:block" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block text-foreground">{user.name}</span>
                  <span className="font-normal capitalize">{user.role}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {user.role === "manager" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <SettingsIcon aria-hidden="true" />
                      Gym settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={logout}>
                  <LogOutIcon aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-360 px-4 py-5 pb-26 sm:px-6 sm:py-7 md:pb-8 lg:px-8">
          {children}
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card/98 px-1 pt-1.5 shadow-[0_-8px_24px_rgba(23,26,31,0.08)] backdrop-blur-sm md:hidden"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-13 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10px] font-semibold text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="w-full truncate text-center">{item.mobileLabel}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
