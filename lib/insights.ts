import type { AppState } from "@/lib/data/state"
import { DAY } from "@/lib/time"
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

/** Classes the member came to in [from, to): attended class bookings, not open use of a space. */
export function classesAttended(
  s: AppState,
  memberId: string,
  from: number,
  to: number
): number {
  return s.bookings.filter(
    (b) =>
      b.memberId === memberId &&
      b.kind === "class" &&
      b.status === "attended" &&
      b.start >= from &&
      b.start < to
  ).length
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

/** Visits by club, most first, with the time of the last visit to each. */
export function clubVisits(
  visits: Visit[]
): { slug: string; n: number; last: number }[] {
  const by = new Map<string, { n: number; last: number }>()
  for (const v of visits) {
    const c = by.get(v.clubSlug) ?? { n: 0, last: 0 }
    by.set(v.clubSlug, { n: c.n + 1, last: Math.max(c.last, v.at) })
  }
  return [...by.entries()]
    .map(([slug, c]) => ({ slug, ...c }))
    .sort((a, b) => b.n - a.n || b.last - a.last)
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

/** The two 30-day windows that end now: the last 30 days and the 30 days before them. */
export function thirtyDayWindows(now: number) {
  return {
    current: { from: now - 30 * DAY, to: now },
    previous: { from: now - 60 * DAY, to: now - 30 * DAY },
  }
}
