"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { BusyWord } from "@/components/clubs/parts"
import { ChevronRight, Lock } from "@/components/icons"
import { CategoryIcon } from "@/components/kit/icons"
import { busyTone, RibMeter } from "@/components/kit/ribs"
import { StatusPill } from "@/components/kit/ui"
import { areasOf, BUSY_WORDS, type CLUBS } from "@/lib/data/catalog"
import {
  areaCrowd,
  hourStart,
  nextCourtOpen,
  nextKidsOpen,
  nextLaneOpen,
  usually,
} from "@/lib/engine"
import { dayStart, fmtDowTime, fmtTime } from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

type Club = (typeof CLUBS)[number]

/** One bookable thing in a row: its category object, a short label, and the value a member compares. */
type Fact = {
  key: string
  cat: CategoryId
  label: string
  value: string
  /** Off: the club does not have it, or nothing is open. The value is muted. */
  on: boolean
}

// Courts, lap lanes and kids club always take the same three slots, so the clubs compare down the list.
function facts(
  club: Club,
  court: ReturnType<typeof nextCourtOpen>,
  lane: ReturnType<typeof nextLaneOpen>,
  kids: ReturnType<typeof nextKidsOpen>,
  now: number
): Fact[] {
  return [
    {
      key: "courts",
      cat: "court",
      label: "Courts",
      value: !club.courts.length
        ? "Not here"
        : court
          ? dayStart(court.start) === dayStart(now)
            ? `Next ${fmtTime(court.start)}`
            : `Next ${fmtDowTime(court.start)}`
          : "None soon",
      on: !!court,
    },
    {
      key: "lanes",
      cat: "aqua",
      label: "Lap lanes",
      value: !club.pool
        ? "Not here"
        : lane
          ? `${lane.open} open`
          : "Full today",
      on: !!lane,
    },
    {
      key: "kids",
      cat: "youth",
      label: "Kids club",
      value: !club.kidsClub
        ? "Not here"
        : kids
          ? `${kids.left} spots`
          : "Full today",
      on: !!kids,
    },
  ]
}

// A list narrower than 23rem stacks the three facts as label and value rows; a wider list puts them side by side.
function FactTile({ f }: { f: Fact }) {
  return (
    <li className="gap-xs flex min-w-0 items-center">
      <span
        aria-hidden="true"
        className={cn(
          "@[23rem]/list:corner-s grid size-6 shrink-0 place-items-center corner-xs @[23rem]/list:size-8",
          f.on
            ? `cat-${f.cat} bg-cat-tint text-cat-text`
            : "bg-muted text-muted-foreground/70"
        )}
      >
        <CategoryIcon id={f.cat} className="size-3.5 @[23rem]/list:size-4" />
      </span>
      <div className="gap-xs flex min-w-0 flex-1 items-baseline justify-between leading-tight @[23rem]/list:block">
        <span className="truncate text-body-s text-muted-foreground @[23rem]/list:block @[23rem]/list:text-body-xs">
          {f.label}
        </span>
        <span
          className={cn(
            "tabular shrink-0 truncate text-body-s @[23rem]/list:block",
            f.on ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {f.value}
        </span>
      </div>
    </li>
  )
}

/**
 * One club in the list, in three layers:
 * 1. Who it is: the name, the Home or plan pill, then the city and the distance.
 * 2. How busy it is now, at the right: the word in its status colour over the same meter as the map pin.
 * 3. What a member can book next (courts, lap lanes, kids club) in three fixed slots. On a wide list the club's areas
 *    follow, worded "Usually …" because they are typical, not live. Narrow lists leave the areas to the club page.
 * The name link covers the whole row. `active` is true while the row or its map pin has the pointer or focus.
 */
export function ClubRow({
  club,
  home,
  locked,
  open,
  level,
  distance,
  active,
  onActive,
}: {
  club: Club
  home: boolean
  locked: boolean
  open: boolean
  level: number
  /** Miles from the member, when the member shared a location. */
  distance?: number
  active: boolean
  onActive: (on: boolean) => void
}) {
  const { s, now } = useApp()
  const list = facts(
    club,
    nextCourtOpen(s, club.slug, now),
    nextLaneOpen(s, club.slug, now),
    nextKidsOpen(s, club.slug, now),
    now
  )
  const areas = areasOf(club.slug).map((a) => ({
    key: a.area,
    label: a.label,
    crowd: areaCrowd(a, hourStart(now)),
  }))
  return (
    <li
      id={`club-${club.slug}`}
      onMouseEnter={() => onActive(true)}
      onMouseLeave={() => onActive(false)}
      className={cn(
        "gap-s p-m scroll-my-m relative flex flex-col corner-m transition-colors",
        "hover:bg-muted/60",
        active && "bg-muted/60"
      )}
    >
      <div className="gap-s flex items-start">
        <div className="min-w-0 flex-1">
          <h2 className="gap-x-xs gap-y-xxs flex flex-wrap items-center">
            <Link
              href={`/clubs/${club.slug}`}
              onFocus={() => onActive(true)}
              onBlur={() => onActive(false)}
              className="text-body-l font-heavy outline-none after:absolute after:inset-0 after:corner-m focus-visible:after:outline-2 focus-visible:after:outline-ring"
            >
              {club.name}
            </Link>
            {home ? <StatusPill tone="accent">Home</StatusPill> : null}
            {locked ? (
              <StatusPill icon={Lock}>Ridge or Summit</StatusPill>
            ) : null}
          </h2>
          <p className="tabular text-body-s text-muted-foreground">
            {club.city}
            {distance !== undefined ? (
              <>
                {" · "}
                <span className="text-foreground">
                  {distance.toFixed(1)} mi
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="gap-xs flex shrink-0 items-center self-center">
          {open ? (
            <div className="gap-xxs flex flex-col items-end">
              <BusyWord level={level} className="text-body-s" />
              <RibMeter
                value={level}
                tone={busyTone(level)}
                size="sm"
                label="Crowd level"
                valueText={BUSY_WORDS[level]}
                decorative
              />
            </div>
          ) : (
            <span className="text-body-s text-muted-foreground">Closed</span>
          )}
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
      <ul
        aria-label="Open to book"
        className="gap-y-xxs @[23rem]/list:gap-x-s grid grid-cols-1 @[23rem]/list:grid-cols-3"
      >
        {list.map((f) => (
          <FactTile key={f.key} f={f} />
        ))}
      </ul>
      {areas.length ? (
        <AreaLine>
          {areas.map((a) => (
            <li key={a.key} className="gap-xs inline-flex items-center">
              <RibMeter
                value={a.crowd.level}
                tone={busyTone(a.crowd.level)}
                size="sm"
                label={`${a.label} crowd`}
                valueText={a.crowd.word}
                decorative
              />
              <span className="text-muted-foreground">{a.label}</span>
              <span>{usually(a.crowd.word)}</span>
            </li>
          ))}
        </AreaLine>
      ) : null}
    </li>
  )
}

// The areas show only when the list is wide enough for them to sit on one or two lines (`@md/list`, 28rem).
function AreaLine({ children }: { children: ReactNode }) {
  return (
    <ul
      aria-label="Areas this hour"
      className="gap-x-m gap-y-xxs pt-xs hidden flex-wrap text-body-xs rule-t @md/list:flex"
    >
      {children}
    </ul>
  )
}
