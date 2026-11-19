"use client"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { ScheduleRow } from "@/components/booking/class-row"
import { ListRows } from "@/components/booking/parts"
import { Card } from "@/components/kit/app"
import { plural } from "@/components/today/sections"
import { Button } from "@/components/ui/button"
import { sessionLeft } from "@/lib/engine"
import { bandOf } from "@/lib/schedule-filters"
import type { Session } from "@/lib/types"

type Part = "morning" | "midday" | "evening"

// The early band is too short to stand alone, so it joins the morning. The range is the description, because
// "Midday" alone does not say where it starts and ends.
const PARTS: { id: Part; title: string; range: string }[] = [
  { id: "morning", title: "Morning", range: "Before noon" },
  { id: "midday", title: "Midday", range: "Noon to 4 pm" },
  { id: "evening", title: "Evening", range: "From 4 pm" },
]

const partOf = (ms: number): Part => {
  const b = bandOf(ms)
  return b === "early" ? "morning" : b
}

/**
 * The day's timetable as Home's cards: one card for each part of the day, with the range and the count in the head
 * and the class rows inside. A member who knows when they are free goes straight to that card. On today, a part of
 * the day that has started in full is folded to its head, so the classes the member can still take come first.
 * Remount it (a `key` on the date) so a new day starts with its own folds.
 */
export function TimeSections({
  sessions,
  showClub,
  query,
}: {
  sessions: Session[]
  showClub?: boolean
  query?: string
}) {
  const { s, now } = useApp()
  const [opened, setOpened] = useState<Set<Part>>(new Set())
  const toggle = (p: Part) =>
    setOpened((o) => {
      const n = new Set(o)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
  return PARTS.map((p) => {
    const list = sessions.filter((x) => partOf(x.start) === p.id)
    if (!list.length) return null
    const over = list.every((x) => x.start <= now)
    const open = list.filter(
      (x) => x.start > now && sessionLeft(s, x) > 0
    ).length
    const shown = !over || opened.has(p.id)
    const rowsId = `part-${p.id}`
    return (
      <Card
        key={p.id}
        display
        compact
        flush
        title={p.title}
        description={
          over
            ? `${p.range} · ${list.length === 1 ? "Started" : "All started"}`
            : `${p.range} · ${plural(list.length, "class")}${open < list.length ? `, ${open} with room` : ""}`
        }
        action={
          over ? (
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={shown}
              aria-controls={rowsId}
              onClick={() => toggle(p.id)}
            >
              {shown ? "Hide" : "Show"}
            </Button>
          ) : null
        }
      >
        {shown ? (
          <div id={rowsId}>
            <ListRows label={`${p.title} classes`}>
              {list.map((x) => (
                <ScheduleRow
                  key={x.id}
                  se={x}
                  inset="m"
                  showClub={showClub}
                  query={query}
                />
              ))}
            </ListRows>
          </div>
        ) : undefined}
      </Card>
    )
  })
}
