"use client"
import { useApp } from "@/components/app/use-app"
import { MapPin } from "@/components/icons"
import { EmptyState } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { setPrefs } from "@/lib/actions"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import type { Club } from "@/lib/types"

/**
 * Shown on a Book tab when the current club does not have what the tab books (Main & Center has no courts). One
 * button for each club that has it sets that club as the current club.
 */
export function NoFacility({
  what,
  has,
}: {
  /** Plural, lower case: "courts", "a lap pool", "kids club". */
  what: string
  has: (c: Club) => boolean
}) {
  const { me, club } = useApp()
  return (
    <EmptyState
      icon={MapPin}
      title={`${CLUB_BY_SLUG[club].name} has no ${what}`}
      action={
        <div className="gap-xs flex flex-wrap justify-center">
          {CLUBS.filter(has).map((c) => (
            <Button
              key={c.slug}
              size="sm"
              variant="outline"
              onClick={() => setPrefs(me.id, { viewingClub: c.slug })}
            >
              {c.name}
            </Button>
          ))}
        </div>
      }
    />
  )
}
