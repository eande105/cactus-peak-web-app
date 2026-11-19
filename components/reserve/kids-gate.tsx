"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import type { ObjectId } from "@/components/brand/graphics"
import { GateAsk, GatePrice, ReserveGate } from "@/components/reserve/empty"
import { Button } from "@/components/ui/button"
import { CHILD_ADDON, CLUBS } from "@/lib/data/catalog"
import { KIDS_BLOCKS } from "@/lib/engine"
import { atTime, dayStart, fmtRange } from "@/lib/time"

// The kids club objects, the playground first, so the arc reads as play before it reads as a gym.
const KIDS_ART: ObjectId[] = [
  "playground",
  "cone",
  "tennis-ball",
  "basketball",
  "whistle",
  "sneaker",
  "water-bottle",
]

/**
 * Book › Kids club for a household with no child on the plan. The same frame as the Courts gate, with its own art and
 * facts: what the member's club runs, the four blocks of a day (the thing they would book), and the price of adding a
 * child. Only the primary member can add one, so anyone else is told who can.
 */
export function KidsGate() {
  const { s, me, hh, now } = useApp()
  const clubs = CLUBS.filter((c) => c.kidsClub)
  const home = CLUBS.find((c) => c.slug === me.homeClub)
  const primary = Object.values(s.members).find(
    (m) => m.householdId === hh.id && m.role === "primary"
  )
  const today = dayStart(now)
  const line = home?.kidsClub
    ? `${home.name} runs kids club Monday to Saturday. Add a child to book it.`
    : `Kids club runs at ${clubs.length} clubs, Monday to Saturday. Add a child to book it.`
  return (
    <ReserveGate
      art={{ ids: KIDS_ART, layout: "ascent", focus: "playground", seed: 5 }}
      pill="Child add-on"
      title="Kids club starts with a child on your plan"
      line={line}
      meta={
        CHILD_ADDON ? (
          <GatePrice value={`$${CHILD_ADDON}`} unit="a month for each child" />
        ) : null
      }
      action={
        me.role === "primary" ? (
          <Button render={<Link href="/family/add" />}>Add a child</Button>
        ) : (
          <GateAsk>
            {primary
              ? `${primary.firstName} manages your household. Ask them to add a child.`
              : "The primary member manages your household."}
          </GateAsk>
        )
      }
    >
      {/* The four blocks of a day, as the member would pick them. The rule is the heading, not a line under it. */}
      <div className="gap-xs flex flex-col">
        <h3 className="font-heavy">Up to 2 blocks for each child a day</h3>
        <ul
          aria-label="Kids club blocks"
          className="gap-xs grid grid-cols-2 @lg:grid-cols-4"
        >
          {KIDS_BLOCKS.map((k) => (
            <li
              key={k.id}
              className="tabular p-s corner-s bg-muted/50 text-center font-medium"
            >
              {fmtRange(atTime(today, k.from), atTime(today, k.to))}
            </li>
          ))}
        </ul>
      </div>
    </ReserveGate>
  )
}
