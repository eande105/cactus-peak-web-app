"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import {
  CategoryMark,
  ListRow,
  ListRows,
  PILL_ICON,
  TimeLead,
} from "@/components/booking/parts"
import { Tabs } from "@/components/graphical"
import {
  AlertCircle,
  CalendarCheck,
  ChevronRight,
  Clock3,
  CreditCard,
  Flame,
  Inbox,
  MapPin,
  MessageSquare,
  QrCode,
  Sparkles,
  Ticket,
  TriangleAlert,
} from "@/components/icons"
import { AppPage, Card, CardFooterLink } from "@/components/kit/app"
import { Collapse } from "@/components/kit/collapse"
import { StatusPill } from "@/components/kit/ui"
import { BookCard } from "@/components/today/book-card"
import { ClassFeature, HeldSpot } from "@/components/today/class-feature"
import { OpenDay, useOpenDayPlan } from "@/components/today/open-day"
import {
  HouseholdCard,
  type NeedItem,
  NeedsCard,
  Pair,
  plural,
  QuickCard,
  StreakCard,
} from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { confirmHold, releaseHold } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { BUSY_WORDS, CLUB_BY_SLUG, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById, sessionsForDay } from "@/lib/data/sessions"
import {
  cancelNote,
  clubOpen,
  liveBusyness,
  sessionLeft,
  weekStart,
} from "@/lib/engine"
import {
  DAY,
  dayStart,
  fmtCountdown,
  fmtDay,
  fmtDowTime,
  fmtTime,
  HOUR,
  MIN,
  monthLabel,
  parts,
} from "@/lib/time"
import type { Booking } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"

type Item = Booking & { names?: string }

// "in 14 minutes", "in 2 h 10 min", "Later today", "Tomorrow", "Thu". Only how far off: the card states the time.
function whenText(start: number, now: number) {
  const diff = start - now
  if (diff >= 6 * HOUR) {
    const d = Math.round((dayStart(start) - dayStart(now)) / DAY)
    return d === 0
      ? "Later today"
      : d === 1
        ? "Tomorrow"
        : fmtDay(start).split(",")[0]
  }
  const m = Math.max(1, Math.round(diff / MIN))
  if (m < 60) return `in ${plural(m, "minute")}`
  return `in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`
}

/**
 * The block that leads Home. The primary content stays together in one column, so it reads as one unit at every
 * width: the heading and when, the title, one quiet line, then the actions. Secondary details sit in the card's
 * corners: the category tile top right, and one short warning bottom right. On a narrow card the warning moves under
 * the actions, where a corner would squeeze it. Everything else about the booking is on its details page.
 */
function NextBlock({
  heading,
  when,
  mark,
  title,
  line,
  note,
  actions,
}: {
  heading: string
  when?: React.ReactNode
  mark?: React.ReactNode
  title: string
  line?: React.ReactNode
  note?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="@container h-full">
      <div className="gap-m grid h-full grid-cols-[minmax(0,1fr)_auto] text-body-m sm:text-body-s">
        <div className="gap-m flex min-w-0 flex-col">
          <div className="gap-xxs flex min-w-0 flex-col">
            <div className="gap-x-xs flex flex-wrap items-center">
              <h2 className="font-heavy">{heading}</h2>
              {when}
            </div>
            <p className="font-display-wide text-body-xl font-heavy text-balance">
              {title}
            </p>
            {line ? <p className="text-muted-foreground">{line}</p> : null}
          </div>
          {actions ? (
            <div className="gap-xs flex flex-wrap">{actions}</div>
          ) : null}
          {note ? <div className="@md:hidden">{note}</div> : null}
        </div>
        {mark || note ? (
          <div className="gap-m flex flex-col items-end justify-between">
            {mark}
            {note ? (
              <div className="whitespace-nowrap @max-md:hidden">{note}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Home answers the member's first question: what am I doing, can I get in, how busy is it, where is my pass.
 * The top row is the next booking beside the club and its busyness. Under it: the held spot when there is one, the
 * quick ways to book, today's bookings, and the few things that need the member.
 */
export default function TodayPage() {
  const { s, me, hh, prefs, club, now } = useApp()
  const router = useRouter()
  const offline = useOffline()
  const household = Object.values(s.members).filter(
    (m) => m.householdId === hh.id
  )
  const canSeeAll = me.role !== "teen" && household.length > 1
  const [who, setWho] = useState<"me" | "household">(
    canSeeAll ? "household" : "me"
  )
  const today = dayStart(now)
  const ids =
    who === "household" && canSeeAll ? household.map((m) => m.id) : [me.id]

  // Two children in the same kids club block are one row.
  const group = (list: Booking[]) => {
    const out: Item[] = []
    for (const b of list) {
      const prev = out.find(
        (o) =>
          o.kind === "kids" &&
          b.kind === "kids" &&
          o.start === b.start &&
          o.ref === b.ref
      )
      if (prev)
        prev.names = `${prev.names} and ${s.members[b.memberId].firstName}`
      else
        out.push({
          ...b,
          names:
            b.kind === "kids" ? s.members[b.memberId].firstName : undefined,
        })
    }
    return out
  }
  const label = (b: Item) =>
    b.kind === "kids" ? `Kids club, ${b.names}` : b.title

  const agenda = group(
    s.bookings
      .filter(
        (b) =>
          ids.includes(b.memberId) &&
          ["booked", "held"].includes(b.status) &&
          dayStart(b.start) === today &&
          b.end > now - 2 * HOUR
      )
      .sort((a, b) => a.start - b.start)
  )
  const next = group(
    s.bookings
      .filter(
        (b) => ids.includes(b.memberId) && b.status === "booked" && b.end > now
      )
      .sort((a, b) => a.start - b.start)
  )[0]
  const held = s.bookings.find(
    (b) =>
      b.memberId === me.id &&
      b.status === "held" &&
      (b.holdExpiresAt ?? 0) > now
  )
  const waitlists = s.bookings.filter(
    (b) => b.memberId === me.id && b.status === "waitlisted" && b.start > now
  )

  const c = CLUB_BY_SLUG[club]
  const open = clubOpen(now)
  const busy = liveBusyness(club, now)
  const wk = weekStart(now)
  const weekCount = s.visits.filter(
    (v) => v.memberId === me.id && v.at >= wk && v.at < wk + 7 * DAY
  ).length
  const openToday = sessionsForDay(club, today).filter(
    (x) => x.start > now && sessionLeft(s, x) > 0
  ).length

  const onTouch = useMedia("(pointer: coarse)")
  const frozen = hh.status === "frozen" && hh.freeze ? hh.freeze : null
  // The Next up card already shows the next booking, so today's list starts after it.
  const later =
    next && !frozen ? agenda.filter((b) => b.id !== next.id) : agenda
  const inProgress = !!next && next.start <= now
  const note = next
    ? cancelNote(s, next.memberId, next.start, now, next.kind)
    : null
  const showPass = () =>
    window.innerWidth >= 1024 ? openDialog("pass") : router.push("/pass")
  // One primary button on the screen. A held spot takes it, because it runs out.
  const lead = held ? "outline" : "primary"
  // The pass is scanned at the front desk from a phone. On a touch device it is the main action of the next booking;
  // on a computer it is not offered at all.
  const passButton = (
    <Button variant={lead} onClick={showPass}>
      <QrCode aria-hidden="true" data-icon="inline-start" />
      Show pass
    </Button>
  )
  const details = (b: Item, variant: "primary" | "outline") => (
    <Button
      variant={variant}
      render={
        <Link
          href={b.sessionId ? `/schedule/${b.sessionId}` : "/bookings"}
          scroll={false}
        />
      }
    >
      Details
    </Button>
  )
  const when = next
    ? inProgress
      ? `On now · ${Math.max(1, Math.round((next.end - now) / MIN))} min left`
      : whenText(next.start, now)
    : ""

  // The few things that wait for the member. The card shows three at most.
  const needs: NeedItem[] = []
  for (const w of waitlists)
    needs.push({
      key: w.id,
      icon: Ticket,
      tone: "primary",
      href: "/bookings",
      title: `On the waitlist for ${w.title}`,
      line: `${fmtDowTime(w.start)} · ${w.position === 2 ? "2nd" : `#${w.position}`} in line`,
    })
  for (const r of s.requests.filter(
    (r) => r.parentId === me.id && r.status === "pending" && r.expiresAt > now
  ))
    needs.push({
      key: r.id,
      icon: MessageSquare,
      tone: "warning",
      href: "/inbox",
      title: `${s.members[r.teenId]?.firstName ?? "Your teen"} asked to join ${r.title.split(",")[0]}`,
      line: `Answer by ${fmtTime(r.expiresAt)} ${dayStart(r.expiresAt) === today ? "today" : fmtDay(r.expiresAt)}`,
    })
  if (prefs.onboardingStep < 6)
    needs.push({
      key: "setup",
      icon: Sparkles,
      tone: "primary",
      href: `/welcome?step=${prefs.onboardingStep}`,
      title: "Finish setting up",
      line: `${plural(Math.max(1, 6 - prefs.onboardingStep), "step")} left`,
    })
  if (
    me.role === "primary" &&
    hh.card.expYear === 26 &&
    hh.status !== "payment_failed"
  ) {
    // "11/26" means nothing out of context: name the card and the month it stops working.
    const brand = hh.card.brand.charAt(0).toUpperCase() + hh.card.brand.slice(1)
    const year = 2000 + hh.card.expYear
    const [month] = monthLabel(Date.UTC(year, hh.card.expMonth - 1, 15)).split(
      " "
    )
    needs.push({
      key: "card",
      icon: CreditCard,
      tone: "warning",
      onSelect: () => openDialog("card"),
      title: `Your ${brand} expires at the end of ${month}${year === parts(now).y ? "" : ` ${year}`}`,
      line: `Ending in ${hh.card.last4} · Update it before your next charge`,
    })
  }
  if (me.role === "primary")
    for (const k of household.filter(
      (m) => m.role === "child" && !m.allergyNotes
    ))
      needs.push({
        key: `al-${k.id}`,
        icon: AlertCircle,
        tone: "warning",
        href: `/family/${k.id}`,
        title: `Add allergy notes for ${k.firstName}`,
        line: "Needed before kids club check-in",
      })

  const idea = useOpenDayPlan()
  // The quick links at the top: the club now, the coming week, the weekly goal and the inbox.
  const weekAhead = s.bookings.filter(
    (b) =>
      ids.includes(b.memberId) &&
      ["booked", "held"].includes(b.status) &&
      b.end > now &&
      b.start < now + 7 * DAY
  )
  const notices = s.notices
    .filter((n) => n.memberId === me.id && !n.readAt)
    .sort((a, b) => b.at - a.at)
  const replies = notices.filter((n) => n.needsAction).length
  const target = prefs.weeklyTarget
  const showGoal = me.role !== "child"
  const showHousehold =
    (me.role === "primary" || me.role === "adult") && household.length > 1

  const nextCard =
    next && !frozen ? (
      <ClassFeature
        booking={next}
        heading="Next up"
        status={when}
        title={label(next)}
        actions={
          <>
            {details(next, onTouch ? "outline" : lead)}
            {onTouch ? passButton : null}
          </>
        }
        note={
          note?.late && !inProgress ? (
            <p className="gap-xxs flex items-center text-warning">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              Changes now count as late
            </p>
          ) : null
        }
      />
    ) : (
      <Card>
        {frozen ? (
          <NextBlock
            heading="Membership"
            title={`Frozen until ${fmtDay(frozen.resume - DAY)}`}
            line={`Starts again on ${fmtDay(frozen.resume)}`}
            actions={
              me.role === "primary" ? (
                <Button variant={lead} render={<Link href="/membership" />}>
                  Resume early
                </Button>
              ) : null
            }
          />
        ) : (
          <NextBlock
            heading="Next up"
            title="Nothing booked"
            line={
              openToday
                ? `${plural(openToday, "class")} with room today at ${c.name}`
                : undefined
            }
            actions={
              <>
                {onTouch ? passButton : null}
                <Button
                  variant={onTouch ? "outline" : lead}
                  render={<Link href="/schedule" />}
                >
                  Book a class
                </Button>
              </>
            }
          />
        )}
      </Card>
    )

  const needsCard = needs.length ? <NeedsCard items={needs} /> : null

  const todayCard = (
    <Card
      display
      title="Today"
      // An empty day says so in the head, under the title, so the body can hold one idea.
      description={
        later.length
          ? later.length < agenda.length
            ? `${later.length} more today`
            : `${plural(later.length, "booking")} today`
          : later.length < agenda.length
            ? "Nothing else on your calendar"
            : "Nothing on your calendar"
      }
      flush
      // The view filter of the list sits in the card's action slot, as a two-option toggle (shadcn CardAction).
      action={
        canSeeAll ? (
          // The theme's tabs: a filled container with the two choices, and a sliding fill behind the selected one.
          <Tabs.Root
            value={who}
            onValueChange={(v) => setWho(v as "me" | "household")}
          >
            <Tabs.List aria-label="Whose bookings">
              <Tabs.Tab value="me">Me</Tabs.Tab>
              <Tabs.Tab value="household">Everyone</Tabs.Tab>
            </Tabs.List>
          </Tabs.Root>
        ) : null
      }
      // The way to the full list is the card's footer (shadcn CardFooter).
      // On an empty day there is no list to see in full, and the idea's Book is the card's one action.
      footer={
        later.length ? (
          <CardFooterLink href="/bookings">All bookings</CardFooterLink>
        ) : undefined
      }
    >
      {later.length ? (
        <ListRows label="Today's bookings">
          {later.map((b) => {
            const se = b.sessionId ? sessionById(b.sessionId) : undefined
            const coach = se ? INSTRUCTOR_BY_ID[se.instructorId]?.name : ""
            const whoName =
              who === "household" && b.kind !== "kids" && b.memberId !== me.id
                ? s.members[b.memberId].firstName
                : ""
            return (
              <ListRow
                key={b.id}
                inset="m"
                href={b.sessionId ? `/schedule/${b.sessionId}` : "/bookings"}
                lead={
                  <TimeLead
                    start={b.start}
                    sub={
                      b.end <= now
                        ? "Done"
                        : b.start <= now
                          ? "On now"
                          : `${Math.round((b.end - b.start) / MIN)} min`
                    }
                  />
                }
                quiet={b.end <= now}
                mark={<CategoryMark category={b.category} />}
                title={label(b)}
                line={[b.place, coach, whoName].filter(Boolean).join(" · ")}
                end={
                  b.status === "held" ? (
                    <StatusPill
                      tone="warning"
                      icon={Clock3}
                      className={PILL_ICON}
                    >
                      Held
                    </StatusPill>
                  ) : (
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )
                }
              />
            )
          })}
        </ListRows>
      ) : (
        <div className="px-m pb-m pt-xs text-body-m sm:text-body-s">
          <OpenDay />
        </div>
      )}
    </Card>
  )

  return (
    <AppPage
      fill
      title={`Hi, ${me.firstName}`}
      meta={
        <p className="text-body-m whitespace-nowrap text-muted-foreground sm:text-body-s">
          {fmtDay(now)}
        </p>
      }
    >
      {/* Prompts: each card states what is waiting and opens the place to act on it. */}
      <div className="@container">
        {/* Two by two until the row holds four. With three, the last one takes the full row. */}
        <ul className="gap-xs @lg:gap-s grid grid-cols-2 @3xl:grid-cols-4 @max-3xl:[&>li:last-child:nth-child(odd)]:col-span-2">
          <li className="flex min-w-0 flex-col">
            <QuickCard
              night
              href={`/clubs/${club}`}
              icon={MapPin}
              title={
                !open.open
                  ? `${c.name} is closed`
                  : offline
                    ? `${c.name} is open`
                    : `${BUSY_WORDS[busy.level]} at ${c.name}`
              }
              action="Plan your visit"
            />
          </li>
          <li className="flex min-w-0 flex-col">
            <QuickCard
              href="/bookings"
              icon={CalendarCheck}
              title={
                weekAhead.length
                  ? `${plural(weekAhead.length, "booking")} this week`
                  : "Nothing booked yet"
              }
              action={weekAhead.length ? "Manage bookings" : "Book something"}
            />
          </li>
          {showGoal ? (
            <li className="flex min-w-0 flex-col">
              <QuickCard
                href={weekCount >= target ? "/progress" : "/schedule"}
                icon={Flame}
                title={
                  weekCount >= target
                    ? "Weekly goal met"
                    : `${plural(target - weekCount, "visit")} to your goal`
                }
                action={
                  weekCount >= target ? "See your progress" : "Book a class"
                }
              />
            </li>
          ) : null}
          <li className="flex min-w-0 flex-col">
            <QuickCard
              href="/inbox"
              icon={Inbox}
              title={
                replies
                  ? `${plural(replies, "message")} ${replies === 1 ? "needs" : "need"} you`
                  : notices.length
                    ? `${notices.length} new in your inbox`
                    : "You're all caught up"
              }
              action={replies ? "Reply now" : "Open inbox"}
            />
          </li>
        </ul>
      </div>

      <Collapse show={!!held}>
        {held ? (
          <HeldSpot
            booking={held}
            day={dayStart(held.start) === today ? "Today" : fmtDay(held.start)}
            left={
              <StatusPill tone="warning" icon={Clock3} className={PILL_ICON}>
                <span className="tabular">
                  {fmtCountdown((held.holdExpiresAt ?? 0) - now)}
                </span>{" "}
                left
              </StatusPill>
            }
            actions={
              <>
                <Button
                  size="sm"
                  aria-label={`Confirm spot, ${Math.ceil(((held.holdExpiresAt ?? 0) - now) / MIN)} minutes left`}
                  onClick={() => {
                    const r = confirmHold(held.id)
                    if (r.ok) announce("Spot confirmed. You're booked.")
                  }}
                >
                  Confirm spot
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => releaseHold(held.id)}
                >
                  Release
                </Button>
              </>
            }
          />
        ) : null}
      </Collapse>

      <Pair
        left={nextCard}
        right={needsCard ?? (showGoal ? <StreakCard /> : undefined)}
      />

      <BookCard exclude={later.length ? undefined : idea?.session} />

      <Pair
        left={todayCard}
        right={needsCard && showGoal ? <StreakCard /> : undefined}
      />

      {showHousehold ? <HouseholdCard /> : null}
    </AppPage>
  )
}
