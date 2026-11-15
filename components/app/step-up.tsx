"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { FormField } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

// Time of the last password check in this browser. Sign-in sets it.
const KEY = "cp-auth-at"
export function touchAuth() {
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {}
}

/** The paths that need a recent password check: billing, and the flows that change the plan. */
export function needsStepUp(path: string): boolean {
  return (
    path === "/billing" ||
    path.startsWith("/billing/") ||
    path.startsWith("/membership/")
  )
}

/**
 * Sensitive pages ask the member for their password again if the last check is older than 30 minutes.
 * The gate draws the password form in place of the page, so the page content is not on screen and cannot be used
 * until the check passes. The password is checked with Supabase Auth. The gate is a browser-side check: row level
 * security in Supabase is the server-side limit on what the member can read and change.
 */
export function StepUpGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => {
    try {
      const at = Number(localStorage.getItem(KEY) ?? 0)
      return !!at && Date.now() - at > 30 * 60_000
    } catch {
      return false
    }
  })
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) touchAuth()
    } catch {}
  }, [])
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return setError("Enter your password.")
    setBusy(true)
    setError("")
    try {
      const db = createClient()
      const { data } = await db.auth.getUser()
      const email = data.user?.email
      if (!email) throw new Error("no session")
      const { error: authError } = await db.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(
          authError.status === 400
            ? "That password is not right. Try again."
            : "We couldn't reach Cactus Peak. Check your connection and try again."
        )
        return
      }
      touchAuth()
      setPassword("")
      setOpen(false)
    } catch {
      setError(
        "We couldn't reach Cactus Peak. Check your connection and try again."
      )
    } finally {
      setBusy(false)
    }
  }
  if (!open) return children
  return (
    <section
      aria-labelledby="page-title"
      className="gap-m p-m flex w-full flex-col corner-m raised"
    >
      <div className="gap-xs flex flex-col">
        <h1
          id="page-title"
          tabIndex={-1}
          className="text-body-m font-heavy outline-none"
        >
          Confirm it&apos;s you
        </h1>
        <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
          Enter your password again to change billing or your membership.
        </p>
      </div>
      <form onSubmit={confirm} className="gap-m flex flex-col" noValidate>
        <FormField label="Password" error={error}>
          {(p) => (
            <Input
              {...p}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </FormField>
        <div className="gap-xs flex items-center justify-between">
          <Button variant="ghost" render={<Link href="/account" />}>
            Back to Account
          </Button>
          <Button type="submit" loading={busy}>
            Confirm
          </Button>
        </div>
      </form>
    </section>
  )
}
