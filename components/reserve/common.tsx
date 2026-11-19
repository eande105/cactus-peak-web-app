"use client"
import { useEffect, useId, useRef, useState } from "react"
import { NumberField } from "@/components/graphical"
import { Minus, Plus } from "@/components/icons"
import { Modal } from "@/components/kit/overlays"
import { Button } from "@/components/ui/button"
import { fmtCountdown, MIN } from "@/lib/time"
import { cn } from "@/lib/utils"

export function SlotHoldTimer({
  holdUntil,
  now,
  onExpire,
  onExtend,
  canExtend,
  what,
  className,
}: {
  holdUntil: number
  now: number
  onExpire: () => void
  onExtend: () => void
  canExtend: boolean
  what: string
  className?: string
}) {
  const left = holdUntil - now
  const fired = useRef(false)
  const [dismissed, setDismissed] = useState(0)
  const warn =
    left > 0 && left <= 60_000 && canExtend && dismissed !== holdUntil
  // biome-ignore lint/correctness/useExhaustiveDependencies: holdUntil re-arms the expiry flag when a new hold starts
  useEffect(() => {
    fired.current = false
  }, [holdUntil])
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire the expiry once per hold, onExpire changes identity on every render
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true
      onExpire()
    }
  }, [left])
  const pct = Math.max(0, Math.min(100, (left / (5 * MIN)) * 100))
  return (
    <div className={cn("gap-xs flex flex-col", className)}>
      <p className="gap-m flex items-baseline justify-between text-body-m sm:text-body-s">
        <span className="min-w-0 truncate text-muted-foreground">
          Holding {what}
        </span>
        <span
          className="tabular shrink-0 font-heavy"
          role="timer"
          aria-label={`Hold time left ${fmtCountdown(left)}`}
        >
          {fmtCountdown(left)} left
        </span>
      </p>
      <div
        className="h-1 overflow-hidden corner-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full corner-full bg-night dark:bg-night-foreground"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Modal
        open={warn}
        onOpenChange={(o) => !o && setDismissed(holdUntil)}
        title="1 minute left"
        description={`We're holding ${what} for you.`}
      >
        <div className="gap-s flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDismissed(holdUntil)}
          >
            Let it go
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onExtend()
            }}
          >
            Add 5 minutes
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  help,
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  help?: string
  className?: string
}) {
  const id = useId()
  return (
    <NumberField.Root
      id={id}
      className={className}
      value={value}
      min={min}
      max={max}
      step={1}
      onValueChange={(v) => {
        // The field reports null while the input is empty. Keep the last whole count in range.
        if (v === null) return
        const n = Math.min(max, Math.max(min, Math.round(v)))
        if (n !== value) onChange(n)
      }}
    >
      <NumberField.Label htmlFor={id}>{label}</NumberField.Label>
      <NumberField.Group>
        <NumberField.Decrement
          aria-label={`Fewer: ${label}`}
          className="max-md:size-11"
        >
          <Minus aria-hidden="true" />
        </NumberField.Decrement>
        <NumberField.Input
          aria-describedby={help ? `${id}-h` : undefined}
          className="max-md:min-h-11"
        />
        <NumberField.Increment
          aria-label={`More: ${label}`}
          className="max-md:size-11"
        >
          <Plus aria-hidden="true" />
        </NumberField.Increment>
      </NumberField.Group>
      {/* The stepper buttons keep focus, so the new count is read out here. */}
      <span className="sr-only" aria-live="polite">
        {value}
      </span>
      {help ? (
        <p
          id={`${id}-h`}
          className="text-body-m text-muted-foreground sm:text-body-s"
        >
          {help}
        </p>
      ) : null}
    </NumberField.Root>
  )
}
