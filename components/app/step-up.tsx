"use client"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Modal } from "@/components/kit/overlays"
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
 * While the check is open, the page stays in place behind a centred dialog, blurred and `inert`: the member sees
 * where they are, but cannot read, focus or use the page, and screen readers skip it. Esc and a click outside do
 * not close the dialog; "Back to Account" leaves the page. The password is checked with Supabase Auth. The gate is
 * a browser-side check: row level security in Supabase is the server-side limit on what the member can read and
 * change.
 */
export function StepUpGate({ children }: { children: ReactNode }) {
  const router = useRouter()
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
  return (
    <>
      <div
        inert={open}
        className={
          open
            ? "pointer-events-none flex flex-1 flex-col blur-lg select-none"
            : "contents"
        }
      >
        {children}
      </div>
      <Modal
        open={open}
        // The check is required to see the page, so only "Back to Account" or a correct password ends it.
        onOpenChange={() => {}}
        hideClose
        title="Confirm it's you"
        description="Enter your password again to see billing or change your membership."
      >
        <form onSubmit={confirm} className="gap-m flex flex-col" noValidate>
          <FormField label="Password" error={error}>
            {(p) => (
              <Input
                {...p}
                type="password"
                name="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <div className="gap-xs flex items-center justify-end">
            <Button variant="outline" onClick={() => router.push("/account")}>
              Back to Account
            </Button>
            <Button type="submit" loading={busy}>
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
