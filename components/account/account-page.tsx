"use client"
import { useRouter } from "next/navigation"
import { IosPassCard } from "@/components/account/ios-pass-card"
import { capital, Section } from "@/components/account/parts"
import {
  AccountMenuList,
  AccountScreen,
  SummaryCard,
} from "@/components/account/screen"
import { canSee } from "@/components/app/nav"
import { useApp } from "@/components/app/use-app"
import {
  ChevronRight,
  CircleHelp,
  CreditCard,
  Dumbbell,
  Gift,
  IdCard,
  Inbox,
  Ticket,
  TrendingUp,
  Users,
} from "@/components/icons"
import { Row, Rows } from "@/components/kit/app"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions"
import { CLUB_BY_SLUG, PLANS } from "@/lib/data/catalog"
import {
  guestPassesLeft,
  householdMembers,
  householdMonthly,
  nextBillingDate,
  ptCreditsLeft,
} from "@/lib/engine"
import { fmtDayShort, fmtMoney } from "@/lib/time"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const ROLE = {
  primary: "Primary member",
  adult: "Adult",
  teen: "Teen",
  child: "Child",
} as const

const STATUS: Record<
  string,
  {
    label: string
    tone: "neutral" | "success" | "info" | "warning" | "danger"
  }
> = {
  active: { label: "Active", tone: "success" },
  frozen: { label: "Frozen", tone: "info" },
  freeze_scheduled: { label: "Freeze scheduled", tone: "info" },
  payment_failed: { label: "Payment failed", tone: "danger" },
  cancel_scheduled: { label: "Ending", tone: "warning" },
}

/**
 * Account overview: one tile for each thing a member manages. A tile states the current value and links to the
 * screen that changes it. A member who is not the primary member sees only the tiles that member can open.
 */
export default function AccountPage() {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const primary = me.role === "primary"
  const adult = primary || me.role === "adult"
  const plan = PLANS[hh.plan]
  const people = householdMembers(s, hh.id)
  const passes = guestPassesLeft(s, hh.id, now)
  const credits = ptCreditsLeft(hh)
  const status = STATUS[hh.status] ?? STATUS.active
  const next = nextBillingDate(hh, now)
  const unread = s.notices.filter(
    (n) => n.memberId === me.id && !n.readAt
  ).length
  // The places that are under You: Bookings, Progress, Inbox, Household and Help. Icon and title, no second line.
  const places = [
    { href: "/bookings", label: "Bookings", icon: Ticket },
    { href: "/progress", label: "Progress", icon: TrendingUp },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/family", label: "Household", icon: Users },
    { href: "/help", label: "Help", icon: CircleHelp },
  ].filter((p) => canSee(me, p.href))
  // Plan, Household and Guest passes for an adult, Payment for the primary member, Training pack for all. Three
  // columns only for an odd count of five, so four cards make a 2 × 2 grid and no card sits alone in a row.
  const cards = (adult ? 3 : 0) + (primary ? 1 : 0) + 1
  return (
    <AccountScreen
      width="wide"
      title={`${me.firstName} ${me.lastName}`}
      meta={
        <p className="min-w-0 truncate text-body-s text-muted-foreground max-sm:hidden">
          {ROLE[me.role]} · {CLUB_BY_SLUG[me.homeClub].name}
        </p>
      }
      actions={
        <Button
          variant="outline"
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
        </Button>
      }
    >
      {/* On a phone the name needs the full row, so the role and club go on their own line under it. */}
      <p className="-mt-s text-body-m text-pretty text-muted-foreground sm:hidden">
        {ROLE[me.role]} · {CLUB_BY_SLUG[me.homeClub].name}
      </p>
      <IosPassCard member={me} plan={hh.plan} />
      <ul
        className={cn(
          "gap-s grid grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2",
          cards === 5 &&
            "lg:grid-cols-3 lg:[&>*:last-child:nth-child(odd)]:col-span-1"
        )}
      >
        {adult ? (
          <li>
            <SummaryCard
              className="h-full"
              href="/membership"
              icon={IdCard}
              label="Plan"
              value={
                <span className="gap-xs flex min-w-0 items-center">
                  {plan.name}
                  {hh.status === "active" ? null : (
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  )}
                </span>
              }
              meta={
                primary
                  ? `${fmtMoney(householdMonthly(s, hh).total)} on ${fmtDayShort(next)}`
                  : `Renews ${fmtDayShort(next)}`
              }
            />
          </li>
        ) : null}
        {primary ? (
          <li>
            <SummaryCard
              className="h-full"
              href="/billing"
              icon={CreditCard}
              label="Payment"
              value={`${capital(hh.card.brand)} ending ${hh.card.last4}`}
              meta={`Expires ${String(hh.card.expMonth).padStart(2, "0")}/${hh.card.expYear}`}
            />
          </li>
        ) : null}
        {adult ? (
          <li>
            <SummaryCard
              className="h-full"
              href="/family"
              icon={Users}
              label="Household"
              value={`${people.length} ${people.length === 1 ? "member" : "members"}`}
              meta={people.map((m) => m.firstName).join(", ")}
            />
          </li>
        ) : null}
        {adult ? (
          <li>
            <SummaryCard
              className="h-full"
              href="/guest-passes"
              icon={Gift}
              label="Guest passes"
              value={`${passes.left} of ${passes.included} left`}
              meta="This month"
            />
          </li>
        ) : null}
        <li>
          <SummaryCard
            className="h-full"
            href="/training"
            icon={Dumbbell}
            label="Training pack"
            value={`${credits} ${credits === 1 ? "session" : "sessions"} left`}
          />
        </li>
      </ul>
      <Section title="Go to">
        <div className="corner-m raised">
          <Rows label="Places under You">
            {places.map((p) => (
              <Row
                key={p.href}
                href={p.href}
                title={
                  <span className="gap-s flex items-center">
                    <p.icon
                      className="size-4.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {p.label}
                  </span>
                }
                end={
                  <>
                    {p.href === "/inbox" && unread ? (
                      <span className="tabular text-body-s text-muted-foreground">
                        {unread} unread
                      </span>
                    ) : null}
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </>
                }
              />
            ))}
          </Rows>
        </div>
      </Section>
      <AccountMenuList />
    </AccountScreen>
  )
}
