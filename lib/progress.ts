import { weekStart } from "@/lib/engine"
import { nextMilestone } from "@/lib/insights"
import { DAY, dayStart, parts } from "@/lib/time"
import type { CategoryId, Visit } from "@/lib/types"

// Read-only numbers for the Progress page. The page draws them; nothing here writes or reads state.

const WEEK = 7 * DAY

/**
 * Whole-number shares that add up to exactly 100 (largest remainder), so a legend never reads 99 % or 101 %.
 * All zeros give all zeros.
 */
export function sharesOf(ns: number[]): number[] {
  const total = ns.reduce((a, b) => a + b, 0)
  if (!total) return ns.map(() => 0)
  const raw = ns.map((n) => (n / total) * 100)
  const out = raw.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, rest: r - Math.floor(r) }))
    .sort((a, b) => b.rest - a.rest)
  for (const o of order) {
    if (!left) break
    out[o.i] += 1
    left -= 1
  }
  return out
}

export function countBetween(visits: Visit[], from: number, to: number) {
  return visits.filter((v) => v.at >= from && v.at < to).length
}

/** One bar of the visits chart. The current week is not over, so it is neither met nor missed until it meets. */
export type WeekBar = {
  start: number
  n: number
  state: "met" | "missed" | "current"
}

/** One bar for each week from the week of `from` to the week of `now`. */
export function weekBars(
  visits: Visit[],
  from: number,
  now: number,
  goal: number
): WeekBar[] {
  const current = weekStart(now)
  const out: WeekBar[] = []
  for (let w = weekStart(from); w <= current; w += WEEK) {
    const n = countBetween(visits, w, w + WEEK)
    out.push({
      start: w,
      n,
      state: n >= goal ? "met" : w === current ? "current" : "missed",
    })
  }
  return out
}

/**
 * This period so far against the period before it at the same point, so a part week is never compared with a
 * full one. `prevStart` is the start of the period before.
 */
export function soFarDelta(
  visits: Visit[],
  start: number,
  prevStart: number,
  now: number
): number {
  const elapsed = now - start
  const prevEnd = Math.min(prevStart + elapsed, start)
  return (
    countBetween(visits, start, now + 1) -
    countBetween(visits, prevStart, prevEnd + 1)
  )
}

/** "+1", "−2" or "0", with a real minus sign. */
export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0"
}

export type MixRow = { id: CategoryId; n: number; share: number }

/** Class visits by category, most first, with shares of all class visits. Visits without a class are left out. */
export function classMix(visits: Visit[]): { rows: MixRow[]; total: number } {
  const n = new Map<CategoryId, number>()
  for (const v of visits)
    if (v.category) n.set(v.category, (n.get(v.category) ?? 0) + 1)
  const sorted = [...n.entries()].sort((a, b) => b[1] - a[1])
  const shares = sharesOf(sorted.map(([, c]) => c))
  return {
    rows: sorted.map(([id, c], i) => ({ id, n: c, share: shares[i] })),
    total: sorted.reduce((a, [, c]) => a + c, 0),
  }
}

/** Visits for each weekday, Monday first to match `weekStart`. `dow` is 0 for Sunday, as in `parts`. */
export function weekdayCounts(visits: Visit[]): { dow: number; n: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dow = (i + 1) % 7
    return { dow, n: visits.filter((v) => parts(v.at).dow === dow).length }
  })
}

export type DayPartId = "morning" | "afternoon" | "evening"
/** Morning is before 12 pm, afternoon 12 to 5 pm, evening from 5 pm. */
export const DAY_PARTS: { id: DayPartId; from: number; to: number }[] = [
  { id: "morning", from: 0, to: 12 },
  { id: "afternoon", from: 12, to: 17 },
  { id: "evening", from: 17, to: 24 },
]

export function dayParts(
  visits: Visit[]
): { id: DayPartId; n: number; share: number }[] {
  const ns = DAY_PARTS.map(
    (p) =>
      visits.filter((v) => {
        const h = parts(v.at).h
        return h >= p.from && h < p.to
      }).length
  )
  const shares = sharesOf(ns)
  return DAY_PARTS.map((p, i) => ({ id: p.id, n: ns[i], share: shares[i] }))
}

export type MilestoneKind = "visits" | "streak" | "variety" | "swim"
export type Milestone = {
  key: string
  kind: MilestoneKind
  title: string
  value: number
  target: number
  /** The word after "of" in "9 of 12 weeks". Empty for a plain count. */
  unit: string
  done: boolean
  /** When it was reached, if a saved visit shows it. */
  at?: number
}

/** Streak steps in weeks, and class-type steps. A track with no step left is complete and shows only as earned. */
export const STREAK_STEPS = [4, 8, 12, 16, 26, 52]
export const VARIETY_STEPS = [2, 4, 6, 8]

/** The first step not earned yet, and the highest step earned. `best` is the most ever reached. */
function steps(list: number[], best: number) {
  return {
    next: list.find((x) => x > best),
    earned: [...list].reverse().find((x) => x <= best),
  }
}

/**
 * The milestones as two lists. `next`: one step in progress for each track (lifetime visits, the current streak,
 * class types). `earned`: the highest step reached on each track (the streak counts the best streak), and the first
 * aqua class.
 */
export function milestones({
  history,
  saved,
  lifetime,
  streak,
  longest,
  swimName,
}: {
  history: Visit[]
  /** The saved visits only. `history` repeats older weeks, so only these give a true date. */
  saved: Visit[]
  lifetime: number
  streak: number
  longest: number
  /** The name of the aqua category, for "First … class". */
  swimName: string
}): { next: Milestone[]; earned: Milestone[] } {
  const ms = nextMilestone(lifetime)
  const kinds = new Set(
    history.flatMap((v) => (v.category ? [v.category] : []))
  ).size
  // The streak track aims at the first step above the best streak; the current streak is the progress to it.
  const st = steps(STREAK_STEPS, Math.max(streak, longest))
  const ty = steps(VARIETY_STEPS, kinds)
  const next: Milestone[] = [
    {
      key: `visits-${ms.to}`,
      kind: "visits",
      title: `${ms.to} visits`,
      value: lifetime,
      target: ms.to,
      unit: "",
      done: false,
    },
  ]
  if (st.next)
    next.push({
      key: `streak-${st.next}`,
      kind: "streak",
      title: `${st.next}-week streak`,
      value: streak,
      target: st.next,
      unit: "weeks",
      done: false,
    })
  if (ty.next)
    next.push({
      key: `variety-${ty.next}`,
      kind: "variety",
      title: `${ty.next} class types`,
      value: kinds,
      target: ty.next,
      unit: "types",
      done: false,
    })
  const earned: Milestone[] = []
  const done = (m: Omit<Milestone, "done" | "value" | "unit">) =>
    earned.push({ ...m, value: m.target, unit: "", done: true })
  if (ms.from > 0)
    done({
      key: `visits-${ms.from}`,
      kind: "visits",
      title: `${ms.from} visits`,
      target: ms.from,
    })
  if (st.earned)
    done({
      key: `streak-${st.earned}`,
      kind: "streak",
      title: `${st.earned}-week streak`,
      target: st.earned,
    })
  if (ty.earned)
    done({
      key: `variety-${ty.earned}`,
      kind: "variety",
      title: `${ty.earned} class types`,
      target: ty.earned,
    })
  if (history.some((v) => v.category === "aqua")) {
    const at = saved.find((v) => v.category === "aqua")?.at
    done({
      key: "swim",
      kind: "swim",
      title: `First ${swimName.toLowerCase()} class`,
      target: 1,
      at: at === undefined ? undefined : dayStart(at),
    })
  }
  return { next, earned }
}
