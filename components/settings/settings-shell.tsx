"use client"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppPage } from "@/components/kit/app"

export const SETTINGS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/preferences", label: "Home club and interests" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/calendar", label: "Calendar" },
  { href: "/settings/security", label: "Sign-in and security" },
  { href: "/settings/display", label: "Display and accessibility" },
  { href: "/settings/privacy", label: "Privacy and data" },
]

/**
 * A settings screen sits in the Account area, where the shell draws the side menu. This part gives each screen its
 * page bar with the title, then the sections that the settings page returns, in one column near 640 px.
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
  return (
    <AppPage
      title={SETTINGS.find((s) => s.href === path)?.label ?? "Settings"}
      className="mx-zero max-w-[640px]"
    >
      <div className="gap-xl flex flex-col">{children}</div>
    </AppPage>
  )
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
