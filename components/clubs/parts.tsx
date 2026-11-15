"use client"
import { BUSY_WORDS } from "@/lib/data/catalog"
import { cn } from "@/lib/utils"

// The busyness word takes the status colour of what it means for the member: quiet and light are easy (success),
// steady is plain, busy needs a plan (warning), packed is a reason to go later (danger). The word always shows, so
// colour is never the only signal.
const BUSY_TONE = [
  "",
  "text-success",
  "text-success",
  "",
  "text-warning",
  "text-destructive",
]

/** The busyness word ("Quiet", "Busy") with its label for a screen reader. */
export function BusyWord({
  level,
  className,
}: {
  level: number
  className?: string
}) {
  return (
    <span className={cn("font-medium", BUSY_TONE[level], className)}>
      <span className="sr-only">Busyness: </span>
      {BUSY_WORDS[level]}
    </span>
  )
}
