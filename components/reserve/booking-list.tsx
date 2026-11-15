"use client"
import { useApp } from "@/components/app/use-app"
import { CategoryMark, ListRow, ListRows } from "@/components/booking/parts"
import { Card, CardFooterLink } from "@/components/kit/app"
import { fmtDay, fmtDayShort, fmtRange } from "@/lib/time"
import type { Booking } from "@/lib/types"

/**
 * The member's reservations of one kind, as a bare list on the sheet under the slot picker. `label` is the title.
 * The link to the full list is the footer. An empty list draws nothing, unless `empty` gives the line to show under
 * the title.
 */
export function BookingList({
  list,
  label,
  empty,
  id,
  className,
}: {
  list: Booking[]
  label?: string
  empty?: string
  id?: string
  className?: string
}) {
  const { s } = useApp()
  const seen = new Set<string>()
  const rows = list
    .filter((b) => {
      const k = b.kind === "kids" ? `${b.ref}${b.start}` : b.id
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.start - b.start)
  if (!rows.length && !empty) return null
  return (
    <Card
      id={id}
      tone="bare"
      title={label}
      className={className}
      footer={
        rows.length ? (
          <CardFooterLink href="/bookings">View all</CardFooterLink>
        ) : undefined
      }
    >
      {rows.length ? (
        // The list sits on the sheet. It reaches out by the rows' padding, so the text lines up with the title and the
        // hover fill has room around it.
        <ListRows label={label} className="-mx-s">
          {rows.map((b) => (
            <ListRow
              key={b.id}
              href="/bookings"
              className="!px-s"
              lead={fmtDay(b.start).split(",")[0]}
              mark={<CategoryMark category={b.category} />}
              title={
                b.kind === "kids"
                  ? `Kids club · ${list
                      .filter((x) => x.ref === b.ref && x.start === b.start)
                      .map((x) => s.members[x.memberId].firstName)
                      .join(", ")}`
                  : b.title
              }
              line={
                <span className="tabular">
                  {fmtDayShort(b.start)} · {fmtRange(b.start, b.end)} ·{" "}
                  {b.place}
                </span>
              }
            />
          ))}
        </ListRows>
      ) : (
        <p className="py-s text-body-m text-muted-foreground sm:text-body-s">
          {empty}
        </p>
      )}
    </Card>
  )
}
