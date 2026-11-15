import type { AppState } from "@/lib/data/state"
import { DAY, dayStart, minutesOfDay, parts } from "@/lib/time"
import type { CategoryId, Visit } from "@/lib/types"

// Read-only numbers for Home: how a member used the clubs in a period. Pages read these; nothing here writes.

/** The member's check-ins in [from, to). */
export function visitsBetween(
  s: AppState,
  memberId: string,
  from: number,
  to: number
): Visit[] {
  return s.visits.filter(
    (v) => v.memberId === memberId && v.at >= from && v.at < to
  )
}

/** Visits by category, most first. Visits without a category are left out. */
export function visitMix(visits: Visit[]): { id: CategoryId; n: number }[] {
  const n = new Map<CategoryId, number>()
  for (const v of visits)
    if (v.category) n.set(v.category, (n.get(v.category) ?? 0) + 1)
  return [...n.entries()]
    .map(([id, count]) => ({ id, n: count }))
    .sort((a, b) => b.n - a.n)
}

const MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000]

/** The next lifetime-visit milestone and the one before it, for a meter from `from` to `to`. */
export function nextMilestone(lifetime: number): { from: number; to: number } {
  const i = MILESTONES.findIndex((m) => m > lifetime)
  if (i === -1) {
    const to = (Math.floor(lifetime / 500) + 1) * 500
    return { from: to - 500, to }
  }
  return { from: i ? MILESTONES[i - 1] : 0, to: MILESTONES[i] }
}

/** The weekday a member comes most regularly, from the full weeks before today. */
export type Rhythm = {
  /** Weeks looked at. */
  weeks: number
  /** For each weekday, Sun to Sat: the weeks with a visit on it. */
  byDow: number[]
  /** The most regular weekday. */
  dow: number
  /** The weeks with a visit on `dow`. */
  hits: number
  /** The usual start on `dow`, in minutes after midnight, to the nearest 15. */
  minute: number
}

/**
 * Counts weeks, not visits, so two visits on one Tuesday do not make Tuesday look more regular than it is.
 * Null when there is no habit to name: fewer than four visits, or no weekday the member came on in two weeks.
 */
export function visitRhythm(
  s: AppState,
  memberId: string,
  now: number,
  weeks = 8
): Rhythm | null {
  const to = dayStart(now)
  const from = to - weeks * 7 * DAY
  const visits = visitsBetween(s, memberId, from, to)
  const seen = Array.from({ length: 7 }, () => new Set<number>())
  const mins: number[][] = Array.from({ length: 7 }, () => [])
  for (const v of visits) {
    const d = parts(v.at).dow
    seen[d].add(Math.floor((v.at - from) / (7 * DAY)))
    mins[d].push(minutesOfDay(v.at))
  }
  const byDow = seen.map((x) => x.size)
  let dow = 0
  for (let i = 1; i < 7; i++)
    if (
      byDow[i] > byDow[dow] ||
      (byDow[i] === byDow[dow] && mins[i].length > mins[dow].length)
    )
      dow = i
  const hits = byDow[dow]
  if (visits.length < 4 || hits < 2) return null
  const sorted = [...mins[dow]].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return { weeks, byDow, dow, hits, minute: Math.round(median / 15) * 15 }
}
