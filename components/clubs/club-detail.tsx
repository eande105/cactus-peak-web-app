"use client"
import Link from "next/link"
import { notFound } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { FactGrid } from "@/components/app/screen-parts"
import { useApp } from "@/components/app/use-app"
import {
  GymObject,
  type ObjectId,
  spaceObjects,
} from "@/components/brand/graphics"
import { ClubMap } from "@/components/clubs/club-map"
import { PopularTimesChart } from "@/components/clubs/popular-times"
import { Check, ChevronRight, Copy, MapPin, Phone } from "@/components/icons"
import {
  AppPage,
  Card,
  CardFooterLink,
  Row,
  Rows,
  TabButtons,
} from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { CapacityIndicator } from "@/components/kit/ribs"
import { EmptyState, LoadingBlock, StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { setPrefs } from "@/lib/actions"
import {
  BUSY_WORDS,
  CLUB_BY_SLUG,
  COACHES,
  INSTRUCTOR_BY_ID,
} from "@/lib/data/catalog"
import { clubSpaces } from "@/lib/data/club-spaces"
import { sessionsForDay } from "@/lib/data/sessions"
import {
  bookingOf,
  busyHint,
  clubOpen,
  courtBlocks,
  courtCount,
  gridSlots,
  KIDS_BLOCKS,
  kidsLeft,
  laneSwimmers,
  liveBusyness,
  sessionLeft,
  waitCount,
} from "@/lib/engine"
import {
  atTime,
  dayStart,
  fmtDowTime,
  fmtRange,
  fmtTime,
  MIN,
  parts,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import { useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

type Tab = "overview" | "classes" | "amenities"

/** A pill with a leading icon. The icon side has less padding, so the icon sits optically in the pill. */
const ICON_PILL = "pl-xxs"

const chevron = (
  <ChevronRight
    className="size-4 shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
)

/** The line a list shows when it has no rows. It lines up with the rows of a bare card. */
function NoRows({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "px-m py-m text-body-m text-muted-foreground sm:text-body-s",
        className
      )}
    >
      {children}
    </p>
  )
}

/** One space of the club as a small tile: the gym object, the name, and one line of what is there. */
function SpaceTile({
  object,
  name,
  line,
  className,
}: {
  object: ObjectId
  name: string
  line?: string
  className?: string
}) {
  return (
    <li
      className={cn(
        "gap-s p-m flex min-w-0 flex-col corner-m raised",
        className
      )}
    >
      {/* The space's object in a cut tile; a hub is too busy at this size. */}
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

/** A row with one button that starts a reservation: courts, the lap pool. */
function ReserveRow({
  title,
  line,
  href,
  action,
}: {
  title: string
  line: ReactNode
  href: string
  action: string
}) {
  return (
    <Row
      title={title}
      line={<span className="tabular whitespace-normal">{line}</span>}
      end={
        <Button size="sm" variant="outline" render={<Link href={href} />}>
          {action}
        </Button>
      }
    />
  )
}

/**
 * One club as a workspace with three tabs. Overview is what a member checks before the drive: how busy now and the
 * typical hours in one block, the details as a grid of facts, and the way there. Classes is today's list.
 * Amenities is what the club has.
 */
export default function ClubDetail({ slug }: { slug: string }) {
  const { s, me, now, club: viewing } = useApp()
  const offline = useOffline()
  const club = CLUB_BY_SLUG[slug]
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>("overview")
  // biome-ignore lint/correctness/useExhaustiveDependencies: slug restarts the fake load delay when the club changes
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [slug])
  if (!club) notFound()
  if (loading) return <LoadingBlock text="Loading club…" rows={5} />
  const o = clubOpen(now)
  const b = liveBusyness(slug, now)
  const today = dayStart(now)
  const p = parts(now)
  const classes = sessionsForDay(slug, today).filter((x) => x.start > now)
  const coaches = COACHES.filter((c) => c.clubs.includes(slug))
  const spaces = clubSpaces(club)
  const isViewing = viewing === slug
  const courtSport = club.courts[0]?.sport
  let nextCourt = ""
  if (courtSport) {
    outer: for (const d of [0, 1, 2, 3]) {
      const day = today + d * 86400000
      for (const sl of gridSlots(day, "court")) {
        if (sl < now) continue
        for (let n = 1; n <= courtCount(slug, courtSport); n++) {
          if (
            !courtBlocks(s, slug, courtSport, n, day).blocks.some(
              (x) => x.from < sl + 60 * MIN && x.to > sl
            )
          ) {
            nextCourt = `Court ${n}, ${fmtDowTime(sl)}`
            break outer
          }
        }
      }
    }
  }
  let nextLane = ""
  if (club.pool) {
    for (const sl of gridSlots(today, "lane").filter((x) => x > now)) {
      const l = Array.from({ length: club.pool.lanes }, (_, i) => i + 1).find(
        (x) => laneSwimmers(s, slug, x, sl).swimmers < 2
      )
      if (l) {
        nextLane = `Lane ${l} free at ${fmtTime(sl)}`
        break
      }
    }
  }
  const tel = `tel:${club.phone.replace(/\D/g, "")}`
  const maps = `https://maps.google.com/?q=${encodeURIComponent(club.address)}`
  const live = o.open && !offline

  return (
    <AppPage
      back={{ href: "/clubs", label: "Clubs" }}
      title={club.name}
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            render={<a href={maps} target="_blank" rel="noreferrer" />}
          >
            <MapPin aria-hidden="true" data-icon="inline-start" />
            Directions
          </Button>
          <Button size="sm" variant="outline" render={<a href={tel} />}>
            <Phone aria-hidden="true" data-icon="inline-start" />
            Call
          </Button>
          {isViewing ? (
            <StatusPill tone="outline" icon={Check} className={ICON_PILL}>
              Your club
            </StatusPill>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setPrefs(me.id, { viewingClub: slug })
                toast({ title: `${club.name} is your club now` })
              }}
            >
              Set as my club
            </Button>
          )}
        </>
      }
      tabs={
        <TabButtons<Tab>
          label="Club sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "Overview" },
            { value: "classes", label: "Classes", count: classes.length },
            { value: "amenities", label: "Amenities" },
          ]}
        />
      }
    >
      {tab === "overview" ? (
        <>
          {/* Open or closed, how busy now, and the typical hours: the one thing a member checks before the drive. The
              state sits top left and the hours top right, the same corners as the club card on Home. */}
          <Card title="Busyness" id="now">
            <div className="gap-l grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="gap-m lg:pr-l flex min-w-0 flex-col text-body-m sm:text-body-s lg:rule-r">
                <div className="gap-m grid grid-cols-[minmax(0,1fr)_auto]">
                  <div className="gap-xxs flex min-w-0 flex-col">
                    {!o.open ? (
                      <p className="font-display-wide text-body-xl font-heavy">
                        Closed now
                      </p>
                    ) : offline ? (
                      <p className="text-pretty">
                        Offline: the live count is unavailable.
                      </p>
                    ) : (
                      <p className="gap-s flex items-baseline">
                        <span className="font-display-wide text-body-xl font-heavy">
                          {BUSY_WORDS[b.level]}
                        </span>
                        <span className="tabular text-muted-foreground">
                          <span className="sr-only">Busyness </span>
                          {b.level} of 5
                        </span>
                      </p>
                    )}
                  </div>
                  <p className="tabular text-right whitespace-nowrap text-muted-foreground">
                    {o.open ? "Open until " : "Opens "}
                    {fmtTime(o.open ? o.closeAt : o.openAt)}
                  </p>
                </div>
                {o.open && !offline ? (
                  <div className="gap-xxs flex flex-col">
                    <p className="text-pretty">{busyHint(slug, now)}</p>
                    <p className="tabular text-muted-foreground">
                      Updated {fmtTime(b.updatedAt)}
                    </p>
                  </div>
                ) : null}
              </div>
              <div id="popular" className="gap-s flex min-w-0 flex-col">
                <h3 className="text-body-m font-heavy sm:text-body-s">
                  Popular times
                </h3>
                <PopularTimesChart
                  slug={slug}
                  nowDow={p.dow}
                  nowHour={p.h}
                  live={live}
                />
              </div>
            </div>
          </Card>
          <Card title="Details" id="hours">
            <FactGrid
              items={[
                {
                  label: "Mon–Fri",
                  value: "4:30 am–10 pm",
                  hint: p.dow >= 1 && p.dow <= 5 ? "Today" : undefined,
                },
                {
                  label: "Sat–Sun",
                  value: "6 am–8 pm",
                  hint: p.dow === 0 || p.dow === 6 ? "Today" : undefined,
                },
                { label: "Staffed", value: "6 am–8 pm" },
                {
                  label: "Kids club",
                  value: club.kidsClub ? "Mon–Sat 8 am–12 pm, 4–8 pm" : "None",
                },
                {
                  label: "Pools",
                  value: club.pool ? "Close 30 min before the club" : "None",
                },
                { label: "Time zone", value: "Arizona, no daylight saving" },
                { label: "Address", value: club.address },
                { label: "Parking", value: club.parking },
                {
                  label: "Main desk",
                  value: (
                    <a href={tel} className="text-link underline">
                      {club.phone}
                    </a>
                  ),
                },
              ]}
            />
          </Card>
          <Card
            title="Getting here"
            id="map"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(club.address)
                  toast({ title: "Address copied" })
                }}
              >
                <Copy aria-hidden="true" data-icon="inline-start" />
                Copy address
              </Button>
            }
          >
            {offline ? (
              <p className="text-body-m text-muted-foreground sm:text-body-s">
                Map unavailable offline.
              </p>
            ) : (
              // The ratio is wider from 640 px, where the block is wide and a 4:3 map would be too tall.
              <ClubMap
                now={now}
                only={slug}
                selected={slug}
                ratio="4/3"
                className="sm:!aspect-[16/6]"
              />
            )}
          </Card>
        </>
      ) : null}

      {tab === "classes" ? (
        <Card
          tone="bare"
          title="Today"
          id="classes"
          footer={
            <CardFooterLink href={`/schedule?club=${slug}`}>
              Full schedule
            </CardFooterLink>
          }
        >
          {classes.length ? (
            <Rows label="Today's classes">
              {classes.map((x) => {
                const bk = bookingOf(s, me.id, x.id)
                return (
                  <Row
                    key={x.id}
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
                            Waitlist{" "}
                            {bk.position === 2 ? "2nd" : `#${bk.position}`}
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
            <EmptyState title="No more classes today" />
          )}
        </Card>
      ) : null}

      {tab === "amenities" ? (
        <>
          <div className="@container">
            <ul
              id="amenities"
              aria-label="Spaces"
              className="gap-m grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4"
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
            <Card tone="plain" title="Also here">
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
            </Card>
          ) : null}
          <div className="gap-l grid items-start lg:grid-cols-2">
            <Card tone="bare" title="Courts and pool" id="facilities">
              {club.courts.length || club.pool ? (
                <Rows>
                  {club.courts.length ? (
                    <ReserveRow
                      title="Courts"
                      line={
                        <>
                          {club.courts
                            .map((c) => `${c.count} ${c.sport}`)
                            .join(", ")}{" "}
                          · Next open: {nextCourt || "see the grid"}
                        </>
                      }
                      href={`/reserve/courts?club=${slug}`}
                      action="Reserve a court"
                    />
                  ) : null}
                  {club.pool ? (
                    <ReserveRow
                      title="Lap pool"
                      line={
                        <>
                          {club.pool.label} · {club.pool.lanes} lanes
                          {club.pool.therapy
                            ? " · warm-water therapy pool, 90–92°F"
                            : ""}{" "}
                          · {nextLane || "Lanes open tomorrow"}
                        </>
                      }
                      href={`/reserve/lanes?club=${slug}`}
                      action="Reserve a lane"
                    />
                  ) : null}
                </Rows>
              ) : (
                <NoRows>No pool or courts at this club.</NoRows>
              )}
            </Card>
            <Card
              tone="bare"
              title="Kids club"
              id="kids"
              footer={
                club.kidsClub ? (
                  <CardFooterLink href="/reserve/kids-club">
                    Book kids club
                  </CardFooterLink>
                ) : undefined
              }
            >
              {club.kidsClub ? (
                <>
                  <Rows label="Kids club blocks today">
                    {KIDS_BLOCKS.map((k) => {
                      const l = kidsLeft(s, slug, today, k)
                      const past = atTime(today, k.from) < now
                      return (
                        <Row
                          key={k.id}
                          title={
                            <span className="tabular">
                              {fmtRange(
                                atTime(today, k.from),
                                atTime(today, k.to)
                              )}
                            </span>
                          }
                          end={
                            p.dow === 0 ? (
                              <StatusPill tone="neutral">
                                Closed Sundays
                              </StatusPill>
                            ) : past ? (
                              <StatusPill tone="neutral">Started</StatusPill>
                            ) : l === 0 ? (
                              <StatusPill tone="danger">Full</StatusPill>
                            ) : (
                              <StatusPill
                                tone={l < 3 ? "warning" : "success"}
                                className="tabular"
                              >
                                {l} {l === 1 ? "spot" : "spots"} left
                              </StatusPill>
                            )
                          }
                        />
                      )
                    })}
                  </Rows>
                  <NoRows className="py-s rule-t">
                    Ages 6 months to 12 years. Parents stay in the building.
                  </NoRows>
                </>
              ) : (
                <NoRows>No kids club at this club.</NoRows>
              )}
            </Card>
          </div>
          <Card tone="bare" title="Coaches" id="coaches">
            {coaches.length ? (
              <Rows>
                {coaches.map((c) => (
                  <Row
                    key={c.id}
                    href={`/training/coaches/${c.slug}`}
                    title={
                      <span className="gap-s flex items-center">
                        <CoachArt
                          name={c.name}
                          roles={c.specialties}
                          size={36}
                        />
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
          </Card>
        </>
      ) : null}
    </AppPage>
  )
}
