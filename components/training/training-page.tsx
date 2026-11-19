"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import {
  FilterBar,
  FilterGroup,
  FilterSheet,
} from "@/components/book/filter-bar"
import { GymObject } from "@/components/brand/graphics"
import { CalendarDays, Clock3, Sparkles, Ticket } from "@/components/icons"
import { Card, Stat, Stats } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { Modal } from "@/components/kit/overlays"
import { LoadingBlock, RadioList, SelectBox } from "@/components/kit/ui"
import { NoticeTile, ReserveNotice } from "@/components/reserve/empty"
import { Button } from "@/components/ui/button"
import {
  CLUB_BY_SLUG,
  CLUBS,
  COACH_FILTERS,
  COACHES,
  PLANS,
  PT_PACKS,
  PT_PRICE,
} from "@/lib/data/catalog"
import { useEmptyPreview } from "@/lib/empty-preview"
import { ptCreditsLeft, ptOpenSlots } from "@/lib/engine"
import { buyPack } from "@/lib/purchases"
import { fmtDateFull, fmtDay, fmtDowTime, fmtMoney, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Coach } from "@/lib/types"

const SPECIALTY_OPTIONS = [
  { value: "all", label: "All specialties" },
  ...COACH_FILTERS.map((x) => ({ value: x, label: x })),
]

/** The short club name: the cross streets without the city. */
const clubShort = (slug: string) => {
  const name = CLUB_BY_SLUG[slug].name
  return name.split(" – ")[1] ?? name
}

/**
 * A coach's clubs as a phrase: "Gilbert & Page and Main & Center", "Val Vista & Warner + 2 more". Each name keeps its
 * cross streets together (non-breaking spaces), so a line breaks between clubs, never inside "Main & Center".
 */
const keepTogether = (name: string) => name.replaceAll(" ", "\u00a0")
const clubPhrase = (slugs: string[]) =>
  slugs.length <= 2
    ? slugs.map((s) => keepTogether(clubShort(s))).join(" and ")
    : `${keepTogether(clubShort(slugs[0]))} + ${slugs.length - 1} more`

/**
 * One coach as a card of the coach grid. The art and name head the card, with the specialties (up to two lines, so
 * nothing is cut mid-word) and the clubs under the name. The foot is one row: the next opening at the left, Book at
 * the right. The name link covers the card, so the whole card opens the profile; Book sits above that link.
 */
export function CoachCard({
  c,
  s,
  now,
}: {
  c: Coach
  s: Parameters<typeof ptOpenSlots>[0]
  now: number
}) {
  const next = ptOpenSlots(s, c.slug, now)[0]
  return (
    <Card
      as="div"
      className="relative h-full focus-within:bg-muted/40 hover:bg-muted/40"
    >
      <div className="gap-m flex h-full flex-col justify-between text-body-m sm:text-body-s">
        <div className="gap-s flex min-w-0 items-start">
          <CoachArt name={c.name} roles={c.specialties} size={48} />
          <div className="min-w-0">
            <h3 className="truncate font-heavy">
              <Link
                href={`/training/coaches/${c.slug}`}
                className="outline-none after:absolute after:inset-0 after:corner-m focus-visible:underline"
              >
                {c.name}
              </Link>
            </h3>
            <p className="line-clamp-2 text-pretty text-muted-foreground">
              {c.specialties.join(" · ")}
            </p>
            <p className="text-pretty text-muted-foreground">
              {clubPhrase(c.clubs)}
            </p>
          </div>
        </div>
        <div className="gap-s flex items-center justify-between">
          <p className="min-w-0">
            <span className="block text-muted-foreground">Next opening</span>
            <span className="tabular block truncate font-medium">
              {next ? fmtDowTime(next) : "No open times"}
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            className="relative z-10 shrink-0"
            render={<Link href={`/training/coaches/${c.slug}/book`} />}
          >
            Book
            <span className="sr-only"> {c.name}</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function TrainingPage() {
  const { s, me, hh, now } = useApp()
  // TEMPORARY design review switch (lib/empty-preview.ts).
  const preview = useEmptyPreview()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("")
  const [club, setClub] = useState("all")
  const [packOpen, setPackOpen] = useState(false)
  const [pack, setPack] = useState("8")
  const [match, setMatch] = useState(false)
  const [goal, setGoal] = useState("return")
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const left = ptCreditsLeft(hh)
  const nextPt = s.bookings
    .filter(
      (b) =>
        b.kind === "pt" &&
        b.memberId === me.id &&
        b.status === "booked" &&
        b.start > now
    )
    .sort((a, b) => a.start - b.start)[0]
  const list = COACHES.filter(
    (c) =>
      (!filter ||
        c.tags.includes(filter) ||
        c.specialties.some((x) =>
          x.toLowerCase().includes(filter.toLowerCase())
        )) &&
      (club === "all" || c.clubs.includes(club))
  ).sort(
    (a, b) =>
      (ptOpenSlots(s, a.slug, now)[0] ?? 1e15) -
      (ptOpenSlots(s, b.slug, now)[0] ?? 1e15)
  )
  const canBuy = me.role === "primary" || me.role === "adult"
  if (loading)
    return (
      <BookPage>
        <LoadingBlock text="Finding coaches…" rows={4} />
      </BookPage>
    )
  const goalMap: Record<string, string> = {
    return: "Return to training",
    strength: "Olympic lifting",
    swim: "Swim",
    mobility: "Mobility",
    teen: "Youth and teen",
  }
  const clear = () => {
    setFilter("")
    setClub("all")
  }
  return (
    <BookPage
      actions={
        canBuy ? (
          <Button onClick={() => setPackOpen(true)}>Buy a pack</Button>
        ) : null
      }
    >
      <section id="yt" aria-label="Your training">
        <Stats variant="cards">
          <Stat
            icon={Ticket}
            label="Sessions left"
            value={hh.ptPack ? `${left} of ${hh.ptPack.total}` : "No pack"}
          />
          {hh.ptPack ? (
            <Stat
              icon={CalendarDays}
              label="Valid until"
              value={fmtDateFull(hh.ptPack.expiresOn)}
            />
          ) : null}
          {hh.plan === "summit" ? (
            <Stat
              icon={Sparkles}
              label="Summit intro session"
              value={hh.ptIntroLeft}
              hint="Left this quarter"
            />
          ) : null}
          <Stat
            icon={Clock3}
            label="Next session"
            value={
              nextPt
                ? `${fmtDay(nextPt.start)} · ${fmtTime(nextPt.start)}`
                : "Nothing booked"
            }
            hint={
              nextPt
                ? `${nextPt.title.replace("Training with ", "Coach ")} · ${nextPt.place}`
                : undefined
            }
            actions={
              nextPt ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href="/bookings" />}
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link
                        href={`/training/coaches/${nextPt.coachSlug}/book?move=${nextPt.id}`}
                      />
                    }
                  >
                    Move
                  </Button>
                </>
              ) : undefined
            }
          />
        </Stats>
      </section>
      {/* The prices and the Summit card are a column beside the coaches only from 1280px, where the coach grid keeps
          two columns beside them. Below, they follow the coaches, side by side where they fit. */}
      <div className="gap-l grid items-start xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          id="fc"
          aria-labelledby="coaches-head"
          className="gap-s flex min-w-0 flex-col"
        >
          {/* The toolbar every Book tab shares (FilterBar): the club and the specialty; narrow, the specialty is in
              the drawer. */}
          <FilterBar
            club={(className) => (
              <SelectBox
                label="Club"
                hideLabel
                value={club}
                onChange={setClub}
                options={[
                  { value: "all", label: "All clubs" },
                  ...CLUBS.map((c) => ({ value: c.slug, label: c.name })),
                ]}
                className={className}
              />
            )}
            quick={
              <SelectBox
                label="Specialty"
                hideLabel
                className="min-w-0 flex-none"
                value={filter || "all"}
                onChange={(v) => setFilter(v === "all" ? "" : v)}
                options={SPECIALTY_OPTIONS}
              />
            }
            onFilters={() => setFiltersOpen(true)}
            wideSheet={false}
            count={filter ? 1 : 0}
            active={!!filter || club !== "all"}
            onClear={clear}
          />
          {/* The section head, as the day head on Classes: what the list holds, and the shortcut that fills the
              filters for the member. */}
          <div className="gap-s px-xs flex min-h-9 flex-wrap items-center justify-between text-body-s">
            <h2 id="coaches-head" className="gap-xs flex items-baseline">
              <span className="font-heavy">Coaches</span>
              <span className="tabular text-muted-foreground">
                {list.length === COACHES.length
                  ? `${COACHES.length}`
                  : `${list.length} of ${COACHES.length}`}
              </span>
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setMatch(true)}>
              <Sparkles aria-hidden="true" data-icon="inline-start" />
              Match me to a coach
            </Button>
          </div>
          {list.length && preview !== "nomatch" ? (
            <div className="@container">
              <ul
                aria-label="Coaches"
                className="gap-s @lg:gap-m grid @lg:grid-cols-2 @5xl:grid-cols-3"
              >
                {list.map((c) => (
                  <li key={c.id}>
                    <CoachCard c={c} s={s} now={now} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ReserveNotice
              art={<NoticeTile id="whistle" />}
              title="No coach matches these filters"
              actions={
                <Button size="sm" variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
        <div className="@container">
          <div className="gap-m grid items-start @2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* The prices as tiles, so the packs compare at a glance: two by two in the side column, one row at full
                width. The two rules that apply to every pack are one line under them. */}
            <Card id="pk" title="Prices" className="@container">
              <dl className="gap-xs grid grid-cols-2 @lg:grid-cols-4">
                {[
                  { label: "1 session", price: PT_PRICE, each: null },
                  ...PT_PACKS.map((p) => ({
                    label: `${p.sessions} sessions`,
                    price: p.price,
                    each: p.price / p.sessions,
                  })),
                ].map((x) => (
                  <div
                    key={x.label}
                    className="p-s corner-s flex min-w-0 flex-col bg-muted/50 text-body-m sm:text-body-s"
                  >
                    <dt className="truncate text-muted-foreground">
                      {x.label}
                    </dt>
                    <dd className="tabular font-display-wide text-body-l font-heavy">
                      {fmtMoney(x.price, false)}
                    </dd>
                    <dd className="tabular truncate text-muted-foreground">
                      {x.each
                        ? `${fmtMoney(x.each, false)} each`
                        : "Pay as you go"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="pt-s text-body-m text-pretty text-muted-foreground sm:text-body-s">
                Packs last 12 months and pause while your membership is frozen.
              </p>
            </Card>
            {hh.plan !== "summit" && canBuy ? (
              <Card tone="night" as="aside">
                <div className="gap-s flex flex-col items-start text-body-m sm:text-body-s">
                  <div className="gap-s flex items-start">
                    <GymObject id="whistle" cut className="size-12 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-heavy text-balance">
                        1 PT intro session a quarter on Summit
                      </p>
                      {PLANS.summit && PLANS[hh.plan] ? (
                        <p className="tabular text-night-muted">
                          ${PLANS.summit.price - PLANS[hh.plan].price} more a
                          month than {PLANS[hh.plan].name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="!text-night-foreground !ring-night-foreground/40 hover:!bg-night-foreground/10"
                    render={<Link href="/membership/change-plan" />}
                  >
                    Compare plans
                  </Button>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Coach filters"
        show={`Show ${list.length} ${list.length === 1 ? "coach" : "coaches"}`}
      >
        <search className="flex flex-col" aria-label="Coach filters">
          <FilterGroup title="Specialty">
            <RadioList
              label="Specialty"
              value={filter || "all"}
              onChange={(v) => setFilter(v === "all" ? "" : v)}
              options={SPECIALTY_OPTIONS}
            />
          </FilterGroup>
        </search>
      </FilterSheet>
      <Modal
        open={packOpen}
        onOpenChange={setPackOpen}
        title="Buy a training pack"
        description="Pick a pack now and a coach later. Charged to your card on file."
      >
        <RadioList
          label="Pack"
          value={pack}
          onChange={setPack}
          options={PT_PACKS.map((p) => ({
            value: String(p.sessions),
            label: `${p.sessions} sessions · ${fmtMoney(p.price, false)}`,
            help: `${fmtMoney(p.price / p.sessions, false)} each`,
          }))}
        />
        <div className="gap-xs flex justify-end">
          <Button variant="outline" onClick={() => setPackOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const r = buyPack(Number(pack))
              setPackOpen(false)
              if (r)
                toast({
                  title: `Training pack added: ${pack} sessions`,
                  description: `${fmtMoney(r)} · ${hh.card.brand} ending ${hh.card.last4}`,
                })
            }}
          >
            Pay{" "}
            {fmtMoney(PT_PACKS.find((p) => String(p.sessions) === pack)!.price)}{" "}
            and buy
          </Button>
        </div>
      </Modal>
      <Modal
        open={match}
        onOpenChange={setMatch}
        title="Match me to a coach"
        description="One question. We'll filter coaches for you."
      >
        <RadioList
          label="What do you want help with?"
          value={goal}
          onChange={setGoal}
          options={[
            {
              value: "return",
              label: "Coming back after an injury or a break",
            },
            { value: "strength", label: "Lifting and barbell technique" },
            { value: "swim", label: "Swimming" },
            { value: "mobility", label: "Mobility and pickleball" },
            { value: "teen", label: "Youth and teen training" },
          ]}
        />
        <div className="gap-xs flex justify-end">
          <Button variant="outline" onClick={() => setMatch(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setFilter(goalMap[goal])
              setMatch(false)
            }}
          >
            Show matches
          </Button>
        </div>
      </Modal>
    </BookPage>
  )
}
