"use client"
import { useEffect, useRef, useState } from "react"
import { Popover, Toggle, ToggleGroup } from "@/components/graphical"
import { CalendarDays, ChevronLeft, ChevronRight } from "@/components/icons"
import { MiniCalendar } from "@/components/kit/calendar"
import { Tip } from "@/components/kit/tip"
import { Button } from "@/components/ui/button"
import { opensAt } from "@/lib/engine"
import {
  addDays,
  DAY,
  DOW,
  dateKey,
  dayStart,
  fmtDay,
  fmtTime,
  parts,
} from "@/lib/time"
import { cn } from "@/lib/utils"

export function dayLabel(day: number, today: number) {
  const diff = Math.round((day - dayStart(today)) / DAY)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `${DOW[parts(day).dow]} ${parts(day).d}`
}

/**
 * The day control of a booking screen: previous day, one segment for each day in the booking window, next day, and
 * "Choose date" for a day outside the row. The segments scroll sideways on a narrow screen.
 */
export function DayStrip({
  selected,
  onSelect,
  now,
  windowDays,
  count,
  marks,
  days = windowDays + 1,
  label = "Choose a day",
  className,
}: {
  selected: number
  onSelect: (d: number) => void
  now: number
  windowDays: number
  count?: (d: number) => number
  marks?: Set<string>
  days?: number
  label?: string
  className?: string
}) {
  const today = dayStart(now)
  const sel = dayStart(selected)
  const list = Array.from({ length: days }, (_, i) => addDays(today, i))
  const [cal, setCal] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const status = (d: number) => {
    const o = opensAt(d + 9 * 3600_000, windowDays)
    return now >= o ? null : `Opens ${fmtDay(o)} at ${fmtTime(o)}`
  }
  // Previous and next can move the selected day out of view, so the row follows it.
  useEffect(() => {
    const box = track.current
    const el =
      box?.querySelector<HTMLElement>(`[data-day="${sel}"]`) ??
      box?.querySelector<HTMLElement>("[data-pressed]")
    if (!box || !el) return
    const a = el.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    if (a.left < b.left) box.scrollLeft += a.left - b.left
    else if (a.right > b.right) box.scrollLeft += a.right - b.right
  }, [sel])
  return (
    <div className={cn("gap-xs flex items-center", className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous day"
        disabled={sel <= today}
        onClick={() => onSelect(addDays(sel, -1))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <div
        ref={track}
        className="min-w-0 flex-1 snap-x scrollbar-none overflow-x-auto"
      >
        {/* One day at a time, so this is a single-choice group. The group owns arrow-key focus. */}
        <ToggleGroup
          aria-label={label}
          value={[String(sel)]}
          onValueChange={(v) => {
            // A press on the selected day would empty the group, so ignore it.
            if (v[0] !== undefined) onSelect(Number(v[0]))
          }}
          className="flex w-max"
        >
          {list.map((d) => {
            const closed = status(d)
            const on = sel === d
            const n = count?.(d)
            const marked = marks?.has(dateKey(d))
            return (
              <Tip key={d} content={closed}>
                <Toggle
                  value={String(d)}
                  data-day={d}
                  className="gap-xs px-s flex shrink-0 snap-start items-center text-body-m font-medium whitespace-nowrap max-md:!min-h-11 sm:text-body-s md:!min-h-9"
                >
                  <span
                    className={cn(closed && !on && "text-muted-foreground")}
                  >
                    {dayLabel(d, now)}
                  </span>
                  {n !== undefined && !closed ? (
                    <span
                      className={cn("tabular", !on && "text-muted-foreground")}
                    >
                      {n}
                      <span className="sr-only"> classes</span>
                    </span>
                  ) : closed ? (
                    <span className="sr-only">Not open</span>
                  ) : null}
                  {marked ? (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 shrink-0 corner-full",
                          // The dot takes the text color on the selected day, so it shows on any selected fill.
                          on ? "bg-current" : "bg-primary"
                        )}
                      />
                      <span className="sr-only">You have a booking</span>
                    </>
                  ) : null}
                </Toggle>
              </Tip>
            )
          })}
        </ToggleGroup>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next day"
        onClick={() => onSelect(addDays(sel, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      <Popover.Root open={cal} onOpenChange={setCal}>
        <Popover.Trigger className="!gap-xs !inline-flex !min-h-11 !shrink-0 !items-center !bg-transparent text-body-m font-medium !whitespace-nowrap hover:!bg-muted sm:text-body-s md:!min-h-9">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span className="max-md:sr-only">Choose date</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={6}>
            <Popover.Popup className="!w-auto">
              <Popover.Title className="sr-only">Choose a date</Popover.Title>
              <MiniCalendar
                today={now}
                selected={selected}
                onSelect={(d) => {
                  onSelect(d)
                  setCal(false)
                }}
                marks={marks}
                disabled={(d) => (d < today ? "Past" : false)}
              />
              <p className="text-body-m text-muted-foreground sm:text-body-s">
                Arizona time (no daylight saving)
              </p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
