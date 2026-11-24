"use client"
import Link from "next/link"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { AddToCalendar } from "@/components/booking/calendar-menu"
import { CancelDialog } from "@/components/booking/cancel-dialog"
import {
  evFor,
  HeldActions,
  PastStatus,
  roomOf,
  StatusOf,
  tileOf,
  titleOf,
} from "@/components/bookings/booking-panel"
import { Clock, Info, MapPin, Phone, Share2, User, X } from "@/components/icons"
import { PanelEmpty } from "@/components/kit/app"
import {
  CancelPolicy,
  FactRow,
  PassCard,
  SectionHeader,
} from "@/components/kit/detail"
import { Button } from "@/components/ui/button"
import { leaveWaitlist, rejoinWaitlist } from "@/lib/actions"
import { CLUB_BY_SLUG, COACH_BY_SLUG } from "@/lib/data/catalog"
import { activeStrikes } from "@/lib/engine"
import {
  DAY,
  fmtDay,
  fmtRange,
  fmtTime,
  HOUR,
  isSameDay,
  MIN,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"

/**
 * The scan code of a booking pass. It has the same shape as the code on the member's Pass (`CheckInPass`), so the front
 * desk reads both the same way. Keep the two in step.
 */
function passToken(memberNumber: string, now: number) {
  const bucket = Math.floor(now / MIN)
  return `CPA|${memberNumber}|${bucket}|${(bucket * 7919) % 9973}`
}

/** "3 h 20 min", "45 min". */
/** "8 days, 2 h", "5 h 10 min", "40 min": two units at most, as the iOS cancel line. */
function span(ms: number) {
  const mins = Math.max(1, Math.round(ms / MIN))
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days > 0)
    return `${days} ${days === 1 ? "day" : "days"}${hours ? `, ${hours} h` : ""}`
  return mins >= 60
    ? `${hours} h${mins % 60 ? ` ${mins % 60} min` : ""}`
    : `${mins} min`
}

const OVER: Booking["status"][] = [
  "attended",
  "late_cancelled",
  "no_show",
  "cancelled",
]

/**
 * One booking as a Wallet-style pass: the pass card, the one action its state asks for (confirm or release a held
 * spot, leave a waitlist, cancel), the action buttons, then who and where, and the cancel rules. It fills the Bookings
 * `Split` panel from `lg` and the `/bookings/<id>` route below it.
 */
export function BookingDetail({
  id,
  onClose,
}: {
  id: string
  /** Shows the close button of the Split panel. */
  onClose?: () => void
}) {
  const { s, me, hh, now } = useApp()
  const offline = useOffline()
  const [cancelFor, setCancelFor] = useState<Booking | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const b = s.bookings.find((x) => x.id === id)
  const owner = b ? s.members[b.memberId] : undefined
  // A member sees the bookings of their household; a teen only their own.
  if (
    !b ||
    !owner ||
    owner.householdId !== hh.id ||
    (me.role === "teen" && b.memberId !== me.id)
  )
    return (
      <PanelEmpty icon={Info}>
        We could not find that booking. It may be cancelled or belong to someone
        else.
      </PanelEmpty>
    )

  const club = CLUB_BY_SLUG[b.clubSlug]
  const kids = b.kind === "kids"
  const training = b.kind === "pt"
  const names = kids
    ? s.bookings
        .filter(
          (x) =>
            x.kind === "kids" &&
            x.ref === b.ref &&
            x.start === b.start &&
            x.status === b.status
        )
        .map((x) => s.members[x.memberId].firstName)
    : [owner.firstName]
  const coach = b.coachSlug ? COACH_BY_SLUG[b.coachSlug] : undefined
  const room = roomOf(b)
  const over =
    OVER.includes(b.status) || (b.status === "booked" && b.end <= now)
  const booked = b.status === "booked" && !over
  const held = b.status === "held"
  const waiting = b.status === "waitlisted"
  const today = isSameDay(b.start, now)
  const win = (training ? 24 : 2) * HOUR
  const cutoff = b.start - win
  const heldLeft = held ? (b.holdExpiresAt ?? 0) - now : 0
  const checkedIn = s.visits.some(
    (v) =>
      v.memberId === b.memberId &&
      v.clubSlug === b.clubSlug &&
      v.at >= b.start - HOUR &&
      v.at <= b.end
  )
  const scanner = kids ? me : owner
  const code =
    booked && today && !checkedIn ? passToken(scanner.memberNumber, now) : null

  const fields: { label: string; value: string }[] = [
    { label: "Date", value: fmtDay(b.start) },
    { label: "Time", value: fmtRange(b.start, b.end) },
    ...(kids
      ? [{ label: "Children", value: names.join(", ") }]
      : training
        ? coach
          ? [{ label: "Coach", value: coach.name }]
          : []
        : b.kind === "court" || b.kind === "lane"
          ? b.resource
            ? [
                {
                  label: b.kind === "court" ? "Court" : "Lane",
                  value: b.resource,
                },
              ]
            : []
          : room
            ? [{ label: "Room", value: room }]
            : []),
    {
      label: "Length",
      value: kids ? "2 h" : `${Math.round((b.end - b.start) / MIN)} min`,
    },
  ]

  const maps = `https://maps.google.com/?q=${encodeURIComponent(club.address)}`
  const canMove =
    b.status === "booked" &&
    !over &&
    (b.kind === "court" || b.kind === "lane" || training)
  const se = b.sessionId
  const lateCancels = activeStrikes(s, b.memberId, now).length
  const late = now >= cutoff

  return (
    <div className="gap-m flex min-w-0 flex-col">
      {onClose ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="corner-s grid size-8 shrink-0 place-items-center hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <PassCard
        tile={tileOf(b, 56)}
        title={titleOf(b, names)}
        subtitle={club.name}
        tint={`var(--cat-${b.category})`}
        status={over ? <PastStatus b={b} /> : <StatusOf b={b} />}
        fields={fields}
        code={code}
        checkedIn={checkedIn && !over}
      />

      {held ? (
        <div className="gap-xs flex flex-col">
          <HeldActions b={b} left={heldLeft} />
          <p className="text-center text-body-m text-muted-foreground sm:text-body-s">
            Confirm in time or the spot goes to the next person.
          </p>
        </div>
      ) : waiting ? (
        <div className="gap-xs flex flex-col">
          <Button
            variant="ghost"
            className="!text-destructive"
            onClick={() => {
              leaveWaitlist(b.id)
              toast({
                title: "You left the waitlist",
                action: {
                  label: "Undo",
                  onClick: () => rejoinWaitlist(b.id),
                },
              })
            }}
          >
            Leave waitlist
          </Button>
          <p className="text-center text-body-m text-muted-foreground sm:text-body-s">
            The waitlist moves up until {fmtTime(b.start - HOUR)}.
          </p>
        </div>
      ) : !over && (booked || b.status === "pending_approval") ? (
        <div className="gap-xs flex flex-col">
          <Button
            variant="ghost"
            className="!text-destructive"
            disabled={offline}
            onClick={() => {
              setCancelFor(b)
              setCancelOpen(true)
            }}
          >
            Cancel booking
          </Button>
          <p className="tabular text-center text-body-m text-muted-foreground sm:text-body-s">
            {kids
              ? "Free to cancel. Please give 2 hours' notice."
              : late
                ? "Free cancel has ended. Cancelling now counts as a late cancel."
                : `Free to cancel for ${span(cutoff - now)}.`}
          </p>
        </div>
      ) : null}

      {/* Equal buttons in one row, as the iOS action row: on phones the glyph sits above the word. */}
      <div className="gap-xs [&>*]:gap-xxs [&>*]:py-xs grid auto-cols-fr grid-flow-col [&>*]:h-auto [&>*]:min-h-14 [&>*]:w-full [&>*]:flex-col [&>*]:text-center">
        {!over ? (
          <Button
            variant="outline"
            render={<a href={maps} target="_blank" rel="noreferrer" />}
          >
            <MapPin className="size-4" aria-hidden="true" />
            Directions
          </Button>
        ) : null}
        {booked ? (
          <AddToCalendar event={evFor(b)} variant="outline">
            Calendar
          </AddToCalendar>
        ) : null}
        {!over && b.kind === "court" ? (
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `https://my.cactuspeakathletic.example/g/${b.ref}`
              )
              toast({ title: "Invite link copied" })
            }}
          >
            <Share2 className="size-4" aria-hidden="true" />
            Invite
          </Button>
        ) : !over ? (
          <Button
            variant="outline"
            render={<a href={`tel:${club.phone.replace(/\D/g, "")}`} />}
          >
            <Phone className="size-4" aria-hidden="true" />
            Call
          </Button>
        ) : null}
        {canMove ? (
          <Button
            variant="outline"
            render={
              <Link
                href={
                  training
                    ? `/training/coaches/${b.coachSlug}/book?move=${b.id}`
                    : `/reserve/${b.kind === "court" ? "courts" : "lanes"}?club=${b.clubSlug}&move=${b.id}`
                }
              />
            }
          >
            <Clock className="size-4" aria-hidden="true" />
            Move
          </Button>
        ) : null}
        {over &&
        b.status === "attended" &&
        !b.feedbackDone &&
        se &&
        now - b.end < 7 * DAY ? (
          <Button
            variant="outline"
            onClick={() => openDialog("feedback", b.id)}
          >
            Give feedback
          </Button>
        ) : null}
        {over && se ? (
          <Button
            variant="outline"
            render={
              <Link
                href={`/schedule?series=${se.split("~")[3]}&club=${b.clubSlug}`}
              />
            }
          >
            Book again
          </Button>
        ) : null}
      </div>

      {kids && !over ? (
        <FactRow
          icon={<Clock />}
          text={`Check in by ${fmtTime(b.start + 15 * MIN)} or we release the block.`}
        />
      ) : null}

      {training && coach ? (
        <section className="gap-xs flex min-w-0 flex-col">
          <SectionHeader title="Coach" />
          <FactRow
            icon={<User />}
            text={coach.name}
            secondary="Personal training"
            href={`/training/coaches/${coach.slug}`}
          />
        </section>
      ) : null}

      {se ? (
        <section className="gap-xs flex min-w-0 flex-col">
          <SectionHeader title="Class" />
          <FactRow
            icon={<Info />}
            text={b.title}
            secondary="Class details"
            href={`/schedule/${se}`}
          />
        </section>
      ) : null}

      <section className="gap-xs flex min-w-0 flex-col">
        <SectionHeader title="Club" />
        <FactRow
          icon={<MapPin />}
          text={club.name}
          secondary={club.address}
          href={`/clubs/${club.slug}`}
        />
      </section>

      {over ? null : (
        <CancelPolicy
          cutoff={new Date(cutoff)}
          now={new Date(now)}
          waitlistUntil={waiting ? new Date(b.start - HOUR) : undefined}
          countsAsStrike={
            b.kind === "class" || b.kind === "court" || b.kind === "lane"
          }
          note={kids ? "Kids club has no strikes" : undefined}
          lateCancels={lateCancels}
          strikesHref="/bookings/strikes"
        />
      )}

      {cancelFor ? (
        <CancelDialog
          booking={cancelFor}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      ) : null}
    </div>
  )
}
