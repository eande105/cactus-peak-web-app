"use client"
import { useRef } from "react"
import { SlotCell, type SlotRange } from "@/components/reserve/parts"
import {
  CourtTiles,
  LaneStrips,
  type SlotRowData,
  SlotRowList,
} from "@/components/reserve/slot-rows"
import { fmtTime, parts } from "@/lib/time"
import { cn } from "@/lib/utils"

export type CellStatus =
  | "open"
  | "mine"
  | "taken"
  | "closed"
  | "past"
  | "short"
  | "notOpen"
  | "full"
export interface CellInfo {
  status: CellStatus
  swimmers?: number
  label?: string
}
export interface GridRow {
  id: number
  label: string
  sub?: string
}

/** The open count for one start time, as a phrase: "Court 2 open", "3 courts open", "3 of 8 lanes open". */
export function openText(
  kind: "court" | "lane",
  rows: GridRow[],
  open: GridRow[]
) {
  if (!open.length) return kind === "court" ? "No court open" : "No lane open"
  if (kind === "lane") return `${open.length} of ${rows.length} lanes open`
  return open.length === 1
    ? `${open[0].label} open`
    : `${open.length} courts open`
}

// Matrix of resources (rows) by start times (columns). One radiogroup, roving focus, arrow-key movement.
// It sits directly on the sheet: a sticky first column with the names, small muted time heads, hairline cells.
export function SlotGrid({
  kind,
  rows,
  slots,
  info,
  selected,
  rangeCells = 1,
  onSelect,
  onHeaderClick,
  label,
  disabled,
  now,
  className,
}: {
  kind: "court" | "lane"
  rows: GridRow[]
  slots: number[]
  info: (row: number, slot: number) => CellInfo
  selected: { row: number; slot: number } | null
  rangeCells?: number
  onSelect: (row: number, slot: number) => void
  onHeaderClick?: (slot: number) => void
  label: string
  disabled?: boolean
  now?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const am = slots.filter((s) => parts(s).h < 12)
  const pm = slots.filter((s) => parts(s).h >= 12)
  const cols = `104px repeat(${slots.length}, ${kind === "court" ? 56 : 72}px)`
  const move = (e: React.KeyboardEvent) => {
    const el = document.activeElement as HTMLElement
    if (el?.getAttribute("role") !== "radio") return
    const r = Number(el.dataset.row)
    const c = Number(el.dataset.col)
    let nr = r,
      nc = c
    if (e.key === "ArrowRight") nc++
    else if (e.key === "ArrowLeft") nc--
    else if (e.key === "ArrowDown") nr++
    else if (e.key === "ArrowUp") nr--
    else if (e.key === "Home") nc = 0
    else if (e.key === "End") nc = slots.length - 1
    else if (e.key === "PageDown") nc += kind === "court" ? 6 : 4
    else if (e.key === "PageUp") nc -= kind === "court" ? 6 : 4
    else if (e.key === "Escape") {
      ;(e.currentTarget as HTMLElement).dispatchEvent(
        new CustomEvent("clear", { bubbles: true })
      )
      return
    } else return
    e.preventDefault()
    nr = Math.max(0, Math.min(rows.length - 1, nr))
    nc = Math.max(0, Math.min(slots.length - 1, nc))
    ref.current
      ?.querySelector<HTMLElement>(`[data-row="${nr}"][data-col="${nc}"]`)
      ?.focus()
  }
  const firstOpen = (() => {
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < slots.length; c++)
        if (info(rows[r].id, slots[c]).status === "open") return `${r}-${c}`
    return "0-0"
  })()
  const cellMs = kind === "court" ? 1800000 : 2700000
  const rangeOf = (row: GridRow, s: number): SlotRange | null => {
    if (!selected || selected.row !== row.id) return null
    const end = selected.slot + rangeCells * cellMs
    if (s < selected.slot || s >= end) return null
    const first = s === selected.slot
    const last = s + cellMs >= end
    return first && last ? "only" : first ? "start" : last ? "end" : "mid"
  }
  const head =
    "tabular grid min-h-9 w-full place-items-center text-body-xs font-medium whitespace-nowrap text-muted-foreground"
  return (
    <div className={cn("relative", className)}>
      <div className="overflow-x-auto">
        <div
          ref={ref}
          role="radiogroup"
          aria-label={label}
          onKeyDown={move}
          className="relative grid w-max min-w-full"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="sticky left-0 z-10 bg-sheet" />
          {am.length ? (
            <div
              style={{ gridColumn: `span ${am.length}` }}
              className="px-xs pt-xs text-body-xs text-muted-foreground"
            >
              am
            </div>
          ) : null}
          {pm.length ? (
            <div
              style={{ gridColumn: `span ${pm.length}` }}
              className={cn(
                "px-xs pt-xs text-body-xs text-muted-foreground",
                am.length > 0 && "rule-l"
              )}
            >
              pm
            </div>
          ) : null}
          <div className="sticky left-0 z-10 bg-sheet rule-b" />
          {slots.map((s, c) => {
            // A start time that has gone by: its header dims with its cells (the "past" tone).
            const gone = now !== undefined && s < now
            return (
              <div
                key={s}
                className={cn("rule-b", c === am.length && c > 0 && "rule-l")}
              >
                {onHeaderClick && !gone ? (
                  <button
                    type="button"
                    onClick={() => onHeaderClick(s)}
                    aria-label={`Any lane at ${fmtTime(s)}`}
                    className={cn(head, "hover:bg-muted hover:text-foreground")}
                  >
                    {fmtTime(s, false)}
                  </button>
                ) : (
                  <div className={cn(head, gone && "opacity-50")}>
                    {fmtTime(s, false)}
                  </div>
                )}
              </div>
            )
          })}
          <div className="pr-s sticky left-0 z-10 flex items-center bg-sheet text-body-xs text-muted-foreground rule-b">
            Open
          </div>
          {slots.map((s, c) => {
            const n = rows.filter((r) => info(r.id, s).status === "open").length
            return (
              <div
                key={s}
                title={openText(
                  kind,
                  rows,
                  rows.filter((r) => info(r.id, s).status === "open")
                )}
                className={cn(
                  "tabular grid min-h-7 place-items-center text-body-xs rule-b",
                  c === am.length && c > 0 && "rule-l",
                  n ? "font-medium text-foreground" : "text-muted-foreground/60"
                )}
              >
                {s < (now ?? 0) ? "" : n}
              </div>
            )
          })}
          {rows.map((row, r) => (
            <div key={row.id} className="contents">
              <div className="pr-s py-xxs sticky left-0 z-10 flex min-h-11 flex-col justify-center bg-sheet text-body-s font-medium rule-b">
                <span className="truncate">{row.label}</span>
                {row.sub ? (
                  <span className="truncate font-regular text-muted-foreground">
                    {row.sub}
                  </span>
                ) : null}
              </div>
              {slots.map((s, c) => {
                const range = rangeOf(row, s)
                return (
                  <div key={s} className="rule-b rule-l">
                    <SlotCell
                      kind={kind}
                      row={row}
                      slot={s}
                      info={info(row.id, s)}
                      r={r}
                      c={c}
                      range={range}
                      tabbable={
                        selected
                          ? range === "start" || range === "only"
                          : firstOpen === `${r}-${c}`
                      }
                      disabled={disabled}
                      onSelect={onSelect}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent"
      />
    </div>
  )
}

// Below 1024px: one row for each start time (SlotRowList), with the courts or lanes as a glance. No horizontal scroll.
// A tap picks the best open court or lane for that start time; a second tap on the picked row moves to the next one.
export function SlotList({
  kind,
  rows,
  slots,
  info,
  selected,
  onSelect,
  lengthMs,
  now,
  label,
  disabled,
  className,
}: {
  kind: "court" | "lane"
  rows: GridRow[]
  slots: number[]
  info: (row: number, slot: number) => CellInfo
  selected: { row: number; slot: number } | null
  onSelect: (row: number, slot: number) => void
  /** How long one reservation runs, for the end time under the start. */
  lengthMs: number
  now: number
  label: string
  disabled?: boolean
  className?: string
}) {
  const data: SlotRowData[] = slots.map((s) => {
    const cells = rows.map((r) => ({ r, i: info(r.id, s) }))
    const open = cells.filter((c) => c.i.status === "open")
    const picked = selected?.slot === s ? selected.row : null
    const past = s < now
    let status: string
    if (past) status = "Past"
    else if (kind === "court")
      status = open.length ? `${open.length} open` : "Full"
    else {
      const shared = open.filter((c) => c.i.swimmers === 1).length
      const empty = open.length - shared
      status = !open.length
        ? "Full · no waitlist"
        : shared
          ? `${empty} open · ${shared} to share`
          : empty === rows.length
            ? `All ${rows.length} lanes open`
            : `${empty} of ${rows.length} lanes open`
    }
    // The best pick: the lane with a swimmer first (it keeps empty lanes free), then the lowest number.
    const order = [...open].sort((a, b) =>
      kind === "lane"
        ? (b.i.swimmers ?? 0) - (a.i.swimmers ?? 0) || a.r.id - b.r.id
        : a.r.id - b.r.id
    )
    const at = order.findIndex((c) => c.r.id === picked)
    const next = order.length ? order[(at + 1) % order.length] : undefined
    return {
      key: s,
      start: s,
      end: s + lengthMs,
      past,
      status,
      pill: open.length && !past ? "Book" : undefined,
      selected: picked !== null,
      label: `${fmtTime(s)}, ${status}${past ? ", past" : ""}`,
      onPress: next ? () => onSelect(next.r.id, s) : undefined,
      glance:
        kind === "court" ? (
          <CourtTiles
            courts={cells.map((c) => ({
              id: c.r.id,
              state:
                c.i.status === "open"
                  ? "open"
                  : c.i.status === "mine"
                    ? "mine"
                    : "taken",
              picked: picked === c.r.id,
            }))}
          />
        ) : (
          <LaneStrips
            lanes={cells.map((c) => ({
              id: c.r.id,
              state:
                c.i.status === "mine"
                  ? "mine"
                  : c.i.status === "open"
                    ? c.i.swimmers === 1
                      ? "shared"
                      : "free"
                    : "full",
              picked: picked === c.r.id,
            }))}
          />
        ),
    }
  })
  return (
    <SlotRowList
      rows={data}
      label={label}
      disabled={disabled}
      className={className}
    />
  )
}
