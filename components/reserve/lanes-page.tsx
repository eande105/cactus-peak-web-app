"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { SuccessPanel } from "@/components/booking/success-panel"
import { Waves } from "@/components/icons"
import {
  Card,
  Facts,
  Panel,
  PanelEmpty,
  Split,
  Toolbar,
} from "@/components/kit/app"
import {
  Banner,
  CheckRow,
  EmptyState,
  FormField,
  LoadingBlock,
  SelectBox,
} from "@/components/kit/ui"
import { BookingList } from "@/components/reserve/booking-list"
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
import { cancelBooking, moveReservation, reserveLane } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import {
  cancelNote,
  gridSlots,
  laneSwimmers,
  pausedUntil,
  windowDays,
} from "@/lib/engine"
import {
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
        panel={panel}
        empty={
          <PanelEmpty icon={Waves}>
            {offline ? "Reconnect to reserve." : "Pick a lane and a time."}
          </PanelEmpty>
        }
      >
        <div className="gap-s flex flex-col">
          <Toolbar>
            <SelectBox
              label="Club"
              value={clubSlug}
              onChange={(v) => setParam({ club: v })}
              options={pools.map((c) => ({ value: c.slug, label: c.name }))}
              hideLabel
              className="min-w-52"
            />
            {wide ? (
              <CheckRow checked={any} onChange={setAny} className="min-h-9">
                Any lane: select a time to get the best lane
              </CheckRow>
            ) : null}
          </Toolbar>
          <DayStrip
            selected={date}
            onSelect={(d) => setParam({ date: d === today ? "" : dateKey(d) })}
            now={now}
            windowDays={win}
            label="Choose a day"
          />
        </div>

        <Card
          id="lane-times"
          tone="bare"
          title={fmtDayLong(date)}
          description={`${club.pool.label} · ${lanes} lanes · 45 min`}
        >
          {loading ? (
            <div className="py-m">
              <LoadingBlock text="Checking availability…" rows={6} />
            </div>
          ) : notOpen ? (
            <EmptyState
              object="wave"
              title={`${fmtDay(date)} lanes open ${fmtDay(opens)} at ${fmtTime(opens)}`}
              body="Lane slots open at the same time as classes."
            />
          ) : noneAtAll ? (
            <EmptyState
              object="pool"
              title={`All ${lanes} lanes are taken`}
              body="Lap lanes have no waitlist."
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
              <SlotLegend
                items={
                  wide
                    ? [
                        { tone: "free", label: "Empty", swimmers: 0 },
                        { tone: "free", label: "1 of 2 swimmers", swimmers: 1 },
                        { tone: "selected", label: "Selected" },
                        { tone: "mine", label: "Yours" },
                        { tone: "taken", label: "Full" },
                      ]
                    : undefined
                }
                note="2 swimmers share a lane, in circle swim"
              />
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
