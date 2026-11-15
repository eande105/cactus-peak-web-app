"use client"
import { type ReactNode, useId } from "react"
import { Section } from "@/components/account/parts"
import { Switch } from "@/components/graphical"
import { cn } from "@/lib/utils"

/** The ARIA links from a setting row to its control. Spread them on the control. */
export type SettingIds = {
  "aria-labelledby": string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/**
 * One group of settings: a heading with one line, then the setting rows with hairlines between them.
 * A child that is not a `SettingRow` (a table, a set of toggles) is one more block in the same stack.
 */
export function SettingsSection({
  id,
  title,
  line,
  action,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  line?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Section
      id={id}
      title={title}
      line={line}
      action={action}
      className={className}
    >
      <div className="flex flex-col rule-t [&>*+*]:rule-t">{children}</div>
    </Section>
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
  as: T = "div",
  children,
  className,
}: {
  label: ReactNode
  line?: ReactNode
  error?: string
  lead?: ReactNode
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
      {lead}
      <B className="flex min-w-0 flex-1 basis-48 flex-col">
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
  checked,
  onChange,
  disabled,
  className,
}: {
  label: ReactNode
  line?: ReactNode
  checked: boolean
  onChange: (c: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <SettingRow as="label" label={label} line={line} className={className}>
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
