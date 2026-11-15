import { hash } from "@/lib/data/sessions"
import type { AppState } from "@/lib/data/state"
import { weekStart } from "@/lib/engine"
import { fromKey } from "@/lib/time"
import type { Visit } from "@/lib/types"

const WEEK = 7 * 24 * 3600_000

// The saved data holds about two months of visits. The 12-week and year views need more, so older weeks repeat the
// member's own saved weeks (same clubs, spaces and times), with a few visits left out. Nothing is made up before the
// household joined, and real visits always win for the weeks they cover.
export function visitHistory(
  s: AppState,
  memberId: string,
  now: number
): Visit[] {
  const real = s.visits.filter((v) => v.memberId === memberId)
  if (!real.length) return []
  const oldest = weekStart(Math.min(...real.map((v) => v.at)))
  const current = weekStart(now)
  // Whole saved weeks only: the current week is not over yet.
  const templates = new Map<number, Visit[]>()
  for (const v of real) {
    const w = weekStart(v.at)
    if (w === current) continue
    templates.set(w, [...(templates.get(w) ?? []), v])
  }
  const weeks = [...templates.keys()]
  const out: Visit[] = [...real]
  if (!weeks.length) return out
  const member = s.members[memberId]
  const joined = s.households[member?.householdId ?? ""]?.memberSince ?? 0
  const first = Math.max(fromKey("2026-01-05"), weekStart(joined))
  for (let w = oldest - WEEK; w >= first; w -= WEEK) {
    const from = weeks[Math.floor(hash(`${memberId}${w}`) * weeks.length)]
    for (const v of templates.get(from) ?? []) {
      if (hash(`${memberId}${v.at}${w}`) < 0.15) continue
      const at = v.at - from + w
      if (at >= joined) out.push({ ...v, at })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}
