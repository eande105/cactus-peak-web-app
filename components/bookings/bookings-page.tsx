"use client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { ListCount } from "@/components/booking/parts"
import {
  type Open,
  PastList,
  UpcomingList,
} from "@/components/bookings/booking-list"
import type { Item } from "@/components/bookings/booking-panel"
import { PastSummary } from "@/components/bookings/past"
import { RequestsCard, UpcomingSummary } from "@/components/bookings/upcoming"
import { AppPage, TabButtons } from "@/components/kit/app"
import { Banner, SelectBox } from "@/components/kit/ui"
import { NoticeTile, ReserveNotice } from "@/components/reserve/empty"
import { BookingDrawer, useBookingParam } from "@/components/today/today-drawer"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { activeStrikes, pausedUntil } from "@/lib/engine"
import { fmtDay } from "@/lib/time"
import type { Booking } from "@/lib/types"

type PastFilter = "all" | "attended" | "cancelled"

/**
 * Bookings, in the patterns of the iOS app. Two tabs, Upcoming and Past, each with its stat cards, then the list as
 * cards: a Waitlist card and one card for each day coming up, one card for each month gone by. The filters for the
 * whole page sit in Book's filter well under the tabs.
 * The rows and the details work as on Today: from 768 px a row opens the booking in the drawer and `?booking=<id>`
 * keeps it in the URL; below 768 px a row opens `/bookings/<id>`. An older `?open=<id>` link goes to the same place.
 * Waitlists and held spots are in their own card, because a member reads them as "waiting on a spot".
 */
function Inner() {
  const { s, me, hh, now } = useApp()
  const sp = useSearchParams()
  const router = useRouter()
  const wide = useMedia("(min-width: 768px)")
  const [pastFilter, setPastFilter] = useState<PastFilter>("all")
  const [pastN, setPastN] = useState(10)
  const [sel, select] = useBookingParam()
  // A booking in the URL on a phone (`?booking=` or the older `?open=`) becomes the booking's own page, as there is no
  // drawer there. The width is read here, not from `wide`, which is still the server's answer on the first render.
  const legacy = sp.get("open")
  useEffect(() => {
    const id = legacy ?? sel
    if (!id) return
    if (!window.matchMedia("(min-width: 768px)").matches)
      router.replace(`/bookings/${encodeURIComponent(id)}`)
    else if (legacy) {
      const p = new URLSearchParams(sp.toString())
      p.delete("open")
      p.set("booking", legacy)
      router.replace(`/bookings?${p}`, { scroll: false })
    }
  }, [legacy, sel, sp, router])
  const who = sp.get("who") ?? "all"
  const tab = sp.get("tab") === "past" ? "past" : "upcoming"
  const go = (next: { who?: string; tab?: string }) => {
    const p = new URLSearchParams()
    const w = next.who ?? who
    const t = next.tab ?? tab
    if (w !== "all") p.set("who", w)
    if (t === "past") p.set("tab", "past")
    if (sel) p.set("booking", sel)
    router.replace(`/bookings${p.size ? `?${p}` : ""}`, { scroll: false })
  }
  const open: Open = {
    drawer: wide,
    selectedId: sel,
    onSelect: (id) => select(id),
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
    const out: Item[] = []
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
  const strikes = activeStrikes(s, me.id, now)
  const pu = pausedUntil(s, me.id, now)
  const requests =
    me.role === "teen"
      ? s.requests.filter((r) => r.teenId === me.id && r.status === "pending")
      : []
  const showWho = me.role !== "teen" && household.length > 1
  const pastShown = Math.min(pastN, past.length)

  // The filter well, as Book's: whose bookings for the whole page, and on Past the kind of record.
  const filters =
    showWho || tab === "past" ? (
      <div className="gap-xs p-xs flex flex-wrap items-center corner-m bg-muted/50">
        {showWho ? (
          <SelectBox
            label="Whose bookings"
            hideLabel
            className="min-w-0 flex-none"
            value={who}
            onChange={(v) => go({ who: v })}
            options={[
              { value: "all", label: "Everyone" },
              ...household.map((m) => ({
                value: m.id,
                label: m.id === me.id ? `${m.firstName} (you)` : m.firstName,
              })),
            ]}
          />
        ) : null}
        {tab === "past" ? (
          <SelectBox<PastFilter>
            label="Show"
            hideLabel
            className="min-w-0 flex-none"
            value={pastFilter}
            onChange={(v) => {
              setPastFilter(v)
              setPastN(10)
            }}
            options={[
              { value: "all", label: "All past bookings" },
              { value: "attended", label: "Attended" },
              { value: "cancelled", label: "Cancelled and missed" },
            ]}
          />
        ) : null}
      </div>
    ) : null

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
      {filters}

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
        {tab === "upcoming" && upcoming.length ? (
          <UpcomingSummary
            list={upcoming}
            strikes={strikes}
            yours={showWho}
            onOpen={(id) =>
              wide ? select(id) : router.push(`/bookings/${id}`)
            }
          />
        ) : null}
        {tab === "upcoming" && requests.length ? (
          <RequestsCard requests={requests} />
        ) : null}
        {tab === "past" && pastAll.length ? (
          <PastSummary all={pastAll} strikes={strikes} yours={showWho} />
        ) : null}
        {/* The list fills the width; a booking opens in the drawer from 768 px, as on Today. */}
        <div className="min-w-0">
          {tab === "upcoming" ? (
            upcoming.length ? (
              <UpcomingList
                list={upcoming}
                strikes={strikes.length}
                oneMember={ids.length === 1}
                household={ids.length > 1}
                open={open}
                who={(id) => s.members[id].firstName}
              />
            ) : (
              <ReserveNotice
                art={<NoticeTile id="schedule" />}
                title="Nothing booked"
                line={
                  strikes.length
                    ? `${strikes.length} of 3 late cancels in the last 30 days.`
                    : undefined
                }
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href="/schedule" />}
                  >
                    Book a class
                  </Button>
                }
              />
            )
          ) : pastAll.length ? (
            past.length ? (
              <div className="gap-m flex flex-col">
                <PastList
                  list={past.slice(0, pastN)}
                  household={ids.length > 1}
                  open={open}
                />
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
              </div>
            ) : (
              <ReserveNotice
                art={<NoticeTile id="mat" />}
                title="No past bookings match"
                actions={
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
            <ReserveNotice
              art={<NoticeTile id="heart-watch" />}
              title="No past bookings yet"
            />
          )}
        </div>
      </div>
      {wide ? <BookingDrawer id={sel} onChange={select} /> : null}
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
