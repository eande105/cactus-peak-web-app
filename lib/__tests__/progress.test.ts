import { describe, expect, it } from "vitest"
import {
  classMix,
  dayParts,
  milestones,
  sharesOf,
  soFarDelta,
  weekBars,
  weekdayCounts,
} from "@/lib/progress"
import { atTime, DAY, fromKey } from "@/lib/time"
import type { CategoryId, Visit } from "@/lib/types"

// Tuesday, Oct 27, 2026. The week starts on Monday, Oct 26.
const NOW = atTime(fromKey("2026-10-27"), "12:00")
const at = (key: string, hhmm: string, category?: CategoryId): Visit => ({
  memberId: "m",
  clubSlug: "main-center",
  at: atTime(fromKey(key), hhmm),
  category,
})

describe("progress numbers", () => {
  it("shares always add up to 100", () => {
    expect(sharesOf([1, 1, 1])).toEqual([34, 33, 33])
    expect(sharesOf([2, 1]).reduce((a, b) => a + b)).toBe(100)
    expect(sharesOf([0, 0])).toEqual([0, 0])
  })

  it("weekBars marks the unfinished week as current, not missed", () => {
    const visits = [
      at("2026-10-19", "06:00"),
      at("2026-10-20", "06:00"),
      at("2026-10-26", "06:00"),
    ]
    const bars = weekBars(visits, NOW - 7 * DAY, NOW, 2)
    expect(bars.map((b) => [b.n, b.state])).toEqual([
      [2, "met"],
      [1, "current"],
    ])
  })

  it("soFarDelta compares with the same point of the period before", () => {
    const visits = [
      at("2026-10-19", "06:00"),
      at("2026-10-23", "06:00"), // Friday last week: after this point, so not counted.
      at("2026-10-26", "06:00"),
      at("2026-10-27", "06:00"),
    ]
    const wk = fromKey("2026-10-26")
    expect(soFarDelta(visits, wk, wk - 7 * DAY, NOW)).toBe(1)
  })

  it("classMix leaves out visits without a class", () => {
    const mix = classMix([
      at("2026-10-26", "06:00", "strength"),
      at("2026-10-26", "07:00", "strength"),
      at("2026-10-26", "08:00", "aqua"),
      at("2026-10-26", "09:00"),
    ])
    expect(mix.total).toBe(3)
    expect(mix.rows.map((r) => [r.id, r.n, r.share])).toEqual([
      ["strength", 2, 67],
      ["aqua", 1, 33],
    ])
  })

  it("weekdays start on Monday and day parts split at 12 pm and 5 pm", () => {
    const visits = [at("2026-10-26", "06:00"), at("2026-10-27", "17:00")]
    expect(weekdayCounts(visits)[0]).toEqual({ dow: 1, n: 1 })
    expect(dayParts(visits).map((p) => p.n)).toEqual([1, 0, 1])
  })

  it("milestones show the next step of each track and the best step earned", () => {
    const { next, earned } = milestones({
      history: [at("2026-10-26", "06:00", "aqua")],
      saved: [],
      lifetime: 148,
      streak: 9,
      longest: 12,
      swimName: "Aqua",
    })
    expect(next.map((m) => [m.key, m.value, m.target])).toEqual([
      ["visits-150", 148, 150],
      ["streak-16", 9, 16],
      ["variety-2", 1, 2],
    ])
    expect(earned.map((m) => m.key)).toEqual([
      "visits-100",
      "streak-12",
      "swim",
    ])
  })
})
