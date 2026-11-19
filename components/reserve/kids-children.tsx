"use client"
import Link from "next/link"
import { Toggle } from "@/components/graphical"
import { Check, TriangleAlert } from "@/components/icons"
import { Card } from "@/components/kit/app"
import { PersonAvatar } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Kids club's rule: no more than this many blocks for one child on one day (lib/actions.ts, bookKidsClub). */
export const KIDS_DAY_LIMIT = 2

/** Whether a child can be booked on the chosen day, and the line that says so. */
export function childReadiness(
  c: Member,
  blocksThatDay: number,
  dayWord: string
) {
  if (!c.allergyNotes)
    return { ready: false, line: "Needs allergy notes", fix: true } as const
  if (blocksThatDay >= KIDS_DAY_LIMIT)
    return {
      ready: false,
      line: `${KIDS_DAY_LIMIT} blocks booked on ${dayWord}`,
      fix: false,
    } as const
  if (blocksThatDay === 1)
    return {
      ready: true,
      line: `1 block left on ${dayWord}`,
      fix: false,
    } as const
  return { ready: true, line: "Allergy notes on file", fix: false } as const
}

/**
 * The first step of a kids club booking, above the filters: who is going. One tile for each child, which the member
 * ticks (one child or several), with the one fact that decides whether that child can go: allergy notes on file, and
 * the day's limit of 2 blocks. A child who cannot go yet keeps a tile, dimmed, with the reason and, where there is one,
 * the fix ("Add allergy notes"), so the member is never left wondering why a child is missing.
 */
export function WhosGoing({
  childList,
  value,
  onChange,
  blocksOn,
  dayWord,
}: {
  childList: Member[]
  value: string[]
  onChange: (id: string, on: boolean) => void
  /** How many kids club blocks the child already has on the chosen day. */
  blocksOn: (id: string) => number
  /** The chosen day in a few letters: "Tue". */
  dayWord: string
}) {
  const going = childList.filter((c) => value.includes(c.id))
  return (
    <Card
      display
      compact
      title="Who's going"
      description={
        going.length
          ? `${going.map((c) => c.firstName).join(" and ")} ${going.length === 1 ? "is" : "are"} going`
          : "Choose at least one child"
      }
    >
      <div className="@container">
        <ul
          aria-label="Children"
          className="gap-xs grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3"
        >
          {childList.map((c) => {
            const st = childReadiness(c, blocksOn(c.id), dayWord)
            const on = st.ready && value.includes(c.id)
            const body = (
              <>
                <PersonAvatar
                  name={c.firstName}
                  hue={c.hue}
                  size={40}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heavy">
                    {c.firstName}, {c.age}
                  </span>
                  <span
                    className={cn(
                      "gap-xxs flex items-start",
                      st.ready ? "text-muted-foreground" : "text-warning"
                    )}
                  >
                    {st.ready ? null : (
                      <span className="flex h-lh shrink-0 items-center">
                        <TriangleAlert
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </span>
                    )}
                    <span className="min-w-0 text-pretty">{st.line}</span>
                  </span>
                </span>
              </>
            )
            return (
              <li key={c.id} className="flex min-w-0">
                {st.ready ? (
                  <Toggle
                    pressed={on}
                    onPressedChange={(p) => onChange(c.id, p)}
                    aria-label={`${c.firstName}, ${c.age}. ${st.line}.`}
                    className="gap-s p-s !flex !min-h-16 !w-full !items-center !justify-start corner-m text-left text-body-m whitespace-normal hairline ring-border data-[pressed]:!bg-accent data-[pressed]:!text-foreground data-[pressed]:ring-primary sm:text-body-s"
                  >
                    {body}
                    {/* The tick: an empty box until the child is chosen, then a Copper check. A chosen child takes the
                        app's selected look (the Copper tint and edge of the sidebar's current item), not the Ink fill. */}
                    {on ? (
                      <Check
                        className="size-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-5 shrink-0 corner-xs hairline ring-input"
                      />
                    )}
                  </Toggle>
                ) : (
                  <div className="gap-s p-s flex min-h-16 w-full items-center corner-m border border-dashed border-border text-body-m sm:text-body-s">
                    <span className="gap-s flex min-w-0 flex-1 items-center opacity-60">
                      {body}
                    </span>
                    {st.fix ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        render={<Link href={`/family/${c.id}`} />}
                      >
                        Add notes
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
