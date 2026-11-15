import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  Gift,
  Grid2x2,
  type IconComponent,
  IdCard,
  Inbox,
  MapPin,
  Settings,
  Sun,
  Ticket,
  TrendingUp,
  Users,
} from "@/components/icons"
import { RibBarbell } from "@/components/kit/icons"
import type { Member } from "@/lib/types"

export interface NavItem {
  href: string
  label: string
  icon: IconComponent | ((p: React.ComponentProps<"svg">) => React.JSX.Element)
}

/**
 * The sidebar. The first group is what a member does: see what is next, book, change a booking, check a club,
 * follow progress, read messages. The bottom group is help (beside the search button). What a member manages
 * (Household, Account and its pages) is in the user menu under it. `match` lists the path prefixes that keep the
 * link current.
 */
export interface PrimaryNavItem extends NavItem {
  match: readonly string[]
}
export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { href: "/today", label: "Home", icon: Sun, match: ["/today"] },
  {
    href: "/schedule",
    label: "Book",
    icon: CalendarDays,
    match: ["/schedule", "/reserve", "/training"],
  },
  { href: "/bookings", label: "Bookings", icon: Ticket, match: ["/bookings"] },
  { href: "/clubs", label: "Clubs", icon: MapPin, match: ["/clubs"] },
  {
    href: "/progress",
    label: "Progress",
    icon: TrendingUp,
    match: ["/progress"],
  },
  { href: "/inbox", label: "Inbox", icon: Inbox, match: ["/inbox"] },
]
export const HELP_NAV: PrimaryNavItem = {
  href: "/help",
  label: "Help",
  icon: CircleHelp,
  match: ["/help"],
}

/** The Account area: one side menu for the plan, the money and the member's own settings. */
export const ACCOUNT_NAV: readonly { href: string; label: string }[] = [
  { href: "/account", label: "Overview" },
  { href: "/membership", label: "Membership" },
  { href: "/billing", label: "Billing" },
  { href: "/guest-passes", label: "Guest passes" },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/preferences", label: "Home club and interests" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/calendar", label: "Calendar" },
  { href: "/settings/security", label: "Sign-in and security" },
  { href: "/settings/display", label: "Display and accessibility" },
  { href: "/settings/privacy", label: "Privacy and data" },
]

/** The path prefixes that show the Account side menu. Task pages under them (freeze, cancel, change plan) do not. */
export const ACCOUNT_PATHS: readonly string[] = [
  "/account",
  "/membership",
  "/billing",
  "/guest-passes",
  "/settings",
]

export function isCurrent(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Every page a member can search for in the command menu. */
export const NAV: NavItem[] = [
  { href: "/today", label: "Home", icon: Sun },
  { href: "/schedule", label: "Book a class", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: Ticket },
  { href: "/reserve/courts", label: "Reserve a court", icon: Grid2x2 },
  { href: "/reserve/lanes", label: "Reserve a lap lane", icon: Grid2x2 },
  { href: "/reserve/kids-club", label: "Book kids club", icon: Grid2x2 },
  {
    href: "/training",
    label: "Personal training",
    icon: RibBarbell as unknown as IconComponent,
  },
  { href: "/clubs", label: "Clubs", icon: MapPin },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/account", label: "Account", icon: IdCard },
  { href: "/family", label: "Household", icon: Users },
  { href: "/membership", label: "Membership", icon: IdCard },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/guest-passes", label: "Guest passes", icon: Gift },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: CircleHelp },
]

export function canSee(m: Member, href: string): boolean {
  const role = m.role
  switch (href) {
    case "/family":
      return role === "primary" || role === "adult"
    case "/membership":
      return role === "primary" || role === "adult"
    case "/billing":
      return role === "primary"
    case "/guest-passes":
      return role === "primary" || role === "adult"
    case "/reserve/kids-club":
      return role === "primary" || role === "adult"
    default:
      return true
  }
}
// Whether a signed-in member may open a path. A direct URL that fails this shows the 403 page.
export function canOpen(
  m: Member,
  path: string
): { ok: true } | { ok: false; reason: string } {
  const p = path.replace(/\/$/, "")
  const parent = m.role === "teen"
  const no = (reason: string) => ({ ok: false as const, reason })
  if (p.startsWith("/billing"))
    return m.role === "primary"
      ? { ok: true }
      : no(
          parent
            ? "Your parent manages billing."
            : "The primary member manages billing."
        )
  if (p.startsWith("/membership/") && m.role !== "primary")
    return no(
      parent
        ? "Your parent manages the membership."
        : "The primary member manages the plan."
    )
  if (p === "/membership" && parent)
    return no("Your parent manages the membership.")
  if (p.startsWith("/family"))
    return m.role === "primary" || (m.role === "adult" && p === "/family")
      ? { ok: true }
      : no(
          parent
            ? "Your parent manages the family plan."
            : "The primary member manages the family plan."
        )
  if (p.startsWith("/guest-passes"))
    return m.role === "teen"
      ? no("Guest passes are managed by your parent.")
      : { ok: true }
  if (p === "/reserve/kids-club")
    return m.role === "primary" || m.role === "adult"
      ? { ok: true }
      : no("Kids club is booked by a parent.")
  if (
    p.includes("/book") &&
    p.startsWith("/training/coaches") &&
    m.role === "teen"
  )
    return { ok: true }
  return { ok: true }
}
