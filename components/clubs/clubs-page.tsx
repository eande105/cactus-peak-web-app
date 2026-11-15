"use client"
import Link from "next/link"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { ClubMap } from "@/components/clubs/club-map"
import { BusyWord } from "@/components/clubs/parts"
import { ChevronRight, MapPin } from "@/components/icons"
import { AppPage, Card, Toolbar } from "@/components/kit/app"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { CLUBS } from "@/lib/data/catalog"
import { clubOpen, liveBusyness } from "@/lib/engine"
import { fmtTime } from "@/lib/time"
import { miles, setCoords, useCoords, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

type Club = (typeof CLUBS)[number]

/**
 * One club in the list: the name, then the city and the distance, and at the right how busy it is while the clubs
 * are open. The link covers the whole row. `active` is true while the row or its map pin has the pointer or focus.
 */
function ClubRow({
  club,
  home,
  locked,
  open,
  level,
  distance,
  active,
  onActive,
  className,
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
  className?: string
}) {
  return (
    <li
      onMouseEnter={() => onActive(true)}
      onMouseLeave={() => onActive(false)}
      className={cn(
        "gap-s relative flex min-h-14 items-center",
        "px-m py-xs",
        "text-body-m",
        "sm:text-body-s",
        active && "bg-muted",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="gap-xs flex items-center">
          <Link
            href={`/clubs/${club.slug}`}
            onFocus={() => onActive(true)}
            onBlur={() => onActive(false)}
            className="truncate font-heavy outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {club.name}
          </Link>
          {home ? <StatusPill tone="accent">Home</StatusPill> : null}
        </p>
        <p className="tabular truncate text-muted-foreground">
          {[
            club.city,
            distance !== undefined ? `${distance.toFixed(1)} mi` : "",
            locked ? "With Ridge or Summit" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="gap-s flex shrink-0 items-center">
        {open ? <BusyWord level={level} /> : null}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </li>
  )
}

/**
 * Clubs: the club rows at the left and the map at the right. A row gives what a member compares before the drive:
 * open or closed, how busy, how far. The row opens the club. A row and its pin highlight together.
 * From 1024 px the map fills the height of the sheet and stays in place while the list scrolls.
 */
export default function ClubsPage() {
  const { me, hh, now } = useApp()
  const offline = useOffline()
  const coords = useCoords()
  const [sel, setSel] = useState<string>()
  const [hover, setHover] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const open = clubOpen(now)
  const list = coords
    ? [...CLUBS].sort((a, b) => miles(coords, a) - miles(coords, b))
    : CLUBS
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setNote("")
      },
      () => setNote("We could not get your location. The clubs stay in order.")
    )
  return (
    <AppPage title="Clubs" width="wide">
      <div className="gap-l grid items-start lg:grid-cols-[minmax(20rem,2fr)_minmax(0,3fr)]">
        <div className="gap-s flex min-w-0 flex-col">
          <Toolbar
            className="items-center"
            end={
              coords ? (
                <p className="text-body-m text-muted-foreground sm:text-body-s">
                  Sorted by distance
                </p>
              ) : (
                <Button size="sm" variant="outline" onClick={locate}>
                  <MapPin aria-hidden="true" data-icon="inline-start" />
                  Sort by distance
                </Button>
              )
            }
          >
            <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
              <span className="font-medium text-foreground">
                {CLUBS.length} clubs
              </span>
              {" · "}
              {open.open
                ? `open now, all close at ${fmtTime(open.closeAt)}`
                : `closed, all open at ${fmtTime(open.openAt)}`}
            </p>
          </Toolbar>
          {note ? (
            <p
              role="status"
              className="text-body-m text-warning sm:text-body-s"
            >
              {note}
            </p>
          ) : null}
          <ul
            aria-label="Clubs"
            className="flex flex-col rule-y [&>li+li]:rule-t"
          >
            {list.map((c) => {
              const home = c.slug === me.homeClub
              return (
                <ClubRow
                  key={c.slug}
                  club={c}
                  home={home}
                  locked={hh.plan === "trailhead" && !home}
                  open={open.open}
                  level={liveBusyness(c.slug, now).level}
                  distance={coords ? miles(coords, c) : undefined}
                  active={hover === c.slug || sel === c.slug}
                  onActive={(on) => setHover(on ? c.slug : null)}
                />
              )
            })}
          </ul>
        </div>
        {offline ? (
          <Card as="aside">
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              You are offline. The map is unavailable.
            </p>
          </Card>
        ) : (
          // The map draws its own edge and corners. `!aspect-auto` lets the height below win over the ratio.
          // The height is the viewport less the sheet margin (1rem), the page bar (2.25rem) and three `l` gaps.
          <aside
            aria-label="Map of the clubs"
            className="min-w-0 lg:sticky lg:top-[calc(0.5rem+var(--space-l))] lg:h-[calc(100dvh-3.25rem-3*var(--space-l))] lg:min-h-96"
          >
            <ClubMap
              now={now}
              selected={sel}
              hover={hover ?? undefined}
              onSelect={(s) => setSel(s)}
              onHover={setHover}
              className="lg:!aspect-auto lg:h-full"
            />
          </aside>
        )}
      </div>
    </AppPage>
  )
}
