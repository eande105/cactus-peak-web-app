import Link from "next/link"
import { openPass } from "@/components/app/pass-dialog"
import { ROLE } from "@/components/family/parts"
import { PersonAvatar, StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { PASS_ANCHOR } from "@/hooks/use-pass-in-view"
import { CLUB_BY_SLUG } from "@/lib/data/catalog"
import type { Member } from "@/lib/types"

/**
 * A contact-card intro for one household member: a large avatar, the name, "Role · Club", tags, then Bookings and Pass.
 * Centred on a phone, left-aligned from `lg`. The page's h1 is the AppPage title, so the name here is not a heading.
 */
export function IosMemberIntro({
  member,
  paused,
}: {
  member: Member
  paused: boolean
}) {
  const name = `${member.firstName} ${member.lastName}`
  return (
    <section
      aria-label={`${name} at a glance`}
      className="gap-m flex flex-col items-center text-center lg:items-start lg:text-left"
    >
      <PersonAvatar name={name} hue={member.hue} size={88} />
      <div className="gap-xxs flex min-w-0 flex-col items-center lg:items-start">
        <p className="font-display-wide text-body-xxl font-heavy text-pretty">
          {name}
        </p>
        <p className="text-body-m text-muted-foreground sm:text-body-s">
          {ROLE[member.role]} · {CLUB_BY_SLUG[member.homeClub].name}
        </p>
      </div>
      {member.status === "invited" || paused ? (
        <div className="gap-xs flex flex-wrap justify-center lg:justify-start">
          {member.status === "invited" ? (
            <StatusPill tone="warning">Invite pending</StatusPill>
          ) : null}
          {paused ? <StatusPill tone="info">Access paused</StatusPill> : null}
        </div>
      ) : null}
      <div className="gap-s grid w-full max-w-[420px] grid-cols-2">
        <Button
          variant="outline"
          className="min-h-11"
          render={
            <Link href={`/bookings?who=${encodeURIComponent(member.id)}`} />
          }
        >
          Bookings
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => openPass(member.id)}
          {...PASS_ANCHOR}
        >
          Pass
        </Button>
      </div>
    </section>
  )
}
