"use client"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { AccountScreen } from "@/components/account/screen"
import { ACCOUNT_NAV } from "@/components/app/nav"

// The settings pages are the Settings group of the Account menu (one source for the labels).
export const SETTINGS = ACCOUNT_NAV.filter((n) => n.group === "Settings")

/**
 * A settings screen sits in the Account area, where the shell draws the side menu. This part gives each screen the
 * Account frame (`AccountScreen`, `form` width): the title from `ACCOUNT_NAV`, then the sections the page returns.
 * /settings itself has no content: it sends the member to Account.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const root = path === "/settings"
  useEffect(() => {
    if (root) router.replace("/account")
  }, [root, router])
  if (root) return null
  return <AccountScreen width="form">{children}</AccountScreen>
}

export function Saved({ show }: { show: boolean }) {
  return (
    <p
      role="status"
      className="text-body-m font-medium text-success sm:text-body-s"
    >
      {show ? "Saved" : ""}
    </p>
  )
}
