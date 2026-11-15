"use client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { AddToCalendar } from "@/components/booking/calendar-menu"
import { CancelDialog } from "@/components/booking/cancel-dialog"
import {
  CategoryMark,
  ListCount,
  ListRow,
  ListRows,
  ListSection,
  PILL_ICON,
  TimeLead,
} from "@/components/booking/parts"
import { calEventFor } from "@/components/booking/session-action"
import { CalendarDays, Check, Clock3 } from "@/components/icons"
import {
  AppPage,
  Card,
  Facts,
  Panel,
  PanelEmpty,
  Split,
  TabButtons,
  Toolbar,
} from "@/components/kit/app"
import {
  Banner,
  EmptyState,
  LateCancelMeter,
  Segmented,
  SelectBox,
  StatusPill,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import {
  confirmHold,
  leaveWaitlist,
  rejoinWaitlist,
  releaseHold,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById } from "@/lib/data/sessions"
import { activeStrikes, pausedUntil } from "@/lib/engine"
import {
  DAY,
  dayStart,
  fmtCountdown,
  fmtDay,
  fmtDayShort,
  fmtRange,
  fmtTime,
  HOUR,
  relDay,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const KIND: Record<Booking["kind"], string> = {
  class: "Class",
  court: "Court",
  lane: "Lane",
  kids: "Kids club",
  pt: "Training",
}

function evFor(b: Booking) {
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  if (se) return calEventFor(se)
  const club = CLUB_BY_SLUG[b.clubSlug]
  return {
    title: b.title,
    start: b.start,
    end: b.end,
    uid: b.id,
    location: `${club.name}, ${club.address}`,
    description: `${b.place}. Arizona time (no daylight saving).`,
  }
}

type Item = { b: Booking; group?: Booking[] }

/**
 * The pill for an upcoming booking. With `hidePlain`, a plain booking shows no pill: the Upcoming tab and the panel
 * already say it is booked, so only the states that differ (held, waitlist, waiting for a parent) stand out.
 */
function StatusOf({
  b,
  hidePlain,
  className,
}: {
  b: Booking
  hidePlain?: boolean
  className?: string
}) {
  return b.status === "held" ? (
    <StatusPill
      tone="warning"
      icon={Clock3}
      className={cn(PILL_ICON, className)}
    >
      Spot held
    </StatusPill>
  ) : b.status === "waitlisted" ? (
    <StatusPill tone="info" className={className}>
      Waitlist {b.position === 2 ? "2nd" : `#${b.position}`}
    </StatusPill>
  ) : b.status === "pending_approval" ? (
    <StatusPill tone="info" className={className}>
      Waiting for a parent
    </StatusPill>
  ) : hidePlain ? null : (
    <StatusPill
      tone="success"
      icon={Check}
      className={cn(PILL_ICON, className)}
    >
      Booked
    </StatusPill>
  )
}

/** The pill for a booking that is over: attended, missed, or cancelled. */
function PastStatus({ b, className }: { b: Booking; className?: string }) {
  const attended = b.status === "attended"
  return (
    <StatusPill
      className={cn(attended && PILL_ICON, className)}
      tone={
        attended
          ? "success"
          : b.status === "late_cancelled" || b.status === "no_show"
            ? "warning"
            : "neutral"
      }
      icon={attended ? Check : undefined}
    >
      {PAST_LABEL[b.status] ?? "Cancelled"}
    </StatusPill>
  )
}

/**
 * The detail panel for one upcoming booking: the facts, the cancel rule, and every action for its state.
 * A booked row cancels, moves and goes to the calendar. A held spot confirms or releases. A waitlist spot leaves.
 */
function BookingPanel({
  item,
  now,
  showWho,
  onClose,
  onCancel,
}: {
  item: Item
  now: number
  showWho: boolean
  onClose: () => void
  onCancel: (b: Booking) => void
}) {
  const { s } = useApp()
  const router = useRouter()
  const offline = useOffline()
  const { b, group } = item
  const club = CLUB_BY_SLUG[b.clubSlug]
  const se = b.sessionId ? sessionById(b.sessionId) : undefined
  const names = (group ?? [b])
    .map((g) => s.members[g.memberId].firstName)
    .join(" and ")
  const late = b.start - now < 2 * HOUR
  const held = b.status === "held" ? (b.holdExpiresAt ?? 0) - now : 0
  const active = b.status === "booked" || b.status === "pending_approval"
  const canMove =
    active && (b.kind === "court" || b.kind === "lane" || b.kind === "pt")
  const rule =
    b.status === "waitlisted"
      ? `The waitlist moves up until ${fmtTime(b.start - HOUR)}.`
      : b.status === "held"
        ? "Confirm in time or the spot goes to the next person."
        : b.kind === "kids"
          ? "Free to cancel. Please give 2 hours' notice."
          : late
            ? "Cancelling now counts as a late cancel."
            : `Free to cancel until ${fmtTime(b.start - (b.kind === "pt" ? 24 : 2) * HOUR)}.`
  return (
    <Panel
      title={b.kind === "kids" ? `Kids club, ${names}` : b.title}
      line={
        <span className="tabular">
          {KIND[b.kind]} · Reference {b.ref}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          {/* A held spot is the one case with a primary action. For every other state the actions are outlines. */}
          {b.status === "held" ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  const r = confirmHold(b.id)
                  if (r.ok) {
                    toast({ title: `Spot confirmed: ${b.title}` })
                    announce("Spot confirmed.")
                  } else toast({ type: "error", title: r.message })
                }}
              >
                Confirm spot ·{" "}
                <span className="tabular">{fmtCountdown(held)}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  releaseHold(b.id)
                  toast({ title: `Released: ${b.title}` })
                }}
              >
                Release
              </Button>
            </>
          ) : null}
          <div className="gap-xs grid grid-cols-2">
            {canMove ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    b.kind === "pt"
                      ? `/training/coaches/${b.coachSlug}/book?move=${b.id}`
                      : `/reserve/${b.kind === "court" ? "courts" : "lanes"}?club=${b.clubSlug}&move=${b.id}`
                  )
                }
              >
                Move
              </Button>
            ) : null}
            {active ? (
              <AddToCalendar
                event={evFor(b)}
                variant="outline"
                className="!min-h-7 !px-s !py-xxs max-sm:!min-h-11"
              />
            ) : null}
            <Button
              size="sm"
              variant="outline"
              render={
                se ? (
                  <Link href={`/schedule/${se.id}`} scroll={false} />
                ) : (
                  <Link href={`/clubs/${b.clubSlug}`} />
                )
              }
            >
              {se ? "Class details" : "Club details"}
            </Button>
            {b.status === "waitlisted" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  leaveWaitlist(b.id)
                  toast({
                    title: "You left the waitlist",
                    action: {
                      label: "Undo",
                      onClick: () => rejoinWaitlist(b.id),
                    },
                  })
                }}
              >
                Leave waitlist
              </Button>
            ) : null}
            {active ? (
              <Button
                size="sm"
                variant="outline"
                className="!text-destructive"
                disabled={offline}
                onClick={() => onCancel(b)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </>
      }
    >
      <StatusOf b={b} hidePlain />
      <Facts
        items={[
          {
            label: "When",
            value: (
              <span className="tabular">
                {fmtDay(b.start)} · {fmtRange(b.start, b.end)}
              </span>
            ),
            hint:
              b.kind === "kids"
                ? "2 h"
                : `${Math.round((b.end - b.start) / 60000)} min`,
          },
          {
            label: "Where",
            value: club.name,
            hint: (
              <>
                {se
                  ? `${se.studio} · ${INSTRUCTOR_BY_ID[se.instructorId]?.name}`
                  : b.place === club.name
                    ? null
                    : b.place.replace(`${club.name} · `, "")}
                <span className="block">{club.address}</span>
              </>
            ),
          },
          ...(b.spot
            ? [
                {
                  label: "Spot",
                  value: <span className="tabular">{b.spot}</span>,
                },
              ]
            : []),
          ...(b.resource
            ? [
                {
                  label: KIND[b.kind],
                  value: <span className="tabular">{b.resource}</span>,
                },
              ]
            : []),
          // A kids club title already names the children, so the Who fact would repeat it.
          ...(showWho && b.kind !== "kids"
            ? [{ label: "Who", value: names }]
            : []),
          ...(b.players?.length
            ? [
                {
                  label: "Players",
                  value: (
                    <ul>
                      {b.players.map((p) => (
                        <li key={p.name}>
                          {p.name}
                          {" · "}
                          {p.status === "confirmed"
                            ? "confirmed"
                            : p.status === "guest"
                              ? "guest pass"
                              : "invited"}
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]
            : []),
        ]}
      />
      <p className="text-pretty text-muted-foreground">{rule}</p>
    </Panel>
  )
}

const PAST_LABEL: Partial<Record<Booking["status"], string>> = {
  attended: "Attended",
  late_cancelled: "Late cancel",
  no_show: "Missed",
  cancelled: "Cancelled",
}

/**
 * Bookings: what is coming, as bare rows under a heading for each day with a detail panel beside the list, and what
 * is past. Two tabs.
 * Waitlists and held spots are in the same list as bookings, in time order, because a member reads them as
 * "my week". The late-cancel count shows only when the member has one.
 */
function Inner() {
  const { s, me, hh, now } = useApp()
  const sp = useSearchParams()
  const router = useRouter()
  const wide = useMedia("(min-width: 1024px)")
  // `undefined` is the default selection (the first booking on desktop). `null` is a closed panel.
  const [sel, setSel] = useState<string | null | undefined>(undefined)
  const [cancelFor, setCancelFor] = useState<Booking | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pastFilter, setPastFilter] = useState<
    "all" | "attended" | "cancelled"
  >("all")
  const [pastN, setPastN] = useState(10)
  const who = sp.get("who") ?? "all"
  const tab = sp.get("tab") === "past" ? "past" : "upcoming"
  const go = (next: { who?: string; tab?: string }) => {
    const p = new URLSearchParams()
    const w = next.who ?? who
    const t = next.tab ?? tab
    if (w !== "all") p.set("who", w)
    if (t === "past") p.set("tab", "past")
    router.replace(`/bookings${p.size ? `?${p}` : ""}`, { scroll: false })
  }
  const household = Object.values(s.members).filter(
    (m) => m.householdId === hh.id
  )
  const ids =
    me.role === "teen"
      ? [me.id]
      : who === "all"
        ? household.map((m) => m.id)
        : [who]
  const mine = s.bookings.filter((b) => ids.includes(b.memberId))
  // Two children in the same kids club block are one row.
  const group = (list: Booking[]) => {
    const out: { b: Booking; group?: Booking[] }[] = []
    for (const b of list) {
      if (b.kind === "kids") {
        const prev = out.find(
          (o) =>
            o.b.kind === "kids" &&
            o.b.ref === b.ref &&
            o.b.start === b.start &&
            o.b.status === b.status
        )
        if (prev?.group) {
          prev.group.push(b)
          continue
        }
        out.push({ b, group: [b] })
      } else out.push({ b })
    }
    return out
  }
  const upcoming = group(
    mine
      .filter(
        (b) =>
          (["booked", "held", "pending_approval"].includes(b.status) &&
            b.end > now) ||
          (b.status === "waitlisted" && b.start > now)
      )
      .sort((a, b) => a.start - b.start)
  )
  const pastAll = mine
    .filter(
      (b) =>
        ["attended", "late_cancelled", "cancelled", "no_show"].includes(
          b.status
        ) ||
        (b.status === "booked" && b.end <= now)
    )
    .sort((a, b) => b.start - a.start)
  const past = pastAll.filter(
    (b) =>
      pastFilter === "all" ||
      (pastFilter === "attended"
        ? b.status === "attended"
        : b.status !== "attended")
  )
  const byDay = upcoming.reduce<Record<number, typeof upcoming>>((acc, r) => {
    const day = dayStart(r.b.start)
    acc[day] ??= []
    acc[day].push(r)
    return acc
  }, {})
  const strikes = activeStrikes(s, me.id, now)
  const pu = pausedUntil(s, me.id, now)
  const requests =
    me.role === "teen"
      ? s.requests.filter((r) => r.teenId === me.id && r.status === "pending")
      : []
  const dayTitle = (d: number) => {
    const rel = relDay(d, now)
    return rel === "Today" || rel === "Tomorrow"
      ? `${rel}, ${fmtDay(d).split(", ")[1]}`
      : fmtDay(d)
  }
  // A cancelled or confirmed booking leaves the list, so a stale selection falls back to the default.
  const picked = sel ? upcoming.find((r) => r.b.id === sel) : undefined
  const current = picked ?? (sel !== null && wide ? upcoming[0] : undefined)
  const showWho = me.role !== "teen" && household.length > 1
  const whoOptions = [
    { value: "all", label: "Everyone" },
    ...household.map((m) => ({ value: m.id, label: m.firstName })),
  ]
  const meter = strikes.length ? (
    <Card tone="plain" as="div">
      <div className="gap-x-m gap-y-xs flex flex-wrap items-center text-body-m sm:text-body-s">
        <LateCancelMeter count={strikes.length} />
        <p className="tabular min-w-0 flex-1 basis-60 text-muted-foreground">
          {strikes.length} of 3 late cancels in the last 30 days. Clears{" "}
          {fmtDayShort(strikes[0].at + 30 * DAY)}.{" "}
          <Link href="/help" className="text-link">
            How it works
          </Link>
        </p>
      </div>
    </Card>
  ) : null
  const pastShown = Math.min(pastN, past.length)
  return (
    <AppPage
      title="Bookings"
      actions={
        <Button size="sm" render={<Link href="/schedule" />}>
          Book
        </Button>
      }
      tabs={
        <TabButtons
          label="Bookings"
          value={tab}
          onChange={(t) => go({ tab: t })}
          items={[
            { value: "upcoming", label: "Upcoming", count: upcoming.length },
            { value: "past", label: "Past" },
          ]}
        />
      }
    >
      {showWho || tab === "past" ? (
        <Toolbar
          end={
            tab === "past" ? (
              <Segmented
                label="Show"
                size="sm"
                value={pastFilter}
                onChange={setPastFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "attended", label: "Attended" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            ) : undefined
          }
        >
          {/* Everyone plus up to two people fit a segmented toggle at 375 px. A larger household keeps the select. */}
          {showWho && whoOptions.length <= 3 ? (
            <Segmented
              label="Whose bookings"
              size="sm"
              value={who}
              onChange={(v) => go({ who: v })}
              options={whoOptions}
            />
          ) : showWho ? (
            <SelectBox
              label="Who"
              value={who}
              onChange={(v) => go({ who: v })}
              options={whoOptions}
            />
          ) : null}
        </Toolbar>
      ) : null}

      {pu ? (
        <Banner tone="warning" title={`Booking is paused until ${fmtDay(pu)}`}>
          You can still cancel and check in.
        </Banner>
      ) : null}

      <div
        id="bookings-panel"
        role="tabpanel"
        aria-label={tab === "past" ? "Past" : "Upcoming"}
        className="gap-m flex flex-col"
      >
        {tab === "upcoming" ? (
          <>
            {requests.length ? (
              <ListSection title="Requests">
                <ListRows label="Requests">
                  {requests.map((r) => (
                    <ListRow
                      key={r.id}
                      title={r.title}
                      end={
                        <StatusPill tone="info">
                          Waiting for {s.members[r.parentId].firstName}
                        </StatusPill>
                      }
                    />
                  ))}
                </ListRows>
              </ListSection>
            ) : null}
            {upcoming.length ? (
              <Split
                label="Booking details"
                open={!!current}
                onClose={() => setSel(null)}
                empty={
                  <PanelEmpty icon={CalendarDays}>Select a booking</PanelEmpty>
                }
                panel={
                  current ? (
                    <BookingPanel
                      key={current.b.id}
                      item={current}
                      now={now}
                      showWho={showWho}
                      onClose={() => setSel(null)}
                      onCancel={(b) => {
                        setCancelFor(b)
                        setCancelOpen(true)
                      }}
                    />
                  ) : null
                }
              >
                {/* The list sits on the sheet: a small heading for each day, then bare rows. */}
                {Object.entries(byDay).map(([d, rows]) => (
                  <ListSection key={d} title={dayTitle(Number(d))}>
                    <ListRows>
                      {rows.map(({ b, group: g }) => {
                        const person = s.members[b.memberId]
                        const club = CLUB_BY_SLUG[b.clubSlug]
                        const names = g
                          ?.map((x) => s.members[x.memberId].firstName)
                          .join(" and ")
                        return (
                          <ListRow
                            key={b.id}
                            mark={<CategoryMark category={b.category} />}
                            lead={
                              <TimeLead
                                start={b.start}
                                sub={
                                  b.kind === "kids"
                                    ? "2 h"
                                    : `${Math.round((b.end - b.start) / 60000)} min`
                                }
                              />
                            }
                            title={
                              b.kind === "kids"
                                ? `Kids club, ${names ?? person.firstName}`
                                : b.title
                            }
                            line={[
                              b.kind === "class" || b.kind === "kids"
                                ? ""
                                : KIND[b.kind],
                              // A court, lane or training booking already names the club as its place.
                              b.kind === "kids" || b.place === club.name
                                ? ""
                                : b.place.replace(`${club.name} · `, ""),
                              club.name,
                              showWho && b.kind !== "kids"
                                ? person.firstName
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            end={<StatusOf b={b} hidePlain />}
                            onSelect={() => setSel(b.id)}
                            selected={current?.b.id === b.id}
                          />
                        )
                      })}
                    </ListRows>
                  </ListSection>
                ))}
                {meter}
              </Split>
            ) : (
              <>
                <EmptyState
                  object="schedule"
                  title="Nothing booked"
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href="/schedule" />}
                    >
                      Book a class
                    </Button>
                  }
                />
                {meter}
              </>
            )}
          </>
        ) : pastAll.length ? (
          past.length ? (
            <>
              <ListRows label="Past bookings" className="rule-b">
                {past.slice(0, pastN).map((b) => {
                  const fb =
                    b.status === "attended" &&
                    !b.feedbackDone &&
                    now - b.end < 7 * DAY &&
                    b.kind === "class"
                  return (
                    <ListRow
                      key={b.id}
                      mark={<CategoryMark category={b.category} />}
                      lead={
                        <p className="tabular font-heavy whitespace-nowrap">
                          {fmtDayShort(b.start)}
                        </p>
                      }
                      title={
                        b.kind === "kids"
                          ? `Kids club, ${s.members[b.memberId].firstName}`
                          : b.title
                      }
                      line={
                        <span className="tabular">
                          {fmtRange(b.start, b.end)} · {b.place}
                          <span className="sm:hidden">
                            {" "}
                            · {PAST_LABEL[b.status] ?? "Cancelled"}
                          </span>
                        </span>
                      }
                      end={
                        <>
                          <PastStatus b={b} className="max-sm:hidden" />
                          {fb ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDialog("feedback", b.id)}
                            >
                              Give feedback
                            </Button>
                          ) : null}
                          {b.sessionId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className={fb ? "max-sm:hidden" : undefined}
                              render={
                                <Link
                                  href={`/schedule?series=${b.sessionId.split("~")[3]}&club=${b.clubSlug}`}
                                />
                              }
                            >
                              Book again
                            </Button>
                          ) : null}
                        </>
                      }
                    />
                  )
                })}
              </ListRows>
              <div className="gap-s flex flex-col items-center">
                <ListCount>
                  Viewing 1–{pastShown} of {past.length}
                </ListCount>
                {past.length > pastN ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPastN((n) => n + 10)}
                  >
                    Show 10 more
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              title="No past bookings match"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPastFilter("all")}
                >
                  Show all
                </Button>
              }
            />
          )
        ) : (
          <EmptyState object="heart-watch" title="No past bookings yet" />
        )}
      </div>
      {cancelFor ? (
        <CancelDialog
          booking={cancelFor}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      ) : null}
    </AppPage>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
