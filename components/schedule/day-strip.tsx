"use client"
import { useEffect, useRef, useState } from "react"
import { Popover, Toggle, ToggleGroup } from "@/components/graphical"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons"
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
  fmtDayShort,
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
 * The day control of a booking screen. Where the control is wide enough: previous day, one segment for each day in
 * the booking window, next day, and "Choose date" for a day outside the row. Where it is not (a phone, a tablet, a
 * laptop with the sidebar), that row would scroll and cut a day in half, so it is: previous day, the chosen day as a
 * button that opens the calendar, and next day.
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
  stepper,
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
  /**
   * One joined control, "‹ | Today, Oct 27 ▾ | ›", on the card fill with its own edge, so it reads apart from the
   * filters around it. `fit` takes the width of its content (a toolbar row); `fill` takes the width of its row (a phone).
   */
  stepper?: "fit" | "fill"
  className?: string
}) {
  const today = dayStart(now)
  const sel = dayStart(selected)
  const list = Array.from({ length: days }, (_, i) => addDays(today, i))
  const [cal, setCal] = useState(false)
  const [phoneCal, setPhoneCal] = useState(false)
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
  const calendar = (align: "center" | "end") => (
    <Popover.Portal>
      <Popover.Positioner align={align} sideOffset={6}>
        <Popover.Popup className="!w-auto">
          <Popover.Title className="sr-only">Choose a date</Popover.Title>
          <MiniCalendar
            today={now}
            selected={selected}
            onSelect={(d) => {
              onSelect(d)
              setCal(false)
              setPhoneCal(false)
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
  )
  const rel = Math.round((sel - today) / DAY)
  const short =
    rel === 0
      ? `Today, ${fmtDayShort(sel)}`
      : rel === 1
        ? `Tomorrow, ${fmtDayShort(sel)}`
        : fmtDay(sel)
  const closedSel = status(sel)
  if (stepper) {
    const has = marks?.has(dateKey(sel))
    return (
      // biome-ignore lint/a11y/useSemanticElements: a group of three buttons; a fieldset would add a legend and a border
      <div
        role="group"
        aria-label={label}
        className={cn(
          stepper === "fit" ? "inline-flex" : "flex w-full",
          "corner-s items-center bg-card hairline ring-input",
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label="Previous day"
          disabled={sel <= today}
          onClick={() => onSelect(addDays(sel, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Popover.Root open={phoneCal} onOpenChange={setPhoneCal}>
          <Popover.Trigger
            aria-label={`${label}: ${fmtDay(sel)}${has ? ", you have a booking" : ""}${closedSel ? `, ${closedSel}` : ""}`}
            className={cn(
              "!gap-xs !px-s !py-zero !flex !h-9 !min-h-0 !items-center !justify-center !corner-zero !bg-transparent text-body-s font-medium !whitespace-nowrap !shadow-none rule-l rule-r hover:!bg-muted/60 max-md:!h-11",
              // A fixed minimum, so a longer day name does not move the arrows as the member steps through days.
              stepper === "fill" ? "!min-w-0 !flex-1" : "!min-w-44"
            )}
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span className="tabular min-w-0 truncate">{short}</span>
            {has ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 corner-full bg-primary"
              />
            ) : null}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Popover.Trigger>
          {calendar(stepper === "fit" ? "end" : "center")}
        </Popover.Root>
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label="Next day"
          onClick={() => onSelect(addDays(sel, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    )
  }
  // The full row needs about 75 px for each day and 260 px for the arrows and "Choose date", so the width it needs
  // follows the number of days. The class names are written out in full so Tailwind finds them.
  const [compactOnly, fullOnly] =
    list.length <= 5
      ? ["@3xl:hidden", "@max-3xl:hidden"]
      : list.length <= 8
        ? ["@4xl:hidden", "@max-4xl:hidden"]
        : ["@5xl:hidden", "@max-5xl:hidden"]
  return (
    <div className={cn("@container", className)}>
      {/* Where the full row would not fit: previous, the chosen day as one button that opens the calendar, and next. The row has a fixed
          height and its middle button takes the free width, so a longer day name does not move the arrows. */}
      <div className={cn("gap-xs flex items-center", compactOnly)}>
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label="Previous day"
          disabled={sel <= today}
          onClick={() => onSelect(addDays(sel, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Popover.Root open={phoneCal} onOpenChange={setPhoneCal}>
          <Popover.Trigger
            aria-label={`${label}: ${fmtDay(sel)}${marks?.has(dateKey(sel)) ? ", you have a booking" : ""}${closedSel ? `, ${closedSel}` : ""}`}
            className="!gap-xs !flex !min-h-11 !min-w-0 !flex-1 !items-center !justify-center text-body-s font-medium !whitespace-nowrap"
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span className="tabular min-w-0 truncate">{short}</span>
            {marks?.has(dateKey(sel)) ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 corner-full bg-primary"
              />
            ) : null}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Popover.Trigger>
          {calendar("center")}
        </Popover.Root>
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label="Next day"
          onClick={() => onSelect(addDays(sel, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {/* Where it fits: the full row of days. */}
      <div className={cn("gap-xs flex items-center", fullOnly)}>
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
                        className={cn(
                          "tabular",
                          !on && "text-muted-foreground"
                        )}
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
          {calendar("end")}
        </Popover.Root>
      </div>
    </div>
  )
}
