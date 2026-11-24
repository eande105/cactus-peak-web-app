"use client"
import { usePathname, useRouter } from "next/navigation"
import {
  type ComponentType,
  createContext,
  type ReactNode,
  Suspense,
  useContext,
} from "react"
import { useApp } from "@/components/app/use-app"
import { ClubSwitcher, useClubParam } from "@/components/clubs/club-switcher"
import { Menu } from "@/components/graphical"
import {
  CalendarDays,
  ChevronDown,
  ChildHead,
  Dumbbell,
  LayoutGrid,
  Waves,
} from "@/components/icons"
import { AppPage, TabLinks } from "@/components/kit/app"
import { CourtIcon } from "@/components/kit/icons"
import { cn } from "@/lib/utils"

type BookTab = {
  href: string
  label: string
  match: string
  icon: ComponentType<{
    className?: string
    "aria-hidden"?: boolean | "true" | "false"
  }>
}

const TABS: BookTab[] = [
  {
    href: "/schedule",
    label: "Classes",
    match: "/schedule",
    icon: CalendarDays,
  },
  {
    href: "/reserve/courts",
    label: "Courts",
    match: "/reserve/courts",
    icon: CourtIcon,
  },
  {
    href: "/reserve/lanes",
    label: "Lap lanes",
    match: "/reserve/lanes",
    icon: Waves,
  },
  {
    href: "/reserve/kids-club",
    label: "Kids club",
    match: "/reserve/kids-club",
    icon: ChildHead,
  },
  { href: "/training", label: "Training", match: "/training", icon: Dumbbell },
]

/** The types this member may book. `BookTypeChip` reads it, so the chip can sit inside a page's own filter row. */
const BookTabsContext = createContext<BookTab[] | null>(null)

/**
 * Phone only (below lg; the tab row takes over from lg): the first chip of the Book filter row. It shows the type
 * being booked and opens a menu of the types the member may book. It renders nothing outside a `BookPage`.
 */
export function BookTypeChip({ className }: { className?: string }) {
  const tabs = useContext(BookTabsContext)
  const path = usePathname()
  const router = useRouter()
  if (!tabs) return null
  const current =
    tabs.find((t) => path === t.match || path.startsWith(`${t.match}/`)) ??
    tabs[0]
  const Icon = current.icon
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`What to book: ${current.label}`}
        className={cn(
          "!gap-xs !px-m !inline-flex !min-h-11 !shrink-0 !items-center !corner-full !text-body-s !font-medium !whitespace-nowrap hairline lg:!hidden",
          className
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {current.label}
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup className="!min-w-48">
            {tabs.map((t) => {
              const TabIcon = t.icon
              return (
                <Menu.Item
                  key={t.href}
                  aria-current={t === current ? "page" : undefined}
                  onClick={() => router.push(t.href)}
                >
                  <TabIcon className="size-4" aria-hidden="true" />
                  {t.label}
                </Menu.Item>
              )
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** Applies `?club=` once (see `useClubParam`). It needs its own Suspense boundary because it reads the URL. */
function ClubParam() {
  useClubParam()
  return null
}

/**
 * The Book workspace: one screen with a tab for each thing a member can book.
 * Every bookable page is a `BookPage`. `actions` sit at the right end of the page bar. The club switcher is the one
 * place a club is chosen for classes, courts, lap lanes and kids club (`prefs.viewingClub`). Training books with a
 * coach, so it has no club switcher.
 */
export function BookPage({
  actions,
  children,
}: {
  actions?: ReactNode
  children: ReactNode
}) {
  const { me } = useApp()
  const path = usePathname()
  const byClub = !path.startsWith("/training")
  const adult = me.role === "primary" || me.role === "adult"
  const tabs = TABS.filter((t) =>
    t.href === "/reserve/kids-club"
      ? adult
      : t.href === "/reserve/courts"
        ? me.role !== "teen"
        : true
  )
  return (
    <BookTabsContext.Provider value={tabs}>
      <AppPage
        title="Book"
        width="wide"
        actions={
          <>
            {byClub ? <ClubSwitcher className="max-sm:w-full" /> : null}
            {actions}
          </>
        }
        tabs={
          <TabLinks
            label="What to book"
            className="max-lg:hidden"
            items={tabs.map((t) => ({
              href: t.href,
              label: t.label,
              match: t.match,
            }))}
          />
        }
      >
        {byClub ? (
          <Suspense fallback={null}>
            <ClubParam />
          </Suspense>
        ) : null}
        {children}
      </AppPage>
    </BookTabsContext.Provider>
  )
}
