"use client"
import Link from "next/link"
import QRCode from "qrcode"
import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useState,
} from "react"
import {
  categoryObject,
  GymObject,
  type ObjectId,
} from "@/components/brand/graphics"
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  TriangleAlert,
  Users,
  XCircle,
} from "@/components/icons"
import { CoachArt } from "@/components/kit/brand-art"
import { DOW, DOW_LONG, fmtTime, isSameDay, parts } from "@/lib/time"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Presentational parts ported from the iOS detail screens (IOS-PARITY-PLAN.md, section 1).
 * They take plain props and never read `useApp()`: a page adapts its data to them.
 */

type FactTone = "accent" | "warning"

const TONE_TEXT: Record<FactTone, string> = {
  accent: "text-primary",
  warning: "text-warning",
}
// A 1.5px tinted inner edge as a shadow ring, never a border (INVARIANTS 5).
const TONE_RING: Record<FactTone, string> = {
  accent:
    "shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
  warning:
    "shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--warning)_40%,transparent)]",
}

/**
 * A section title in the display face, as a display `Card` title. `detail` is a short accent line under it (a count,
 * "3 booked"). With `href` or `onClick` the whole header is a link or a button and the title gets a trailing chevron.
 */
export function SectionHeader({
  title,
  detail,
  href,
  onClick,
  className,
}: {
  title: string
  detail?: string
  href?: string
  onClick?: () => void
  className?: string
}) {
  const interactive = Boolean(href || onClick)
  const body = (
    <>
      <h2 className="gap-xxs font-display-wide flex min-w-0 items-center text-body-l font-heavy text-pretty">
        <span className="min-w-0">{title}</span>
        {interactive ? (
          <ChevronRight
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
        ) : null}
      </h2>
      {detail ? (
        <p className="text-body-m text-primary sm:text-body-s">{detail}</p>
      ) : null}
    </>
  )
  const base = "flex min-w-0 flex-col text-left"
  if (href)
    return (
      <Link
        href={href}
        className={cn(base, "outline-none focus-visible:underline", className)}
      >
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "outline-none focus-visible:underline", className)}
      >
        {body}
      </button>
    )
  return <div className={cn(base, className)}>{body}</div>
}

/**
 * An outlined glyph square, the text, a quiet second line and an optional trailing slot. With `href` the row is a
 * link with a chevron. The row stays a row at every width, as the iOS fact row does; the text wraps beside the glyph.
 */
export function FactRow({
  icon,
  text,
  secondary,
  tone = "accent",
  trailing,
  href,
  className,
}: {
  icon: ReactNode
  text: ReactNode
  secondary?: ReactNode
  tone?: FactTone
  trailing?: ReactNode
  href?: string
  className?: string
}) {
  const stack = trailing !== undefined && trailing !== null
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "corner-s grid size-9 shrink-0 place-items-center [&_svg]:size-5",
          TONE_TEXT[tone],
          TONE_RING[tone]
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-body-m sm:text-body-s">
        <span className="block font-medium text-pretty">{text}</span>
        {secondary ? (
          <span className="block text-body-s text-pretty text-muted-foreground">
            {secondary}
          </span>
        ) : null}
      </span>
      {stack ? (
        <span className="flex shrink-0 items-center">{trailing}</span>
      ) : null}
      {href && !stack ? (
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      ) : null}
    </>
  )
  const layout = cn("gap-s py-xs flex min-w-0 items-center", className)
  return href ? (
    <Link
      href={href}
      className={cn(layout, "outline-none focus-visible:underline")}
    >
      {content}
    </Link>
  ) : (
    <div className={layout}>{content}</div>
  )
}

const STRIP_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

/**
 * Items of equal width split by vertical hairlines. Four items make a 2x2 grid below `sm`. Put `StatItem`s inside.
 * Extends `Stats` from kit/app; it does not replace it.
 */
export function StatStrip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const n = Children.toArray(children).length
  return (
    <div
      className={cn(
        "grid",
        STRIP_COLS[n] ?? "auto-cols-fr grid-flow-col",
        // The first item of each row has no left rule. In the 2x2 grid, row two gets a rule above it.
        n === 4
          ? "sm:[&>*:first-child]:rule-l-0 max-sm:[&>*:nth-child(n+3)]:rule-t [&>*:nth-child(odd)]:max-sm:rule-l-0"
          : "[&>*:first-child]:rule-l-0",
        className
      )}
    >
      {children}
    </div>
  )
}

/** One centred column of a `StatStrip`: a caption, a numeral or a meter, a short word. One accessible element. */
export function StatItem({
  label,
  value,
  meter,
  detail,
  srLabel,
  className,
}: {
  label: string
  value?: ReactNode
  meter?: ReactNode
  detail: string
  srLabel?: string
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={srLabel ?? `${label}, ${detail}`}
      className={cn(
        "gap-xxs px-s py-s flex min-w-0 flex-col items-center text-center rule-l",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="text-body-s font-medium text-pretty text-muted-foreground uppercase"
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="flex min-h-8 items-center justify-center"
      >
        {meter ?? (
          <span className="tabular font-display-wide text-body-xl font-heavy">
            {value}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="text-body-s text-pretty text-muted-foreground"
      >
        {detail}
      </span>
    </div>
  )
}

/** The weekday in accent over the day number. Decorative: the row it sits in carries the full date. */
export function DateBadge({
  date,
  className,
}: {
  date: Date
  className?: string
}) {
  const p = parts(date.getTime())
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex w-11 shrink-0 flex-col items-center text-center",
        className
      )}
    >
      <span className="text-body-xs font-heavy tracking-wide text-primary uppercase">
        {DOW[p.dow]}
      </span>
      <span className="tabular font-display-wide text-body-l font-heavy">
        {p.d}
      </span>
    </span>
  )
}

/** A small capsule at the end of a row: "Book", "View", "4 left", "Waitlist #2". */
export function RowPill({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode
  tone?: "accent" | "muted"
  className?: string
}) {
  return (
    <span
      className={cn(
        "tabular px-s py-xxs inline-flex shrink-0 items-center corner-full bg-muted text-body-s font-medium whitespace-nowrap",
        tone === "accent" ? "text-primary" : "text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

const KIND_OBJECT: Record<"court" | "lane" | "kids", ObjectId> = {
  court: "paddle",
  lane: "pool",
  kids: "playground",
}
const KIND_CATEGORY: Record<"court" | "lane" | "kids", CategoryId> = {
  court: "court",
  lane: "aqua",
  kids: "youth",
}
const CUT = "polygon(0 25%, 14.43% 0, 100% 0, 100% 100%, 0 100%)"

/**
 * The booking's picture in the 60 degree cut-corner tile (VISUAL-IDENTITY): the category object for a class, the space
 * object for a court, lane or kids club, the coach's initials for training. Decorative.
 * The app's `pt` booking kind is `training` here: the page maps it.
 */
export function BookingTile({
  kind,
  category,
  coachName,
  coachCategory,
  size = 48,
  className,
}: {
  kind: "class" | "court" | "lane" | "kids" | "training"
  category?: CategoryId
  coachName?: string
  coachCategory?: CategoryId
  size?: number
  className?: string
}) {
  const box = cn("relative inline-block shrink-0", className)
  const style: CSSProperties = { width: size, height: size }
  if (kind === "training")
    return (
      <span aria-hidden="true" className={box} style={style}>
        <span className="block size-full" style={{ clipPath: CUT }}>
          <CoachArt
            name={coachName ?? "Coach"}
            roles={[coachCategory ?? "strength"]}
            shape="square"
            size={size}
            className="!rounded-none"
          />
        </span>
      </span>
    )
  const cat = kind === "class" ? (category ?? "strength") : KIND_CATEGORY[kind]
  return (
    <span aria-hidden="true" className={box} style={style}>
      <GymObject
        id={kind === "class" ? categoryObject[cat] : KIND_OBJECT[kind]}
        scheme={{ category: cat }}
        cut
        className="size-full"
      />
    </span>
  )
}

/**
 * The art at the head of a detail page, then the title block. Below `lg` the art bleeds to the screen edges (the shell
 * gutter is `px-m`, so the negative margin matches it) and up to the sticky header; the title block sits on the normal
 * content edge. From `lg` the art is a rounded banner the width of the main column.
 */
export function HeroHeader({
  art,
  children,
  height = 280,
  className,
}: {
  art: ReactNode
  children: ReactNode
  height?: number
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div
        // Phones keep the art's wide shape, so a wide crop is not cut to a sliver; desktop uses the fixed height.
        className="-mx-m -mt-m lg:corner-l relative aspect-[16/10] overflow-hidden bg-muted lg:mx-0 lg:mt-0 lg:aspect-auto lg:h-(--hero-h)"
        style={{ "--hero-h": `${height}px` } as CSSProperties}
      >
        <div className="absolute inset-0 [&_img]:size-full [&_img]:object-cover [&>*]:size-full [&>svg]:object-cover">
          {art}
        </div>
      </div>
      <div className="gap-xs pt-m flex min-w-0 flex-col">{children}</div>
    </div>
  )
}

/** A black-on-white QR code in a white square, in both colour modes, so scanners can read it. */
function PassQr({ value }: { value: string }) {
  const [svg, setSvg] = useState("")
  useEffect(() => {
    let live = true
    QRCode.toString(value, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then((s) => {
      if (live) setSvg(s)
    })
    return () => {
      live = false
    }
  }, [value])
  return (
    <div
      role="img"
      aria-label="Check-in code"
      className="corner-s bg-white box-border size-[150px] shrink-0 p-3 [&_svg]:size-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG comes from the local QR library, not user HTML
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}

/**
 * A booking's pass: a card on a flat tint of `tint`, a header (tile, title, subtitle, status), a two-column field grid,
 * then the QR code with "Scan at the front desk", or a "Checked in" line once the member is in.
 */
export function PassCard({
  tile,
  title,
  subtitle,
  status,
  fields,
  tint,
  code,
  checkedIn,
  className,
}: {
  tile: ReactNode
  title: string
  subtitle: string
  status?: ReactNode
  fields: { label: string; value: string }[]
  tint?: string
  code?: string | null
  checkedIn?: boolean
  className?: string
}) {
  return (
    <section
      aria-label={title}
      style={tint ? ({ "--pt": tint } as CSSProperties) : undefined}
      className={cn(
        "gap-m p-m flex min-w-0 flex-col corner-m hairline ring-foreground/10",
        tint
          ? "bg-[color-mix(in_oklab,var(--pt)_8%,var(--card))] dark:bg-[color-mix(in_oklab,var(--pt)_18%,var(--card))]"
          : "bg-card",
        className
      )}
    >
      <div className="gap-s flex min-w-0 items-center max-sm:flex-wrap">
        {tile}
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="font-display-wide text-body-l font-heavy text-pretty">
            {title}
          </h2>
          <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
            {subtitle}
          </p>
        </div>
        {status ? (
          <div className="flex shrink-0 items-center max-sm:basis-full">
            {status}
          </div>
        ) : null}
      </div>
      {fields.length > 0 ? (
        <dl className="gap-x-s gap-y-s grid grid-cols-2">
          {fields.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-body-s font-medium text-muted-foreground uppercase">
                {f.label}
              </dt>
              <dd className="tabular text-body-m font-medium text-pretty sm:text-body-s">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {checkedIn ? (
        <p className="gap-xs flex items-center text-body-m font-medium text-success sm:text-body-s">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          Checked in
        </p>
      ) : code ? (
        <div className="gap-xs flex flex-col items-center text-center">
          <PassQr value={code} />
          <p className="text-body-m text-muted-foreground sm:text-body-s">
            Scan at the front desk
          </p>
        </div>
      ) : null}
    </section>
  )
}

// "today" when the moment falls on the same day as now, else the long weekday.
const dayWord = (d: Date, now: Date) =>
  isSameDay(d.getTime(), now.getTime())
    ? "today"
    : DOW_LONG[parts(d.getTime()).dow]

/**
 * The cancellation and waitlist rules of a booking as fact rows: the free-cancel cutoff, when the waitlist moves, a note,
 * and the member's late-cancel count with a link to Strikes.
 */
export function CancelPolicy({
  cutoff,
  now,
  waitlistUntil,
  countsAsStrike,
  note,
  lateCancels,
  strikesHref,
  className,
}: {
  cutoff: Date
  now: Date
  waitlistUntil?: Date
  countsAsStrike: boolean
  note?: string
  lateCancels?: number
  strikesHref?: string
  className?: string
}) {
  const ended = cutoff.getTime() <= now.getTime()
  const cutoffTime = fmtTime(cutoff.getTime())
  const later = countsAsStrike ? "Later counts as a late cancel" : undefined
  return (
    <section className={cn("gap-xs flex min-w-0 flex-col", className)}>
      <SectionHeader
        title={waitlistUntil ? "Cancellation and waitlist" : "Cancellation"}
      />
      <FactRow
        icon={<Clock />}
        text={
          ended
            ? `Free cancel ended at ${cutoffTime}`
            : `Cancel free until ${cutoffTime} ${dayWord(cutoff, now)}`
        }
        secondary={later}
      />
      {waitlistUntil ? (
        <FactRow
          icon={<Users />}
          text={`Waitlist moves until ${fmtTime(waitlistUntil.getTime())} ${dayWord(waitlistUntil, now)}`}
          secondary="You get 30 minutes to confirm a spot"
        />
      ) : null}
      {note ? <FactRow icon={<Info />} text={note} /> : null}
      {countsAsStrike && lateCancels !== undefined && lateCancels > 0 ? (
        <FactRow
          icon={<TriangleAlert />}
          tone="warning"
          text={`${lateCancels} of 3 late cancels`}
          secondary="3 in 30 days pause new bookings"
          href={strikesHref}
        />
      ) : null}
    </section>
  )
}

/**
 * A booking in a list: tile, title, one quiet line, an optional end slot. The whole row is a link or a button.
 * `selected` marks the row whose panel is open in the desktop Split list, with the app's selected-row style.
 */
export function BookingListRow({
  tile,
  title,
  line,
  trailing,
  href,
  onClick,
  selected,
  className,
}: {
  tile: ReactNode
  title: string
  line: string
  trailing?: ReactNode
  href?: string
  onClick?: () => void
  selected?: boolean
  className?: string
}) {
  const main = (
    <>
      {tile}
      <span className="min-w-0 flex-1 text-body-m sm:text-body-s">
        <span className="block truncate font-medium">{title}</span>
        <span className="tabular block truncate text-muted-foreground">
          {line}
        </span>
      </span>
    </>
  )
  const hit =
    "gap-s flex min-h-13 min-w-0 flex-1 items-center py-xs text-left outline-none focus-visible:underline"
  return (
    <div
      className={cn(
        "gap-s relative flex min-h-13 min-w-0 items-center",
        (href || onClick) && "hover:bg-muted/40",
        selected && "bg-accent rule-l rule-primary",
        className
      )}
    >
      {href ? (
        <Link href={href} scroll={false} className={hit}>
          {main}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          className={hit}
        >
          {main}
        </button>
      ) : (
        <div className={hit}>{main}</div>
      )}
      {trailing ? (
        <span className="flex shrink-0 items-center">{trailing}</span>
      ) : null}
    </div>
  )
}

const OUTCOME = {
  attended: { word: "Attended", cls: "text-success", Icon: CheckCircle2 },
  missed: { word: "Missed", cls: "text-warning", Icon: TriangleAlert },
  late: { word: "Late cancel", cls: "text-warning", Icon: TriangleAlert },
  cancelled: { word: "Cancelled", cls: "text-muted-foreground", Icon: XCircle },
} as const

/** What happened to a past booking: a glyph and a word in the status colour, no capsule. */
export function OutcomeMark({
  outcome,
  className,
}: {
  outcome: "attended" | "missed" | "late" | "cancelled"
  className?: string
}) {
  const { word, cls, Icon } = OUTCOME[outcome]
  return (
    <span
      className={cn(
        "gap-xxs inline-flex shrink-0 items-center text-body-s font-medium whitespace-nowrap",
        cls,
        className
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {word}
    </span>
  )
}
