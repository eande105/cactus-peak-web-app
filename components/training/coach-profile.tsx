"use client"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { Check, Clock3, ShieldCheck, TriangleAlert } from "@/components/icons"
import { AppPage, Card, Facts, Group, Row, Rows } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { CapacityIndicator } from "@/components/kit/ribs"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { ensureThread } from "@/lib/actions"
import {
  CLUB_BY_SLUG,
  COACH_BY_SLUG,
  INSTRUCTORS,
  PT_PACKS,
  PT_PRICE,
} from "@/lib/data/catalog"
import { sessionsRange } from "@/lib/data/sessions"
import {
  bookingOf,
  bookingState,
  ptOpenSlots,
  sessionLeft,
  waitCount,
} from "@/lib/engine"
import { dayStart, fmtDay, fmtDowTime, fmtMoney, fmtTime } from "@/lib/time"
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

/** One class the coach teaches, as a row that opens the class. The right end shows the member's state or the spots. */
function ClassRow({ se }: { se: Session }) {
  const { s, me, now } = useApp()
  const st = bookingState(s, me.id, se, now)
  const bk = bookingOf(s, me.id, se.id)
  return (
    <Row
      className="px-zero"
      href={`/schedule/${se.id}`}
      title={se.name}
      line={
        <span className="tabular">
          {fmtDowTime(se.start)} · {se.studio}
        </span>
      }
      end={
        st.state === "booked" || st.state === "late-cancel" ? (
          <StatusPill tone="success" icon={Check}>
            Booked
          </StatusPill>
        ) : bk?.status === "waitlisted" ? (
          <StatusPill icon={Clock3}>
            Waitlist {bk.position === 2 ? "2nd" : `#${bk.position}`}
          </StatusPill>
        ) : st.state === "hold" ? (
          <StatusPill tone="warning" icon={TriangleAlert}>
            Spot held
          </StatusPill>
        ) : (
          <CapacityIndicator
            variant="text"
            className="text-muted-foreground"
            left={sessionLeft(s, se)}
            capacity={se.capacity}
            unit={se.unit}
            waiting={waitCount(s, se)}
          />
        )
      }
    />
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
  const classes = INSTRUCTORS.filter((i) => i.name === c.name).length
    ? sessionsRange(c.clubs[0], dayStart(now), 5)
        .filter((x) => x.instructorId === c.id)
        .slice(0, 3)
    : []
  const book = `/training/coaches/${slug}/book`
  return (
    <AppPage
      back={{ href: "/training", label: "Training" }}
      title={c.name}
      meta={
        <Chips
          items={c.specialties}
          label="Specialties"
          className="min-w-0 flex-nowrap overflow-hidden max-sm:hidden"
        />
      }
      actions={
        <Button
          variant="outline"
          loading={busy}
          onClick={() => {
            setBusy(true)
            const id = ensureThread(`Coach ${c.name}`, "Your first session")
            setTimeout(() => router.push(`/inbox/${id}`), 200)
          }}
        >
          Message
          <span className="sr-only"> {first}</span>
        </Button>
      }
    >
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="gap-l flex min-w-0 flex-col">
          <Chips
            items={c.specialties}
            label="Specialties"
            className="sm:hidden"
          />
          <Card id="ab" title="About">
            <div className="gap-m flex items-start">
              <CoachArt name={c.name} roles={c.specialties} size={56} />
              <p className="max-w-[64ch] min-w-0 flex-1 text-body-m text-pretty sm:text-body-s">
                {c.about}
              </p>
            </div>
            <Facts
              className="mt-m rule-t"
              items={[
                { label: "Coaching since", value: String(c.since) },
                {
                  label: c.clubs.length === 1 ? "Club" : "Clubs",
                  value: c.clubs.map((x) => (
                    <span key={x} className="block">
                      {CLUB_BY_SLUG[x].name}
                    </span>
                  )),
                },
              ]}
            />
          </Card>
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
          {classes.length ? (
            <Card id="ct" tone="bare" title="Classes">
              <Rows label={`Classes with ${first}`}>
                {classes.map((x) => (
                  <ClassRow key={x.id} se={x} />
                ))}
              </Rows>
            </Card>
          ) : null}
        </div>
        <Card
          id="cf"
          as="aside"
          title="Sessions"
          className="max-lg:order-first lg:sticky lg:top-[calc(var(--bar-h)+var(--space-m))]"
        >
          <div className="gap-m flex flex-col">
            <Facts
              items={[
                { label: "Length", value: "45 minutes" },
                {
                  label: "Single session",
                  value: fmtMoney(PT_PRICE, false),
                },
                {
                  label: "Pack price",
                  value: `From ${fmtMoney(PT_PACKS[2].price / 12, false)} each`,
                },
                ...(hh.plan === "summit"
                  ? [
                      {
                        label: "Summit intro session",
                        value: `${hh.ptIntroLeft} left this quarter`,
                      },
                    ]
                  : []),
                ...(me.role === "teen"
                  ? [{ label: "Approval", value: "By your parent" }]
                  : []),
              ]}
            />
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
            <p className="gap-xs flex items-center text-body-m text-muted-foreground sm:text-body-s">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              Free to move until 24 hours before.
            </p>
            <Button className="w-full" render={<Link href={book} />}>
              Book a session
            </Button>
          </div>
        </Card>
      </div>
    </AppPage>
  )
}
