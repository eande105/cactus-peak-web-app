"use client"
import { type CSSProperties, type ReactNode, useEffect, useState } from "react"

/**
 * The cards of Today, each rendered once, and the three layouts they take by the page's own width (not the viewport,
 * because the sidebar takes room on a desktop):
 * - narrow, below `@3xl`: one column, Next up first, the summary tiles after Book;
 * - medium, `@3xl` up: the tiles on top, Next up, then Coming up beside Needs you and Streak, Book, Household;
 * - wide, `@6xl` up: the tiles on top, a main column (Next up, Coming up, Book) and a sticky right rail (Needs you,
 *   Streak, Household).
 * Each layout is a `grid-template-areas` value, built from the cards that exist, so no layout leaves an empty row.
 * The DOM order matches the reading order of every layout. The summary tiles and Needs you sit in different places on
 * phones and on wider pages, so each has two copies, one hidden (`display: none`) in each layout: keyboard and screen
 * reader users meet every card once, where it shows.
 */
export type TodaySlots = {
  tiles: ReactNode
  /** The held spot (a `Collapse`). Always passed; `heldOpen` says if the layouts reserve a row for it. */
  held: ReactNode
  heldOpen: boolean
  next: ReactNode
  needs?: ReactNode
  coming: ReactNode
  book: ReactNode
  streak?: ReactNode
  house?: ReactNode
}

const rows = (list: string[]) => list.map((r) => `"${r}"`).join(" ")

/** True while `on` is true and for `ms` after it turns false, so an exit animation keeps its row. */
function useLinger(on: boolean, ms: number) {
  const [lingering, setLingering] = useState(on)
  useEffect(() => {
    if (on) {
      setLingering(true)
      return
    }
    const t = setTimeout(() => setLingering(false), ms)
    return () => clearTimeout(t)
  }, [on, ms])
  return on || lingering
}

const AREA = {
  tiles: "[grid-area:tiles]",
  held: "[grid-area:held]",
  next: "[grid-area:next]",
  needs: "[grid-area:needs]",
  needsN: "[grid-area:needsN]",
  tilesN: "[grid-area:tilesN]",
  coming: "[grid-area:coming]",
  book: "[grid-area:book]",
  streak: "[grid-area:streak]",
  house: "[grid-area:house]",
} as const

export function TodayGrid(slots: TodaySlots) {
  const heldRow = useLinger(slots.heldOpen, 350)
  const hasNeeds = !!slots.needs
  const hasStreak = !!slots.streak
  const hasHouse = !!slots.house
  const hasRail = hasNeeds || hasStreak || hasHouse

  const narrow = rows(
    [
      heldRow && "held",
      "next",
      hasNeeds && "needsN",
      "coming",
      "book",
      "tilesN",
      hasStreak && "streak",
      hasHouse && "house",
    ].filter((x): x is string => !!x)
  )
  const side = [hasNeeds && "needs", hasStreak && "streak"].filter(
    (x): x is string => !!x
  )
  const medium = rows(
    [
      "tiles tiles",
      heldRow && "held held",
      "next next",
      ...(side.length ? side.map((a) => `coming ${a}`) : ["coming coming"]),
      "book book",
      hasHouse && "house house",
    ].filter((x): x is string => !!x)
  )
  const rail = hasRail ? "rail" : "next"
  const wide = rows(
    [
      "tiles tiles",
      heldRow && "held held",
      `next ${rail}`,
      `coming ${hasRail ? "rail" : "coming"}`,
      `book ${hasRail ? "rail" : "book"}`,
    ].filter((x): x is string => !!x)
  )

  const vars = {
    "--a-n": narrow,
    "--a-m": medium,
    "--a-w": wide,
  } as CSSProperties

  const cell = "min-w-0"
  return (
    <div className="@container/page">
      <div
        style={vars}
        className="gap-m md:gap-l grid [grid-template-areas:var(--a-n)] @3xl/page:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl/page:[grid-template-areas:var(--a-m)] @6xl/page:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] @6xl/page:[grid-template-areas:var(--a-w)]"
      >
        <div className={`${cell} ${AREA.tiles} @max-3xl/page:hidden`}>
          {slots.tiles}
        </div>
        {heldRow ? (
          <div className={`${cell} ${AREA.held}`}>{slots.held}</div>
        ) : null}
        <div className={`${cell} ${AREA.next}`}>{slots.next}</div>
        {hasNeeds ? (
          // Phones: Needs you right under Next up. Wider pages show the copy in the side column instead.
          <div className={`${cell} ${AREA.needsN} @3xl/page:hidden`}>
            {slots.needs}
          </div>
        ) : null}
        <div className={`${cell} ${AREA.coming}`}>{slots.coming}</div>
        <div className={`${cell} ${AREA.book}`}>{slots.book}</div>
        {/* Phones: the summary tiles after Book, as the iOS summary sits low. Wider pages show them on top. */}
        <div className={`${cell} ${AREA.tilesN} @3xl/page:hidden`}>
          {slots.tiles}
        </div>
        {hasRail ? (
          // Dissolved below `@6xl`, where its cards are grid cells of their own. From `@6xl` it is the sticky rail.
          <div className="@6xl/page:gap-l contents @6xl/page:sticky @6xl/page:top-[calc(var(--bar-h)+var(--space-m))] @6xl/page:flex @6xl/page:flex-col @6xl/page:self-start @6xl/page:[grid-area:rail]">
            {hasNeeds ? (
              <div
                className={`${cell} ${AREA.needs} @max-3xl/page:hidden @3xl/page:self-start @6xl/page:self-stretch`}
              >
                {slots.needs}
              </div>
            ) : null}
            {hasStreak ? (
              <div
                className={`${cell} ${AREA.streak} @3xl/page:self-start @6xl/page:self-stretch`}
              >
                {slots.streak}
              </div>
            ) : null}
            {hasHouse ? (
              <div className={`${cell} ${AREA.house}`}>{slots.house}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
