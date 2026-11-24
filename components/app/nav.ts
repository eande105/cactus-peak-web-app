import {
  Bell,
  CalendarDays,
  CircleHelp,
  CreditCard,
  Gift,
  Grid2x2,
  type IconComponent,
  IdCard,
  Inbox,
  KeyRound,
  LayoutGrid,
  Lock,
  MapPin,
  Settings,
  Sun,
  SunMedium,
  Ticket,
  TrendingUp,
  User,
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
 * The four places. Today (what is next, with Bookings under it), Book (classes, courts, lap lanes, kids club,
 * training), Clubs (crowd levels and what is open) and You (account, progress, inbox, household, help). The phone
 * tab bar and the desktop sidebar both render this list and nothing else. `match` lists the path prefixes that keep
 * the link current.
 */
export interface PrimaryNavItem extends NavItem {
  match: readonly string[]
}

/** The path prefixes that show the Account side menu. Task pages under them (freeze, cancel, change plan) do not. */
export const ACCOUNT_PATHS: readonly string[] = [
  "/account",
  "/membership",
  "/billing",
  "/guest-passes",
  "/settings",
]

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { href: "/today", label: "Today", icon: Sun, match: ["/today", "/bookings"] },
  {
    href: "/schedule",
    label: "Book",
    icon: CalendarDays,
    match: ["/schedule", "/reserve", "/training"],
  },
  { href: "/clubs", label: "Clubs", icon: MapPin, match: ["/clubs"] },
  {
    href: "/account",
    label: "You",
    icon: IdCard,
    match: [...ACCOUNT_PATHS, "/progress", "/inbox", "/family", "/help"],
  },
]
export const HELP_NAV: PrimaryNavItem = {
  href: "/help",
  label: "Help",
  icon: CircleHelp,
  match: ["/help"],
}

/** The two groups of the Account menu: what the member pays for and uses, then the member's own settings. */
export const ACCOUNT_GROUPS = ["Membership", "Settings"] as const
export type AccountGroup = (typeof ACCOUNT_GROUPS)[number]

/**
 * One page in the Account area. The side menu, the phone list on Overview and each page's title read this list, so
 * a label is written once. `line` sits under the page title: a fact or a consequence, never a filler description.
 */
export interface AccountNavItem extends NavItem {
  group: AccountGroup
  line?: string
}

/** The Account area: one side menu for the plan, the money and the member's own settings. */
export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  {
    href: "/account",
    label: "Overview",
    icon: LayoutGrid,
    group: "Membership",
  },
  {
    href: "/membership",
    label: "Membership",
    icon: IdCard,
    group: "Membership",
  },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Membership" },
  {
    href: "/guest-passes",
    label: "Guest passes",
    icon: Gift,
    group: "Membership",
  },
  {
    href: "/settings/profile",
    label: "Profile",
    icon: User,
    group: "Settings",
  },
  {
    href: "/settings/preferences",
    label: "Home club and interests",
    icon: MapPin,
    group: "Settings",
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
    group: "Settings",
  },
  {
    href: "/settings/calendar",
    label: "Calendar",
    icon: CalendarDays,
    group: "Settings",
  },
  {
    href: "/settings/security",
    label: "Sign-in and security",
    icon: KeyRound,
    group: "Settings",
  },
  {
    href: "/settings/display",
    label: "Display and accessibility",
    icon: SunMedium,
    group: "Settings",
  },
  {
    href: "/settings/privacy",
    label: "Privacy and data",
    icon: Lock,
    group: "Settings",
  },
]

export function isCurrent(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Every page a member can search for in the command menu. */
export const NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
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
