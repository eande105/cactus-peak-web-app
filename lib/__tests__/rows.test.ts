import { describe, expect, it } from "vitest"
import {
  clubAreaFromRow,
  type DbRows,
  diffRows,
  HOUSEHOLD_TABLES,
  isEmptyDiff,
  rowsFromState,
  stableStringify,
  stateFromRows,
} from "@/lib/data/rows"
import { sessionsForDay } from "@/lib/data/sessions"
import type { AppState } from "@/lib/data/state"
import { sessionLeft, waitCount } from "@/lib/engine"
import { DEMO_START } from "@/lib/time"
import { seedState } from "./fixture"

// One household's slice of the seeded world, the way the app holds it after sign-in.
function household(id: string): AppState {
  const s = seedState()
  const keep = new Set(
    Object.values(s.members)
      .filter((m) => m.householdId === id)
      .map((m) => m.id)
  )
  return {
    ...s,
    members: Object.fromEntries(
      Object.entries(s.members).filter(([k]) => keep.has(k))
    ),
    households: { [id]: s.households[id] },
    bookings: s.bookings.filter((b) => keep.has(b.ownerId)),
    strikes: s.strikes.filter((x) => keep.has(x.memberId)),
    notices: s.notices.filter((x) => keep.has(x.memberId)),
    threads: s.threads.filter((x) => keep.has(x.memberId)),
    requests: s.requests.filter((x) => keep.has(x.teenId)),
    guestPasses: s.guestPasses.filter((x) => x.householdId === id),
    visits: s.visits.filter((x) => keep.has(x.memberId)),
  }
}
const asDb = (rows: ReturnType<typeof rowsFromState>) =>
  Object.fromEntries(
    HOUSEHOLD_TABLES.map((t) => [t, Object.values(rows[t])])
  ) as unknown as DbRows

describe("household rows", () => {
  it("state → rows → state → rows is stable", () => {
    const rows = rowsFromState(household("h1"))
    const back = stateFromRows(asDb(rows), "maya")
    const again = rowsFromState({ ...back, clock: { realStart: 0, skew: 0 } })
    expect(isEmptyDiff(diffRows(rows, again))).toBe(true)
    expect(back.members.maya.age).toBe(34)
  })
  it("a cancel changes one booking row and nothing else", () => {
    const s = household("h1")
    const before = rowsFromState(s)
    const b = s.bookings.find((x) => x.status === "booked")!
    b.status = "cancelled"
    b.cancelledAt = DEMO_START
    const d = diffRows(before, rowsFromState(s))
    expect(d.bookings.upserts).toHaveLength(1)
    for (const t of HOUSEHOLD_TABLES.filter((x) => x !== "bookings"))
      expect(d[t].upserts.length + d[t].deletes.length).toBe(0)
  })
  it("a removed notice is a delete", () => {
    const s = household("h1")
    const before = rowsFromState(s)
    const gone = s.notices.shift()!
    expect(diffRows(before, rowsFromState(s)).notices.deletes).toEqual([
      gone.id,
    ])
  })
  it("stableStringify ignores key order", () => {
    expect(stableStringify({ a: 1, b: [2, { d: 1, c: 2 }] })).toBe(
      stableStringify({ b: [2, { c: 2, d: 1 }], a: 1 })
    )
  })
})

describe("spots left with other households", () => {
  it("other households' bookings and waitlists count once", () => {
    const s = household("h1")
    const se = sessionsForDay(
      "val-vista-warner",
      DEMO_START + 2 * 86_400_000
    )[0]
    const left = sessionLeft(s, se)
    const waiting = waitCount(s, se)
    s.others = { [se.id]: { booked: 1, waitlisted: 2 } }
    expect(sessionLeft(s, se)).toBe(Math.max(0, left - 1))
    expect(waitCount(s, se)).toBe(waiting + 2)
  })
})

describe("club_areas rows", () => {
  const row = {
    club_slug: "val-vista-warner",
    area: "pool",
    label: "25-yard lap pool",
    sort: 1,
    typical_weekday: [1, 2, 4, 5, 3, 2, 2, 1, 2, 2, 2, 3, 4, 5, 5, 3, 2, 1],
    typical_weekend: [1, 1, 1, 2, 3, 3, 4, 5, 5, 3, 2, 2, 2, 2, 2, 1, 1, 1],
  }
  it("maps every column to a ClubArea field", () => {
    expect(clubAreaFromRow(row)).toEqual({
      clubSlug: "val-vista-warner",
      area: "pool",
      label: "25-yard lap pool",
      sort: 1,
      typicalWeekday: row.typical_weekday,
      typicalWeekend: row.typical_weekend,
    })
  })
  it("keeps the weekday and weekend arrays apart and in order", () => {
    const a = clubAreaFromRow(row)
    expect(a.typicalWeekday).toHaveLength(18)
    expect(a.typicalWeekend).toHaveLength(18)
    expect(a.typicalWeekday[3]).toBe(5)
    expect(a.typicalWeekend[7]).toBe(5)
  })
})
