"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import {
  FilterBar,
  FilterGroup,
  FilterSheet,
} from "@/components/book/filter-bar"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
  Card,
  Facts,
  Group,
  Panel,
  PanelEmpty,
  Split,
} from "@/components/kit/app"
import { Modal } from "@/components/kit/overlays"
import { CheckRow, Segmented, SelectBox, SwitchRow } from "@/components/kit/ui"
import { BookingList } from "@/components/reserve/booking-list"
import {
  NoticeTile,
  ReserveNotice,
  soonerPlan,
} from "@/components/reserve/empty"
import { BlockPicker } from "@/components/reserve/kids-blocks"
import { KIDS_DAY_LIMIT, WhosGoing } from "@/components/reserve/kids-children"
import { KidsGate } from "@/components/reserve/kids-gate"
import { PanelError, QuietLine } from "@/components/reserve/parts"
import { DayStrip } from "@/components/schedule/day-strip"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { addRemind, bookKidsClub, joinKidsWaitlist } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import { useEmptyPreview } from "@/lib/empty-preview"
import {
  householdMembers,
  KIDS_BLOCKS,
  kidsLeft,
  opensAt,
  windowDays,
} from "@/lib/engine"
import {
  addDays,
  atTime,
  dateKey,
  dayStart,
  fmtDay,
  fmtDayLong,
  fmtRange,
  fmtTime,
  HOUR,
  parts,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { useOffline } from "@/lib/ui-state"

type When = "any" | "morning" | "evening"
// Mornings are the two blocks before noon, evenings the two after 4 pm (KIDS_BLOCKS).
const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Mornings" },
  { value: "evening", label: "Evenings" },
]

export default function KidsClubPage() {
  const { s, me, hh, now, club: viewing } = useApp()
  // TEMPORARY design review switch (lib/empty-preview.ts).
  const preview = useEmptyPreview()
  const router = useRouter()
  const offline = useOffline()
  // The booking summary is a column beside the blocks from 1280px (Split bp="xl"); below, a sheet opened by Review.
  const wide = useMedia("(min-width: 1280px)")
  // The pass is scanned at the front desk from a phone, so it is offered on a touch device only.
  const onTouch = useMedia("(pointer: coarse)")
  const kidsClubs = CLUBS.filter((c) => c.kidsClub)
  const [clubSlug, setClubSlug] = useState(
    CLUB_BY_SLUG[viewing].kidsClub ? viewing : kidsClubs[0].slug
  )
  // The filters, as on Book › Classes. `clubsF` is the kids clubs shown (one by default); `clubSlug` stays the one club
  // the booking is for, and moves to another club when the member picks a block there.
  const [clubsF, setClubsF] = useState<string[]>([clubSlug])
  const [when, setWhen] = useState<When>("any")
  const [roomOnly, setRoomOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const members = householdMembers(s, hh.id)
  const children = members.filter((m) => m.role === "child")
  const adults = members.filter(
    (m) => m.role === "primary" || m.role === "adult"
  )
  const [kids, setKids] = useState<string[]>(
    children.filter((c) => !!c.allergyNotes).map((c) => c.id)
  )
  const today = dayStart(now)
  const [day, setDay] = useState(today)
  const [blocks, setBlocks] = useState<string[]>([])
  const [pickup, setPickup] = useState<string[]>(adults.map((m) => m.id))
  const [notesOk, setNotesOk] = useState(false)
  const [wl, setWl] = useState<string | null>(null)
  const [wlOk, setWlOk] = useState(false)
  const [done, setDone] = useState<{ bookings: Booking[]; ref: string } | null>(
    null
  )
  const [error, setError] = useState("")
  // On a phone the summary is a sheet. It opens when the member picks a block or selects Review.
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const win = windowDays(hh.plan)
  const sunday = parts(day).dow === 0
  const opens = opensAt(day + 9 * HOUR, win)
  const notOpen = now < opens
  const sooner = notOpen ? soonerPlan(hh.plan, day, now) : undefined
  const club = CLUB_BY_SLUG[clubSlug]
  if (!children.length || preview === "gate")
    return (
      <BookPage>
        <KidsGate />
      </BookPage>
    )
  const chosen = children.filter((c) => kids.includes(c.id))
  const toggleBlock = (id: string) => {
    setError("")
    if (blocks.includes(id)) return setBlocks(blocks.filter((x) => x !== id))
    if (blocks.length >= 2) return
    setBlocks([...blocks, id])
    setReview(true)
  }
  const book = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 450))
    const r = bookKidsClub({ clubSlug, childIds: kids, day, blocks })
    setBusy(false)
    if (r.ok) {
      setDone({ bookings: r.bookings, ref: r.ref })
      announce(
        `${chosen.map((c) => c.firstName).join(" and ")} ${chosen.length > 1 ? "are" : "is"} booked.`
      )
    } else {
      setError(r.message)
      announce(r.message)
    }
  }
  const blockTimes = (sep: string) =>
    blocks
      .map((b) => {
        const k = KIDS_BLOCKS.find((x) => x.id === b)!
        return fmtRange(atTime(day, k.from), atTime(day, k.to))
      })
      .join(sep)
  if (done) {
    const first = done.bookings[0]
    return (
      <BookPage>
        <div className="max-w-xl">
          <SuccessPanel
            pill="Kids club booked"
            headline={chosen.map((c) => c.firstName).join(" and ")}
            summary={[
              {
                label: "When",
                value: `${fmtDay(first.start)} · ${blockTimes(", ")}`,
              },
              { label: "Where", value: club.name },
              { label: "Reference", value: done.ref },
            ]}
            event={{
              title: `Kids club: ${chosen.map((c) => c.firstName).join(", ")}`,
              start: first.start,
              end: first.end,
              location: club.address,
            }}
            extra={
              <QuietLine>
                Check in at {club.name} before drop-off and stay in the club.
                Unclaimed blocks release 15 minutes after they start.
              </QuietLine>
            }
            rows={[
              ...(onTouch ? [{ label: "Show pass", href: "/pass" }] : []),
              {
                label: "Call the club",
                href: `tel:${club.phone.replace(/\D/g, "")}`,
              },
            ]}
            onDone={() => router.push("/bookings")}
            doneLabel="See my bookings"
          />
        </div>
      </BookPage>
    )
  }
  // The four rules, in order: a club, a child or more, a day with a block or two, then the pick-up and notes checks.
  const ready = kids.length > 0 && blocks.length > 0
  const valid = ready && notesOk && pickup.length > 0 && !offline
  // The household's coming kids club blocks, at every club.
  const upcoming = s.bookings.filter(
    (b) =>
      b.kind === "kids" &&
      b.status === "booked" &&
      b.end > now &&
      s.members[b.memberId]?.householdId === hh.id
  )
  const clear = () => {
    setBlocks([])
    setReview(false)
    setError("")
  }
  // The blocks a club shows under the filters: the time of day, and room for every chosen child.
  const need = Math.max(1, kids.length)
  const visible = (slug: string) =>
    KIDS_BLOCKS.filter(
      (k) =>
        (when === "any" || (when === "morning") === k.from < "12:00") &&
        (!roomOnly || kidsLeft(s, slug, day, k) >= need)
    )
  const roomIn = (slug: string) =>
    KIDS_BLOCKS.filter(
      (k) => atTime(day, k.from) > now && kidsLeft(s, slug, day, k) >= need
    ).length
  const shownClubs = kidsClubs.filter((c) => clubsF.includes(c.slug))
  const shownBlocks = shownClubs.reduce((n, c) => n + visible(c.slug).length, 0)
  const countText = `${shownBlocks} ${shownBlocks === 1 ? "block" : "blocks"}`
  // On a narrow row the club stays on the page, so the badge counts the rest. Wide, the time of day is on the page too.
  const phoneCount = (when !== "any" ? 1 : 0) + (roomOnly ? 1 : 0)
  const moreCount = roomOnly ? 1 : 0
  const filtered = when !== "any" || roomOnly || clubsF.length > 1
  const clearFilters = () => {
    setWhen("any")
    setRoomOnly(false)
    setClubsF([clubSlug])
  }
  const goClub = (slug: string) => {
    if (slug === clubSlug) return
    setClubSlug(slug)
    setBlocks([])
  }
  const toggleClub = (slug: string) => {
    const next = clubsF.includes(slug)
      ? clubsF.filter((x) => x !== slug)
      : [...clubsF, slug]
    if (!next.length) return
    setClubsF(next)
    if (!next.includes(clubSlug)) goClub(next[0])
  }
  // A block at another club moves the booking there, so the summary always names one club.
  const pick = (slug: string, id: string) => {
    if (slug !== clubSlug) {
      setClubSlug(slug)
      setError("")
      setBlocks([id])
      setReview(true)
      return
    }
    toggleBlock(id)
  }
  // A child's kids club blocks on the chosen day, for the 2-a-day rule.
  const blocksOn = (id: string, on = day) =>
    s.bookings.filter(
      (b) =>
        b.kind === "kids" &&
        b.memberId === id &&
        b.status === "booked" &&
        dayStart(b.start) === dayStart(on)
    ).length
  const toggleKid = (id: string, on: boolean) => {
    const next = on ? [...kids, id] : kids.filter((x) => x !== id)
    setKids(next)
    // A block stays chosen only while it has a spot for each child.
    setBlocks((b) =>
      b.filter((bid) => {
        const k = KIDS_BLOCKS.find((x) => x.id === bid)!
        return next.length > 0 && kidsLeft(s, clubSlug, day, k) >= next.length
      })
    )
  }
  const clubSelect = (className: string) => (
    <SelectBox
      label="Kids club"
      hideLabel
      className={className}
      value={clubsF.length === 1 ? clubsF[0] : "several"}
      onChange={(v) => {
        if (v === "several") return
        setClubsF([v])
        goClub(v)
      }}
      options={[
        ...(clubsF.length > 1
          ? [{ value: "several", label: `${clubsF.length} kids clubs` }]
          : []),
        ...kidsClubs.map((c) => ({ value: c.slug, label: c.name })),
      ]}
    />
  )
  const panel = ready ? (
    <Panel
      title="Kids club"
      onClose={wide ? undefined : () => setReview(false)}
      footer={
        <>
          <PanelError>{error}</PanelError>
          <Button
            className="w-full"
            disabled={!valid}
            loading={busy}
            onClick={() => void book()}
          >
            Book kids club
          </Button>
          <Button className="w-full" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </>
      }
    >
      <Facts
        items={[
          { label: "Club", value: club.name },
          {
            label: "Children",
            value: chosen.map((c) => `${c.firstName} (${c.age})`).join(", "),
          },
          { label: "Day", value: fmtDayLong(day) },
          {
            label: blocks.length > 1 ? "Blocks" : "Block",
            value: <span className="tabular">{blockTimes(", ")}</span>,
          },
        ]}
      />
      <Group label="Pick-up adults">
        {adults.map((m) => (
          <CheckRow
            key={m.id}
            checked={pickup.includes(m.id)}
            onChange={(on) =>
              setPickup((p) =>
                on ? [...p, m.id] : p.filter((x) => x !== m.id)
              )
            }
          >
            {m.firstName} {m.lastName}
          </CheckRow>
        ))}
      </Group>
      <CheckRow checked={notesOk} onChange={setNotesOk}>
        Allergy and medical notes are up to date
      </CheckRow>
      <QuietLine>
        {offline
          ? "Reconnect to book."
          : `Check in at ${club.name} before drop-off and stay in the club. Free to cancel with 2 hours' notice.`}
      </QuietLine>
    </Panel>
  ) : null
  return (
    <BookPage>
      <Split
        label="Your kids club booking"
        open={ready && (wide || review)}
        onClose={() => setReview(false)}
        collapseEmpty
        bp="xl"
        panel={panel}
        empty={
          <PanelEmpty object="playground">
            {kids.length ? "Pick a block." : "Choose a child first."}
          </PanelEmpty>
        }
      >
        {/* The first step: who is going. It comes before the filters, because it decides which blocks have room. */}
        <WhosGoing
          childList={children}
          value={kids}
          onChange={toggleKid}
          blocksOn={blocksOn}
          dayWord={fmtDay(day).split(",")[0]}
        />

        <div className="gap-s flex flex-col">
          {/* The toolbar every Book tab shares (FilterBar): the kids club and the time of day, then the drawer. */}
          <FilterBar
            club={clubSelect}
            quick={
              <SelectBox
                label="Time of day"
                hideLabel
                className="min-w-0 flex-none"
                value={when}
                onChange={setWhen}
                options={WHEN_OPTIONS}
              />
            }
            onFilters={() => setFiltersOpen(true)}
            count={phoneCount}
            more={moreCount}
            active={filtered}
            onClear={clearFilters}
            day={(stepper) => (
              <DayStrip
                stepper={stepper}
                selected={day}
                onSelect={(d) => {
                  setDay(d)
                  setBlocks([])
                  // A child who already has 2 blocks on the new day cannot go again that day.
                  setKids((k) =>
                    k.filter((id) => blocksOn(id, d) < KIDS_DAY_LIMIT)
                  )
                }}
                now={now}
                windowDays={win}
                label="Choose a day"
              />
            )}
          />
        </div>

        <section
          aria-labelledby="kids-day"
          className="gap-m flex min-w-0 flex-col"
        >
          <div className="gap-s px-xs flex min-h-9 items-center justify-between text-body-s">
            <h2 id="kids-day" className="min-w-0 truncate font-heavy">
              {fmtDayLong(day)}
            </h2>
            {sunday || notOpen ? null : kids.length ? (
              <span className="tabular shrink-0 text-muted-foreground">
                Up to 2 blocks for each child
              </span>
            ) : (
              <span className="shrink-0 text-warning">
                Choose a child to pick a block
              </span>
            )}
          </div>
          {sunday || preview === "sunday" ? (
            <ReserveNotice
              art={<NoticeTile id="sun" />}
              title="Closed Sundays"
              line="Kids club runs Monday to Saturday."
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDay(addDays(day, 1))
                    setBlocks([])
                  }}
                >
                  See Monday
                </Button>
              }
            />
          ) : notOpen || preview === "notopen" ? (
            <ReserveNotice
              art={<NoticeTile id="schedule" />}
              title={`${fmtDay(day)} kids club opens ${fmtDay(opens)} at ${fmtTime(opens)}`}
              line={
                sooner
                  ? `On ${sooner.name}, blocks open ${sooner.window} days ahead, so this day is open now.`
                  : "Blocks open at the same time as classes."
              }
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      addRemind(`kids-${dateKey(day)}`)
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
          ) : shownBlocks ? (
            // The clubs and their blocks in one picker, laid out like the court and lane tables (BlockPicker).
            <Card>
              <BlockPicker
                clubs={shownClubs}
                blocks={KIDS_BLOCKS.filter(
                  (k) =>
                    when === "any" || (when === "morning") === k.from < "12:00"
                )}
                cell={(slug, k) => {
                  const left = kidsLeft(s, slug, day, k)
                  return { left, shown: !roomOnly || left >= need }
                }}
                day={day}
                now={now}
                need={kids.length}
                homeClub={me.homeClub}
                picked={{ club: clubSlug, ids: blocks }}
                onPick={(slug, k) => {
                  // Not enough spots for every child: the waitlist, at this block's club.
                  if (kidsLeft(s, slug, day, k) < kids.length) {
                    goClub(slug)
                    setWl(k.id)
                  } else pick(slug, k.id)
                }}
                disabled={!kids.length}
              />
            </Card>
          ) : (
            <ReserveNotice
              art={<NoticeTile id="playground" />}
              title="No blocks match these filters"
              line={`${kidsClubs.length} clubs run kids club on ${fmtDayLong(day).split(",")[0]}.`}
              actions={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
          {ready && !wide ? (
            <Button className="w-full" onClick={() => setReview(true)}>
              Review booking
            </Button>
          ) : null}
        </section>

        <BookingList
          id="your-kids-club"
          label="Your kids club blocks"
          list={upcoming}
          empty="No kids club block booked."
        />
      </Split>

      <Modal
        open={!!wl}
        onOpenChange={(o) => {
          if (!o) {
            setWl(null)
            setWlOk(false)
          }
        }}
        title="Join the kids club waitlist"
        description="Not enough spots for everyone. If spots open, we hold them for 30 minutes and you tap Confirm spot. We stop moving people up 1 hour before the block."
      >
        <CheckRow checked={wlOk} onChange={setWlOk}>
          I understand the hold lasts 30 minutes.
        </CheckRow>
        <div className="gap-s flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setWl(null)}>
            Pick another block
          </Button>
          <Button
            size="sm"
            disabled={!wlOk}
            onClick={() => {
              joinKidsWaitlist({ clubSlug, childIds: kids, day, blockId: wl! })
              setWl(null)
              setWlOk(false)
              toast({
                title: "You're on the waitlist",
                description: "We'll tell you if a spot opens.",
              })
            }}
          >
            Join waitlist
          </Button>
        </div>
      </Modal>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Kids club filters"
        show={`Show ${countText}`}
      >
        <search className="flex flex-col" aria-label="Kids club filters">
          <FilterGroup title="Kids clubs">
            {kidsClubs.map((c) => (
              <CheckRow
                key={c.slug}
                checked={clubsF.includes(c.slug)}
                onChange={() => toggleClub(c.slug)}
              >
                <span className="flex min-w-0 flex-col">
                  <span>
                    {c.name}
                    {c.slug === me.homeClub ? (
                      <span className="text-primary"> · Your club</span>
                    ) : null}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {roomIn(c.slug)} of {KIDS_BLOCKS.length} blocks have room
                  </span>
                </span>
              </CheckRow>
            ))}
          </FilterGroup>
          <FilterGroup title="Time of day">
            <Segmented
              label="Time of day"
              value={when}
              onChange={setWhen}
              size="sm"
              options={WHEN_OPTIONS}
            />
          </FilterGroup>
          <FilterGroup title="Availability">
            <SwitchRow checked={roomOnly} onChange={setRoomOnly}>
              {kids.length > 1
                ? `Room for all ${kids.length} children`
                : "Blocks with room only"}
            </SwitchRow>
          </FilterGroup>
          <div className="pt-s rule-t">
            <Button
              variant="ghost"
              size="sm"
              disabled={!filtered}
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        </search>
      </FilterSheet>
    </BookPage>
  )
}
