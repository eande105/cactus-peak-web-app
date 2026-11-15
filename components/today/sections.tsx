"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { CategoryTile } from "@/components/brand/graphics"
import {
  ArrowRight,
  ChevronRight,
  type IconComponent,
} from "@/components/icons"
import { Card, CardFooterLink, Facts, Rows } from "@/components/kit/app"
import { VisitStrip } from "@/components/kit/progress"
import { RibMeter } from "@/components/kit/ribs"
import { PersonAvatar, StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { CLUB_BY_SLUG, PLANS } from "@/lib/data/catalog"
import {
  guestPassesLeft,
  householdMembers,
  householdMonthly,
  nextBillingDate,
  ptCreditsLeft,
  weekStart,
} from "@/lib/engine"
import { clubVisits, nextMilestone, visitsBetween } from "@/lib/insights"
import {
  DAY,
  dateKey,
  fmtDay,
  fmtDayShort,
  fmtDowTime,
  fmtMoney,
} from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

export const plural = (n: number, w: string) =>
  `${n} ${n === 1 ? w : w.endsWith("s") ? `${w}es` : `${w}s`}`

/**
 * One prompt at the top of Home: the callout with its icon on the same line, and the action under it. The whole card
 * is the link. `night` is the brand's one dark block on the screen.
 */
export function QuickCard({
  href,
  icon: Icon,
  title,
  action,
  night,
}: {
  href: string
  icon: IconComponent
  title: ReactNode
  action: string
  night?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group gap-s p-m flex h-full min-w-0 flex-col justify-between corner-m text-body-m sm:text-body-s",
        night
          ? "bg-night text-night-foreground hover:bg-night/90"
          : "raised hover:bg-muted/40"
      )}
    >
      <span className="gap-xs flex min-w-0 items-start text-body-l">
        <span className="flex h-lh shrink-0 items-center">
          <Icon
            aria-hidden="true"
            className={cn("size-4.5 shrink-0", night ? "" : "text-primary")}
          />
        </span>
        <span className="tabular font-display-wide min-w-0 font-heavy text-balance">
          {title}
        </span>
      </span>
      <span
        className={cn(
          "gap-xxs flex items-center font-medium",
          night ? "" : "text-link"
        )}
      >
        {action}
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </span>
    </Link>
  )
}

/** Two cards side by side from a wide container, stacked under it. One card takes the full row. */
export function Pair({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="@container">
      <div
        className={cn(
          "gap-m grid",
          right ? "@3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""
        )}
      >
        {left}
        {right}
      </div>
    </div>
  )
}

/**
 * The streak and the weekly goal: how many weeks in a row, this week's days, and the next lifetime milestone.
 * Under the goal it offers a class, because one booking is what keeps the streak.
 */
export function StreakCard() {
  const { s, me, prefs, now } = useApp()
  const stats = s.stats[me.id] ?? { streakWeeks: 0, lifetime: 0, longest: 0 }
  const wk = weekStart(now)
  const week = visitsBetween(s, me.id, wk, wk + 7 * DAY)
  const target = prefs.weeklyTarget
  const left = Math.max(0, target - week.length)
  const planned = new Set(
    s.bookings
      .filter(
        (b) =>
          b.memberId === me.id &&
          b.status === "booked" &&
          b.start > now &&
          b.start < wk + 7 * DAY
      )
      .map((b) => dateKey(b.start))
  )
  const lifetime = Math.max(
    stats.lifetime,
    s.visits.filter((v) => v.memberId === me.id).length
  )
  const ms = nextMilestone(lifetime)
  return (
    <Card
      display
      title="Streak"
      description={
        left
          ? `${plural(left, "visit")} to keep it this week`
          : "Goal met this week"
      }
      footer={<CardFooterLink href="/progress">Progress</CardFooterLink>}
    >
      <div className="gap-m flex flex-col text-body-m sm:text-body-s">
        <div className="gap-x-m gap-y-s flex flex-wrap items-end justify-between">
          <div className="gap-s flex items-baseline">
            <p className="tabular font-display-wide text-body-xl font-heavy">
              {plural(stats.streakWeeks, "week")}
            </p>
            <p className="tabular text-muted-foreground">
              Best {stats.longest}
            </p>
          </div>
          <VisitStrip
            weekStart={wk}
            visits={new Set(week.map((v) => dateKey(v.at)))}
            planned={planned}
            today={now}
            goal={target}
          />
        </div>
        <div className="gap-s pt-s flex items-center justify-between rule-t">
          <div className="min-w-0">
            <p className="font-medium">{ms.to} visits</p>
            <p className="tabular text-muted-foreground">
              {lifetime} so far · {ms.to - lifetime} to go
            </p>
          </div>
          <RibMeter
            value={Math.round(((lifetime - ms.from) / (ms.to - ms.from)) * 5)}
            size="sm"
            tone="brand"
            label={`Progress to ${ms.to} visits`}
            valueText={`${lifetime} of ${ms.to}`}
          />
        </div>
        {left ? (
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            render={<Link href="/schedule" />}
          >
            Book a class
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

/** The clubs the member used in the last 60 days, most visits first. Each row opens the club. */
export function ClubsCard() {
  const { s, me, now } = useApp()
  const clubs = clubVisits(visitsBetween(s, me.id, now - 60 * DAY, now))
  return (
    <Card
      display
      title="Where you train"
      description="Last 60 days"
      flush
      footer={<CardFooterLink href="/clubs">All clubs</CardFooterLink>}
    >
      {clubs.length ? (
        <Rows className="rule-t" label="Clubs you visited">
          {clubs.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/clubs/${c.slug}`}
                className="gap-s px-m py-xs flex min-h-14 items-center text-body-m hover:bg-muted/40 sm:text-body-s"
              >
                <span className="min-w-0 flex-1">
                  <span className="gap-xs flex items-center">
                    <span className="truncate font-medium">
                      {CLUB_BY_SLUG[c.slug]?.name ?? c.slug}
                    </span>
                    {c.slug === me.homeClub ? (
                      <StatusPill className="shrink-0">Home</StatusPill>
                    ) : null}
                  </span>
                  <span className="tabular block truncate text-muted-foreground">
                    Last visit {fmtDayShort(c.last)}
                  </span>
                </span>
                <span className="tabular shrink-0 font-medium">
                  {plural(c.n, "visit")}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </Rows>
      ) : (
        <p className="px-m pb-m pt-xs text-body-m text-muted-foreground sm:text-body-s">
          No visits in the last 60 days.
        </p>
      )}
    </Card>
  )
}

/** Each person in the household: visits this week and the next thing booked. Kids are counted too. */
export function HouseholdCard() {
  const { s, me, hh, now } = useApp()
  const people = householdMembers(s, hh.id).filter(
    (m) => m.status !== "invite_expired"
  )
  const wk = weekStart(now)
  const primary = me.role === "primary"
  return (
    <Card
      display
      title="Household"
      description="This week"
      flush
      footer={<CardFooterLink href="/family">Household</CardFooterLink>}
    >
      <Rows className="rule-t" label="Household this week">
        {people.map((m) => {
          const n = visitsBetween(s, m.id, wk, wk + 7 * DAY).length
          const next = s.bookings
            .filter(
              (b) => b.memberId === m.id && b.status === "booked" && b.end > now
            )
            .sort((a, b) => a.start - b.start)[0]
          const body = (
            <>
              <PersonAvatar
                name={`${m.firstName} ${m.lastName}`}
                hue={m.hue}
                className="shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {m.id === me.id ? `${m.firstName} (you)` : m.firstName}
                </span>
                <span className="tabular block truncate text-muted-foreground">
                  {next
                    ? `${next.kind === "kids" ? "Kids club" : next.title}, ${fmtDowTime(next.start)}`
                    : "Nothing booked"}
                </span>
              </span>
              <span className="tabular shrink-0 font-medium">
                {plural(n, "visit")}
              </span>
            </>
          )
          const href = primary && m.id !== me.id ? `/family/${m.id}` : undefined
          return (
            <li key={m.id}>
              {href ? (
                <Link
                  href={href}
                  className="gap-s px-m py-xs flex min-h-14 items-center text-body-m hover:bg-muted/40 sm:text-body-s"
                >
                  {body}
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div className="gap-s px-m py-xs flex min-h-14 items-center text-body-m sm:text-body-s">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </Rows>
    </Card>
  )
}

/** The plan and what is left on it: the next charge, guest passes and coach sessions, with a way to use each. */
export function MembershipCard() {
  const { s, me, hh, now } = useApp()
  const primary = me.role === "primary"
  const passes = guestPassesLeft(s, hh.id, now)
  const credits = ptCreditsLeft(hh)
  const items = [
    ...(primary
      ? [
          {
            label: "Next charge",
            value: `${fmtMoney(householdMonthly(s, hh).total, false)} on ${fmtDay(nextBillingDate(hh, now))}`,
          },
        ]
      : []),
    {
      label: "Guest passes",
      value: `${passes.left} of ${passes.included} left`,
    },
    {
      label: "Coach sessions",
      value: credits ? `${credits} left` : "None left",
    },
  ]
  return (
    <Card
      display
      title="Membership"
      description={`${PLANS[hh.plan].name} · ${CLUB_BY_SLUG[me.homeClub].name}`}
      footer={
        <div className="gap-xs flex flex-wrap justify-end">
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/guest-passes/send" />}
          >
            Send a guest pass
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/training" />}
          >
            Book a coach
          </Button>
        </div>
      }
    >
      <Facts items={items} className="[&>div:first-child]:pt-zero" />
    </Card>
  )
}

/** One thing waiting for the member: a status icon, what to do, one fact, and where it goes. */
export type NeedItem = {
  key: string
  icon: IconComponent
  /** `warning` for a deadline or something missing; `primary` for something in progress. */
  tone: "warning" | "primary"
  title: string
  line?: string
  href?: string
  onSelect?: () => void
}

/**
 * The things that wait for the member, three at most. A card header (the title and the count beside it), then ghost
 * rows: each row is the control, with a status icon at the left and a chevron at the right. The dividers start and end
 * with the rows' text, not at the card's edges.
 */
export function NeedsCard({ items }: { items: NeedItem[] }) {
  const shown = items.slice(0, 3)
  return (
    <section className="flex min-w-0 flex-col corner-m raised">
      <header className="gap-xs px-m pt-m pb-xs flex items-center">
        <h2 className="font-display-wide text-body-l font-heavy">Needs you</h2>
        <span className="tabular px-xs min-w-6 corner-full bg-muted text-center text-body-m font-medium sm:text-body-s">
          <span className="sr-only">, </span>
          {items.length}
          <span className="sr-only"> to do</span>
        </span>
      </header>
      <ul className="p-xs pt-zero flex flex-col">
        {shown.map((it, i) => {
          const body = (
            <>
              <span className="flex h-lh shrink-0 items-center">
                <it.icon
                  aria-hidden="true"
                  className={cn(
                    "size-4.5 shrink-0",
                    it.tone === "warning" ? "text-warning" : "text-primary"
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-pretty">
                  {it.title}
                </span>
                {it.line ? (
                  <span className="tabular block text-pretty text-muted-foreground">
                    {it.line}
                  </span>
                ) : null}
              </span>
              <span className="flex h-lh shrink-0 items-center">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </span>
            </>
          )
          const row =
            "gap-s px-s py-s flex w-full min-w-0 items-start corner-s text-left text-body-m hover:bg-muted/60 sm:text-body-s"
          return (
            <li
              key={it.key}
              className={cn(
                "relative",
                i > 0 &&
                  "before:inset-x-s before:absolute before:top-0 before:h-px before:bg-border"
              )}
            >
              {it.href ? (
                <Link href={it.href} className={row}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={it.onSelect} className={row}>
                  {body}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * One booking shortcut in the Book row, kept brief because the member knows what each one books: the category tile, a
 * one-word name ("Class", "Court"), one short fact from their data ("Mobility 30, 5:30 pm", "6 courts"), and the
 * arrow from the prompts at the top of Home. The whole card is the link.
 */
export function BookSuggestion({
  href,
  category,
  title,
  hint,
}: {
  href: string
  category: CategoryId
  title: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      className="group gap-s p-s flex h-full min-w-0 items-center corner-m raised text-body-m hover:bg-muted/40 sm:text-body-s"
    >
      <CategoryTile
        category={category}
        className="size-8 shrink-0"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heavy">{title}</span>
        {hint ? (
          <span className="tabular block truncate text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden="true"
        // In the half-width cards of a phone the arrow would cut the name short, so it shows from @lg.
        className="size-4 shrink-0 text-link transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none @max-lg:hidden"
      />
    </Link>
  )
}
