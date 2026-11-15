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
import { CATEGORIES, INSTRUCTOR_BY_ID } from "@/lib/data/catalog"
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
      className="flex max-w-[560px] flex-col items-start gap-s py-m"
    >
      <TriangleAlert className="size-6 text-warning" aria-hidden="true" />
      <h2 className="font-display-wide font-display-wide text-body-xl font-heavy">
        We couldn&apos;t load {what}.
      </h2>
      <p className="text-muted-foreground">
        Your bookings are safe. Try again.
      </p>
      <div className="flex flex-wrap gap-xs">
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
        "flex flex-wrap items-center gap-x-m gap-y-xxs",
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
        <div className="flex flex-wrap items-center gap-xs">{actions}</div>
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

const CAT_IDS = CATEGORIES.map((c) => c.id)
export function PersonAvatar({
  name,
  hue = 0,
  size,
  className,
}: {
  name: string
  hue?: number
  size?: number
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
      // Shape and type come from Avatar.
      className={cn(
        `cat-${CAT_IDS[Math.abs(hue) % CAT_IDS.length]}`,
        "bg-cat",
        className
      )}
      // A set size also scales the initials. Without one, the theme sets both.
      style={size ? { width: size, height: size } : undefined}
    >
      <Avatar.Fallback
        className="font-heavy text-on-cat"
        style={size ? { fontSize: Math.max(11, size * 0.38) } : undefined}
      >
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
        "inline-flex min-w-0 items-center gap-xs",
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
      className="inline-flex gap-xxs"
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
    <div className="flex flex-col gap-s" aria-busy="true">
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
        "corner-xs px-xs py-xxs",
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
