"use client"
import Link from "next/link"
import { type ReactNode, useId } from "react"
import { GymObject, type ObjectId } from "@/components/brand/graphics"
import {
  Avatar,
  Checkbox,
  Radio,
  RadioGroup,
  SelectField,
  Switch,
  Toggle,
  ToggleGroup,
} from "@/components/graphical"
import {
  CheckCircle2,
  type IconComponent,
  Info,
  OctagonAlert,
  TriangleAlert,
} from "@/components/icons"
import { CoachArt } from "@/components/kit/brand-art"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  object,
  title,
  body,
  action,
  secondary,
  className,
  tone,
}: {
  icon?: IconComponent
  /** The gym object for what is missing, in a cut tile (VISUAL-IDENTITY.md). Wins over `icon`. */
  object?: ObjectId
  title: string
  body?: ReactNode
  action?: ReactNode
  secondary?: ReactNode
  className?: string
  tone?: "default" | "error"
}) {
  return (
    <div
      className={cn(
        "gap-s px-m py-xl mx-auto flex max-w-[44ch] flex-col items-center text-center",
        className
      )}
    >
      {object ? (
        <GymObject id={object} cut className="size-16" />
      ) : Icon ? (
        <Icon
          className={cn(
            "size-5",
            tone === "error" ? "text-warning" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      ) : null}
      <h2 className="text-body-m font-heavy text-balance">{title}</h2>
      {body ? (
        <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
          {body}
        </p>
      ) : null}
      {action || secondary ? (
        <div className="gap-xs flex flex-wrap items-center justify-center">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  what,
  onRetry,
}: {
  what: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="gap-s py-m flex max-w-[560px] flex-col items-start"
    >
      <TriangleAlert className="size-6 text-warning" aria-hidden="true" />
      <h2 className="font-display-wide font-display-wide text-body-xl font-heavy">
        We couldn&apos;t load {what}.
      </h2>
      <p className="text-muted-foreground">
        Your bookings are safe. Try again.
      </p>
      <div className="gap-xs flex flex-wrap">
        {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
        <Button variant="outline" render={<Link href="/inbox" />}>
          Message the front desk
        </Button>
      </div>
      <p className="text-body-xs text-muted-foreground">Error code: NETWORK</p>
    </div>
  )
}

type Tone =
  | "neutral"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "accent"
  | "outline"
export function StatusPill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: IconComponent
  children: ReactNode
  className?: string
}) {
  return (
    <Badge tone={tone} className={cn("corner-full", className)}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </Badge>
  )
}

export function Banner({
  tone = "info",
  icon,
  title,
  children,
  actions,
  className,
  role,
}: {
  tone?: "info" | "warning" | "danger" | "success" | "neutral"
  icon?: IconComponent
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  className?: string
  role?: "status" | "alert"
}) {
  const Icon =
    icon ??
    (tone === "danger"
      ? OctagonAlert
      : tone === "warning"
        ? TriangleAlert
        : tone === "success"
          ? CheckCircle2
          : Info)
  const bg =
    tone === "danger"
      ? "bg-danger-subtle"
      : tone === "warning"
        ? "bg-warning-subtle"
        : tone === "success"
          ? "bg-success-subtle"
          : tone === "info"
            ? "bg-color-3-transparent"
            : "bg-muted"
  const ic =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : tone === "info"
            ? "text-color-3"
            : "text-muted-foreground"
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(
        "gap-x-m gap-y-xxs flex flex-wrap items-center",
        "corner-s px-s py-xs",
        "md:px-m md:py-s",
        bg,
        className
      )}
    >
      <Icon className={cn("size-5 shrink-0", ic)} aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48 text-body-s max-md:[&>:not(:first-child)]:hidden">
        {title ? <p className="text-body-s font-heavy">{title}</p> : null}
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? (
        <div className="gap-xs flex flex-wrap items-center">{actions}</div>
      ) : null}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: { value: T; label: ReactNode; sr?: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: "sm" | "md"
  className?: string
}) {
  // The theme owns the control height now. `size` stays in the API so call sites keep working.
  void size
  return (
    <ToggleGroup
      aria-label={label}
      value={[String(value)]}
      onValueChange={(next) => {
        // Single choice: a press on the selected item would empty the group, so ignore it.
        const o = options.find((x) => String(x.value) === next[0])
        if (o && o.value !== value) onChange(o.value)
      }}
      className={cn("inline-flex max-w-full overflow-x-auto", className)}
    >
      {options.map((o) => (
        <Toggle
          key={String(o.value)}
          value={String(o.value)}
          aria-label={o.sr}
          disabled={o.disabled}
          // The selected fill (design review S8) comes from the shared pressed-toggle rule in app/globals.css.
          className="max-md:min-h-11"
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

export function SelectBox<V extends string>({
  label,
  value,
  onChange,
  options,
  className,
  hideLabel,
}: {
  label: string
  value: V
  onChange: (v: V) => void
  options: { value: V; label: string; disabled?: boolean }[]
  className?: string
  hideLabel?: boolean
}) {
  return (
    <div
      className={cn(
        // The Graphical select renders its label and trigger as siblings; stack them with the same gap as `Field`.
        "gap-xs flex min-w-0 flex-col max-md:[&_.themed-select]:!min-h-11",
        hideLabel && "[&_.field-label]:sr-only",
        className
      )}
    >
      <SelectField<V>
        label={label}
        value={value}
        onValueChange={(v) => onChange(v as V)}
        options={options}
      />
    </div>
  )
}

export function CheckRow({
  checked,
  onChange,
  children,
  disabled,
  id,
  className,
}: {
  checked: boolean
  onChange: (c: boolean) => void
  children: ReactNode
  disabled?: boolean
  id?: string
  className?: string
}) {
  return (
    <Checkbox.Row className={className}>
      <Checkbox.Root
        id={id}
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        disabled={disabled}
      />
      <Checkbox.Label>{children}</Checkbox.Label>
    </Checkbox.Row>
  )
}
export function SwitchRow({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean
  onChange: (c: boolean) => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <Switch.Row>
      <Switch.Root
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        disabled={disabled}
      >
        <Switch.Thumb />
      </Switch.Root>
      <Switch.Label>{children}</Switch.Label>
    </Switch.Row>
  )
}

export function FormField({
  label,
  help,
  error,
  children,
  className,
}: {
  label: string
  help?: string
  error?: string
  children: (p: {
    id: string
    "aria-describedby"?: string
    "aria-invalid"?: boolean
  }) => ReactNode
  className?: string
}) {
  const id = useId()
  const desc =
    [help ? `${id}-h` : "", error ? `${id}-e` : ""].filter(Boolean).join(" ") ||
    undefined
  // Same type and color roles as the Graphical Field label, description and error parts. Those parts are not used
  // because Field.Label links only to a Field.Control, and callers pass their own controls with this id.
  return (
    <div className={cn("flex flex-col gap-(--space-xs)", className)}>
      <label htmlFor={id} className="text-body-s font-heavy text-foreground">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": desc,
        "aria-invalid": error ? true : undefined,
      })}
      {help ? (
        <p id={`${id}-h`} className="text-body-s text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-e`}
          role="alert"
          className="text-body-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The avatar palette: the eight category colours, in hue order around the wheel. It is fixed here, not read from
 * `CATEGORIES`, because the catalog fills at run time and a module-level copy of it can be empty. Each id has a
 * `.cat-*` rule in globals.css that sets `--c`, which `bg-cat` reads.
 */
const AVATAR_CATS = [
  "strength",
  "conditioning",
  "court",
  "mind-body",
  "cycle",
  "aqua",
  "recovery",
  "youth",
] as const satisfies readonly CategoryId[]

/** The member's colour: `hue` is degrees (0–360), so it picks the palette slot nearest on the wheel. */
export function avatarCategory(hue: number): CategoryId {
  const h = Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 0
  const n = AVATAR_CATS.length
  return AVATAR_CATS[Math.round(h / (360 / n)) % n]
}

/** Each size is a Tailwind size with an initials size from the type scale, about 0.4 of the circle. */
const AVATAR_SIZE = {
  24: "size-6 text-body-xxs",
  28: "size-7 text-body-xxs",
  32: "size-8 text-body-xs",
  36: "size-9 text-body-xs",
  40: "size-10 text-body-s",
  48: "size-12 text-body-m",
  88: "size-22 text-body-xxl",
} as const

export function PersonAvatar({
  name,
  hue = 0,
  size = 32,
  className,
}: {
  /** The full name, so the initials have two letters. */
  name: string
  /** `members.hue`, in degrees. */
  hue?: number
  size?: keyof typeof AVATAR_SIZE
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <Avatar.Root
      aria-hidden="true"
      // The solid category colour tells family members apart and stands off every surface (4.4:1 or more against the
      // Sand sidebar); the initials take the category's own text colour (`on-cat`, 4.9:1 or more in both modes).
      // The utilities replace the theme's avatar surface, and the size replaces its control size.
      className={cn(
        `cat-${avatarCategory(hue)}`,
        "bg-cat text-on-cat",
        AVATAR_SIZE[size],
        className
      )}
    >
      {/* The initials layer fills the circle. It stays clear, so a theme fill on it cannot hide the colour. */}
      <Avatar.Fallback className="bg-transparent [font-size:inherit] leading-none font-heavy text-on-cat">
        {initials}
      </Avatar.Fallback>
    </Avatar.Root>
  )
}
export function InstructorChip({
  id,
  size = "md",
  stacked,
}: {
  id: string
  size?: "sm" | "md" | "lg"
  stacked?: boolean
}) {
  const i = INSTRUCTOR_BY_ID[id]
  if (!i) return null
  const px = size === "lg" ? 56 : size === "md" ? 28 : 24
  return (
    <span
      className={cn(
        "gap-xs inline-flex min-w-0 items-center",
        stacked && "flex-col items-start"
      )}
    >
      <CoachArt name={i.name} roles={[i.role]} size={px} />
      <span className="min-w-0 truncate text-body-s">{i.name}</span>
    </span>
  )
}

export function LateCancelMeter({
  count,
  max = 3,
  clears,
}: {
  count: number
  max?: number
  clears?: number
}) {
  void clears
  return (
    // biome-ignore lint/a11y/useSemanticElements: a native meter draws its own bar and would change the look
    <span
      role="meter"
      aria-label="Late cancels in the last 30 days"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={count}
      aria-valuetext={`${count} of ${max}`}
      className="gap-xxs inline-flex"
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholders with no data identity that never reorder
          key={i}
          className={cn(
            "h-3 w-6 corner-xs",
            i < count
              ? count >= max
                ? "bg-destructive"
                : "bg-warning"
              : "hairline ring-input"
          )}
        />
      ))}
    </span>
  )
}

export function LoadingBlock({
  text,
  rows = 4,
}: {
  text: string
  rows?: number
}) {
  return (
    <div className="gap-s flex flex-col" aria-busy="true">
      <p role="status" className="text-body-s text-muted-foreground">
        {text}
      </p>
      {Array.from({ length: rows }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholders with no data identity that never reorder
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className={cn(
        "px-xs py-xxs corner-xs",
        "font-body text-body-xs font-heavy",
        "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </kbd>
  )
}

export function RadioList<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: {
    value: T
    label: ReactNode
    help?: ReactNode
    disabled?: boolean
  }[]
  className?: string
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className={className}
    >
      {options.map((o) => (
        <RadioGroup.Row key={o.value}>
          <Radio.Root value={o.value} disabled={o.disabled}>
            <Radio.Indicator />
          </Radio.Root>
          <RadioGroup.Label>
            {o.label}
            {o.help ? (
              <span className="block text-body-s font-regular text-muted-foreground">
                {o.help}
              </span>
            ) : null}
          </RadioGroup.Label>
        </RadioGroup.Row>
      ))}
    </RadioGroup>
  )
}
