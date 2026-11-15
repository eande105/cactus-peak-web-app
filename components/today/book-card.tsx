"use client"
import Link from "next/link"
import { useApp } from "@/components/app/use-app"
import {
  CategoryTile,
  categoryObject,
  ObjectCrop,
} from "@/components/brand/graphics"
import { ArrowRight, User } from "@/components/icons"
import { Card } from "@/components/kit/app"
import { ArtFrame } from "@/components/kit/brand-art"
import { dayWord, useOpenClasses } from "@/components/today/open-day"
import { plural } from "@/components/today/sections"
import { INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionLeft } from "@/lib/engine"
import { DAY, fmtTime, minutesOfDay } from "@/lib/time"
import type { Session } from "@/lib/types"
import { cn } from "@/lib/utils"

/** At this many spots or fewer, the class says how many are left, because that is a reason to book now. */
const FEW = 3

/**
 * Classes for the member in the coming week, one of each type, four at most, in time order. The member's interests
 * come first, the ones they have not used lately before the others; then classes near the time they usually come.
 * A type the member already has booked in the week goes last.
 * `exclude` is the class the empty Today card promotes. Its whole class type is left out, so Home does not show it twice.
 */
function usePicks(exclude?: Session) {
  const { s, me, now } = useApp()
  const { open, rank, rhythm } = useOpenClasses()
  // A type the member already has booked this week is covered, so the others come first.
  const booked = new Set(
    s.bookings
      .filter(
        (b) =>
          b.memberId === me.id &&
          b.status === "booked" &&
          b.start > now &&
          b.start < now + 7 * DAY
      )
      .map((b) => b.category)
  )
  const has = (x: Session) => (booked.has(x.category) ? 1 : 0)
  const near = (x: Session) =>
    rhythm && Math.abs(minutesOfDay(x.start) - rhythm.minute) <= 90 ? 0 : 1
  const seen = new Set<string>()
  return open
    .filter((x) => x.category !== exclude?.category)
    .sort(
      (a, b) =>
        has(a) - has(b) ||
        rank(a.category) - rank(b.category) ||
        near(a) - near(b) ||
        a.start - b.start
    )
    .filter((x) => {
      if (seen.has(x.category)) return false
      seen.add(x.category)
      return true
    })
    .slice(0, 4)
    .sort((a, b) => a.start - b.start)
}

/**
 * The Book card. In a short space it is one row on a wide screen: the title and the way to the full schedule at the
 * left, then the classes picked for the member past a rule. On a wide screen with height to spare (a 16:9 desktop)
 * the card takes the height left on Home. The list is a size container, so each class reads the list's height, not
 * the screen's, and shows only what fits: a row under 8rem; from 8rem, the row adds the coach; from 10rem, a column
 * with the tile at the top and the length on the time line; from 12rem, "Book" under it; from 13rem, the class
 * type's gym object on its tint in place of the tile. The variants are written out in full so Tailwind finds them.
 * Each class is a link to its page, where the member
 * books it, so the card adds no buttons beside the one in the Today card. On a phone, the title and the way to the
 * full schedule share the top line, and the classes are a row of tiles the member swipes through.
 */
export function BookCard({ exclude }: { exclude?: Session }) {
  const { s, now } = useApp()
  const picks = usePicks(exclude)
  return (
    // Only from xl does Home fill the height, and only there is the card one row that can grow.
    <Card flush className="xl:flex-1">
      <div className="@container/card flex h-full flex-col">
        <div className="grid flex-1 @4xl:grid-cols-[11rem_minmax(0,1fr)]">
          {/* Narrow, the way to the full schedule sits at the right of the title, so the card ends with its classes. */}
          <div className="gap-x-m gap-y-s px-m pt-m pb-xs @4xl:pr-m @4xl:pb-m flex items-start justify-between @4xl:flex-col">
            <div>
              <h2 className="font-display-wide text-body-l font-heavy">Book</h2>
              <p className="text-body-m text-muted-foreground sm:text-body-s">
                {picks.length ? "Picked for you" : "No classes open this week"}
              </p>
            </div>
            <ScheduleLink className="@max-4xl:mt-xxs shrink-0" />
          </div>
          {picks.length ? (
            // A phone: one row of tiles the member swipes through, all four, so the card stays short.
            // From @lg, a grid (2 by 2, then one row). In one row, the list is a size container (its height comes
            // from the card, not its classes), with a minimum that holds the short rows.
            <ul className="gap-xs px-m pb-m @lg:p-xs flex snap-x snap-mandatory scroll-px-(--space-m) [scrollbar-width:none] overflow-x-auto @lg:grid @lg:snap-none @lg:grid-cols-2 @lg:gap-0 @lg:overflow-visible @4xl:min-h-20 @4xl:grid-cols-3 @4xl:rule-l @4xl:[container:book/size] @6xl:grid-cols-4">
              {picks.map((x) => {
                const left = sessionLeft(s, x)
                const coach = INSTRUCTOR_BY_ID[x.instructorId]?.name
                const when = `${dayWord(x.start, now)}, ${fmtTime(x.start)}`
                return (
                  <li
                    key={x.id}
                    // A row of three shows three; the swipe row, the 2 by 2 grid and a row of four show four.
                    className="flex w-36 min-w-0 shrink-0 snap-start @lg:w-auto @4xl/card:@max-6xl/card:nth-4:hidden"
                  >
                    <Link
                      href={`/schedule/${x.id}`}
                      aria-label={`${x.name}, ${when}`}
                      className={cn(
                        "group gap-s p-s corner-s flex min-w-0 flex-1 items-center text-body-m hover:bg-muted/60 sm:text-body-s",
                        // A swipe tile: a quiet well, with the tile above the name.
                        "@max-lg/card:flex-col @max-lg/card:items-start @max-lg/card:bg-muted/50",
                        // From 10rem, a column: the tile (or the art) at the top, the words at the bottom.
                        "[@container_book_(min-height:10rem)]:p-m [@container_book_(min-height:10rem)]:flex-col [@container_book_(min-height:10rem)]:items-start [@container_book_(min-height:10rem)]:justify-between"
                      )}
                    >
                      {/* From 13rem, the class type's gym object on its tint takes the free height, as on Next up. */}
                      <ArtFrame
                        className={`cat-${x.category} corner-s hidden min-h-0 flex-1 self-stretch [@container_book_(min-height:13rem)]:block`}
                        art={
                          <ObjectCrop
                            id={categoryObject[x.category]}
                            ratio="4/3"
                            scheme={{ category: x.category }}
                            scale={0.62}
                            x={0.42}
                            y={0.22}
                            fill
                          />
                        }
                      />
                      <CategoryTile
                        category={x.category}
                        className="size-10 shrink-0 [@container_book_(min-height:13rem)]:hidden"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 [@container_book_(min-height:10rem)]:flex-none [@container_book_(min-height:10rem)]:self-stretch">
                        <span className="[@container_book_(min-height:13rem)]:font-display-wide block truncate font-heavy @max-lg/card:line-clamp-2 @max-lg/card:whitespace-normal [@container_book_(min-height:13rem)]:text-body-l">
                          {x.name}
                        </span>
                        <span className="tabular block truncate text-muted-foreground">
                          {when}
                          {/* The length shows in the column, where the line has the full width. */}
                          <span className="hidden [@container_book_(min-height:10rem)]:inline">
                            {" "}
                            · {x.duration} min
                          </span>
                          {left <= FEW ? ` · ${plural(left, "spot")} left` : ""}
                        </span>
                        {coach ? (
                          <span className="gap-xxs mt-xxs hidden items-center text-muted-foreground [@container_book_(min-height:8rem)]:flex">
                            <User
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                            <span className="truncate">{coach}</span>
                          </span>
                        ) : null}
                        <span className="gap-xxs mt-s hidden items-center font-medium text-link [@container_book_(min-height:12rem)]:flex">
                          Book
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          />
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-link transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none @max-lg/card:hidden [@container_book_(min-height:10rem)]:hidden"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function ScheduleLink({ className }: { className?: string }) {
  return (
    <Link
      href="/schedule"
      className={cn(
        "group gap-xxs flex w-max items-center text-body-m font-medium text-link sm:text-body-s",
        className
      )}
    >
      Full schedule
      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  )
}
