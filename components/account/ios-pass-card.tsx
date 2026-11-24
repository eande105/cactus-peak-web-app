"use client"
import { PASS_SURFACE } from "@/components/app/check-in-pass"
import { openPass } from "@/components/app/pass-dialog"
import { QrCode } from "@/components/icons"
import { PASS_ANCHOR } from "@/hooks/use-pass-in-view"
import { CLUB_BY_SLUG, PLANS } from "@/lib/data/catalog"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The pass as a Wallet-style card at the top of You. The whole card is one button that opens the pass popup, the same
 * popup as the header Pass button. It is on the night surface in both themes. The QR glyph is a signpost, not a second control.
 */
export function IosPassCard({
  member,
  plan,
  className,
}: {
  member: Member
  plan: keyof typeof PLANS
  className?: string
}) {
  const club = CLUB_BY_SLUG[member.homeClub]
  return (
    <button
      type="button"
      onClick={() => openPass(member.id)}
      {...PASS_ANCHOR}
      aria-label={`Open your pass, member number ${member.memberNumber}`}
      className={cn(
        "cursor-pointer text-left",
        "gap-l p-l corner-l flex min-h-11 w-full max-w-[420px] flex-col",
        PASS_SURFACE,
        className
      )}
    >
      <span className="gap-s flex items-center justify-between">
        {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
        <img
          src="/brand/cpa-horizontal-reversed.svg"
          alt=""
          className="h-8 w-auto min-w-0"
        />
        <span className="px-s py-xxs shrink-0 rounded-full bg-dawn/15 text-body-s font-heavy text-dawn shadow-[inset_0_0_0_1.5px_var(--dawn)]">
          {PLANS[plan].name}
        </span>
      </span>
      <span className="gap-s flex items-end justify-between">
        <span className="gap-xxs flex min-w-0 flex-col">
          <span className="font-display-wide truncate text-body-xl font-heavy">
            {club.name}
          </span>
          <span className="tabular font-mono text-body-m text-night-foreground/80">
            {member.memberNumber}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-night-foreground/15"
        >
          <QrCode className="size-5" />
        </span>
      </span>
    </button>
  )
}
