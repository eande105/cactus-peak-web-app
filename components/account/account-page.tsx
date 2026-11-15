"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { capital } from "@/components/account/parts"
import { useApp } from "@/components/app/use-app"
import { AppPage } from "@/components/kit/app"
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
 * One overview tile. The whole tile is the link to the screen that changes the value: the name of the thing, its
 * current value as the strong line, and one fact under it.
 */
function LinkTile({
  href,
  label,
  value,
  pill,
  line,
  className,
}: {
  href: string
  label: string
  value: ReactNode
  pill?: ReactNode
  line?: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "gap-xxs p-m flex h-full min-w-0 flex-col corner-m text-body-m raised hover:bg-muted/40 sm:text-body-s",
        className
      )}
    >
      <p className="text-muted-foreground">{label}</p>
      <div className="gap-xs flex min-w-0 items-center">
        <p className="tabular min-w-0 truncate text-body-m font-heavy">
          {value}
        </p>
        {pill}
      </div>
      {line ? (
        <p className="tabular truncate text-muted-foreground">{line}</p>
      ) : null}
    </Link>
  )
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
  return (
    <AppPage
      title={`${me.firstName} ${me.lastName}`}
      meta={
        <p className="min-w-0 truncate text-body-m text-muted-foreground sm:text-body-s">
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
      <div className="@container">
        <ul className="gap-m grid @md:grid-cols-2 @3xl:grid-cols-3">
          {adult ? (
            <li>
              <LinkTile
                href="/membership"
                label="Plan"
                value={plan.name}
                pill={
                  hh.status === "active" ? undefined : (
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  )
                }
                line={
                  primary
                    ? `${fmtMoney(householdMonthly(s, hh).total)} on ${fmtDayShort(next)}`
                    : `Renews ${fmtDayShort(next)}`
                }
              />
            </li>
          ) : null}
          {primary ? (
            <li>
              <LinkTile
                href="/billing"
                label="Payment"
                value={`${capital(hh.card.brand)} ending ${hh.card.last4}`}
                line={`Expires ${String(hh.card.expMonth).padStart(2, "0")}/${hh.card.expYear}`}
              />
            </li>
          ) : null}
          {adult ? (
            <li>
              <LinkTile
                href="/family"
                label="Household"
                value={`${people.length} ${people.length === 1 ? "member" : "members"}`}
                line={people.map((m) => m.firstName).join(", ")}
              />
            </li>
          ) : null}
          {adult ? (
            <li>
              <LinkTile
                href="/guest-passes"
                label="Guest passes"
                value={`${passes.left} of ${passes.included} left`}
                line="This month"
              />
            </li>
          ) : null}
          <li>
            <LinkTile
              href="/training"
              label="Training pack"
              value={`${credits} ${credits === 1 ? "session" : "sessions"} left`}
            />
          </li>
        </ul>
      </div>
    </AppPage>
  )
}
