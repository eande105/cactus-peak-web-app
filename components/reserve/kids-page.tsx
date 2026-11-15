"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { SuccessPanel } from "@/components/booking/success-panel"
import { Toggle } from "@/components/graphical"
import {
  Check,
  ChildHead,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  TriangleAlert,
} from "@/components/icons"
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
  CheckRow,
  EmptyState,
  PersonAvatar,
  RadioList,
} from "@/components/kit/ui"
import { BookingList } from "@/components/reserve/booking-list"
import { PanelError, QuietLine } from "@/components/reserve/parts"
import { DayStrip } from "@/components/schedule/day-strip"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { bookKidsClub, joinKidsWaitlist } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import {
  householdMembers,
  KIDS_BLOCKS,
  kidsLeft,
  opensAt,
  windowDays,
} from "@/lib/engine"
import {
  atTime,
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
import { cn } from "@/lib/utils"

const BLOCK_ICON = { k1: Sunrise, k2: Sun, k3: Sunset, k4: Moon } as const
function BlockIcon({ id }: { id: string }) {
  const I = BLOCK_ICON[id as keyof typeof BLOCK_ICON]
  return <I className="size-4 shrink-0" aria-hidden="true" />
}

/**
 * One zone of the booking block: a title, one short fact at the right, and the choice.
 * The zone stays visible but cannot be used until the choice before it is set.
 */
function Zone({
  title,
  need,
  hint,
  id,
  children,
  className,
}: {
  title: string
  /** What the member must set first. When it is given, the zone content is inert. */
  need?: string
  hint?: string
  id?: string
  children: React.ReactNode
  className?: string
}) {
  const side = need ?? hint
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("gap-s p-m flex min-w-0 flex-col", className)}
    >
      <div className="gap-s flex items-baseline justify-between">
        <h2 className="shrink-0 text-body-m font-heavy sm:text-body-s">
          {title}
        </h2>
        {side ? (
          <p className="min-w-0 text-right text-body-m text-muted-foreground sm:text-body-s">
            {side}
          </p>
        ) : null}
      </div>
      <div
        inert={!!need}
        className={cn("gap-s flex min-w-0 flex-col", need && "opacity-50")}
      >
        {children}
      </div>
    </section>
  )
}

/** One kids club block as a full-width time button: the time at the left, the spots left at the right. */
function BlockButton({
  id,
  time,
  left,
  need,
  on,
  past,
  onPress,
  className,
}: {
  id: string
  time: string
  left: number
  /** How many children need a spot. */
  need: number
  on: boolean
  past: boolean
  onPress: () => void
  className?: string
}) {
  const short = left < need
  return (
    <Toggle
      pressed={on}
      disabled={past}
      onPressedChange={onPress}
      className={cn(
        "gap-s flex min-h-11 w-full items-center justify-between text-left text-body-m whitespace-normal sm:text-body-s",
        className
      )}
    >
      <span className="gap-xs flex min-w-0 items-center">
        <BlockIcon id={id} />
        <span className="tabular font-medium">{time}</span>
        {on ? (
          <Check className="size-4 shrink-0" aria-label="Selected" />
        ) : null}
      </span>
      <span
        className={cn(
          "tabular gap-xs flex shrink-0 items-center",
          left < 3 && !on && "text-warning"
        )}
      >
        {left === 0 ? (
          "Full"
        ) : short ? (
          `${left} left. Need ${need}.`
        ) : left < 3 ? (
          <>
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            Only {left} left
          </>
        ) : (
          `${left} spots left`
        )}
        {short ? <span className="underline">Join waitlist</span> : null}
      </span>
    </Toggle>
  )
}

export default function KidsClubPage() {
  const { s, hh, now, club: viewing } = useApp()
  const router = useRouter()
  const offline = useOffline()
  const wide = useMedia("(min-width: 1024px)")
  // The pass is scanned at the front desk from a phone, so it is offered on a touch device only.
  const onTouch = useMedia("(pointer: coarse)")
  const kidsClubs = CLUBS.filter((c) => c.kidsClub)
  const [clubSlug, setClubSlug] = useState(
    CLUB_BY_SLUG[viewing].kidsClub ? viewing : kidsClubs[0].slug
  )
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
  const club = CLUB_BY_SLUG[clubSlug]
  if (!children.length)
    return (
      <BookPage>
        <Card>
          <EmptyState
            object="playground"
            title="No children on your plan yet."
            action={
              <Button size="sm" render={<Link href="/family/add" />}>
                Add a child
              </Button>
            }
          />
        </Card>
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
        panel={panel}
        empty={
          <PanelEmpty icon={ChildHead}>
            {kids.length ? "Pick a day and a block." : "Choose a child first."}
          </PanelEmpty>
        }
      >
        <div className="@container">
          <div className="grid corner-m raised @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex min-w-0 flex-col [&>*+*]:rule-t">
              <Zone id="k1" title="Club">
                <RadioList
                  label="Club"
                  value={clubSlug}
                  onChange={(v) => {
                    if (v === clubSlug) return
                    setClubSlug(v)
                    setBlocks([])
                  }}
                  options={CLUBS.map((c) => ({
                    value: c.slug,
                    label: c.name,
                    disabled: !c.kidsClub,
                    help: (
                      <span className="tabular">
                        {c.kidsClub
                          ? `${kidsLeft(s, c.slug, day, KIDS_BLOCKS[0])} spots left at ${fmtTime(atTime(day, "08:00"))}`
                          : "No kids club"}
                      </span>
                    ),
                  }))}
                />
              </Zone>

              <Zone id="k2" title="Children">
                <ul className="gap-s flex flex-col" aria-label="Children">
                  {children.map((c) => (
                    <li
                      key={c.id}
                      className="gap-s flex min-w-0 items-center justify-between"
                    >
                      <CheckRow
                        className="min-w-0"
                        checked={kids.includes(c.id)}
                        disabled={!c.allergyNotes}
                        onChange={(on) => {
                          const next = on
                            ? [...kids, c.id]
                            : kids.filter((x) => x !== c.id)
                          setKids(next)
                          // A block stays chosen only while it has a spot for each child.
                          setBlocks((b) =>
                            b.filter((id) => {
                              const k = KIDS_BLOCKS.find((x) => x.id === id)!
                              return (
                                next.length > 0 &&
                                kidsLeft(s, clubSlug, day, k) >= next.length
                              )
                            })
                          )
                        }}
                      >
                        <span className="gap-s flex min-w-0 items-center">
                          <PersonAvatar
                            name={c.firstName}
                            hue={c.hue}
                            size={28}
                            className="shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {c.firstName}, {c.age}
                            </span>
                            <span className="block text-body-m font-regular text-muted-foreground sm:text-body-s">
                              {c.allergyNotes
                                ? "Allergy notes on file"
                                : "Needs allergy notes"}
                            </span>
                          </span>
                        </span>
                      </CheckRow>
                      {c.allergyNotes ? null : (
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href={`/family/${c.id}`} />}
                        >
                          Add notes
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </Zone>
            </div>

            <div className="flex min-w-0 flex-col rule-t @2xl:rule-l @2xl:rule-t-0 [&>*+*]:rule-t">
              <Zone
                id="k3"
                title="Day"
                need={kids.length ? undefined : "Choose a child first"}
                hint={fmtDay(day)}
              >
                <DayStrip
                  selected={day}
                  onSelect={(d) => {
                    setDay(d)
                    setBlocks([])
                  }}
                  now={now}
                  windowDays={win}
                  label="Choose a day"
                />
              </Zone>

              <Zone
                id="k4"
                title="Block"
                need={kids.length ? undefined : "Choose a child first"}
                hint="Up to 2 blocks for each child"
                className="flex-1"
              >
                {sunday ? (
                  <Banner tone="neutral" title="Closed Sundays">
                    Kids club runs Monday to Saturday.
                  </Banner>
                ) : notOpen ? (
                  <Banner
                    tone="neutral"
                    title={`${fmtDay(day)} kids club opens ${fmtDay(opens)} at ${fmtTime(opens)}`}
                  />
                ) : (
                  // biome-ignore lint/a11y/useSemanticElements: labelled list of toggle buttons, a fieldset would change the list markup and styles
                  <ul
                    className="gap-xs flex flex-col"
                    role="group"
                    aria-label="Kids club blocks"
                  >
                    {KIDS_BLOCKS.map((k) => (
                      <li key={k.id}>
                        <BlockButton
                          id={k.id}
                          time={fmtRange(
                            atTime(day, k.from),
                            atTime(day, k.to)
                          )}
                          left={kidsLeft(s, clubSlug, day, k)}
                          need={kids.length}
                          on={blocks.includes(k.id)}
                          past={atTime(day, k.from) < now}
                          onPress={() =>
                            kidsLeft(s, clubSlug, day, k) < kids.length
                              ? setWl(k.id)
                              : toggleBlock(k.id)
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {ready && !wide ? (
                  <Button className="w-full" onClick={() => setReview(true)}>
                    Review booking
                  </Button>
                ) : null}
              </Zone>
            </div>
          </div>
        </div>

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
    </BookPage>
  )
}
