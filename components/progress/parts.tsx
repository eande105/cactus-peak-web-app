"use client"
import type { CSSProperties, ReactNode } from "react"
import { IconTile } from "@/components/account/screen"
import { BarList, Th } from "@/components/app/screen-parts"
import { GymObject, type ObjectId } from "@/components/brand/graphics"
import {
  CalendarDays,
  CircleCheck,
  Clock,
  type IconComponent,
  Moon,
  Sun,
  Sunrise,
} from "@/components/icons"
import { Card } from "@/components/kit/app"
import { CATEGORY_BY_ID } from "@/lib/data/catalog"
import type {
  DayPartId,
  Milestone,
  MilestoneKind,
  MixRow,
  WeekBar,
} from "@/lib/progress"
import { DOW, DOW_LONG, fmtDay, hourLabel } from "@/lib/time"
import { cn } from "@/lib/utils"

/**
 * One headline number at the top of Progress: an icon tile and the title, the value in the large type with its unit,
 * an optional meter, and one line of context. `night` is the one dark tile of the screen (the streak).
 */
export function KpiTile({
  icon,
  title,
  value,
  unit,
  meter,
  line,
  night,
  className,
}: {
  icon: IconComponent
  title: string
  value: ReactNode
  unit?: ReactNode
  meter?: ReactNode
  line?: ReactNode
  night?: boolean
  className?: string
}) {
  return (
    <section
      className={cn(
        "gap-s p-m flex min-w-0 flex-col corner-m",
        night ? "bg-night text-night-foreground" : "raised",
        className
      )}
    >
      <h2
        className={cn(
          "gap-xs flex items-center text-body-s leading-tight font-medium",
          night ? "text-night-foreground" : "text-muted-foreground"
        )}
      >
        <IconTile
          icon={icon}
          tone={night ? "muted" : "accent"}
          className={cn(
            "size-7",
            night && "bg-night-foreground/15 text-night-foreground"
          )}
        />
        <span className="min-w-0 truncate">{title}</span>
      </h2>
      <p className="gap-x-xs flex flex-wrap items-baseline">
        <span className="tabular font-display-wide text-display-xs leading-none font-heavy sm:text-display-s">
          {value}
        </span>
        {unit ? (
          <span
            className={cn(
              "tabular text-body-m",
              night ? "text-night-foreground/80" : "text-muted-foreground"
            )}
          >
            {unit}
          </span>
        ) : null}
      </p>
      {meter}
      {line ? (
        <p
          className={cn(
            "tabular mt-auto text-body-s text-pretty",
            night ? "text-night-foreground/80" : "text-muted-foreground"
          )}
        >
          {line}
        </p>
      ) : null}
    </section>
  )
}

/** A thin progress bar from 0 to 1. Decorative: the number beside it is the text form. */
export function ProgressBar({
  value,
  done,
  className,
}: {
  value: number
  done?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block h-1.5 overflow-hidden corner-full bg-muted",
        className
      )}
    >
      <span
        className={cn(
          "block h-full w-(--fill) corner-full",
          done ? "bg-success" : "bg-night dark:bg-neutral-8"
        )}
        style={
          {
            "--fill": `${Math.max(0, Math.min(1, value)) * 100}%`,
          } as CSSProperties
        }
      />
    </span>
  )
}

/**
 * Class mix: one bar split by category in proportion to its visits, most first from the left, and a legend table
 * under it with the count and share of each. The table holds every number, so the bar can stay a picture.
 */
export function ClassMix({
  rows,
  total,
  scope,
  className,
}: {
  rows: MixRow[]
  total: number
  /** The range in words: "4 weeks". */
  scope: string
  className?: string
}) {
  return (
    <Card
      title="Class mix"
      description={
        total
          ? `${total} ${total === 1 ? "class" : "classes"} in ${scope}`
          : undefined
      }
      className={className}
    >
      {total ? (
        <div className="gap-m flex flex-col">
          {/* A 2 px gap of card colour between segments, so two neighbours never merge. */}
          <div
            aria-hidden="true"
            className="flex h-3 gap-[2px] overflow-hidden corner-full"
          >
            {rows.map((r) => (
              <span
                key={r.id}
                className={cn(`cat-${r.id}`, "min-w-1 basis-0 bg-cat")}
                style={{ flexGrow: r.n }}
              />
            ))}
          </div>
          <table className="w-full text-body-m sm:text-body-s">
            <caption className="sr-only">
              Classes by category in {scope}
            </caption>
            <thead>
              <tr className="rule-b">
                <Th>Class</Th>
                <Th end>Visits</Th>
                <Th end className="w-16">
                  Share
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn(`cat-${r.id}`, "[&+tr]:rule-t")}>
                  <th scope="row" className="py-xs text-left font-regular">
                    <span className="gap-xs flex min-w-0 items-center">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 corner-full bg-cat"
                      />
                      <span className="min-w-0 truncate">
                        {CATEGORY_BY_ID[r.id].name}
                      </span>
                    </span>
                  </th>
                  <td className="tabular py-xs text-right font-medium">
                    {r.n}
                  </td>
                  <td className="tabular py-xs text-right text-muted-foreground">
                    {r.share}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-body-m text-muted-foreground sm:text-body-s">
          No classes in {scope}.
        </p>
      )}
    </Card>
  )
}

const DAY_PART: Record<
  DayPartId,
  { name: string; icon: IconComponent; hours: string }
> = {
  morning: { name: "Morning", icon: Sunrise, hours: `before ${hourLabel(12)}` },
  afternoon: { name: "Afternoon", icon: Sun, hours: `12–${hourLabel(17)}` },
  evening: { name: "Evening", icon: Moon, hours: `from ${hourLabel(17)}` },
}

/** A sub-heading inside a card: an icon and a title. */
function SubHead({
  icon: Icon,
  children,
}: {
  icon: IconComponent
  children: ReactNode
}) {
  return (
    <h3 className="gap-xs flex items-center text-body-m font-heavy sm:text-body-s">
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      {children}
    </h3>
  )
}

/**
 * When you visit: a column for each weekday, Monday first, with its count over the column, and the visits by time of
 * day as a ranked list. Each count is text; the columns and bars are pictures of it.
 */
export function VisitPattern({
  days,
  dayParts,
  scope,
  className,
}: {
  days: { dow: number; n: number }[]
  dayParts: { id: DayPartId; n: number; share: number }[]
  scope: string
  className?: string
}) {
  const max = Math.max(1, ...days.map((d) => d.n))
  const top = days.reduce((a, b) => (b.n > a.n ? b : a), days[0])
  const total = dayParts.reduce((a, p) => a + p.n, 0)
  const lead = dayParts.reduce((a, b) => (b.n > a.n ? b : a), dayParts[0])
  return (
    <Card
      title="When you visit"
      description={`In ${scope}`}
      className={className}
    >
      <div className="gap-l @container grid">
        <div className="gap-s flex flex-col">
          <SubHead icon={CalendarDays}>
            {top.n ? `Most on ${DOW_LONG[top.dow]}s` : "Days"}
          </SubHead>
          <ul
            aria-label={`Visits by weekday in ${scope}`}
            className="gap-xs grid grid-cols-7 items-end"
          >
            {days.map((d) => (
              <li
                key={d.dow}
                className="gap-xxs flex min-w-0 flex-col items-center"
              >
                <span className="sr-only">
                  {DOW_LONG[d.dow]}: {d.n} {d.n === 1 ? "visit" : "visits"}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "tabular text-body-s",
                    d === top && d.n ? "font-heavy" : "text-muted-foreground"
                  )}
                >
                  {d.n}
                </span>
                <span aria-hidden="true" className="flex h-16 w-full items-end">
                  <span
                    className={cn(
                      "mx-auto w-full max-w-8 corner-t-xs",
                      d === top && d.n
                        ? "bg-night dark:bg-neutral-8"
                        : "bg-night/35 dark:bg-neutral-8/40"
                    )}
                    style={{ height: d.n ? `${(d.n / max) * 100}%` : "2px" }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="text-body-xs font-medium text-muted-foreground"
                >
                  {DOW[d.dow]}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="gap-s flex flex-col">
          <SubHead icon={Clock}>
            {lead.n
              ? `Mostly in the ${DAY_PART[lead.id].name.toLowerCase()}`
              : "Time of day"}
          </SubHead>
          <BarList
            label={`Visits by time of day in ${scope}`}
            max={Math.max(1, total)}
            items={dayParts.map((p) => {
              const part = DAY_PART[p.id]
              const Icon = part.icon
              return {
                key: p.id,
                label: (
                  <span className="gap-xs flex min-w-0 items-center">
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {part.name}{" "}
                      <span className="text-muted-foreground">
                        {part.hours}
                      </span>
                    </span>
                  </span>
                ),
                value: p.n,
              }
            })}
          />
        </div>
      </div>
    </Card>
  )
}

const MILESTONE_OBJECT: Record<MilestoneKind, ObjectId> = {
  visits: "sneaker",
  streak: "calendar",
  variety: "gym-bag",
  swim: "wave",
}

// One column for each card in progress, so the last row never holds a lone card.
const NEXT_COLS: Record<number, string> = {
  1: "@sm:grid-cols-1",
  2: "@sm:grid-cols-2",
  3: "@sm:grid-cols-3",
}

/**
 * Milestones: one card for each track still in progress (the object, the name, "148 of 150" and a bar), then the
 * earned ones as a compact row of badges with the date when it is known. The objects use the cut tile, which keeps its
 * own field colour, so they read on the card in both themes.
 */
export function MilestoneGrid({
  next,
  earned,
  className,
}: {
  next: Milestone[]
  earned: Milestone[]
  className?: string
}) {
  return (
    <Card title="Milestones" className={className}>
      <div className="gap-m @container flex flex-col">
        {next.length ? (
          <ul
            aria-label="In progress"
            className={cn("gap-s grid grid-cols-1", NEXT_COLS[next.length])}
          >
            {next.map((m) => (
              <li
                key={m.key}
                className="gap-s p-s flex min-w-0 items-center corner-m bg-muted/50 @sm:flex-col @sm:items-start"
              >
                <GymObject
                  id={MILESTONE_OBJECT[m.kind]}
                  cut
                  className="size-12 shrink-0"
                />
                <span className="gap-xxs flex w-full min-w-0 flex-1 flex-col text-body-m sm:text-body-s">
                  <span className="truncate font-medium">{m.title}</span>
                  <span className="tabular truncate text-muted-foreground">
                    {Math.min(m.value, m.target)} of {m.target}
                    {m.unit ? ` ${m.unit}` : ""}
                  </span>
                  <ProgressBar value={m.value / m.target} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {earned.length ? (
          <div className="gap-xs flex flex-col">
            <SubHead icon={CircleCheck}>Earned</SubHead>
            <ul className="gap-xs flex flex-wrap">
              {earned.map((m) => (
                <li
                  key={m.key}
                  className="gap-xs py-xxs pr-s pl-xxs flex min-w-0 items-center corner-full bg-muted/50 text-body-s"
                >
                  <GymObject
                    id={MILESTONE_OBJECT[m.kind]}
                    cut
                    className="size-7 shrink-0"
                  />
                  <span className="font-medium">{m.title}</span>
                  {m.at ? (
                    <span className="tabular text-muted-foreground">
                      {fmtDay(m.at)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

/**
 * The last weeks as a row of small marks, oldest first, on the night tile: a solid mark for a week that met the goal,
 * an outline for a week that did not, and a dashed outline for this week until it meets the goal.
 */
export function WeekMarks({ weeks }: { weeks: WeekBar[] }) {
  const met = weeks.filter((w) => w.state === "met").length
  return (
    <span
      role="img"
      aria-label={`Goal met in ${met} of the last ${weeks.length} weeks, this week included`}
      className="gap-xxs flex items-end"
    >
      {weeks.map((w) => (
        <span
          key={w.start}
          className={cn(
            "h-4 w-2.5 corner-xs",
            w.state === "met"
              ? "bg-night-foreground"
              : w.state === "current"
                ? "border border-dashed border-night-foreground/70"
                : "border border-night-foreground/40"
          )}
        />
      ))}
    </span>
  )
}
