"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import { GymObject, type ObjectId } from "@/components/brand/graphics"
import { GateAsk, GatePrice, ReserveGate } from "@/components/reserve/empty"
import { Button } from "@/components/ui/button"
import { CLUBS, PLANS } from "@/lib/data/catalog"
import type { Club } from "@/lib/types"

type Sport = Club["courts"][number]["sport"]

// The object that stands for each sport, as on the club pages (spaceObjects in the brand graphics).
export const SPORT_OBJECT: Record<Sport, ObjectId> = {
  pickleball: "paddle",
  tennis: "tennis-ball",
  basketball: "basketball",
}

// The court objects first, so the hub's ring reads as courts before it reads as a gym.
const COURT_ART: ObjectId[] = [
  "paddle",
  "tennis-ball",
  "basketball",
  "sneaker",
  "whistle",
  "water-bottle",
  "towel",
]

/** "4 pickleball and 2 tennis", "6 pickleball". */
const courtWords = (courts: Club["courts"]) =>
  courts.map((c) => `${c.count} ${c.sport}`).join(" and ")

/**
 * Book › Courts for a plan without courts (Trailhead). It answers what the member is missing at their own club, where
 * else the courts are, and what it costs to get them, then offers the one way forward.
 * - The art (ReserveGate): court objects that climb to a lit paddle: an upgrade, drawn with the courts it opens.
 * - The head: what comes with which plan, and one line about the member's own club.
 * - The clubs with courts: each name over its courts, with one object for each sport; the member's club is marked.
 * - The plan row: Ridge's price and the difference, then "Switch to Ridge". Only the primary member can change the plan,
 *   so anyone else is told who can.
 */
export function CourtsLocked() {
  const { s, me, hh } = useApp()
  const withCourts = CLUBS.filter((c) => c.courts.length)
  const home = CLUBS.find((c) => c.slug === me.homeClub)
  const ridge = PLANS.ridge
  const now = PLANS[hh.plan]
  const more = ridge && now ? ridge.price - now.price : 0
  const total = withCourts.reduce(
    (n, c) => n + c.courts.reduce((m, x) => m + x.count, 0),
    0
  )
  const primary = Object.values(s.members).find(
    (m) => m.householdId === hh.id && m.role === "primary"
  )
  const line = home?.courts.length
    ? `${home.name} has ${courtWords(home.courts)} courts. Ridge lets you book them.`
    : `Ridge lets you book ${total} courts at ${withCourts.length} clubs.`

  return (
    <ReserveGate
      art={{ ids: COURT_ART, layout: "climb", focus: "paddle", seed: 3 }}
      pill="Ridge and Summit"
      title="Courts come with Ridge"
      line={line}
      meta={
        ridge ? (
          <GatePrice
            value={`$${ridge.price}`}
            unit="a month on Ridge"
            note={more > 0 ? `$${more} more than ${now.name}` : undefined}
          />
        ) : null
      }
      action={
        me.role === "primary" ? (
          <Button render={<Link href="/membership/change-plan" />}>
            Switch to Ridge
          </Button>
        ) : (
          <GateAsk>
            {primary
              ? `${primary.firstName} manages your plan. Ask them to switch to Ridge.`
              : "The primary member manages your plan."}
          </GateAsk>
        )
      }
    >
      {/* The clubs with courts: a name over its courts, no line beyond the facts. */}
      <ul
        aria-label="Clubs with courts"
        className="gap-x-m gap-y-s grid @lg:grid-cols-3"
      >
        {withCourts.map((c) => (
          <li key={c.slug} className="gap-xxs flex min-w-0 flex-col">
            <p className="gap-x-xs flex flex-wrap items-baseline font-heavy">
              <span className="truncate">{c.name}</span>
              {c.slug === me.homeClub ? (
                <span className="font-medium text-primary">Your club</span>
              ) : null}
            </p>
            {/* One object for each sport, so the clubs read apart at a glance. */}
            <ul className="gap-x-s gap-y-xxs flex flex-wrap text-muted-foreground">
              {c.courts.map((x) => (
                <li key={x.sport} className="tabular gap-xxs flex items-center">
                  <GymObject
                    id={SPORT_OBJECT[x.sport]}
                    className="size-5 shrink-0"
                  />
                  {x.count} {x.sport}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </ReserveGate>
  )
}
