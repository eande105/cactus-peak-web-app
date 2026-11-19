"use client"
import { useEffect, useState } from "react"
import type { AppState } from "@/lib/data/state"
import type { PlanId } from "@/lib/types"

/**
 * TEMPORARY, development only: forces one empty state on a Book tab for design review. Remove this file and its
 * callers (search for `useEmptyPreview`) when the review is done.
 *
 * Add `?empty=<state>` to a Book tab's URL and load the page:
 * - Classes: `notopen`, `none`, `nomatch`
 * - Courts: `gate`, `notopen`, `full`
 * - Lap lanes: `notopen`, `full`
 * - Kids club: `gate`, `sunday`, `notopen`
 * - Training: `nomatch`; a coach's booking page: `notimes`
 *
 * It reads the URL once after mount, so the server render and the first client render match, and it returns null in
 * production builds.
 */
export function useEmptyPreview(): string | null {
  const [state, setState] = useState<string | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    setState(new URLSearchParams(window.location.search).get("empty"))
  }, [])
  return state
}

/**
 * TEMPORARY, development only: `?plan=trailhead|ridge|summit` shows the app as if the signed-in household had that
 * plan, so the plan gates can be reviewed without another sign-in. Read once after mount, like `useEmptyPreview`.
 * Only what the screens read changes; anything saved still goes to the real household.
 */
export function usePlanPreview(): PlanId | null {
  const [plan, setPlan] = useState<PlanId | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const v = new URLSearchParams(window.location.search).get("plan")
    if (v === "trailhead" || v === "ridge" || v === "summit") setPlan(v)
  }, [])
  return plan
}

/** A copy of the state with one household on another plan. */
export function withPlan(s: AppState, householdId: string, plan: PlanId) {
  const hh = s.households[householdId]
  if (!hh || hh.plan === plan) return s
  return {
    ...s,
    households: { ...s.households, [householdId]: { ...hh, plan } },
  }
}
