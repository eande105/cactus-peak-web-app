"use client"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import {
  CalendarDays,
  Clock,
  MapPin,
  RotateCcw,
  Share2,
  Snowflake,
  Sparkles,
} from "@/components/icons"
import { AppPage, Card, Group } from "@/components/kit/app"
import { CoachArt, roleCategory } from "@/components/kit/brand-art"
import { CategoryBadge } from "@/components/kit/category"
import {
  DateBadge,
  FactRow,
  RowPill,
  SectionHeader,
  StatItem,
  StatStrip,
} from "@/components/kit/detail"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { ensureThread } from "@/lib/actions"
import {
  CATEGORY_BY_ID,
  CLUB_BY_SLUG,
  COACH_BY_SLUG,
  PT_PACKS,
  PT_PRICE,
} from "@/lib/data/catalog"
import { sessionsRange } from "@/lib/data/sessions"
import { bookingOf, bookingState, ptOpenSlots, sessionLeft } from "@/lib/engine"
import { dayStart, fmtDay, fmtMoney, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Session } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A row of quiet tag chips: specialties, "Good for". */
function Chips({
  items,
  label,
  className,
}: {
  items: string[]
  label: string
  className?: string
}) {
  return (
    <ul aria-label={label} className={cn("gap-xs flex flex-wrap", className)}>
      {items.map((x) => (
        <li key={x}>
          <StatusPill tone="outline">{x}</StatusPill>
        </li>
      ))}
    </ul>
  )
}

/**
 * The parts of a first session. An item is "10 minutes talking": the length is the strong title and the rest is
 * the line. An item without a length is the title alone.
 */
function StepList({
  items,
  className,
}: {
  items: string[]
  className?: string
}) {
  return (
    <ol className={cn("flex flex-col [&>li+li]:rule-t", className)}>
      {items.map((g, i) => {
        const m = /^(\d+\s+\w+)\s+(.+)$/.exec(g)
        const line = m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : ""
        return (
          <li
            key={g}
            className="gap-s py-s flex items-baseline text-body-m sm:text-body-s"
          >
            <span
              className="tabular w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="tabular block font-heavy">{m ? m[1] : g}</span>
              {line ? (
                <span className="block text-muted-foreground">{line}</span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** One class this week: date, name, time and room, and the spots or the member's state. Opens the class. */
function WeekRow({ se }: { se: Session }) {
  const { s, me, now } = useApp()
  const st = bookingState(s, me.id, se, now)
  const bk = bookingOf(s, me.id, se.id)
  const left = sessionLeft(s, se)
  const booked = st.state === "booked" || st.state === "late-cancel"
  return (
    <li>
      <Link
        href={`/schedule/${se.id}`}
        className="gap-s py-xs flex min-h-13 min-w-0 items-center outline-none hover:bg-muted/40 focus-visible:underline"
      >
        <DateBadge date={new Date(se.start)} />
        <span className="min-w-0 flex-1 text-body-m sm:text-body-s">
          <span className="block truncate font-medium">{se.name}</span>
          <span className="tabular block truncate text-muted-foreground">
            {fmtTime(se.start)} · {se.studio}
          </span>
        </span>
        {booked ? (
          <RowPill>Booked</RowPill>
        ) : bk?.status === "waitlisted" ? (
          <RowPill tone="muted">Waitlist</RowPill>
        ) : (
          <RowPill tone={left === 0 ? "muted" : "accent"}>
            {left === 0 ? "Full" : `${left} left`}
          </RowPill>
        )}
      </Link>
    </li>
  )
}

/** The prices as a strip: one session, then each pack with its price for one session. */
function PriceStrip({ className }: { className?: string }) {
  return (
    <StatStrip className={className}>
      <StatItem
        label="Single"
        value={fmtMoney(PT_PRICE, false)}
        detail="1 session"
      />
      {PT_PACKS.map((p) => (
        <StatItem
          key={p.sessions}
          label={`${p.sessions} pack`}
          value={fmtMoney(Math.round(p.price / p.sessions), false)}
          detail="each"
          srLabel={`${p.sessions} session pack, ${fmtMoney(p.price, false)}, ${fmtMoney(Math.round(p.price / p.sessions), false)} each`}
        />
      ))}
    </StatStrip>
  )
}

/** The rules of a training session as fact rows. */
function RuleRows({ summit }: { summit: boolean }) {
  return (
    <div className="flex flex-col">
      <FactRow icon={<Clock />} text="45 min sessions" />
      <FactRow
        icon={<RotateCcw />}
        text="Cancel or reschedule free"
        secondary="Up to 24 hours before"
      />
      <FactRow
        icon={<Snowflake />}
        text="Packs last 12 months"
        secondary="They pause during a freeze"
      />
      {summit ? (
        <FactRow icon={<Sparkles />} text="1 intro session a quarter" />
      ) : null}
    </div>
  )
}

/** One open time as a chip. The chip opens the booking flow with that time picked. */
function TimeChip({
  t,
  slug,
  className,
}: {
  t: number
  slug: string
  className?: string
}) {
  return (
    <Link
      href={`/training/coaches/${slug}/book?t=${t}`}
      className={cn(
        "tabular flex min-h-11 flex-col justify-center hairline",
        "px-s corner-s py-xs",
        "text-body-m",
        "hover:bg-muted/40 sm:text-body-s",
        className
      )}
    >
      <span className="truncate text-muted-foreground">{fmtDay(t)}</span>
      <span className="truncate font-heavy">{fmtTime(t)}</span>
    </Link>
  )
}

export default function CoachProfile({ slug }: { slug: string }) {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const c = COACH_BY_SLUG[slug]
  const [busy, setBusy] = useState(false)
  if (!c) notFound()
  const slots = ptOpenSlots(s, slug, now).slice(0, 8)
  const first = c.name.split(" ")[0]
  const week = c.clubs
    .flatMap((club) => sessionsRange(club, dayStart(now), 7))
    .filter((x) => x.instructorId === c.id && x.start >= now)
    .sort((a, b) => a.start - b.start)
  const shown = week.slice(0, 5)
  const book = `/training/coaches/${slug}/book`
  const scheduleHref = `/schedule?inst=${encodeURIComponent(c.id)}`
  const cat = roleCategory(c.specialties)
  const catName = CATEGORY_BY_ID[cat].name.toLowerCase()
  const tags = c.specialties.filter((x) => !x.toLowerCase().includes(catName))
  const summit = hh.plan === "summit"
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: c.name, url })
        return
      }
    } catch {
      return
    }
    void navigator.clipboard?.writeText(url)
    toast({ title: "Link copied" })
  }
  const message = () => {
    setBusy(true)
    const id = ensureThread(`Coach ${c.name}`, "Your first session")
    setTimeout(() => router.push(`/inbox/${id}`), 200)
  }
  return (
    <AppPage
      back={{ href: "/training", label: "Training" }}
      title={<span className="sr-only">{c.name}</span>}
      actions={
        <Button
          variant="outline"
          className="max-lg:hidden"
          loading={busy}
          onClick={message}
        >
          Message
          <span className="sr-only"> {first}</span>
        </Button>
      }
    >
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="gap-l flex min-w-0 flex-col">
          <div className="gap-m flex min-w-0 flex-col">
            <div className="gap-s flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
              <CoachArt name={c.name} roles={c.specialties} size={96} />
              <div className="min-w-0">
                <p
                  aria-hidden="true"
                  className="font-display-wide text-body-xl font-heavy text-balance"
                >
                  {c.name}
                </p>
                <p className="text-body-m text-muted-foreground sm:text-body-s">
                  Coaching since {c.since}
                </p>
              </div>
              <ul
                aria-label="Tags"
                className="gap-xs flex flex-wrap justify-center lg:justify-start"
              >
                <li>
                  <CategoryBadge id={cat} size="md" />
                </li>
                <li>
                  <StatusPill tone="success">Personal training</StatusPill>
                </li>
                {tags.map((x) => (
                  <li key={x}>
                    <StatusPill tone="outline">{x}</StatusPill>
                  </li>
                ))}
              </ul>
            </div>
            <Button className="w-full lg:hidden" render={<Link href={book} />}>
              Book a session
            </Button>
            <div className="gap-xs grid grid-cols-3 lg:max-w-sm lg:grid-cols-2">
              <Button variant="outline" render={<Link href={scheduleHref} />}>
                <CalendarDays aria-hidden="true" />
                Schedule
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 aria-hidden="true" />
                Share
              </Button>
              <Button
                variant="outline"
                className="lg:hidden"
                loading={busy}
                onClick={message}
              >
                Message
                <span className="sr-only"> {first}</span>
              </Button>
            </div>
          </div>
          {shown.length ? (
            <section id="ct" className="gap-xs flex min-w-0 flex-col">
              <SectionHeader
                title="This week"
                detail={`${week.length} ${week.length === 1 ? "class" : "classes"}`}
                href={scheduleHref}
              />
              <ul
                aria-label={`Classes with ${first}`}
                className="flex flex-col [&>li+li]:rule-t"
              >
                {shown.map((x) => (
                  <WeekRow key={x.id} se={x} />
                ))}
              </ul>
            </section>
          ) : null}
          <section id="ab" className="gap-xs flex min-w-0 flex-col">
            <SectionHeader title="About" />
            <p className="max-w-[64ch] text-body-m text-pretty sm:text-body-s">
              {c.about}
            </p>
          </section>
          {c.goodFor.length ? (
            <Card tone="bare" title="Good for">
              <Chips items={c.goodFor} label="Good for" className="pt-s" />
            </Card>
          ) : null}
          {c.firstSession.length ? (
            <Card id="fs" tone="bare" title="What a first session is">
              <StepList items={c.firstSession} />
            </Card>
          ) : null}
          <section className="gap-xs flex min-w-0 flex-col">
            <SectionHeader title={c.clubs.length === 1 ? "Club" : "Clubs"} />
            <div className="flex flex-col">
              {c.clubs.map((x) => (
                <FactRow
                  key={x}
                  icon={<MapPin />}
                  text={CLUB_BY_SLUG[x].name}
                  href={`/clubs/${x}`}
                />
              ))}
            </div>
          </section>
          <section className="gap-xs flex min-w-0 flex-col lg:hidden">
            <SectionHeader title="Personal training" />
            <PriceStrip />
            <RuleRows summit={summit} />
            {summit ? (
              <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
                {hh.ptIntroLeft} left this quarter.
              </p>
            ) : null}
            {me.role === "teen" ? (
              <p className="text-body-m text-muted-foreground sm:text-body-s">
                A parent approves each booking.
              </p>
            ) : null}
          </section>
        </div>
        <Card
          id="cf"
          as="aside"
          title="Sessions"
          className="hidden lg:sticky lg:top-[calc(var(--bar-h)+var(--space-m))] lg:flex"
        >
          <div className="gap-m flex flex-col">
            <PriceStrip className="lg:grid-cols-2 lg:[&>*:nth-child(3)]:rule-l-0 lg:[&>*:nth-child(n+3)]:rule-t" />
            <RuleRows summit={summit} />
            {summit ? (
              <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
                {hh.ptIntroLeft} left this quarter.
              </p>
            ) : null}
            {me.role === "teen" ? (
              <p className="text-body-m text-muted-foreground sm:text-body-s">
                A parent approves each booking.
              </p>
            ) : null}
            <div id="no">
              <Group label="Next open times" hint="Arizona time">
                {slots.length ? (
                  <>
                    <ul
                      aria-label="Next open times"
                      className="gap-xs grid grid-cols-2"
                    >
                      {slots.map((t) => (
                        <li key={t} className="min-w-0">
                          <TimeChip t={t} slug={slug} />
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={book}
                      className="w-fit text-body-m font-medium text-link sm:text-body-s"
                    >
                      See more times
                    </Link>
                  </>
                ) : (
                  <p className="text-body-m text-muted-foreground sm:text-body-s">
                    No open times with {first} in the next 14 days.
                  </p>
                )}
              </Group>
            </div>
            <Button className="w-full" render={<Link href={book} />}>
              Book a session
            </Button>
          </div>
        </Card>
      </div>
    </AppPage>
  )
}
