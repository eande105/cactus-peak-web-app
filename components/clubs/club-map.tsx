"use client"
import { Minus, Plus, RotateCcw } from "@/components/icons"
import { BusynessMeter } from "@/components/kit/ribs"
import { BrandMap, BrandPin } from "@/components/map/brand-map"
import { Button } from "@/components/ui/button"
import { CLUBS } from "@/lib/data/catalog"
import { liveBusyness } from "@/lib/engine"
import { cn } from "@/lib/utils"

// Brand map of the East Valley (components/map/brand-map.tsx). Each club pin carries its neighbourhood and live
// busyness. Pins are buttons in the tab order, after the list.
export function ClubMap({
  now,
  selected,
  hover,
  onSelect,
  onHover,
  only,
  className,
  ratio = "16/11",
  interactive = true,
}: {
  now: number
  selected?: string
  hover?: string
  onSelect?: (slug: string) => void
  onHover?: (slug: string | null) => void
  only?: string
  className?: string
  ratio?: string
  /** Off: a still picture of the place, for a card. */
  interactive?: boolean
}) {
  const pins = (only ? CLUBS.filter((c) => c.slug === only) : CLUBS).map(
    (c) => ({ ...c, id: c.slug })
  )
  return (
    <BrandMap
      pins={pins}
      focus={only}
      zoom={14.5}
      selected={selected}
      interactive={interactive}
      label={
        only
          ? `Map of ${pins[0]?.name ?? "the club"} and the streets around it`
          : "Map of the clubs"
      }
      className={cn("corner-m hairline ring-border", className)}
      style={{ aspectRatio: ratio }}
      fallback={
        <p className="text-body-s text-muted-foreground">
          The map did not load. The address is listed with each club.
        </p>
      }
      renderPin={(c) => {
        const on = selected === c.slug || hover === c.slug
        const b = liveBusyness(c.slug, now)
        return (
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(c.slug)}
            onMouseEnter={() => onHover?.(c.slug)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(c.slug)}
            onBlur={() => onHover?.(null)}
            aria-label={`${c.name}, busyness ${b.label}`}
            aria-pressed={onSelect ? selected === c.slug : undefined}
            className="corner-s focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
          >
            <BrandPin
              active={on}
              chipClassName={cn(
                "flex flex-col items-center gap-0.5 corner-s bg-card px-2 py-1 shadow-(--shadow-s) hairline ring-border",
                on && "!bg-night text-night-foreground"
              )}
            >
              <span className="text-body-xs font-heavy whitespace-nowrap">
                {c.name}
              </span>
              <BusynessMeter level={b.level} variant="compact" />
            </BrandPin>
          </button>
        )
      }}
      renderControls={({ zoomIn, zoomOut, reset }) => (
        <div className="flex flex-col gap-xxs">
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            onClick={zoomIn}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            onClick={zoomOut}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Reset view"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      )}
    />
  )
}
