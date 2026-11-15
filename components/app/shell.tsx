"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { PaymentBanners } from "@/components/app/banners"
import { GlobalDialogs } from "@/components/app/global-dialogs"
import { HouseholdGate, ShellSkeleton } from "@/components/app/household-gate"
import {
  ACCOUNT_NAV,
  ACCOUNT_PATHS,
  canOpen,
  canSee,
  HELP_NAV,
  isCurrent,
  PRIMARY_NAV,
  type PrimaryNavItem,
} from "@/components/app/nav"
import { needsStepUp, StepUpGate } from "@/components/app/step-up"
import { useApp } from "@/components/app/use-app"
import { Menu } from "@/components/graphical"
import {
  Bell,
  CalendarPlus,
  Check,
  ChevronRight,
  MonitorSmartphone,
  Moon,
  MoreHorizontal,
  QrCode,
  Search,
  Sun,
  X,
} from "@/components/icons"
import { Tip, TipProvider } from "@/components/kit/tip"
import { EmptyState, PersonAvatar } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import {
  demoJumpClock,
  demoOpenWaitlistSpot,
  demoPaymentFailed,
  demoReset,
  setPrefs,
  signOut,
  switchMember,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { PLANS } from "@/lib/data/catalog"
import { toast } from "@/lib/toast"
import { openDialog, setOfflineDemo, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

/** The gutters of the content area. Each screen sets its own width with `AppPage`. */
export const FRAME = "w-full px-m lg:px-l"

function Logo({ className, symbol }: { className?: string; symbol?: boolean }) {
  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
      <img
        src={
          symbol
            ? "/brand/cpa-symbol-color.svg"
            : "/brand/cpa-horizontal-color.svg"
        }
        alt=""
        className={cn("dark:hidden", className)}
      />
      {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
      <img
        src={
          symbol
            ? "/brand/cpa-symbol-reversed.svg"
            : "/brand/cpa-horizontal-reversed.svg"
        }
        alt=""
        className={cn("hidden dark:block", className)}
      />
    </>
  )
}

function SideLink({ item, count }: { item: PrimaryNavItem; count?: number }) {
  const path = usePathname()
  const active = isCurrent(path, item.match)
  const Icon = item.icon
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "gap-s px-s flex h-9 items-center corner-s text-body-s font-medium",
          active
            ? "bg-card text-foreground hairline"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", active && "text-primary")}
          aria-hidden="true"
        />
        <span className="flex-1 truncate">{item.label}</span>
        {count ? (
          <span className="tabular px-xs corner-full bg-badge-danger text-body-xs font-heavy text-badge-danger-fg">
            <span className="sr-only">Unread: </span>
            {count}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

/** The sidebar, from 1024 px. What a member does is at the top. What a member manages is at the bottom. */
function Sidebar() {
  const { s, me } = useApp()
  const unread = s.notices.filter(
    (n) => n.memberId === me.id && !n.readAt
  ).length
  return (
    <aside className="gap-m p-s sticky top-0 flex h-dvh w-60 shrink-0 flex-col overflow-y-auto max-lg:hidden">
      <Link
        href="/today"
        aria-label="Cactus Peak Athletic, Home"
        className="px-s flex h-10 items-center"
      >
        <Logo className="h-8 w-auto" />
      </Link>
      {/* The action members take most, with the pass beside it as an icon button: the pass is what they need at
          the door. */}
      <div className="gap-xs flex items-center">
        <Button
          className="flex-1 justify-start"
          render={<Link href="/schedule" />}
        >
          <CalendarPlus aria-hidden="true" data-icon="inline-start" />
          Book a class
        </Button>
        <Tip content="Show pass" side="bottom">
          <Button
            variant="outline"
            size="icon"
            aria-label="Show pass"
            onClick={() => openDialog("pass")}
          >
            <QrCode aria-hidden="true" />
          </Button>
        </Tip>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col justify-between">
        <ul className="gap-xxs flex flex-col">
          {PRIMARY_NAV.map((n) => (
            <SideLink
              key={n.href}
              item={n}
              count={n.href === "/inbox" ? unread : undefined}
            />
          ))}
        </ul>
        <ul className="gap-xxs flex flex-col">
          <li>
            <button
              type="button"
              onClick={() => openDialog("command")}
              className="gap-s px-s flex h-9 w-full items-center corner-s text-body-s font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Search</span>
            </button>
          </li>
          <SideLink item={HELP_NAV} />
        </ul>
      </nav>
      <AccountMenu wide />
    </aside>
  )
}

/** The side menu of the Account area. Below 1024 px it is a row that scrolls sideways. */
function AccountNav() {
  const { me } = useApp()
  const path = usePathname()
  return (
    <nav aria-label="Account" className="lg:w-52 lg:shrink-0">
      <ul className="gap-xxs flex scrollbar-none max-lg:overflow-x-auto lg:sticky lg:top-[calc(var(--bar-h)+var(--space-m))] lg:flex-col">
        {ACCOUNT_NAV.filter((n) => canSee(me, n.href)).map((n) => {
          const active = path === n.href || path.startsWith(`${n.href}/`)
          return (
            <li key={n.href} className="shrink-0">
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-s flex h-9 items-center corner-s text-body-m font-medium whitespace-nowrap sm:h-8 sm:text-body-s",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {n.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The bell opens the Inbox page. The count is the member's unread notices. */
function InboxLink() {
  const { s, me } = useApp()
  const path = usePathname()
  const unread = s.notices.filter(
    (n) => n.memberId === me.id && !n.readAt
  ).length
  return (
    <Link
      href="/inbox"
      aria-label={unread ? `Inbox, ${unread} unread` : "Inbox"}
      aria-current={path.startsWith("/inbox") ? "page" : undefined}
      className="relative grid size-9 place-items-center corner-s hover:bg-muted"
    >
      <Bell className="size-4.5" aria-hidden="true" />
      {unread ? (
        <span
          className="px-xxs tabular absolute top-0.5 right-0.5 grid min-w-4 place-items-center corner-full bg-badge-danger text-body-xs font-heavy text-badge-danger-fg"
          aria-hidden="true"
        >
          {unread}
        </span>
      ) : null}
    </Link>
  )
}

const ROLE_LABEL = {
  primary: "Primary member",
  adult: "Family adult",
  teen: "Teen",
  child: "Child",
} as const

function AccountMenu({ wide }: { wide?: boolean }) {
  const { s, me, hh } = useApp()
  const offline = useOffline()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  // Row level security limits the app to the signed-in household, so only its members can be viewed here.
  const people = Object.values(s.members).filter(
    (m) => m.householdId === hh.id && m.role !== "child"
  )
  const [resetting, setResetting] = useState(false)
  const sub = (label: string, children: ReactNode, wide?: boolean) => (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        {label}
        <ChevronRight
          className="ml-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} alignOffset={-4}>
          <Menu.Popup
            className={cn(
              "max-h-[80vh] overflow-y-auto",
              wide ? "!min-w-64" : "!min-w-44"
            )}
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Account menu for ${me.firstName} ${me.lastName}`}
        className={cn(
          "!border-0 !bg-transparent !shadow-none",
          wide
            ? "!gap-s !px-s !flex !h-12 !w-full !items-center !justify-start corner-s !text-left hover:!bg-foreground/5 data-[popup-open]:!bg-foreground/5"
            : "!grid !size-9 !place-items-center !p-zero hover:!bg-muted"
        )}
      >
        <PersonAvatar
          name={`${me.firstName} ${me.lastName}`}
          hue={me.hue}
          size={wide ? 32 : 28}
        />
        {wide ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-s font-medium text-foreground">
                {me.firstName} {me.lastName}
              </span>
              <span className="block truncate text-body-xs text-muted-foreground">
                {PLANS[hh.plan].name}
              </span>
            </span>
            <MoreHorizontal
              className="size-4 shrink-0 rotate-90 text-muted-foreground"
              aria-hidden="true"
            />
          </>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={wide ? "right" : "bottom"}
          align="end"
          sideOffset={wide ? 12 : 8}
        >
          <Menu.Popup className="!min-w-64">
            <div className="gap-s px-s py-xs flex items-center">
              <PersonAvatar
                name={`${me.firstName} ${me.lastName}`}
                hue={me.hue}
                size={36}
              />
              <div className="min-w-0">
                <p className="truncate text-body-s font-heavy">
                  {me.firstName} {me.lastName}
                </p>
                <p className="truncate text-body-s text-muted-foreground">
                  {PLANS[hh.plan].name} · {ROLE_LABEL[me.role]}
                </p>
              </div>
            </div>
            <Menu.Separator />
            {/* What a member manages. On a phone the menu also carries the places the tab bar has no room for. On
                the sidebar, Help and Search sit right above the menu, so it does not repeat them. */}
            {(
              [
                ["/account", "Account", true],
                ["/family", "Household", true],
                ["/billing", "Billing", true],
                ["/settings/notifications", "Notifications", true],
                ["/clubs", "Clubs", false],
                ["/progress", "Progress", false],
                ["/help", "Help", false],
              ] as const
            )
              .filter(
                ([href, , everywhere]) =>
                  canSee(me, href) && (everywhere || !wide)
              )
              .map(([href, label]) => (
                <Menu.Item key={href} render={<Link href={href} />}>
                  {label}
                </Menu.Item>
              ))}
            <Menu.Separator />
            {sub(
              "Appearance",
              <Menu.RadioGroup
                value={theme ?? "system"}
                onValueChange={(v) => {
                  setTheme(v as string)
                  setPrefs(me.id, { theme: v as "system" })
                }}
              >
                {(
                  [
                    ["system", "System", MonitorSmartphone],
                    ["light", "Light", Sun],
                    ["dark", "Dark", Moon],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Menu.RadioItem key={value} value={value}>
                    <Menu.RadioItemIndicator>
                      <Check aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                    <Icon className="mr-xs size-4" aria-hidden="true" />
                    {label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            )}
            {/* The demo tools are for the presentation, not for members. One submenu keeps them out of the way. */}
            {sub(
              "Demo",
              <>
                <Menu.Group>
                  <Menu.GroupLabel>View as</Menu.GroupLabel>
                  <Menu.RadioGroup
                    value={me.id}
                    onValueChange={(v) => {
                      switchMember(v as string)
                      router.push("/today")
                      announce(
                        `Now viewing as ${s.members[v as string].firstName}.`
                      )
                    }}
                  >
                    {people.map((m) => (
                      <Menu.RadioItem key={m.id} value={m.id} closeOnClick>
                        <Menu.RadioItemIndicator>
                          <Check aria-hidden="true" />
                        </Menu.RadioItemIndicator>
                        {m.firstName} {m.lastName}
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Group>
                <Menu.Separator />
                <Menu.Item
                  onClick={() => {
                    const ok = demoOpenWaitlistSpot()
                    announce(
                      ok
                        ? "A spot opened on your waitlist."
                        : "You are not on a waitlist right now."
                    )
                  }}
                >
                  Open a spot on my waitlist
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    demoJumpClock(3600_000)
                    announce("Clock moved forward 1 hour.")
                  }}
                >
                  Move the clock forward 1 hour
                </Menu.Item>
                {me.role === "primary" ? (
                  <>
                    <Menu.Item onClick={() => demoPaymentFailed(0)}>
                      Fail my payment (day 0)
                    </Menu.Item>
                    <Menu.Item onClick={() => demoPaymentFailed(9)}>
                      Fail my payment (day 9)
                    </Menu.Item>
                    <Menu.Item onClick={() => demoPaymentFailed(null)}>
                      Clear payment failure
                    </Menu.Item>
                  </>
                ) : null}
                <Menu.CheckboxItem
                  checked={offline}
                  onCheckedChange={(c) => setOfflineDemo(!!c)}
                >
                  <Menu.CheckboxItemIndicator>
                    <Check aria-hidden="true" />
                  </Menu.CheckboxItemIndicator>
                  Offline
                </Menu.CheckboxItem>
                <Menu.Item
                  disabled={resetting}
                  onClick={async () => {
                    setResetting(true)
                    try {
                      await demoReset()
                      setOfflineDemo(false)
                      announce("Demo data reset.")
                      toast({ title: "Demo data reset" })
                      router.push("/today")
                    } catch {
                      toast({
                        type: "error",
                        title: "We couldn't reset the demo data",
                        description:
                          "Check your connection, then try Reset demo data again.",
                      })
                    } finally {
                      setResetting(false)
                    }
                  }}
                >
                  {resetting ? "Resetting demo data…" : "Reset demo data"}
                </Menu.Item>
              </>,
              true
            )}
            <Menu.Separator />
            <Menu.Item
              onClick={async () => {
                try {
                  await signOut()
                } catch {
                  toast({
                    type: "error",
                    title: "We couldn't reach the server to sign out",
                    description:
                      "You're signed out on this device. Sign out again later to end other sessions.",
                  })
                }
                router.replace("/sign-in")
                router.refresh()
              }}
            >
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** Phone only. Three places and the pass: the pass is the one thing a member needs at the door. */
function TabBar() {
  const path = usePathname()
  const tabs = [
    ...PRIMARY_NAV.slice(0, 3),
    { href: "/pass", label: "Pass", icon: QrCode, match: ["/pass"] },
  ]
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 bg-sheet pb-[env(safe-area-inset-bottom)] rule-t lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = isCurrent(path, t.match)
          const Icon = t.icon
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "gap-xxs relative flex min-h-14 flex-col items-center justify-center text-body-xs font-medium",
                  active
                    ? "text-foreground before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:bg-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn("size-5", active && "text-primary")}
                  aria-hidden="true"
                />
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function StoreGate({ children }: { children: ReactNode }) {
  return (
    <HouseholdGate skeleton={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </HouseholdGate>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const app = useApp()
  const { me } = app
  const path = usePathname()
  const offline = useOffline()
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    document.documentElement.dataset.motion =
      app.prefs.motion === "reduce" ? "reduce" : ""
    document.documentElement.dataset.text =
      app.prefs.textSize === "large" ? "large" : ""
  }, [app.prefs.motion, app.prefs.textSize])
  // Route change: move focus to the page heading and announce the title.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change only, the focus move must not repeat for other changes
  useEffect(() => {
    const t = window.setTimeout(() => {
      const h = document.getElementById("page-title") ?? main.current
      h?.focus({ preventScroll: true })
      announce(`${document.title.split(" · ")[0] || "Page"} page loaded`)
    }, 120)
    return () => window.clearTimeout(t)
  }, [path])
  const access = canOpen(me, path)
  const page =
    ACCOUNT_PATHS.includes(path) || path.startsWith("/settings/") ? (
      <div className="gap-l lg:gap-xl flex w-full flex-col lg:flex-row">
        <AccountNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    ) : (
      children
    )
  return (
    // One provider for the signed-in app, so moving between hints skips the open delay.
    <TipProvider>
      <div className="isolate flex min-h-dvh [--bar-h:3.5rem] lg:[--bar-h:0rem]">
        <a
          href="#main"
          className="px-m py-s fixed top-2 left-2 z-[70] -translate-y-20 corner-s bg-night text-body-s font-heavy text-night-foreground focus:translate-y-0"
        >
          Skip to main content
        </a>
        <Sidebar />
        {/* The content sheet beside the Sand sidebar (the template's inset sheet): its own surface, a step lighter than
            the sidebar, with a soft ring. Screens sit on it; cards are raised from it. */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            "bg-sheet",
            "lg:my-xs lg:mr-xs lg:corner-l lg:hairline lg:ring-foreground/10 lg:shadow-s"
          )}
        >
          <header className="sticky top-0 z-30 bg-sheet rule-b lg:hidden">
            <div className={cn(FRAME, "gap-s flex h-(--bar-h) items-center")}>
              <Link
                href="/today"
                aria-label="Cactus Peak Athletic, Home"
                className="shrink-0"
              >
                <Logo symbol className="size-7" />
              </Link>
              <div className="gap-xs flex flex-1 items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDialog("pass")}
                >
                  <QrCode aria-hidden="true" data-icon="inline-start" />
                  Pass
                </Button>
                <InboxLink />
                <AccountMenu />
              </div>
            </div>
          </header>
          {path === "/pass" ? null : (
            <PaymentBanners offline={offline} path={path} />
          )}
          <main
            id="main"
            ref={main}
            tabIndex={-1}
            className={cn(
              FRAME,
              "py-m lg:py-l flex-1 outline-none max-lg:pb-[calc(var(--space-xxl)*2)]"
            )}
          >
            {access.ok ? (
              needsStepUp(path) ? (
                <StepUpGate>{page}</StepUpGate>
              ) : (
                page
              )
            ) : (
              <EmptyState
                icon={X}
                title="You don't have access to this page."
                body={access.reason}
                action={
                  <Button render={<Link href="/today" />}>Back to Home</Button>
                }
                secondary={
                  me.parentId ? (
                    <Button variant="outline" render={<Link href="/inbox" />}>
                      Message {app.s.members[me.parentId].firstName}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </main>
        </div>
        <div
          id="live-status"
          role="status"
          aria-live="polite"
          className="sr-only"
        />
        <TabBar />
        <GlobalDialogs />
      </div>
    </TipProvider>
  )
}
