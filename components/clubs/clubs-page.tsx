"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { ClubMap } from "@/components/clubs/club-map"
import { ClubRow } from "@/components/clubs/club-row"
import { MapPin } from "@/components/icons"
import { AppPage, Card, Toolbar } from "@/components/kit/app"
import { Button } from "@/components/ui/button"
import { CLUBS } from "@/lib/data/catalog"
import { clubOpen, liveBusyness } from "@/lib/engine"
import { fmtTime } from "@/lib/time"
import { miles, setCoords, useCoords, useOffline } from "@/lib/ui-state"

/**
 * Clubs: the club rows at the left and the map at the right from 768 px; below that the map is a card above the list.
 * A row gives what a member compares before the drive: how busy, how far, what is open to book. The row opens the
 * club. A row and its pin highlight together, and a pin selects its row and scrolls it into view.
 * The map stays in place while the list scrolls. In the DOM the map comes after the list, so the rows come first in
 * the tab order; on phones the grid puts the map above the list.
 */
export default function ClubsPage() {
  const { me, hh, now } = useApp()
  const router = useRouter()
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
  // With the map beside the list (from 768 px) a pin selects its row. Below that a pin opens its club, as on iOS.
  const pick = (slug: string) => {
    if (!window.matchMedia("(min-width: 768px)").matches) {
      router.push(`/clubs/${slug}`)
      return
    }
    setSel(slug)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById(`club-${slug}`)?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    })
  }
  // The sticky map fills the height left by the shell. Below lg: the 3.5rem top bar, the 3.5rem tab bar and the
  // safe area. From lg: the sheet margin (1rem), the page bar (2.25rem) and three `l` gaps.
  const mapBox =
    "min-w-0 max-md:row-start-2 md:sticky md:col-start-2 md:row-span-2 md:row-start-1 md:top-[calc(3.5rem+var(--space-m))] md:h-[calc(100dvh-7rem-env(safe-area-inset-bottom)-2*var(--space-m))] md:min-h-80 lg:top-[calc(0.5rem+var(--space-l))] lg:h-[calc(100dvh-3.25rem-3*var(--space-l))] lg:min-h-96"
  return (
    <AppPage title="Clubs" width="wide">
      <div className="gap-y-s md:gap-x-m lg:gap-x-l grid items-start md:grid-cols-[minmax(18rem,1fr)_minmax(0,1fr)] md:grid-rows-[auto_1fr] xl:grid-cols-[minmax(24rem,2fr)_minmax(0,3fr)]">
        <div className="gap-s flex min-w-0 flex-col md:col-start-1 md:row-start-1">
          <Toolbar
            className="items-center"
            end={
              coords ? (
                <p className="text-body-s text-muted-foreground">
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
            <p className="tabular text-body-s text-muted-foreground">
              <span className="font-medium text-foreground">
                {CLUBS.length} clubs
              </span>
              {" · "}
              {open.open ? (
                <>
                  <span className="font-medium text-success">Open</span>
                  {` until ${fmtTime(open.closeAt)}`}
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Closed</span>
                  {` until ${fmtTime(open.openAt)}`}
                </>
              )}
            </p>
          </Toolbar>
          {note ? (
            <p role="status" className="text-body-s text-warning">
              {note}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 max-md:row-start-3 md:col-start-1 md:row-start-2">
          <ul
            aria-label="Clubs"
            className="-mx-m @container/list flex flex-col md:mx-0"
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
          <Card as="aside" className={mapBox}>
            <p className="text-body-s text-muted-foreground">
              You are offline. The map is unavailable.
            </p>
          </Card>
        ) : (
          // The map draws its own edge and corners. `!aspect-auto` lets the height win over the ratio.
          // On phones it is a 15rem card with the home club pin in the accent (the pin's active state).
          <aside aria-label="Map of the clubs" className={mapBox}>
            <ClubMap
              now={now}
              selected={sel}
              hover={hover ?? me.homeClub}
              spotlight={hover}
              onSelect={pick}
              onHover={setHover}
              className="corner-l !aspect-auto h-60 raised md:h-full md:corner-m"
            />
          </aside>
        )}
      </div>
    </AppPage>
  )
}
