"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { calEventFor, SessionAction } from "@/components/booking/session-action"
import {
  AlsoThisWeek,
  SessionButtons,
  SessionDetails,
  SessionHeroArt,
  SessionStats,
  SessionTag,
  SessionTags,
} from "@/components/booking/session-parts"
import { type ClubId, ClubSet } from "@/components/brand/graphics"
import { Card, Facts } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { CategoryBadge } from "@/components/kit/category"
import {
  CancelPolicy,
  HeroHeader,
  SectionHeader,
} from "@/components/kit/detail"
import { Modal } from "@/components/kit/overlays"
import { EmptyState, PersonAvatar, SelectBox } from "@/components/kit/ui"
import { ReserveNotice } from "@/components/reserve/empty"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMedia } from "@/hooks/use-media"
import { CLUB_BY_SLUG, COACHES, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import { sessionById, sessionsRange } from "@/lib/data/sessions"
import {
  activeStrikes,
  bookingState,
  clubCrowdAt,
  guestPassesLeft,
  householdMembers,
  sessionLeft,
  waitCount,
} from "@/lib/engine"
import {
  dayStart,
  fmtDayLong,
  fmtDowTime,
  fmtRange,
  fmtTime,
  HOUR,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking, Session } from "@/lib/types"

function useDelay(ms: number) {
  void ms
  return true
}

function InviteDialog({
  open,
  onOpenChange,
  se,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  se: Session
}) {
  const { s, hh, now } = useApp()
  const { left } = guestPassesLeft(s, hh.id, now)
  const link = `https://my.cactuspeakathletic.example/g/${se.id.split("~")[3]}-${se.id.split("~")[1]}`
  return (
    <Modal
      wide
      open={open}
      onOpenChange={onOpenChange}
      title="Invite a friend"
      description={`Share ${se.name}, ${fmtDowTime(se.start)}. Friends need a guest pass to get in.`}
    >
      <div className="gap-xs flex">
        <Input
          readOnly
          aria-label="Invite link"
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          onClick={() => {
            void navigator.clipboard?.writeText(link)
            toast({ title: "Link copied" })
          }}
        >
          Copy link
        </Button>
      </div>
      <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
        {left > 0
          ? `Guest passes left this month: ${left}`
          : "Guest passes: 0 left this month. A day pass is $20."}{" "}
        <Link href="/guest-passes" className="text-link underline">
          Send a guest pass
        </Link>
      </p>
    </Modal>
  )
}

/**
 * The class detail. In the sheet it is one panel column and the booking block comes right under the title. On the
 * full page the content column sits on the sheet and the booking block is a card beside it from 1024 px, so it stays
 * in view while the member reads. The page bar there holds the title.
 */
export function SessionDetail({
  id,
  mode,
  onClose,
}: {
  id: string
  mode: "sheet" | "page"
  onClose?: () => void
}) {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const wide = useMedia("(min-width: 1024px)")
  const ready = useDelay(mode === "sheet" ? 260 : 120)
  const se = sessionById(id)
  useEffect(() => {
    if (!se) return
    const t = setTimeout(() => {
      document.title = `${se.name}, ${fmtDowTime(se.start)} · Cactus Peak Athletic`
    }, 150)
    return () => clearTimeout(t)
  }, [se])
  const [forId, setForId] = useState(me.id)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const [invite, setInvite] = useState(false)
  if (!ready)
    return (
      <div className="gap-s p-m flex flex-col" aria-busy="true">
        <p
          role="status"
          className="text-body-m text-muted-foreground sm:text-body-s"
        >
          Checking availability…
        </p>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  if (!se || se.end < now - 12 * HOUR)
    return (
      <div className="px-m">
        <EmptyState
          title="That class has ended"
          action={
            <Button
              size="sm"
              onClick={() => {
                onClose?.()
                router.push("/schedule")
              }}
            >
              See today&apos;s schedule
            </Button>
          }
        />
      </div>
    )
  const club = CLUB_BY_SLUG[se.clubSlug]
  const inst = INSTRUCTOR_BY_ID[se.instructorId]
  const people = householdMembers(s, hh.id).filter(
    (m) =>
      (me.role === "teen"
        ? m.id === me.id
        : m.id === me.id || me.role === "primary" || me.role === "adult") &&
      m.status !== "invite_expired"
  )
  const who = s.members[people.some((p) => p.id === forId) ? forId : me.id]
  const st = bookingState(s, who.id, se, now)
  const left = sessionLeft(s, se)
  const strikes = activeStrikes(s, who.id, now)
  const others = s.bookings.filter(
    (b) =>
      b.sessionId === se.id &&
      b.memberId !== who.id &&
      b.status === "booked" &&
      s.members[b.memberId].householdId === hh.id
  )
  const same = sessionsRange(se.clubSlug, dayStart(now), 8)
    .filter((x) => x.typeKey === se.typeKey && x.id !== se.id && x.start > now)
    .slice(0, 4)
    .map((x) => ({
      id: x.id,
      start: x.start,
      end: x.end,
      coach: INSTRUCTOR_BY_ID[x.instructorId]?.name ?? "Coach",
      left: sessionLeft(s, x),
    }))
  const coachSlug = COACHES.find((c) => c.id === se.instructorId)?.slug
  const ages =
    se.minAge >= 18
      ? "18 and over"
      : se.minAge > 4
        ? `${se.minAge} and up`
        : null
  const booked = st.state === "booked" || st.state === "late-cancel"
  const justBooked = confirmed && st.booking?.id === confirmed.id
  const ev = calEventFor(se)
  const crowd = clubCrowdAt(club.slug, se.start)

  const options = people.map((p) => {
    const ps = bookingState(s, p.id, se, now)
    const blocked =
      ps.state === "restricted" && /ages|18/i.test(ps.reason ?? "")
    return {
      value: p.id,
      label: `${p.id === me.id ? `${p.firstName} (you)` : p.firstName}${blocked ? ` — ${ps.reason}` : ""}`,
      disabled: blocked,
    }
  })

  // A plan lock (Trailhead at another club) gets the plan notice, not a disabled button: what the plan covers, the
  // way to Ridge and the way back to the home club. Other locks (ages) keep the disabled button and its reason.
  const planLock =
    st.state === "restricted" && st.link?.href === "/membership/change-plan"
  const home = CLUB_BY_SLUG[me.homeClub]

  // The time is shown once, under the title. Each fact is listed once, in the details.
  const when = `${fmtDayLong(se.start)} · ${fmtRange(se.start, se.end)}`
  const cancelBy = fmtTime(se.start - 2 * HOUR)
  const waitBy = fmtTime(se.start - HOUR)

  // The one rule that applies to the action above it. The member's state (paused, restricted) already has its reason.
  const ruleLine =
    st.state === "started" || st.state === "paused" || st.state === "restricted"
      ? null
      : st.state === "late-cancel" || (booked && now >= se.start - 2 * HOUR)
        ? "Cancelling now counts as a late cancel."
        : st.state === "hold"
          ? "Confirm within 30 minutes, or the spot goes to the next person."
          : st.state === "waitlisted" ||
              st.state === "waitlist" ||
              (left === 0 && !booked)
            ? `The waitlist moves up until ${waitBy}.`
            : `Free to cancel until ${cancelBy}.`

  const coachName = inst?.name ?? "Coach"
  const tags = (
    <SessionTags>
      <li>
        <CategoryBadge id={se.category} />
      </li>
      {ages ? <SessionTag>{ages}</SessionTag> : null}
      {se.firstTimerOk ? <SessionTag>First-timers welcome</SessionTag> : null}
    </SessionTags>
  )
  const coachLine = (
    <p className="text-body-m sm:text-body-s">
      {coachSlug ? (
        <Link
          href={`/training/coaches/${coachSlug}`}
          className="gap-xs py-xxs inline-flex min-h-11 items-center hover:underline"
        >
          <CoachArt
            name={coachName}
            roles={[inst?.role ?? se.category]}
            size={24}
          />
          <span>
            with <span className="font-medium">{coachName}</span>
          </span>
        </Link>
      ) : (
        <span className="gap-xs inline-flex items-center">
          <CoachArt
            name={coachName}
            roles={[inst?.role ?? se.category]}
            size={24}
          />
          with <span className="font-medium">{coachName}</span>
        </span>
      )}
    </p>
  )
  const titleBlock = (
    <>
      <h1
        id={mode === "page" ? "page-title" : undefined}
        tabIndex={mode === "page" ? -1 : undefined}
        className="font-display-wide text-body-xl font-heavy text-balance outline-none"
      >
        {se.name}
      </h1>
      <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
        {when}
      </p>
      {coachLine}
      {tags}
    </>
  )

  const buttons = (
    <SessionButtons
      event={ev}
      booked={booked}
      canInvite={me.role !== "teen"}
      onInvite={() => setInvite(true)}
      onShare={() => {
        void navigator.clipboard?.writeText(
          `https://my.cactuspeakathletic.example/schedule/${se.id}`
        )
        toast({ title: "Link copied" })
      }}
    />
  )

  const stats = (grid?: boolean) => (
    <SessionStats
      grid={grid}
      category={se.category}
      intensity={se.intensity}
      minutes={se.duration}
      left={left}
      capacity={se.capacity}
      waiting={waitCount(s, se)}
      crowdLevel={crowd.level}
      crowdWord={crowd.word}
    />
  )

  // The booking block: who the booking is for, the one full-width action with the rule under it, and what a member
  // needs right after a booking. The time is above it, so the block does not repeat it.
  const booking = (
    <div className="gap-s flex flex-col text-body-m sm:text-body-s">
      {people.length > 1 ? (
        <SelectBox
          label="Booking for"
          value={who.id}
          onChange={setForId}
          options={options}
        />
      ) : null}
      {/* `SessionAction` aligns its parts to the right in `bar` mode. This block is a column, so they stretch. */}
      {planLock ? (
        <ReserveNotice
          art={<ClubSet club={se.clubSlug as ClubId} className="w-28" />}
          title={`${club.name} classes come with Ridge`}
          line={st.reason}
          actions={
            <>
              {me.role === "primary" ? (
                <Button
                  size="sm"
                  render={<Link href="/membership/change-plan" />}
                >
                  Switch to Ridge
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/schedule?club=${home.slug}`} />}
              >
                See {home.name} classes
              </Button>
            </>
          }
        />
      ) : (
        <div className="flex flex-col [&>div]:items-stretch [&>div]:justify-between [&>div]:text-left">
          <SessionAction
            featured
            se={se}
            forId={who.id}
            bar
            showReason
            className="w-full"
            onBooked={(bk) => setConfirmed(bk)}
          />
        </div>
      )}
      {ruleLine ? (
        <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
          {ruleLine}
        </p>
      ) : null}
      {booked && st.booking ? (
        <div role={justBooked ? "status" : undefined} className="rule-t">
          <Facts
            items={[
              ...(st.booking.spot
                ? [
                    {
                      label: "Spot",
                      value: <span className="tabular">{st.booking.spot}</span>,
                    },
                  ]
                : []),
              {
                label: "Reference",
                value: <span className="tabular">{st.booking.ref}</span>,
              },
            ]}
          />
        </div>
      ) : null}
      {others.length ? (
        <p className="gap-xs flex items-center text-muted-foreground">
          <PersonAvatar
            name={`${s.members[others[0].memberId].firstName} ${s.members[others[0].memberId].lastName}`}
            hue={s.members[others[0].memberId].hue}
            size={24}
            className="shrink-0"
          />
          {others.map((o) => s.members[o.memberId].firstName).join(" and ")}{" "}
          {others.length > 1 ? "are" : "is"} also booked
        </p>
      ) : null}
    </div>
  )

  const sections = (
    <>
      <SessionDetails
        room={se.studio}
        bring={se.bring}
        club={{ slug: club.slug, name: club.name, address: club.address }}
      />
      <section className="gap-xs flex min-w-0 flex-col">
        <SectionHeader title="About" />
        <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
          {se.about}
        </p>
      </section>
      <AlsoThisWeek rows={same} />
      <CancelPolicy
        cutoff={new Date(se.start - 2 * HOUR)}
        now={new Date(now)}
        waitlistUntil={new Date(se.start - HOUR)}
        countsAsStrike
        lateCancels={strikes.length}
        strikesHref="/bookings/strikes"
      />
    </>
  )

  const hero = (
    <HeroHeader
      height={wide && mode === "page" ? 240 : 216}
      art={
        <SessionHeroArt
          category={se.category}
          back={
            mode === "page"
              ? { href: "/schedule", label: "Back to schedule" }
              : undefined
          }
          onClose={mode === "sheet" ? onClose : undefined}
        />
      }
    >
      {titleBlock}
    </HeroHeader>
  )

  if (mode === "page")
    return (
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="gap-l flex min-w-0 flex-col">
          {hero}
          {wide ? null : booking}
          {buttons}
          {wide ? null : stats()}
          {sections}
        </div>
        {wide ? (
          <Card
            as="aside"
            className="sticky top-[calc(var(--bar-h)+var(--space-m))]"
          >
            <div className="gap-m flex flex-col">
              {booking}
              <div className="rule-t">{stats(true)}</div>
            </div>
          </Card>
        ) : null}
        <InviteDialog open={invite} onOpenChange={setInvite} se={se} />
      </div>
    )
  return (
    <div className="gap-l p-m flex min-h-full min-w-0 flex-col">
      {hero}
      {booking}
      {buttons}
      {stats()}
      {sections}
      <InviteDialog open={invite} onOpenChange={setInvite} se={se} />
    </div>
  )
}
