"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useApp } from "@/components/app/use-app"
import { BusyWord } from "@/components/clubs/parts"
import { Menu } from "@/components/graphical"
import { Check, ChevronDown } from "@/components/icons"
import { BusynessMeter } from "@/components/kit/ribs"
import { setPrefs } from "@/lib/actions"
import { CLUB_BY_SLUG, CLUBS } from "@/lib/data/catalog"
import { liveBusyness } from "@/lib/engine"
import { cn } from "@/lib/utils"

/**
 * `?club=` on a Book page sets the current club once (`prefs.viewingClub`) and leaves the URL. The current club is
 * the one place a club is chosen: Book (classes, courts, lap lanes, kids club) and Today read it.
 */
export function useClubParam() {
  const { me, prefs } = useApp()
  const sp = useSearchParams()
  const path = usePathname()
  const router = useRouter()
  const param = sp.get("club")
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the param appears; the param is removed after it is applied
  useEffect(() => {
    // One club slug sets the current club. A list (the class filter that compares clubs) stays in the URL.
    if (!param || !CLUB_BY_SLUG[param]) return
    if (param !== prefs.viewingClub) setPrefs(me.id, { viewingClub: param })
    const p = new URLSearchParams(sp)
    p.delete("club")
    const q = p.toString()
    router.replace(q ? `${path}?${q}` : path, { scroll: false })
  }, [param])
}

function Level({ slug }: { slug: string }) {
  const { now } = useApp()
  const b = liveBusyness(slug, now)
  return (
    <span className="gap-xs flex shrink-0 items-center">
      <BusynessMeter level={b.level} variant="compact" />
      <BusyWord level={b.level} className="text-body-xs" />
    </span>
  )
}

/**
 * The one club switcher. It shows the current club (cross streets), its crowd level meter and the level word, and
 * writes `prefs.viewingClub`. It sits at the top of Today and in the Book header.
 */
export function ClubSwitcher({ className }: { className?: string }) {
  const { me, club } = useApp()
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Club: ${CLUB_BY_SLUG[club].name}. Change club`}
        className={cn(
          "!gap-s !px-s corner-s !flex !min-h-9 !items-center !justify-start !text-left hairline max-md:!min-h-11",
          className
        )}
      >
        <span className="min-w-0 truncate text-body-s font-heavy">
          {CLUB_BY_SLUG[club].name}
        </span>
        <Level slug={club} />
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup className="!min-w-72">
            <Menu.RadioGroup
              value={club}
              onValueChange={(v) =>
                setPrefs(me.id, { viewingClub: v as string })
              }
            >
              {CLUBS.map((c) => (
                <Menu.RadioItem key={c.slug} value={c.slug} closeOnClick>
                  <Menu.RadioItemIndicator>
                    <Check aria-hidden="true" />
                  </Menu.RadioItemIndicator>
                  <span className="flex-1 truncate">{c.name}</span>
                  <Level slug={c.slug} />
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
