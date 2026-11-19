"use client"
import { useMemo } from "react"
import type { AppState } from "@/lib/data/state"
import { usePlanPreview, withPlan } from "@/lib/empty-preview"
import { householdOf, nowOf } from "@/lib/engine"
import { useStore, useTick } from "@/lib/store"

// Convenience for pages: the saved state is non-null inside the signed-in layout.
export function useApp() {
  const stored = useStore() as AppState
  // TEMPORARY design review switch (lib/empty-preview.ts): `?plan=` in development.
  const plan = usePlanPreview()
  const s = useMemo(() => {
    if (!plan) return stored
    const m = stored.members[stored.currentMemberId]
    return withPlan(stored, m.householdId, plan)
  }, [stored, plan])
  useTick()
  const now = nowOf(s)
  const me = s.members[s.currentMemberId]
  const hh = householdOf(s, me.id)
  const prefs = s.prefs[me.id]
  return { s, now, me, hh, prefs, club: prefs.viewingClub }
}
