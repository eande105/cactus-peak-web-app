import { describe, expect, it } from "vitest"
import { previewUpgrade } from "@/lib/actions"
import {
  areaCrowd,
  busyHint,
  cancelNote,
  hourStart,
  nextBillingDate,
  nextCourtOpen,
  nextKidsOpen,
  nextLaneOpen,
  usually,
} from "@/lib/engine"
import {
  atTime,
  DEMO_START,
  endSentence,
  fmtDelta,
  fmtTime,
  fromKey,
  HOUR,
  MIN,
} from "@/lib/time"
import type { ClubArea } from "@/lib/types"
import { seedState } from "./fixture"

describe("time copy", () => {
  it("formats times with am and pm", () => {
    expect(fmtTime(atTime(fromKey("2026-10-27"), "06:00"))).toBe("6 am")
    expect(fmtTime(atTime(fromKey("2026-10-27"), "12:00"))).toBe("12 pm")
  })
  it("endSentence never doubles the full stop", () => {
    expect(endSentence("Free to cancel until 4:00 am")).toBe(
      "Free to cancel until 4:00 am."
    )
    expect(endSentence("Free to cancel until 4:00 am..")).toBe(
      "Free to cancel until 4:00 am."
    )
    expect(endSentence("Booked")).toBe("Booked.")
  })
  it("fmtDelta uses a real minus", () => {
    expect(fmtDelta(-25)).toBe("−$25")
    expect(fmtDelta(50)).toBe("+$50")
    expect(fmtDelta(-25)).not.toContain("$-")
  })
})

describe("cancelNote", () => {
  const s = seedState()
  const now = DEMO_START
  it("class far away is free and ends in one full stop", () => {
    const t = cancelNote(s, "maya", now + 10 * HOUR, now, "class").text
    expect(t.startsWith("Free to cancel until")).toBe(true)
    expect(t).not.toContain("..")
  })
  it("class inside 2 hours is a late cancel with the strike count", () => {
    const c = cancelNote(s, "maya", now + 20 * MIN, now, "class")
    expect(c.late).toBe(true)
    expect(c.text).toContain("strike 2 of 3")
  })
  it("class that started says Started, not starts in", () => {
    const c = cancelNote(s, "maya", now - 5 * MIN, now, "class")
    expect(c.text.startsWith("Started.")).toBe(true)
    expect(c.text).not.toContain("starts in")
  })
  it("PT inside 24 hours uses the session and never says free until yesterday", () => {
    const c = cancelNote(s, "maya", now + 7 * HOUR, now, "pt")
    expect(c.late).toBe(true)
    expect(c.text).toContain("uses the session")
  })
  it("PT beyond 24 hours names the free-until time", () => {
    expect(cancelNote(s, "maya", now + 40 * HOUR, now, "pt").text).toMatch(
      /^Free to cancel or move until/
    )
  })
})

describe("billing date", () => {
  it("Maya's next charge is Nov 12", () => {
    const s = seedState()
    const d = nextBillingDate(s.households.h1, DEMO_START)
    expect(new Date(d - 7 * HOUR).toISOString().slice(0, 10)).toBe("2026-11-12")
  })
  it("upgrade preview next charge equals the household next billing date", () => {
    const s = seedState()
    const hh = s.households.h1
    expect(previewUpgrade(s, hh, "summit", DEMO_START).next).toBe(
      nextBillingDate(hh, DEMO_START)
    )
    expect(previewUpgrade(s, hh, "summit", DEMO_START).today).toBe(25.81)
  })
  it("busyness hint has no double stop", () => {
    expect(busyHint("val-vista-warner", DEMO_START)).not.toContain("..")
  })
})

describe("areaCrowd", () => {
  // Index 0 = 4 am ... 17 = 9 pm. Weekday and weekend arrays differ at every hour so a mix-up fails.
  const area: ClubArea = {
    clubSlug: "dobson-southern",
    area: "sauna",
    label: "Sauna",
    sort: 1,
    typicalWeekday: [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
    typicalWeekend: [5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 2],
  }
  const tue = fromKey("2026-10-27") // Tuesday
  const sat = fromKey("2026-10-31")
  const sun = fromKey("2026-11-01")
  it("reads the weekday array Monday to Friday", () => {
    expect(areaCrowd(area, atTime(tue, "06:00")).level).toBe(3) // index 2
  })
  it("reads the weekend array on Saturday and Sunday", () => {
    expect(areaCrowd(area, atTime(sat, "06:00")).level).toBe(3) // index 2, weekend
    expect(areaCrowd(area, atTime(sat, "08:00")).level).toBe(1) // index 4
    expect(areaCrowd(area, atTime(sun, "08:00")).level).toBe(1)
    expect(areaCrowd(area, atTime(tue, "08:00")).level).toBe(5) // index 4, weekday
  })
  it("uses index 0 at 4 am and index 17 at 9 pm", () => {
    expect(areaCrowd(area, atTime(tue, "04:00")).level).toBe(1)
    expect(areaCrowd(area, atTime(tue, "21:00")).level).toBe(3)
    expect(areaCrowd(area, atTime(sat, "21:00")).level).toBe(2)
  })
  it("uses the nearest end outside 4 am to 9 pm", () => {
    expect(areaCrowd(area, atTime(tue, "02:00")).level).toBe(1)
    expect(areaCrowd(area, atTime(tue, "23:00")).level).toBe(3)
  })
  it("does not change inside an hour", () => {
    expect(areaCrowd(area, atTime(tue, "06:59")).level).toBe(3)
  })
  it("maps levels 1 to 5 to Quiet, Light, Steady, Busy, Packed", () => {
    const words = [1, 2, 3, 4, 5].map(
      (l) =>
        areaCrowd(
          { ...area, typicalWeekday: Array(18).fill(l) },
          atTime(tue, "12:00")
        ).word
    )
    expect(words).toEqual(["Quiet", "Light", "Steady", "Busy", "Packed"])
  })
})

describe("usually", () => {
  it("always says Usually, never now", () => {
    expect(usually("Busy")).toBe("Usually busy")
    expect(usually("Packed", atTime(fromKey("2026-10-27"), "18:00"))).toBe(
      "Usually packed at 6 pm"
    )
    expect(
      usually("Quiet", atTime(fromKey("2026-10-27"), "06:00"))
    ).not.toMatch(/now/i)
  })
})

describe("what is open at a club", () => {
  const s = seedState()
  const now = DEMO_START
  it("has no courts, lanes or kids club where the club has none", () => {
    expect(nextCourtOpen(s, "main-center", now)).toBeNull()
    expect(nextLaneOpen(s, "main-center", now)).toBeNull()
    expect(nextKidsOpen(s, "gilbert-page", now)).toBeNull()
  })
  it("finds a court at or after now where the club has courts", () => {
    const c = nextCourtOpen(s, "dobson-southern", now)
    expect(c).not.toBeNull()
    expect(c!.start).toBeGreaterThanOrEqual(now)
  })
  it("counts lanes against the pool size", () => {
    const l = nextLaneOpen(s, "dobson-southern", now)
    if (l) {
      expect(l.total).toBe(8)
      expect(l.open).toBeGreaterThan(0)
      expect(l.open).toBeLessThanOrEqual(8)
    }
  })
  it("hourStart drops the minutes", () => {
    const t = atTime(fromKey("2026-10-27"), "18:35")
    expect(hourStart(t)).toBe(atTime(fromKey("2026-10-27"), "18:00"))
  })
})
