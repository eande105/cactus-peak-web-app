"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import {
  FilterBar,
  FilterGroup,
  FilterSheet,
} from "@/components/book/filter-bar"
import {
  Card,
  Facts,
  Group,
  Panel,
  PanelEmpty,
  Split,
} from "@/components/kit/app"
import { Modal } from "@/components/kit/overlays"
import {
  Banner,
  FormField,
  LoadingBlock,
  Segmented,
  SelectBox,
} from "@/components/kit/ui"
import { BookingList } from "@/components/reserve/booking-list"
import { SlotHoldTimer, Stepper } from "@/components/reserve/common"
import { CourtsLocked, SPORT_OBJECT } from "@/components/reserve/courts-locked"
import {
  NoticeCount,
  NoticeTile,
  ReserveNotice,
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
import { addRemind, moveReservation, reserveCourt } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import { useEmptyPreview } from "@/lib/empty-preview"
import {
  cancelNote,
  courtBlocks,
  courtCount,
  gridSlots,
  guestPassesLeft,
  opensAt,
  pausedUntil,
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
import { openDialog, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const DURATIONS: { value: 60 | 90; label: string }[] = [
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
]
const SPORTS = {
  pickleball: "Pickleball",
  tennis: "Tennis",
  basketball: "Basketball",
} as const
type Sport = keyof typeof SPORTS
const ROSTER = [
  "Linda Park",
  "Pat Lowe",
  "Dana Kessler",
  "Marty Gómez",
  "Sofia Reyes",
]

type Player = { kind: "member" | "guest"; name: string }

/** One more player in the booking panel: member or guest, the name, and what the choice costs. */
function PlayerRow({
  n,
  player,
  onChange,
  invalid,
  note,
  className,
}: {
  /** The player's number. The member who books is player 1. */
  n: number
  player: Player
  onChange: (p: Partial<Player>) => void
  invalid: boolean
  note: string
  className?: string
}) {
  const member = player.kind === "member"
  return (
    <li className={cn("gap-xs py-s flex flex-col", className)}>
      <Segmented
        label={`Player ${n} type`}
        size="sm"
        value={player.kind}
        onChange={(kind) => onChange({ kind })}
        options={[
          { value: "member", label: "Member" },
          { value: "guest", label: "Guest" },
        ]}
      />
      <FormField
        label={
          member ? `Player ${n}: search members` : `Player ${n}: guest's name`
        }
        error={
          invalid
            ? member
              ? "Pick a member from the list, or switch to Guest."
              : "Enter the guest's name."
            : undefined
        }
      >
        {(f) => (
          <Input
            {...f}
            list={member ? "roster" : undefined}
            value={player.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={member ? "Linda Park" : "Guest name"}
          />
        )}
      </FormField>
      <p className="text-body-m text-muted-foreground sm:text-body-s">{note}</p>
    </li>
  )
}

function Inner() {
  const { s, me, hh, now, club: viewing } = useApp()
  // TEMPORARY design review switch (lib/empty-preview.ts).
  const preview = useEmptyPreview()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const wide = useMedia("(min-width: 1024px)")
  const offline = useOffline()
  const [loading, setLoading] = useState(false)
  const withCourts = CLUBS.filter((c) => c.courts.length)
  const clubSlug =
    sp.get("club") ??
    (CLUB_BY_SLUG[viewing].courts.length ? viewing : withCourts[0].slug)
  const club = CLUB_BY_SLUG[clubSlug]
  const sports = club.courts.map((c) => c.sport) as Sport[]
  const sport =
    (sp.get("sport") as Sport | null) &&
    sports.includes(sp.get("sport") as Sport)
      ? (sp.get("sport") as Sport)
      : sports[0]
  const dur = (Number(sp.get("dur")) === 90 ? 90 : 60) as 60 | 90
  const today = dayStart(now)
  const date = sp.get("date") ? fromKey(sp.get("date")!) : today
  const moveId = sp.get("move")
  const moving = moveId ? s.bookings.find((b) => b.id === moveId) : undefined
  const [sel, setSel] = useState<{ row: number; slot: number } | null>(null)
  const [holdUntil, setHoldUntil] = useState(0)
  const [extended, setExtended] = useState(false)
  const [ended, setEnded] = useState<{ row: number; slot: number } | null>(null)
  const [count, setCount] = useState(2)
  const [players, setPlayers] = useState<Player[]>([
    { kind: "member", name: "" },
  ])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: clubSlug restarts the fake load delay when the club changes
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [clubSlug])
  const setParam = (p: Record<string, string>) => {
    const q = new URLSearchParams(sp)
    Object.entries(p).forEach(([k, v]) => {
      if (v) q.set(k, v)
      else q.delete(k)
    })
    router.replace(`/reserve/courts?${q}`, { scroll: false })
    setSel(null)
    setHoldUntil(0)
  }
  const n = courtCount(clubSlug, sport)
  const rows = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    label: `Court ${i + 1}`,
    sub: club.slug === "power-mckellips" ? "Outdoor" : "Indoor",
  }))
  const slots = gridSlots(date, "court").filter((x) => x + 30 * MIN > now)
  const opens = opensAt(date + 9 * HOUR, 3)
  const notOpen = now < opens
  const maxPlayers = sport === "basketball" ? 10 : 4
  const changeCount = (c: number) => {
    setCount(c)
    setPlayers((p) => {
      const next = p.slice(0, c - 1)
      while (next.length < c - 1) next.push({ kind: "member", name: "" })
      return next
    })
  }
  const mineRanges = s.bookings.filter(
    (b) =>
      b.kind === "court" &&
      b.status === "booked" &&
      b.clubSlug === clubSlug &&
      s.members[b.memberId].householdId === hh.id
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: rows is rebuilt each render and n stands for it, so it is left out on purpose
  const blocksFor = useMemo(
    () =>
      Object.fromEntries(
        rows.map((r) => [
          r.id,
          courtBlocks(s, clubSlug, sport, r.id, date).blocks,
        ])
      ),
    [s, clubSlug, sport, date, n]
  )
  const closeAt =
    dayStart(date) +
    (new Date(date + 3600e3 * -7).getUTCDay() === 0 ||
    new Date(date - 7 * HOUR).getUTCDay() === 6
      ? 20
      : 21) *
      HOUR
  const info = (court: number, slot: number): CellInfo => {
    if (slot < now) return { status: "past" }
    if (notOpen)
      return { status: "notOpen", label: `Opens ${fmtDowTime(opens)}` }
    const bl = blocksFor[court] ?? []
    const hit = bl.find((b) => b.from < slot + 30 * MIN && b.to > slot)
    if (hit)
      return {
        status: mineRanges.some(
          (m) =>
            m.resource === `Court ${court}` &&
            m.start < slot + 30 * MIN &&
            m.end > slot
        )
          ? "mine"
          : hit.kind === "closed"
            ? "closed"
            : "taken",
      }
    if (
      bl.some((b) => b.from < slot + dur * MIN && b.to > slot) ||
      slot + dur * MIN > closeAt
    )
      return { status: "short" }
    return { status: "open" }
  }
  const select = (row: number, slot: number) => {
    setError("")
    setSel({ row, slot })
    setHoldUntil(now + 5 * MIN)
    setExtended(false)
    announce(
      `Court ${row} selected, ${fmtTime(slot)} to ${fmtTime(slot + dur * MIN)}`
    )
  }
  const free = (court: number, slot: number) =>
    info(court, slot).status === "open"
  const noneOpen =
    !loading &&
    !notOpen &&
    rows.every((r) => slots.every((sl) => !free(r.id, sl)))
  const { left: passesLeft } = guestPassesLeft(s, hh.id, now)
  const teen = me.role === "teen"
  const waiting = teen
    ? s.requests.find(
        (r) =>
          r.teenId === me.id &&
          r.status === "pending" &&
          r.title.startsWith("Court")
      )
    : undefined
  const needsParent = teen && !me.permissions?.courts
  const parentName = me.parentId
    ? s.members[me.parentId].firstName
    : "your parent"
  const resolved = (p: Player) =>
    p.kind === "guest"
      ? p.name.trim().length > 1
      : !!Object.values(s.members).find(
          (m) =>
            m.role !== "child" &&
            m.id !== me.id &&
            `${m.firstName} ${m.lastName}`.toLowerCase() ===
              p.name.trim().toLowerCase()
        ) || ROSTER.some((r) => r.toLowerCase() === p.name.trim().toLowerCase())
  const valid = sel && (needsParent || players.every(resolved)) && !offline
  const release = () => {
    setSel(null)
    setHoldUntil(0)
  }
  const reserve = async () => {
    if (!sel) return
    if (needsParent) {
      openDialog("askParent", {
        title: `Court ${sel.row}, ${fmtDowTime(sel.slot)} at ${club.name}`,
      })
      return
    }
    setBusy(true)
    await new Promise((r) => setTimeout(r, 450))
    const member = (nm: string) =>
      Object.values(s.members).find(
        (m) =>
          `${m.firstName} ${m.lastName}`.toLowerCase() ===
          nm.trim().toLowerCase()
      )
    if (moving) {
      const r = moveReservation(moving.id, {
        start: sel.slot,
        resource: `Court ${sel.row}`,
      })
      setBusy(false)
      if (r.ok) {
        toast({
          title: `Moved to Court ${sel.row}`,
          description: fmtDowTime(sel.slot),
        })
        router.push("/bookings")
      } else setError(r.message)
      return
    }
    const r = reserveCourt({
      clubSlug,
      sport,
      court: sel.row,
      start: sel.slot,
      duration: dur,
      players: players.map((p) => ({
        name: p.name.trim(),
        kind: p.kind,
        memberId: p.kind === "member" ? member(p.name)?.id : undefined,
      })),
    })
    setBusy(false)
    if (r.ok) {
      announce(`Court ${sel.row} is yours.`)
      router.push(`/reserve/confirmed/${r.booking.id}`)
    } else {
      setError(r.message)
      announce(r.message)
      if (r.code === "SLOT_TAKEN") {
        setSel(null)
        setHoldUntil(0)
        toast({ type: "error", title: r.message })
      }
    }
  }
  const players_ = sel ? (
    <Group label="Players">
      <Stepper
        label="How many players?"
        value={count}
        min={2}
        max={maxPlayers}
        onChange={changeCount}
        help={sport === "basketball" ? "2 to 10." : "2 to 4."}
      />
      <datalist id="roster">
        {ROSTER.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <ul className="flex flex-col rule-t [&>li+li]:rule-t">
        {players.map((p, i) => (
          <PlayerRow
            // biome-ignore lint/suspicious/noArrayIndexKey: player slots have no id and only change at the end of the list
            key={i}
            n={i + 2}
            player={p}
            onChange={(next) =>
              setPlayers((a) =>
                a.map((x, j) => (j === i ? { ...x, ...next } : x))
              )
            }
            invalid={!!p.name.trim() && !resolved(p)}
            note={
              p.kind === "guest"
                ? passesLeft -
                    players.slice(0, i).filter((x) => x.kind === "guest")
                      .length >
                  0
                  ? `Uses 1 guest pass. You have ${passesLeft} left.`
                  : "Costs $20 per guest. Charged to your card on file."
                : "We send an invite when you reserve."
            }
          />
        ))}
      </ul>
    </Group>
  ) : null
  if (hh.plan === "trailhead" || preview === "gate")
    return (
      <BookPage>
        <CourtsLocked />
      </BookPage>
    )
  const pu = pausedUntil(s, me.id, now)
  // The household's coming court reservations, at every club.
  const upcoming = s.bookings.filter(
    (b) =>
      b.kind === "court" &&
      b.status === "booked" &&
      b.end > now &&
      s.members[b.memberId].householdId === hh.id
  )
  const note = sel ? cancelNote(s, me.id, sel.slot, now, "court") : null
  const panel = sel ? (
    <Panel
      title={moving ? "Move your court" : "Reserve a court"}
      onClose={release}
      footer={
        <>
          <PanelError>{error}</PanelError>
          <Button
            className="w-full"
            disabled={!valid || !!waiting}
            loading={busy}
            onClick={() => void reserve()}
          >
            {waiting
              ? `Waiting for ${parentName}`
              : needsParent
                ? `Ask ${parentName}`
                : moving
                  ? `Move to Court ${sel.row}`
                  : "Reserve court"}
          </Button>
          {waiting ? null : (
            <Button className="w-full" variant="ghost" onClick={release}>
              Release
            </Button>
          )}
        </>
      }
    >
      <Facts
        items={[
          { label: "Court", value: `Court ${sel.row} · ${SPORTS[sport]}` },
          { label: "Day", value: fmtDay(sel.slot) },
          {
            label: "Time",
            value: (
              <span className="tabular">
                {fmtRange(sel.slot, sel.slot + dur * MIN)}
              </span>
            ),
          },
          {
            label: "Duration",
            value: <span className="tabular">{dur} min</span>,
          },
          { label: "Club", value: club.name },
        ]}
      />
      {holdUntil ? (
        <SlotHoldTimer
          holdUntil={holdUntil}
          now={now}
          what={`Court ${sel.row}`}
          canExtend={!extended}
          onExtend={() => {
            setHoldUntil((h) => h + 5 * MIN)
            setExtended(true)
          }}
          onExpire={() => {
            setEnded(sel)
            setSel(null)
            setHoldUntil(0)
          }}
        />
      ) : null}
      {needsParent ? null : players_}
      {needsParent ? (
        <QuietLine>
          Courts need {parentName}&apos;s OK. The time is held for 24 hours.
        </QuietLine>
      ) : note ? (
        <CancelLine note={note} />
      ) : null}
    </Panel>
  ) : null
  return (
    <BookPage>
      {moving ? (
        <Banner
          tone="neutral"
          title={`Moving ${moving.resource}: ${fmtDay(moving.start)}, ${fmtRange(moving.start, moving.end)}`}
        >
          Free to move until {fmtTime(moving.start - 2 * HOUR)}.
        </Banner>
      ) : null}
      {pu ? (
        <Banner tone="warning" title={`Booking is paused until ${fmtDay(pu)}.`}>
          You can still look at courts.
        </Banner>
      ) : null}
      {waiting ? (
        <Banner
          tone="neutral"
          title={`Waiting for ${parentName}: ${waiting.title}. Held until ${fmtDay(waiting.expiresAt)}, ${fmtTime(waiting.expiresAt)}.`}
        />
      ) : null}
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Court filters"
        show={`Show ${SPORTS[sport].toLowerCase()} courts`}
      >
        <search className="flex flex-col" aria-label="Court filters">
          {sports.length > 1 ? (
            <FilterGroup title="Sport">
              <Segmented
                label="Sport"
                value={sport}
                onChange={(v) => setParam({ sport: v })}
                size="sm"
                options={sports.map((v) => ({ value: v, label: SPORTS[v] }))}
              />
            </FilterGroup>
          ) : null}
          <FilterGroup title="Length">
            <Segmented
              label="Length"
              value={dur}
              onChange={(v) => setParam({ dur: String(v) })}
              size="sm"
              options={DURATIONS}
            />
          </FilterGroup>
        </search>
      </FilterSheet>
      <Split
        label="Your reservation"
        open={!!sel}
        onClose={release}
        collapseEmpty
        bp="xl"
        panel={panel}
        empty={
          <PanelEmpty object={SPORT_OBJECT[sport]}>
            {offline
              ? "Reconnect to reserve."
              : "Pick a free time to hold a court for 5 minutes."}
          </PanelEmpty>
        }
      >
        <div className="gap-s flex flex-col">
          {/* The toolbar every Book tab shares (FilterBar). Wide, the sport and the length sit beside the club; narrow,
              they are in the drawer and the badge counts the ones changed from the default. */}
          <FilterBar
            club={(className) => (
              <SelectBox
                label="Club"
                value={clubSlug}
                onChange={(v) => setParam({ club: v, sport: "" })}
                options={withCourts.map((c) => ({
                  value: c.slug,
                  label: c.name,
                }))}
                hideLabel
                className={className}
              />
            )}
            quick={
              <>
                {sports.length > 1 ? (
                  <SelectBox
                    label="Sport"
                    hideLabel
                    className="min-w-0 flex-none"
                    value={sport}
                    onChange={(v) => setParam({ sport: v })}
                    options={sports.map((v) => ({
                      value: v,
                      label: SPORTS[v],
                    }))}
                  />
                ) : null}
                <Segmented
                  label="Length"
                  value={dur}
                  onChange={(v) => setParam({ dur: String(v) })}
                  options={DURATIONS}
                />
              </>
            }
            onFilters={() => setFiltersOpen(true)}
            wideSheet={false}
            count={(sport !== sports[0] ? 1 : 0) + (dur !== 60 ? 1 : 0)}
            day={(stepper) => (
              <DayStrip
                stepper={stepper}
                selected={date}
                onSelect={(d) =>
                  setParam({ date: d === today ? "" : dateKey(d) })
                }
                now={now}
                windowDays={3}
                days={5}
                label="Choose a day"
              />
            )}
          />
        </div>

        <Card
          id="court-times"
          tone="bare"
          title={fmtDayLong(date)}
          description={`${SPORTS[sport]} · ${n} ${n === 1 ? "court" : "courts"}`}
          action={
            <SlotLegend
              // The phone chips use the same tones as the table, so the key is the same at every width.
              items={[
                { tone: "free", label: "Free" },
                { tone: "mine", label: "Yours" },
                { tone: "taken", label: "Taken" },
                { tone: "short", label: `Under ${dur} min free` },
                ...(date === today && wide
                  ? [{ tone: "past" as const, label: "Past" }]
                  : []),
              ]}
              note={
                offline
                  ? "Reconnect to reserve."
                  : "Picking a time holds the court for 5 minutes."
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
              title={`${fmtDay(date)} courts open ${fmtDay(opens)} at ${fmtTime(opens)}`}
              line="Courts open 3 days ahead at 6 am."
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addRemind(`court-${dateKey(date)}`)
                    toast({ title: "We'll remind you" })
                  }}
                >
                  Remind me
                </Button>
              }
            />
          ) : noneOpen || preview === "full" ? (
            <ReserveNotice
              className="pt-s"
              tone="warning"
              art={
                <NoticeCount
                  id={SPORT_OBJECT[sport]}
                  count={n}
                  label={`${n} ${SPORTS[sport].toLowerCase()} courts, all taken`}
                />
              }
              title={`Every ${SPORTS[sport].toLowerCase()} court is taken on ${fmtDay(date)}`}
              line="Courts have no waitlist."
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setParam({ date: dateKey(addDays(date, 1)) })
                    }
                  >
                    Try the next day
                  </Button>
                  {club.slug !== "dobson-southern" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParam({ club: "dobson-southern" })}
                    >
                      Dobson & Southern
                    </Button>
                  ) : null}
                </>
              }
            />
          ) : wide ? (
            <SlotGrid
              kind="court"
              rows={rows}
              slots={slots}
              info={info}
              selected={sel}
              rangeCells={dur / 30}
              onSelect={select}
              label="Choose a court and start time"
              disabled={offline || !!pu}
              now={now}
            />
          ) : (
            <SlotList
              kind="court"
              rows={rows}
              slots={slots.filter((sl) => rows.some((r) => free(r.id, sl)))}
              info={info}
              selected={sel}
              onSelect={select}
              label="Choose a court and start time"
              disabled={offline || !!pu}
            />
          )}
        </Card>

        <BookingList
          id="your-courts"
          label="Your courts"
          list={upcoming}
          empty="No court reserved."
        />
      </Split>

      <Modal
        open={!!ended}
        onOpenChange={(o) => !o && setEnded(null)}
        title="Your hold ended"
        description="The court is open to others. Pick it again?"
      >
        <div className="gap-s flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setEnded(null)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (ended && free(ended.row, ended.slot))
                select(ended.row, ended.slot)
              else
                toast({
                  type: "error",
                  title: "Court was just booked. Pick another time.",
                })
              setEnded(null)
            }}
          >
            Pick again
          </Button>
        </div>
      </Modal>
    </BookPage>
  )
}
export default function CourtsPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
