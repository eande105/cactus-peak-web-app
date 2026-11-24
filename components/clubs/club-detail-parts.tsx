"use client"
import Link from "next/link"
import type { ReactNode, SVGProps } from "react"
import { useApp } from "@/components/app/use-app"
import {
  GymObject,
  type ObjectId,
  spaceObjects,
} from "@/components/brand/graphics"
import { ClubMap } from "@/components/clubs/club-map"
import { PopularTimesChart } from "@/components/clubs/popular-times"
import { Menu } from "@/components/graphical"
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  ChildHead,
  Clock,
  Copy,
  MapPin,
  MoreHorizontal,
  Phone,
  Share2,
  Users,
  Waves,
} from "@/components/icons"
import { Row, Rows } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import {
  FactRow,
  HeroHeader,
  RowPill,
  SectionHeader,
  StatItem,
  StatStrip,
} from "@/components/kit/detail"
import {
  BusynessMeter,
  busyTone,
  CapacityIndicator,
  RibMeter,
} from "@/components/kit/ribs"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { setPrefs } from "@/lib/actions"
import {
  areasOf,
  BUSY_WORDS,
  CLUB_BY_SLUG,
  COACHES,
  INSTRUCTOR_BY_ID,
} from "@/lib/data/catalog"
import { clubSpaces } from "@/lib/data/club-spaces"
import { sessionsForDay } from "@/lib/data/sessions"
import {
  areaCrowd,
  bookingOf,
  busyHint,
  clubOpen,
  hourStart,
  hoursFor,
  KIDS_BLOCKS,
  kidsLeft,
  liveBusyness,
  nextCourtOpen,
  nextLaneOpen,
  sessionLeft,
  usually,
  waitCount,
} from "@/lib/engine"
import {
  atTime,
  DOW_LONG,
  dayStart,
  fmtDowTime,
  fmtRange,
  fmtTime,
  parts,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import { miles, useCoords, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

/** A pill with a leading icon. The icon side has less padding, so the icon sits optically in the pill. */
const ICON_PILL = "pl-xxs"

const chevron = (
  <ChevronRight
    className="size-4 shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
)

/** The icon set has no house glyph, so the "Home club" mark is drawn here (outline, 18 px grid like the pack). */
export function HouseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2.5 8 9 2.75 15.5 8" />
      <path d="M4 7v7.25a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
      <path d="M7.25 15.25v-4h3.5v4" />
    </svg>
  )
}

function NoRows({ children }: { children: ReactNode }) {
  return (
    <p className="py-xs text-body-m text-muted-foreground sm:text-body-s">
      {children}
    </p>
  )
}

const mapsUrl = (address: string) =>
  `https://maps.google.com/?q=${encodeURIComponent(address)}`
const telUrl = (phone: string) => `tel:${phone.replace(/\D/g, "")}`

/** Distance in miles from the member's location, or undefined when location is off. */
function useMiles(slug: string) {
  const coords = useCoords()
  const club = CLUB_BY_SLUG[slug]
  return coords && club ? miles(coords, club) : undefined
}

/**
 * The head of the page: the map as art (a still picture; a tap opens Maps), a back chip on a phone, then the title,
 * the city line and the strip of three facts.
 */
export function ClubHero({ slug }: { slug: string }) {
  const { now, club: viewing } = useApp()
  const offline = useOffline()
  const club = CLUB_BY_SLUG[slug]
  const o = clubOpen(now)
  const b = liveBusyness(slug, now)
  const away = useMiles(slug)
  const isViewing = viewing === slug
  const crowdWord = BUSY_WORDS[b.level]
  return (
    <div className="gap-m flex min-w-0 flex-col">
      <HeroHeader
        height={240}
        art={
          <div className="relative">
            {offline ? (
              <div className="grid place-items-center bg-muted text-body-s text-muted-foreground">
                Map unavailable offline.
              </div>
            ) : (
              <ClubMap
                now={now}
                only={slug}
                selected={slug}
                interactive={false}
                ratio="auto"
                className="size-full !rounded-none !shadow-none"
              />
            )}
            <a
              href={mapsUrl(club.address)}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="sr-only">Open {club.name} in Maps</span>
            </a>
            <Link
              href="/clubs"
              aria-label="Back to Clubs"
              className="top-m left-m absolute z-20 grid size-11 place-items-center corner-full bg-card text-foreground shadow-(--shadow-s) hairline ring-border lg:hidden"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </div>
        }
      >
        {/* One heading per breakpoint: the page bar's heading is hidden on a phone, so this one carries it there. */}
        <h1
          tabIndex={-1}
          className="font-display-wide text-display-s font-heavy text-balance outline-none lg:hidden"
        >
          {club.name}
        </h1>
        <p
          aria-hidden="true"
          className="font-display-wide text-display-s font-heavy text-balance max-lg:hidden"
        >
          {club.name}
        </p>
        <p className="gap-xs flex flex-wrap items-center text-body-m text-muted-foreground sm:text-body-s">
          <span>{club.city}, AZ</span>
          {isViewing ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="gap-xxs flex items-center font-medium text-primary">
                <HouseIcon className="size-4 shrink-0" />
                Home club
              </span>
            </>
          ) : null}
        </p>
      </HeroHeader>
      <div className="corner-m raised">
        <StatStrip>
          <StatItem
            label="Hours"
            value={
              <span className={o.open ? "text-success" : undefined}>
                {o.open ? "Open" : "Closed"}
              </span>
            }
            detail={
              o.open
                ? `until ${fmtTime(o.closeAt)}`
                : `opens ${fmtTime(o.openAt)}`
            }
          />
          <StatItem
            label="Distance"
            value={away === undefined ? "–" : away.toFixed(1)}
            detail={away === undefined ? "location off" : "miles"}
          />
          <StatItem
            label="Crowd"
            meter={
              <RibMeter
                value={o.open ? b.level : 0}
                tone={busyTone(b.level)}
                label="Crowd level"
                valueText={o.open ? crowdWord : "Closed"}
                decorative
                unavailable={!o.open}
              />
            }
            detail={o.open ? `${crowdWord.toLowerCase()} now` : "Closed"}
            srLabel={
              o.open ? `Crowd, ${crowdWord.toLowerCase()} now` : "Crowd, closed"
            }
          />
        </StatStrip>
      </div>
    </div>
  )
}

/** "Book here" and "Directions" side by side (they stack when the row is narrow), and the More menu. */
export function ClubActions({ slug }: { slug: string }) {
  const club = CLUB_BY_SLUG[slug]
  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: club.name, url })
        return
      }
      await navigator.clipboard?.writeText(url)
      toast({ title: "Link copied" })
    } catch {
      // The person closed the share sheet: nothing to report.
    }
  }
  return (
    <div className="gap-s flex flex-wrap items-center">
      <Button
        className="min-w-28 flex-1 lg:min-w-40 lg:flex-none"
        render={<Link href={`/schedule?club=${slug}`} />}
      >
        Book here
      </Button>
      <Button
        variant="outline"
        className="min-w-28 flex-1 lg:min-w-40 lg:flex-none"
        render={
          <a href={mapsUrl(club.address)} target="_blank" rel="noreferrer" />
        }
      >
        <MapPin aria-hidden="true" data-icon="inline-start" />
        Directions
      </Button>
      <Menu.Root>
        <Menu.Trigger
          aria-label="More actions"
          className="!p-zero corner-s !grid !size-11 !shrink-0 !place-items-center hairline sm:!size-9"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={4}>
            <Menu.Popup className="!min-w-48">
              <Menu.Item render={<a href={telUrl(club.phone)} />}>
                <Phone aria-hidden="true" className="size-4" />
                Call {club.phone}
              </Menu.Item>
              <Menu.Item onClick={() => void share()}>
                <Share2 aria-hidden="true" className="size-4" />
                Share
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}

/** Set as my club, with its rules (one current club), or the "Your club" pill. */
export function SetClubAction({ slug }: { slug: string }) {
  const { me, club: viewing } = useApp()
  const club = CLUB_BY_SLUG[slug]
  if (viewing === slug)
    return (
      <StatusPill tone="outline" icon={Check} className={ICON_PILL}>
        Your club
      </StatusPill>
    )
  return (
    <Button
      variant="outline"
      onClick={() => {
        setPrefs(me.id, { viewingClub: slug })
        toast({ title: `${club.name} is your club now` })
      }}
    >
      Set as my club
    </Button>
  )
}

const bookPill = <RowPill>Book</RowPill>

/** Courts, lap lanes and kids club: one fact row each, with the next open time and a Book pill. */
export function ReserveSection({ slug }: { slug: string }) {
  const { s, now } = useApp()
  const club = CLUB_BY_SLUG[slug]
  if (!club.courts.length && !club.pool && !club.kidsClub) return null
  const today = dayStart(now)
  const p = parts(now)
  const court = nextCourtOpen(s, slug, now)
  const lane = nextLaneOpen(s, slug, now)
  const kids =
    p.dow === 0
      ? undefined
      : KIDS_BLOCKS.find(
          (k) => atTime(today, k.from) > now && kidsLeft(s, slug, today, k) > 0
        )
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Reserve" />
      {club.courts.length ? (
        <FactRow
          icon={<Activity />}
          text={club.courts.map((c) => `${c.count} ${c.sport}`).join(", ")}
          secondary={
            court
              ? `Next open Court ${court.court}, ${fmtDowTime(court.start)}`
              : "See the grid for open times"
          }
          trailing={bookPill}
          href={`/reserve/courts?club=${slug}`}
        />
      ) : null}
      {club.pool ? (
        <FactRow
          icon={<Waves />}
          text={`${club.pool.label} · ${club.pool.lanes} lanes`}
          secondary={
            lane
              ? `Next open ${fmtTime(lane.start)}, ${lane.open} of ${lane.total} lanes`
              : "Lanes open tomorrow"
          }
          trailing={bookPill}
          href={`/reserve/lanes?club=${slug}`}
        />
      ) : null}
      {club.kidsClub ? (
        <FactRow
          icon={<ChildHead />}
          text="Kids club"
          secondary={
            kids
              ? `Next open today ${fmtRange(atTime(today, kids.from), atTime(today, kids.to))}`
              : "Mon–Sat 8 am–12 pm, 4–8 pm"
          }
          trailing={bookPill}
          href={`/reserve/kids-club?club=${slug}`}
        />
      ) : null}
    </section>
  )
}

/** The rest of today's classes. The header links to the schedule for this club. */
export function ClassesSection({ slug }: { slug: string }) {
  const { s, me, now } = useApp()
  const classes = sessionsForDay(slug, dayStart(now)).filter(
    (x) => x.start > now
  )
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader
        title="Classes"
        detail={classes.length ? `${classes.length} more today` : undefined}
        href={`/schedule?club=${slug}`}
      />
      {classes.length ? (
        <Rows label="Today's classes">
          {classes.map((x) => {
            const bk = bookingOf(s, me.id, x.id)
            return (
              <Row
                key={x.id}
                className="!px-0"
                href={`/schedule/${x.id}`}
                lead={fmtTime(x.start)}
                title={x.name}
                line={[
                  x.studio,
                  INSTRUCTOR_BY_ID[x.instructorId]?.name,
                  `${x.duration} min`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                end={
                  <>
                    {bk?.status === "booked" ? (
                      <StatusPill
                        tone="success"
                        icon={Check}
                        className={ICON_PILL}
                      >
                        Booked
                      </StatusPill>
                    ) : bk?.status === "waitlisted" ? (
                      <StatusPill tone="neutral">
                        Waitlist {bk.position === 2 ? "2nd" : `#${bk.position}`}
                      </StatusPill>
                    ) : bk?.status === "held" ? (
                      <StatusPill tone="warning">Spot held</StatusPill>
                    ) : (
                      <CapacityIndicator
                        variant="text"
                        left={sessionLeft(s, x)}
                        capacity={x.capacity}
                        unit={x.unit}
                        waiting={waitCount(s, x)}
                      />
                    )}
                    {chevron}
                  </>
                }
              />
            )
          })}
        </Rows>
      ) : (
        <NoRows>No more classes today.</NoRows>
      )}
    </section>
  )
}

/** Typical crowd: the day control and chart, the hint for now, and the areas (always "Usually …"). */
export function CrowdSection({ slug }: { slug: string }) {
  const { now } = useApp()
  const offline = useOffline()
  const o = clubOpen(now)
  const p = parts(now)
  const areas = areasOf(slug)
  return (
    <section className="gap-s flex min-w-0 flex-col">
      <SectionHeader title="Crowd" />
      <PopularTimesChart
        slug={slug}
        nowDow={p.dow}
        nowHour={p.h}
        live={o.open && !offline}
      />
      {o.open ? (
        <p className="text-body-m text-pretty sm:text-body-s">
          {busyHint(slug, now)}
        </p>
      ) : null}
      {areas.length ? (
        <ul
          aria-label="Crowd level by area"
          className="flex flex-col rule-t [&>li+li]:rule-t"
        >
          {areas.map((a) => {
            const c = areaCrowd(a, hourStart(now))
            return (
              <li
                key={a.area}
                className="gap-s flex min-h-11 items-center justify-between text-body-m sm:text-body-s"
              >
                <span className="min-w-0 truncate font-medium">{a.label}</span>
                <span className="gap-xs tabular flex shrink-0 items-center text-muted-foreground">
                  <BusynessMeter level={c.level} variant="compact" />
                  {usually(c.word, hourStart(now))}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

const WEEK = [1, 2, 3, 4, 5, 6, 0]

/** Seven days of hours, today bold with a dot, then when the desk is staffed. */
export function HoursSection({ slug }: { slug: string }) {
  const { now } = useApp()
  const club = CLUB_BY_SLUG[slug]
  const p = parts(now)
  const at = (mins: number) =>
    fmtTime(
      atTime(
        dayStart(now),
        `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`
      )
    )
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Hours" />
      <table className="w-full text-body-m sm:text-body-s">
        <caption className="sr-only">Club hours by day</caption>
        <tbody className="[&>tr+tr]:rule-t">
          {WEEK.map((d) => {
            const h = hoursFor(d)
            const today = d === p.dow
            return (
              <tr
                key={d}
                className={cn("h-11", today && "font-heavy")}
                aria-current={today ? "date" : undefined}
              >
                <th scope="row" className="py-xs text-left font-[inherit]">
                  <span className="gap-xs flex items-center">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 corner-full",
                        today ? "bg-primary" : "bg-transparent"
                      )}
                    />
                    {DOW_LONG[d]}
                    {today ? <span className="sr-only"> (today)</span> : null}
                  </span>
                </th>
                <td className="tabular py-xs text-right">
                  {at(h.open)} to {at(h.close)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <FactRow
        icon={<Users />}
        text="Desk staffed 6 am to 8 pm"
        secondary="Arizona time, no daylight saving"
      />
      {club.pool ? (
        <FactRow icon={<Clock />} text="Pools close 30 min before the club" />
      ) : null}
    </section>
  )
}

/** What the club has: a tile for each space, then the smaller extras. */
export function AmenitiesSection({ slug }: { slug: string }) {
  const spaces = clubSpaces(CLUB_BY_SLUG[slug])
  return (
    <section className="gap-s flex min-w-0 flex-col">
      <SectionHeader title="Amenities" />
      <div className="@container">
        <ul
          aria-label="Spaces"
          className="gap-s grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4"
        >
          {spaces.primary.map((sp) => (
            <SpaceTile
              key={sp.id}
              object={spaceObjects[sp.graphic].lead}
              name={sp.name}
              line={sp.amenities.join(" · ")}
            />
          ))}
        </ul>
      </div>
      {spaces.amenities.length ? (
        <ul className="gap-x-m gap-y-s flex flex-wrap text-body-m sm:text-body-s">
          {spaces.amenities.map((a) => (
            <li key={a.id} className="gap-xs flex items-center">
              <GymObject
                id={spaceObjects[a.graphic].lead}
                className="size-6 shrink-0"
              />
              {a.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/** One space of the club as a small tile: the gym object, the name, and one line of what is there. */
function SpaceTile({
  object,
  name,
  line,
}: {
  object: ObjectId
  name: string
  line?: string
}) {
  return (
    <li className="gap-s p-m flex min-w-0 flex-col corner-m raised">
      <GymObject id={object} cut className="size-12 shrink-0" />
      <div className="min-w-0 text-body-m sm:text-body-s">
        <h3 className="font-heavy">{name}</h3>
        {line ? (
          <p className="text-pretty text-muted-foreground">{line}</p>
        ) : null}
      </div>
    </li>
  )
}

export function CoachesSection({ slug }: { slug: string }) {
  const coaches = COACHES.filter((c) => c.clubs.includes(slug))
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Coaches" />
      {coaches.length ? (
        <Rows>
          {coaches.map((c) => (
            <Row
              key={c.id}
              className="!px-0"
              href={`/training/coaches/${c.slug}`}
              title={
                <span className="gap-s flex items-center">
                  <CoachArt name={c.name} roles={c.specialties} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate">{c.name}</span>
                    <span className="block truncate font-regular text-muted-foreground">
                      {c.specialties.join(" · ")}
                    </span>
                  </span>
                </span>
              }
              end={chevron}
            />
          ))}
        </Rows>
      ) : (
        <NoRows>Coach profiles are coming soon.</NoRows>
      )}
    </section>
  )
}

/** The address with its distance and parking, a copy button, and the front desk number. */
export function DetailsSection({ slug }: { slug: string }) {
  const club = CLUB_BY_SLUG[slug]
  const away = useMiles(slug)
  return (
    <section className="gap-xs flex min-w-0 flex-col">
      <SectionHeader title="Details" />
      <FactRow
        icon={<MapPin />}
        text={club.address}
        secondary={[
          away === undefined ? undefined : `${away.toFixed(1)} miles away`,
          club.parking,
        ]
          .filter(Boolean)
          .join(" · ")}
        trailing={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy address"
            onClick={() => {
              void navigator.clipboard?.writeText(club.address)
              toast({ title: "Address copied" })
            }}
          >
            <Copy aria-hidden="true" />
          </Button>
        }
      />
      <FactRow
        icon={<Phone />}
        text={club.phone}
        secondary="Main desk"
        href={telUrl(club.phone)}
      />
    </section>
  )
}
