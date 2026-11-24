"use client"
import { type ReactNode, useId } from "react"
import { IconTile } from "@/components/account/screen"
import { Switch } from "@/components/graphical"
import type { IconComponent } from "@/components/icons"
import { cn } from "@/lib/utils"

/** The ARIA links from a setting row to its control. Spread them on the control. */
export type SettingIds = {
  "aria-labelledby": string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/**
 * One group of settings: a heading with an optional line and action, then a raised card that holds the setting
 * rows with a rule between them. From xl the heading sits at the left of its card (the settings frame is wide
 * enough there). A child that is not a `SettingRow` (a table, a set of toggles) is one more block in the card.
 * `tone="danger"` is for an action that cannot be undone: the card takes a destructive edge.
 */
export function SettingsSection({
  id,
  title,
  line,
  action,
  tone = "default",
  children,
  className,
}: {
  id?: string
  title: ReactNode
  line?: ReactNode
  action?: ReactNode
  tone?: "default" | "danger"
  children: ReactNode
  className?: string
}) {
  const headId = useId()
  return (
    <section
      id={id}
      aria-labelledby={headId}
      className={cn(
        "gap-s xl:gap-l grid min-w-0 xl:grid-cols-[15rem_minmax(0,1fr)] xl:items-start",
        className
      )}
    >
      <div className="gap-x-m gap-y-xs xl:pt-s flex flex-wrap items-end justify-between xl:flex-col xl:items-start">
        <div className="min-w-0 flex-1 basis-48 xl:flex-none xl:basis-auto">
          <h2
            id={headId}
            className={cn(
              "text-body-m font-heavy sm:text-body-s",
              tone === "danger" && "text-destructive"
            )}
          >
            {title}
          </h2>
          {line ? (
            <p className="text-body-m text-pretty text-muted-foreground sm:text-body-s">
              {line}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="gap-xs flex shrink-0 items-center">{action}</div>
        ) : null}
      </div>
      <div
        className={cn(
          "px-m flex min-w-0 flex-col corner-m [&>*+*]:rule-t",
          tone === "danger" ? "bg-card hairline ring-destructive/40" : "raised"
        )}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * One setting: the label and one line at the left, the control at the right. `wide` gives a text field or a select
 * a fixed width, and the full width on a phone. `as="label"` makes the whole row the label of a switch.
 * Pass a function as the child to get the ARIA links for the control.
 */
export function SettingRow({
  label,
  line,
  error,
  lead,
  wide,
  icon,
  as: T = "div",
  children,
  className,
}: {
  label: ReactNode
  line?: ReactNode
  error?: string
  lead?: ReactNode
  /** An icon tile before the label (a span, so it is valid inside `as="label"`). */
  icon?: IconComponent
  wide?: boolean
  as?: "div" | "label"
  children?: ReactNode | ((ids: SettingIds) => ReactNode)
  className?: string
}) {
  const id = useId()
  const ids: SettingIds = {
    "aria-labelledby": `${id}-l`,
    "aria-describedby":
      [line ? `${id}-d` : "", error ? `${id}-e` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
  }
  // A label element takes phrasing content only.
  const B = T === "label" ? "span" : "div"
  return (
    <T
      className={cn(
        "py-s gap-x-m gap-y-xs flex min-h-14 flex-wrap items-center justify-between text-body-m sm:text-body-s",
        className
      )}
    >
      {icon ? (
        <IconTile icon={icon} className="self-start sm:self-center" />
      ) : null}
      {lead}
      <B className="flex min-w-0 flex-1 basis-40 flex-col">
        <B id={`${id}-l`} className="font-medium">
          {label}
        </B>
        {line ? (
          <B id={`${id}-d`} className="text-pretty text-muted-foreground">
            {line}
          </B>
        ) : null}
        {error ? (
          <B id={`${id}-e`} role="alert" className="text-destructive">
            {error}
          </B>
        ) : null}
      </B>
      {children !== undefined && children !== null ? (
        <B
          className={cn(
            "gap-xs flex max-w-full shrink-0 items-center",
            wide && "w-full sm:w-64 [&>*]:min-w-0 [&>*]:flex-1"
          )}
        >
          {typeof children === "function" ? children(ids) : children}
        </B>
      ) : null}
    </T>
  )
}

/** A setting that is on or off. The whole row toggles the switch. */
export function SettingSwitch({
  label,
  line,
  icon,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: ReactNode
  line?: ReactNode
  /** Passed to `SettingRow` `icon`. */
  icon?: IconComponent
  checked: boolean
  onChange: (c: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <SettingRow
      as="label"
      label={label}
      line={line}
      icon={icon}
      className={className}
    >
      {(ids) => (
        <Switch.Root
          {...ids}
          checked={checked}
          onCheckedChange={(c) => onChange(!!c)}
          disabled={disabled}
        >
          <Switch.Thumb />
        </Switch.Root>
      )}
    </SettingRow>
  )
}

/** A block in a settings section that is not a label and control pair: a set of toggles, a field with buttons. */
export function SettingBlock({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("py-s", className)}>{children}</div>
}
