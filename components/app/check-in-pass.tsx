"use client"
import Link from "next/link"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import {
  type ClubId,
  clubObjects,
  ObjectRow,
} from "@/components/brand/graphics"
import { Pause, Smartphone, WifiOff } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { CLUB_BY_SLUG, PLANS } from "@/lib/data/catalog"
import type { AppState } from "@/lib/data/state"
import { clubOpen, householdOf, paymentDaysLate } from "@/lib/engine"
import { DAY, fmtDay, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Member } from "@/lib/types"
import { useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

export type PassState = {
  kind: "valid" | "frozen" | "past-due" | "ended"
  note?: string
  line?: string
}
export function passState(s: AppState, m: Member, now: number): PassState {
  const hh = householdOf(s, m.id)
  if (hh.status === "frozen" && hh.freeze)
    return {
      kind: "frozen",
      line: `Frozen until ${fmtDay(hh.freeze.resume - DAY)}`,
      note: "Ask the front desk.",
    }
  if (paymentDaysLate(s, m.id, now) >= 15)
    return { kind: "past-due", line: "Payment needed. See the front desk." }
  if (hh.status === "cancel_scheduled" && hh.cancelOn)
    return { kind: "valid", note: `Membership ends ${fmtDay(hh.cancelOn)}` }
  return { kind: "valid" }
}

// The QR is always black on a white square with a quiet zone, in both colour modes, so scanners can read it.
function Qr({ value, name }: { value: string; name: string }) {
  const [svg, setSvg] = useState("")
  useEffect(() => {
    let live = true
    QRCode.toString(value, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then((s) => {
      if (live) setSvg(s)
    })
    return () => {
      live = false
    }
  }, [value])
  return (
    <div
      role="img"
      aria-label={`Check-in code for ${name}, updates every 60 seconds`}
      className={cn(
        "grid aspect-square w-full max-w-[272px] place-items-center",
        "corner-s p-m mx-auto",
        "bg-white",
        "[&_svg]:size-full"
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG comes from the local QR library, not user HTML
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    ></div>
  )
}

/** On a computer: send the pass to the member's phone, where the front desk can scan it. */
function SendToPhone({ member }: { member: Member }) {
  const { me, prefs } = useApp()
  const last4 = prefs.phone.replace(/\D/g, "").slice(-4)
  return (
    <div className="gap-s corner-s p-m flex flex-col items-start bg-night-foreground/10">
      <p className="text-body-s text-night-foreground/90">
        Check in with the code on your phone.
      </p>
      {last4 ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast({
              title: `Pass link sent to the phone ending ${last4}`,
              // A parent can send a child's pass to their own phone; say whose it is.
              description:
                member.id === me.id ? undefined : `${member.firstName}'s pass`,
            })
          }
        >
          <Smartphone aria-hidden="true" data-icon="inline-start" />
          Send to my phone
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          render={<Link href="/settings/profile" />}
        >
          <Smartphone aria-hidden="true" data-icon="inline-start" />
          Add a phone number
        </Button>
      )}
    </div>
  )
}

export function CheckInPass({
  s,
  member,
  now,
  variant = "full",
  className,
}: {
  s: AppState
  member: Member
  now: number
  variant?: "full" | "compact"
  className?: string
}) {
  const offline = useOffline()
  const st = passState(s, member, now)
  const hh = householdOf(s, member.id)
  const club = CLUB_BY_SLUG[member.homeClub]
  const bucket = Math.floor(now / 60_000)
  const token = `CPA|${member.memberNumber}|${bucket}|${(bucket * 7919) % 9973}`
  const scannable = st.kind === "valid"
  // The code is scanned from a phone at the front desk. A computer gets a way to send the pass to the phone instead.
  const onTouch = useMedia("(pointer: coarse)")
  if (variant === "compact")
    return (
      <div
        className={cn(
          "gap-m flex items-center justify-between",
          "corner-s px-m py-s",
          "bg-night text-night-foreground",
          className
        )}
      >
        <div className="min-w-0">
          <p className="eyebrow text-night-foreground/80">Member number</p>
          <p className="tabular truncate text-body-m font-heavy">
            {member.memberNumber}
          </p>
        </div>
        <Button variant="secondary" size="sm" render={<Link href="/pass" />}>
          Show pass
        </Button>
      </div>
    )
  return (
    <section
      aria-label={`Check-in pass for ${member.firstName} ${member.lastName}`}
      className={cn(
        "overflow-hidden corner-m bg-night text-night-foreground",
        className
      )}
    >
      <div className="gap-s px-l pt-l flex items-center justify-between">
        {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
        <img
          src="/brand/cpa-horizontal-reversed.svg"
          alt="Cactus Peak Athletic"
          className="h-8 w-auto"
        />
        <span
          className={cn(
            "px-xs py-xxs corner-xs edge-m",
            "text-body-s font-heavy",
            "border-dawn text-dawn"
          )}
        >
          {PLANS[hh.plan].name}
        </span>
      </div>
      {member.homeClub in clubObjects ? (
        // The home club's Set: three objects that mark the club this pass opens.
        <ObjectRow
          ids={clubObjects[member.homeClub as ClubId]}
          scheme="night"
          className="mx-l mt-l h-9 w-auto"
        />
      ) : null}
      <div className="gap-xxs px-l pt-l flex flex-col">
        <p className="font-display-wide text-body-xxl font-heavy">
          {member.firstName} {member.lastName}
        </p>
        <p className="eyebrow text-night-foreground/80">Member number</p>
        <p className="tabular text-display-s font-heavy sm:text-display-m">
          {member.memberNumber}
        </p>
        {st.note ? (
          <p className="text-body-s text-night-foreground/80">{st.note}</p>
        ) : null}
      </div>
      <div className="px-l py-l">
        {scannable && onTouch ? (
          <>
            <Qr value={token} name={`${member.firstName} ${member.lastName}`} />
            <p className="mt-s text-body-s text-night-foreground/90">
              Scan at the front desk. Updates every 60 seconds.
            </p>
          </>
        ) : scannable ? (
          <SendToPhone member={member} />
        ) : (
          <div className="gap-xs corner-s p-m flex flex-col bg-night-foreground/10">
            <p className="gap-xs inline-flex items-center text-body-s font-heavy">
              {st.kind === "frozen" ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : null}
              {st.line}
            </p>
            {st.note ? (
              <p className="text-body-s text-night-foreground/90">{st.note}</p>
            ) : null}
            <p className="text-body-s text-night-foreground/90">
              Your member number stays valid:{" "}
              <span className="tabular">{member.memberNumber}</span>
            </p>
          </div>
        )}
        {offline && scannable && onTouch ? (
          <p
            className={cn(
              "gap-xs inline-flex items-start",
              "mt-s p-xs corner-xs",
              "text-body-s",
              "bg-warning-subtle text-foreground"
            )}
          >
            <WifiOff
              className="mt-xxs size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            Offline. This code may not scan. Show your member number:{" "}
            {member.memberNumber}.
          </p>
        ) : null}
      </div>
      <p className="px-l py-s edge-t-m border-night-foreground/15 text-body-s text-night-foreground/90">
        Home club: {club.name} ·{" "}
        {clubOpen(now).open
          ? `Open now, closes ${fmtTime(clubOpen(now).closeAt)}`
          : `Closed now, opens ${fmtTime(clubOpen(now).openAt)}`}
      </p>
    </section>
  )
}
