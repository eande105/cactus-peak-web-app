"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { BookPage } from "@/components/book/book-tabs"
import { Toggle } from "@/components/graphical"
import { Card, Facts, Stat, Stats } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { Modal } from "@/components/kit/overlays"
import {
  EmptyState,
  LoadingBlock,
  RadioList,
  SelectBox,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import {
  CLUB_BY_SLUG,
  CLUBS,
  COACH_FILTERS,
  COACHES,
  PT_PACKS,
  PT_PRICE,
} from "@/lib/data/catalog"
import { ptCreditsLeft, ptOpenSlots } from "@/lib/engine"
import { buyPack } from "@/lib/purchases"
import { fmtDateFull, fmtDay, fmtDowTime, fmtMoney, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Coach } from "@/lib/types"

/** The short club name: the cross streets without the city. */
const clubShort = (slug: string) => {
  const name = CLUB_BY_SLUG[slug].name
  return name.split(" – ")[1] ?? name
}

/**
 * One coach as a card of the coach grid. The art and name head the card, with the specialties and clubs as quiet
 * lines under the name. The next opening and Book sit together under them, top-aligned. The name link covers the
 * card, so the whole card opens the profile. Book sits above that link.
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
      <div className="gap-m flex h-full flex-col text-body-m sm:text-body-s">
        <div className="gap-s flex min-w-0 items-center">
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
            <p className="truncate text-muted-foreground">
              {c.specialties.join(" · ")}
            </p>
            <p className="truncate text-muted-foreground">
              {c.clubs.map(clubShort).join(", ")}
            </p>
          </div>
        </div>
        <div className="gap-xs flex flex-col items-start">
          <p className="gap-xs flex flex-wrap">
            <span className="text-muted-foreground">Next opening</span>
            <span className="tabular font-medium">
              {next ? fmtDowTime(next) : "No open times"}
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            className="relative z-10"
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
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("")
  const [club, setClub] = useState("all")
  const [packOpen, setPackOpen] = useState(false)
  const [pack, setPack] = useState("8")
  const [match, setMatch] = useState(false)
  const [goal, setGoal] = useState("return")
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
        <>
          <Button variant="outline" onClick={() => setMatch(true)}>
            Match me to a coach
          </Button>
          {canBuy ? (
            <Button onClick={() => setPackOpen(true)}>Buy a pack</Button>
          ) : null}
        </>
      }
    >
      <section id="yt" aria-label="Your training">
        <Stats>
          <Stat
            label="Sessions left"
            value={hh.ptPack ? `${left} of ${hh.ptPack.total}` : "No pack"}
          />
          {hh.ptPack ? (
            <Stat
              label="Valid until"
              value={fmtDateFull(hh.ptPack.expiresOn)}
            />
          ) : null}
          {hh.plan === "summit" ? (
            <Stat
              label="Summit intro session"
              value={hh.ptIntroLeft}
              hint="Left this quarter"
            />
          ) : null}
          <Stat
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
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          id="fc"
          aria-label="Coaches"
          className="gap-m flex min-w-0 flex-col"
        >
          <div className="gap-s flex flex-wrap items-center justify-between">
            <ul
              aria-label="Specialty"
              className="gap-xs flex min-w-0 flex-1 flex-wrap p-xxs"
            >
              {COACH_FILTERS.map((x) => (
                <li key={x} className="shrink-0">
                  <Toggle
                    pressed={filter === x}
                    onPressedChange={() => setFilter(filter === x ? "" : x)}
                    className="corner-full max-md:min-h-11"
                  >
                    {x}
                  </Toggle>
                </li>
              ))}
            </ul>
            <SelectBox
              label="Club"
              hideLabel
              value={club}
              onChange={setClub}
              options={[
                { value: "all", label: "All clubs" },
                ...CLUBS.map((c) => ({ value: c.slug, label: c.name })),
              ]}
              className="w-full shrink-0 sm:w-52"
            />
          </div>
          {list.length ? (
            <div className="@container">
              <ul
                aria-label="Coaches"
                className="gap-m grid @lg:grid-cols-2 @4xl:grid-cols-3"
              >
                {list.map((c) => (
                  <li key={c.id}>
                    <CoachCard c={c} s={s} now={now} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No coach matches."
              action={
                <Button size="sm" variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
        <div className="gap-l flex min-w-0 flex-col">
          <Card id="pk" title="Prices">
            <Facts
              items={[
                { label: "Single session", value: fmtMoney(PT_PRICE, false) },
                ...PT_PACKS.map((p) => ({
                  label: `${p.sessions} sessions`,
                  value: fmtMoney(p.price, false),
                  hint: `${fmtMoney(p.price / p.sessions, false)} each`,
                })),
                { label: "Pack validity", value: "12 months" },
                { label: "During a freeze", value: "Pack pauses" },
              ]}
            />
          </Card>
          {hh.plan !== "summit" && canBuy ? (
            <Card tone="night" as="aside">
              <div className="gap-s flex flex-col items-start">
                <p className="text-body-m font-heavy text-balance sm:text-body-s">
                  Summit includes a PT intro session every quarter.
                </p>
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
