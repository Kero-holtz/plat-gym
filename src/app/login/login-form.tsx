"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DumbbellIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { apiFetch } from "@/lib/client-api"
import type { StaffUser } from "@/lib/domain"

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState(demoMode ? "admin@platgym.eg" : "")
  const [password, setPassword] = useState(demoMode ? "PlatGym2026!" : "")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch<{ user: StaffUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      router.replace("/dashboard")
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.")
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo(role: "manager" | "receptionist") {
    if (role === "manager") {
      setEmail("admin@platgym.eg")
      setPassword("PlatGym2026!")
    } else {
      setEmail("reception@platgym.eg")
      setPassword("Reception2026!")
    }
    setError(null)
  }

  return (
    <main className="grid min-h-dvh bg-card lg:grid-cols-[minmax(380px,0.82fr)_1.18fr]">
      <section className="flex min-h-dvh flex-col justify-between bg-sidebar px-6 py-7 text-sidebar-foreground sm:px-10 sm:py-10 lg:px-14">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <DumbbellIcon aria-hidden="true" />
          </span>
          <span className="font-display text-3xl font-bold tracking-[0.08em]">PLAT GYM</span>
        </div>

        <div className="my-12 max-w-md lg:my-0">
          <div className="mb-7 h-1 w-12 bg-sidebar-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Run the front desk without the paperwork.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-sidebar-foreground/65 sm:text-base">
            Members, visits, PT bookings, and payments in one focused workspace.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-sidebar-foreground/55">
            <span className="border-t border-sidebar-border pt-3">Memberships</span>
            <span className="border-t border-sidebar-border pt-3">Daily visits</span>
            <span className="border-t border-sidebar-border pt-3">PT schedule</span>
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">Private staff access · Africa/Cairo</p>
      </section>

      <section className="absolute inset-x-0 bottom-0 top-22 flex items-start justify-center rounded-t-3xl bg-background px-5 py-8 sm:top-28 lg:static lg:items-center lg:rounded-none lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <LockKeyholeIcon aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">Staff sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Use your PLAT GYM staff account.</p>
          </div>

          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={Boolean(error)}
                  className="h-11 bg-card"
                />
              </Field>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    aria-invalid={Boolean(error)}
                    className="h-11 bg-card pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </FieldGroup>
          </form>

          {demoMode ? (
            <div className="mt-7 rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Demo accounts</p>
              <FieldDescription className="mt-1">Choose an access level, then sign in.</FieldDescription>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => fillDemo("manager")}>
                  Manager
                </Button>
                <Button type="button" variant="outline" onClick={() => fillDemo("receptionist")}>
                  Receptionist
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
