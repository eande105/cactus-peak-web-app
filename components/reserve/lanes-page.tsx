"use client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { FilterBar } from "@/components/book/filter-bar"
import { SuccessPanel } from "@/components/booking/success-panel"
import { Card, Facts, Panel, PanelEmpty, Split } from "@/components/kit/app"
import {
  Banner,
  FormField,
  LoadingBlock,
  SelectBox,
  SwitchRow,
} from "@/components/kit/ui"
import { BookingList } from "@/components/reserve/booking-list"
import {
  NoticeCount,
  NoticeTile,
  ReserveNotice,
  soonerPlan,
} from "@/components/reserve/empty"
import {
  CancelLine,
  PanelError,
  QuietLine,
  SlotLegend,
} from "@/components/reserve/parts"
import {
  type CellInfo,
  SlotGrid,
  SlotList,
} from "@/components/reserve/slot-grid"
import { DayStrip } from "@/components/schedule/day-strip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMedia } from "@/hooks/use-media"
import {
  addRemind,
  cancelBooking,
  moveReservation,
  reserveLane,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import { useEmptyPreview } from "@/lib/empty-preview"
import {
  cancelNote,
  gridSlots,
  laneSwimmers,
  pausedUntil,
  windowDays,
} from "@/lib/engine"
import {
  addDays,
  dateKey,
  dayStart,
  fmtDay,
  fmtDayLong,
  fmtDowTime,
  fmtRange,
  fmtTime,
  fromKey,
  HOUR,
  MIN,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"

function Inner() {
  const { s, me, hh, now, club: viewing } = useApp()
  // TEMPORARY design review switch (lib/empty-preview.ts).
  const preview = useEmptyPreview()
  const router = useRouter()
  const sp = useSearchParams()
  const wide = useMedia("(min-width: 1024px)")
  const offline = useOffline()
  const [loading, setLoading] = useState(false)
  const pools = CLUBS.filter((c) => c.pool)
  const clubSlug =
    sp.get("club") ?? (CLUB_BY_SLUG[viewing].pool ? viewing : pools[0].slug)
  const club = CLUB_BY_SLUG[clubSlug]
  const today = dayStart(now)
  const date = sp.get("date") ? fromKey(sp.get("date")!) : today
  const moveId = sp.get("move")
  const moving = moveId ? s.bookings.find((b) => b.id === moveId) : undefined
  const [any, setAny] = useState(true)
  const [sel, setSel] = useState<{ row: number; slot: number } | null>(null)
  const [partner, setPartner] = useState("")
  const [done, setDone] = useState<Booking | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: clubSlug restarts the fake load delay when the club changes
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 280)
    return () => clearTimeout(t)
  }, [clubSlug])
  const setParam = (p: Record<string, string>) => {
    const q = new URLSearchParams(sp)
    Object.entries(p).forEach(([k, v]) => {
      if (v) q.set(k, v)
      else q.delete(k)
    })
    router.replace(`/reserve/lanes?${q}`, { scroll: false })
    setSel(null)
  }
  const lanes = club.pool?.lanes ?? 0
  const rows = Array.from({ length: lanes }, (_, i) => ({
    id: i + 1,
    label: `Lane ${i + 1}`,
  }))
  const slots = gridSlots(date, "lane").filter((x) => x + 45 * MIN > now)
  const win = windowDays(hh.plan)
  const opens = dayStart(date) - win * 86400000 + 6 * HOUR
  const sooner = now < opens ? soonerPlan(hh.plan, date, now) : undefined
  const notOpen = now < opens
  const info = (lane: number, slot: number): CellInfo => {
    if (slot < now) return { status: "past" }
    const { swimmers, mine } = laneSwimmers(s, clubSlug, lane, slot)
    if (mine) return { status: "mine", swimmers }
    if (swimmers >= 2) return { status: "full", swimmers }
    return { status: "open", swimmers }
  }
  const pickAny = (slot: number) => {
    const opts = rows
      .map((r) => ({ r, i: info(r.id, slot) }))
      .filter((x) => x.i.status === "open")
    if (!opts.length)
      return toast({
        type: "info",
        title: `All ${lanes} lanes are taken at ${fmtTime(slot)}`,
      })
    const best = opts.sort(
      (a, b) => (b.i.swimmers ?? 0) - (a.i.swimmers ?? 0) || a.r.id - b.r.id
    )[0]
    setError("")
    setSel({ row: best.r.id, slot })
    announce(`Lane ${best.r.id} selected at ${fmtTime(slot)}`)
  }
  const sw = sel ? laneSwimmers(s, clubSlug, sel.row, sel.slot).swimmers : 0
  const reserve = async () => {
    if (!sel) return
    if (me.role === "teen" && !(me.permissions?.lanes && me.age >= 14)) {
      openDialog("askParent", {
        title: `Lane ${sel.row}, ${fmtDowTime(sel.slot)} at ${club.name}`,
      })
      return
    }
    setBusy(true)
    await new Promise((r) => setTimeout(r, 400))
    if (moving) {
      const r = moveReservation(moving.id, {
        start: sel.slot,
        resource: `Lane ${sel.row}`,
      })
      setBusy(false)
      if (r.ok) {
        toast({
          title: `Moved to Lane ${sel.row}`,
          description: fmtDowTime(sel.slot),
        })
        router.push("/bookings")
      } else setError(r.message)
      return
    }
    const r = reserveLane({
      clubSlug,
      lane: sel.row,
      start: sel.slot,
      partnerName: partner.trim() || undefined,
    })
    setBusy(false)
    if (r.ok) {
      setDone(r.booking)
      announce(`Lane ${sel.row} is yours, ${fmtDowTime(sel.slot)}`)
      toast({
        title: `Lane ${sel.row} is yours, ${fmtDowTime(sel.slot)}`,
        action: {
          label: "Undo",
          onClick: () => {
            cancelBooking(r.booking.id, { undoWindow: true })
            setDone(null)
            setSel(null)
          },
        },
      })
    } else {
      setError(r.message)
      setSel(null)
      toast({ type: "error", title: r.message })
    }
  }
  const noneAtAll =
    !notOpen &&
    !loading &&
    slots
      .filter((x) => x > now)
      .every((x) => rows.every((r) => info(r.id, x).status !== "open"))
  const waiting =
    me.role === "teen"
      ? s.requests.find(
          (r) =>
            r.teenId === me.id &&
            r.status === "pending" &&
            r.title.startsWith("Lane")
        )
      : undefined
  const needsParent =
    me.role === "teen" && !(me.permissions?.lanes && me.age >= 14)
  const parentName = me.parentId
    ? s.members[me.parentId].firstName
    : "your parent"
  const pu = pausedUntil(s, me.id, now)
  const pick = (r: number, sl: number) => {
    setError("")
    setSel({ row: r, slot: sl })
    announce(`Lane ${r} selected, ${fmtTime(sl)}`)
  }
  const clear = () => setSel(null)
  if (done)
    return (
      <BookPage>
        <div className="max-w-xl">
          <SuccessPanel
            pill="Reserved"
            headline={done.resource ?? "Lap lane"}
            summary={[
              {
                label: "When",
                value: `${fmtDay(done.start)} · ${fmtRange(done.start, done.end)}`,
              },
              { label: "Where", value: `${club.name} · ${club.pool?.label}` },
              { label: "Reference", value: done.ref },
            ]}
            event={{
              title: `Lap lane, ${done.resource}`,
              start: done.start,
              end: done.end,
              location: club.address,
            }}
            shareText="https://my.cactuspeakathletic.example/lane"
            onDone={() => {
              setDone(null)
              setSel(null)
            }}
            extra={
              <CancelLine
                note={cancelNote(s, me.id, done.start, now, "lane")}
              />
            }
          />
        </div>
      </BookPage>
    )
  if (!club.pool) return null
  // The household's coming lane reservations, at every club.
  const upcoming = s.bookings.filter(
    (b) =>
      b.kind === "lane" &&
      b.status === "booked" &&
      b.end > now &&
      s.members[b.memberId].householdId === hh.id
  )
  const note = sel ? cancelNote(s, me.id, sel.slot, now, "lane") : null
  const panel = sel ? (
    <Panel
      title={moving ? "Move your lane" : "Reserve a lane"}
      onClose={clear}
      footer={
        <>
          <PanelError>{error}</PanelError>
          <Button
            className="w-full"
            disabled={offline || !!pu || !!waiting}
            loading={busy}
            onClick={() => void reserve()}
          >
            {waiting
              ? `Waiting for ${parentName}`
              : needsParent
                ? `Ask ${parentName}`
                : moving
                  ? "Move lane"
                  : "Reserve lane"}
          </Button>
          {waiting ? null : (
            <Button className="w-full" variant="ghost" onClick={clear}>
              Clear
            </Button>
          )}
        </>
      }
    >
      <Facts
        items={[
          {
            label: "Lane",
            value: `Lane ${sel.row}`,
            hint: sw === 1 ? "1 swimmer already" : "Empty lane",
          },
          { label: "Day", value: fmtDay(sel.slot) },
          {
            label: "Time",
            value: (
              <span className="tabular">
                {fmtRange(sel.slot, sel.slot + 45 * MIN)}
              </span>
            ),
          },
          { label: "Duration", value: <span className="tabular">45 min</span> },
          { label: "Club", value: club.name, hint: club.pool.label },
        ]}
      />
      {needsParent || moving ? null : (
        <FormField label="Lane partner (optional)" help="Uses the 2nd place.">
          {(f) => (
            <Input
              {...f}
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="Partner's name"
            />
          )}
        </FormField>
      )}
      {needsParent ? (
        <QuietLine>Lanes need {parentName}&apos;s OK.</QuietLine>
      ) : note ? (
        <CancelLine note={note} />
      ) : null}
    </Panel>
  ) : null
  // The quiet line under a lane name: how many start times are still open on this day.
  const openLine = (lane: number) => {
    const open = slots.filter((x) => info(lane, x).status === "open").length
    return open ? `${open} open` : "Full"
  }
  return (
    <BookPage>
      {moving ? (
        <Banner
          tone="neutral"
          title={`Moving ${moving.resource}: ${fmtDay(moving.start)}, ${fmtRange(moving.start, moving.end)}`}
        />
      ) : null}
      {pu ? (
        <Banner tone="warning" title={`Booking is paused until ${fmtDay(pu)}.`}>
          You can still look at lanes.
        </Banner>
      ) : null}
      {waiting ? (
        <Banner
          tone="neutral"
          title={`Waiting for ${parentName}: ${waiting.title}. Held until ${fmtDay(waiting.expiresAt)}, ${fmtTime(waiting.expiresAt)}.`}
        />
      ) : null}
      <Split
        label="Your reservation"
        open={!!sel}
        onClose={clear}
        collapseEmpty
        bp="xl"
        panel={panel}
        empty={
          <PanelEmpty object="wave">
            {offline ? "Reconnect to reserve." : "Pick a lane and a time."}
          </PanelEmpty>
        }
      >
        <div className="gap-s flex flex-col">
          {/* The toolbar every Book tab shares (FilterBar). Lanes have no filters beyond the club, so there is no drawer;
              "Any lane" is a choice of how to pick, shown where the lane grid is. */}
          <FilterBar
            club={(className) => (
              <SelectBox
                label="Club"
                value={clubSlug}
                onChange={(v) => setParam({ club: v })}
                options={pools.map((c) => ({ value: c.slug, label: c.name }))}
                hideLabel
                className={className}
              />
            )}
            quick={
              wide ? (
                <div className="px-xs flex min-h-9 items-center">
                  <SwitchRow checked={any} onChange={setAny}>
                    Any lane
                  </SwitchRow>
                </div>
              ) : null
            }
            day={(stepper) => (
              <DayStrip
                stepper={stepper}
                selected={date}
                onSelect={(d) =>
                  setParam({ date: d === today ? "" : dateKey(d) })
                }
                now={now}
                windowDays={win}
                label="Choose a day"
              />
            )}
          />
        </div>

        <Card
          id="lane-times"
          tone="bare"
          title={fmtDayLong(date)}
          description={`${club.pool.label} · ${lanes} lanes · 45 min`}
          action={
            <SlotLegend
              items={
                wide
                  ? [
                      { tone: "free", label: "Empty", swimmers: 0 },
                      { tone: "free", label: "1 of 2", swimmers: 1 },
                      { tone: "mine", label: "Yours" },
                      { tone: "taken", label: "Full" },
                      ...(date === today
                        ? [{ tone: "past" as const, label: "Past" }]
                        : []),
                    ]
                  : // The phone chips say "1 of 2" in words, so their key needs only the two looks.
                    [
                      { tone: "free", label: "Open" },
                      { tone: "taken", label: "Full" },
                    ]
              }
              note={
                offline
                  ? "Reconnect to reserve."
                  : any && wide
                    ? "2 swimmers share a lane. With Any lane, pick a time at the top to get the best lane."
                    : "2 swimmers share a lane, in circle swim."
              }
            />
          }
        >
          {loading ? (
            <div className="py-m">
              <LoadingBlock text="Checking availability…" rows={6} />
            </div>
          ) : notOpen || preview === "notopen" ? (
            <ReserveNotice
              className="pt-s"
              art={<NoticeTile id="schedule" />}
              title={`${fmtDay(date)} lanes open ${fmtDay(opens)} at ${fmtTime(opens)}`}
              line={
                sooner
                  ? `On ${sooner.name}, lanes open ${sooner.window} days ahead, so this day is open now.`
                  : "Lane slots open at the same time as classes."
              }
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      addRemind(`lane-${dateKey(date)}`)
                      toast({ title: "We'll remind you" })
                    }}
                  >
                    Remind me
                  </Button>
                  {sooner && me.role === "primary" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href="/membership/change-plan" />}
                    >
                      Compare plans
                    </Button>
                  ) : null}
                </>
              }
            />
          ) : noneAtAll || preview === "full" ? (
            <ReserveNotice
              className="pt-s"
              tone="warning"
              art={
                <NoticeCount
                  id="wave"
                  count={lanes}
                  label={`${lanes} lanes, all taken`}
                />
              }
              title={`All ${lanes} lanes are taken on ${fmtDay(date)}`}
              line="Lap lanes have no waitlist."
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setParam({ date: dateKey(addDays(date, 1)) })}
                >
                  Try the next day
                </Button>
              }
            />
          ) : (
            <div className="gap-s flex flex-col">
              {wide ? (
                <SlotGrid
                  kind="lane"
                  rows={rows.map((r) => ({ ...r, sub: openLine(r.id) }))}
                  slots={slots}
                  info={info}
                  selected={sel}
                  onSelect={pick}
                  onHeaderClick={any ? pickAny : undefined}
                  label="Choose a lane and start time"
                  disabled={offline || !!pu}
                  now={now}
                />
              ) : (
                <SlotList
                  kind="lane"
                  rows={rows}
                  slots={slots.filter(
                    (sl) =>
                      sl > now &&
                      rows.some((r) => info(r.id, sl).status === "open")
                  )}
                  info={info}
                  selected={sel}
                  onSelect={(r, sl) => {
                    setError("")
                    setSel({ row: r, slot: sl })
                  }}
                  label="Choose a lane and start time"
                  disabled={offline || !!pu}
                  className="rule-b"
                />
              )}
            </div>
          )}
        </Card>

        <BookingList
          id="your-lanes"
          label="Your lanes"
          list={upcoming}
          empty="No lane reserved."
        />
      </Split>
    </BookPage>
  )
}
export default function LanesPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
