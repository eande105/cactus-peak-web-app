"use client"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { Collapsible, Toggle } from "@/components/graphical"
import { ChevronDown, Lock, Minus, Plus } from "@/components/icons"
import { CategoryBadge } from "@/components/kit/category"
import { CheckRow, Segmented, SelectBox, SwitchRow } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { setPrefs } from "@/lib/actions"
import { CATEGORIES, CLUBS, INSTRUCTORS } from "@/lib/data/catalog"
import {
  activeCount,
  EMPTY,
  type Filters,
  type TimeBand,
} from "@/lib/schedule-filters"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

function Group({
  title,
  children,
  defaultOpen = true,
  className,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className={cn("py-s rule-t first:pt-zero first:shadow-none", className)}
    >
      <Collapsible.Trigger
        className={cn(
          "group flex min-h-9 w-full items-center justify-between",
          "!p-zero",
          "text-body-m font-heavy",
          "!bg-transparent !shadow-none",
          "sm:text-body-s"
        )}
      >
        {title}
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="pt-xs">
        <div className="gap-xs flex flex-col">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

const BANDS: { value: TimeBand; label: string; sr: string }[] = [
  { value: "early", label: "Early", sr: "Early, 4:30 to 7 am" },
  { value: "morning", label: "Morning", sr: "Morning, 7 am to noon" },
  { value: "midday", label: "Midday", sr: "Midday, noon to 4 pm" },
  { value: "evening", label: "Evening", sr: "Evening, 4 to 10 pm" },
]

export function ScheduleFilters({
  f,
  onChange,
  count,
  counts,
  studios,
}: {
  f: Filters
  onChange: (f: Filters) => void
  count: number
  counts: Record<string, number>
  studios: string[]
}) {
  const { me, hh, prefs, club } = useApp()
  const [saved, setSaved] = useState(!!prefs.savedFilters)
  const multi = hh.plan !== "trailhead"
  const set = (p: Partial<Filters>) => onChange({ ...f, ...p })
  const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
  return (
    <search className="flex flex-col" aria-label="Schedule filters">
      <Group title="Club">
        {CLUBS.map((c) => {
          const locked = !multi && c.slug !== me.homeClub
          return locked ? (
            <p
              key={c.slug}
              className="gap-xs flex min-h-9 items-center text-body-m text-muted-foreground sm:text-body-s"
            >
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              {c.name}
              <span>· Ridge or Summit</span>
            </p>
          ) : (
            <CheckRow
              key={c.slug}
              checked={f.clubs.includes(c.slug)}
              onChange={() => {
                const next = toggle(f.clubs, c.slug)
                set({ clubs: next.length ? next : [club] })
              }}
            >
              {c.name}
            </CheckRow>
          )
        })}
      </Group>
      <Group title="Category">
        {CATEGORIES.filter(
          (c) => (counts[c.id] ?? 0) > 0 || f.cats.includes(c.id as CategoryId)
        ).map((c) => (
          <CheckRow
            key={c.id}
            checked={f.cats.includes(c.id as CategoryId)}
            onChange={() => set({ cats: toggle(f.cats, c.id as CategoryId) })}
          >
            <span className="gap-xs flex items-center">
              <CategoryBadge id={c.id} />
              <span className="tabular text-body-xs text-muted-foreground">
                {counts[c.id] ?? 0}
              </span>
            </span>
          </CheckRow>
        ))}
      </Group>
      <Group title="Time of day">
        {/* biome-ignore lint/a11y/useSemanticElements: toggle-button group, a fieldset would add legend and border styles */}
        <div
          className="gap-xs flex flex-wrap"
          role="group"
          aria-label="Time of day"
        >
          {BANDS.map((b) => (
            <Toggle
              key={b.value}
              pressed={f.times.includes(b.value)}
              aria-label={b.sr}
              onPressedChange={() => set({ times: toggle(f.times, b.value) })}
              className="max-md:min-h-11"
            >
              {b.label}
            </Toggle>
          ))}
        </div>
      </Group>
      <Group title="Intensity">
        <p className="text-body-m text-muted-foreground sm:text-body-s">
          1 Easy · 5 All-out
        </p>
        {(["intMin", "intMax"] as const).map((k) => (
          <div key={k} className="gap-s flex items-center justify-between">
            <span className="text-body-m sm:text-body-s">
              {k === "intMin" ? "At least" : "At most"}
            </span>
            <span className="gap-xxs flex items-center">
              <Button
                variant="outline"
                size="icon"
                aria-label={`Decrease ${k === "intMin" ? "minimum" : "maximum"} intensity`}
                onClick={() =>
                  set({ [k]: Math.max(1, f[k] - 1) } as Partial<Filters>)
                }
                disabled={f[k] <= 1}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span
                className="tabular w-8 text-center text-body-m font-heavy sm:text-body-s"
                aria-live="polite"
              >
                {f[k]}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Increase ${k === "intMin" ? "minimum" : "maximum"} intensity`}
                onClick={() =>
                  set({ [k]: Math.min(5, f[k] + 1) } as Partial<Filters>)
                }
                disabled={f[k] >= 5}
              >
                <Plus aria-hidden="true" />
              </Button>
            </span>
          </div>
        ))}
      </Group>
      <Group title="Availability">
        <SwitchRow checked={f.open} onChange={(c) => set({ open: c })}>
          Open spots only
        </SwitchRow>
        <CheckRow checked={f.first} onChange={(c) => set({ first: c })}>
          Good for first-timers
        </CheckRow>
        <CheckRow checked={f.mine} onChange={(c) => set({ mine: c })}>
          Only my bookings
        </CheckRow>
      </Group>
      <Group title="More" defaultOpen={false}>
        <SelectBox
          label="Instructor"
          value={f.inst || "any"}
          onChange={(v) => set({ inst: v === "any" ? "" : v })}
          options={[
            { value: "any", label: "Any instructor" },
            ...INSTRUCTORS.map((i) => ({ value: i.id, label: i.name })),
          ]}
        />
        <SelectBox
          label="Studio or room"
          value={f.studio || "any"}
          onChange={(v) => set({ studio: v === "any" ? "" : v })}
          options={[
            { value: "any", label: "Any room" },
            ...studios.map((x) => ({ value: x, label: x })),
          ]}
        />
        <Segmented
          label="Duration"
          value={f.dur || "any"}
          onChange={(v) => set({ dur: v === "any" ? "" : v })}
          size="sm"
          options={[
            { value: "any", label: "Any" },
            { value: "30", label: "Up to 30" },
            { value: "45", label: "45" },
            { value: "60", label: "60+" },
          ]}
        />
      </Group>
      <div className="gap-s pt-s flex flex-col rule-t">
        <CheckRow
          checked={saved}
          onChange={(c) => {
            setSaved(c)
            setPrefs(me.id, { savedFilters: c ? JSON.stringify(f) : undefined })
          }}
        >
          Save as my filters
        </CheckRow>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={activeCount(f, club) === 0}
            onClick={() => onChange({ ...EMPTY, clubs: [club] })}
          >
            Clear all
          </Button>
          {/* The sheet's own button shows the count, so this one is for screen readers only. */}
          <p role="status" className="sr-only">
            {count} {count === 1 ? "class" : "classes"}
          </p>
        </div>
      </div>
    </search>
  )
}
