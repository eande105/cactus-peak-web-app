"use client"
import { useEffect, useState } from "react"
import { CheckInPass } from "@/components/app/check-in-pass"
import { useApp } from "@/components/app/use-app"
import { Apple, SunMedium } from "@/components/icons"
import { AppPage, Card } from "@/components/kit/app"
import { LoadingBlock, SelectBox } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { householdMembers } from "@/lib/engine"

/** The pass as its own screen, for a phone: one centred bordered card, 380 px at most, with whose pass it is. */
export default function PassPage() {
  const { s, me, hh, now } = useApp()
  const [who, setWho] = useState(me.id)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    // Keep the screen on while the pass is showing. Unsupported browsers skip this silently.
    let lock: { release: () => Promise<void> } | null = null
    ;(
      navigator as unknown as {
        wakeLock?: { request: (t: string) => Promise<typeof lock> }
      }
    ).wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l
      })
      .catch(() => {})
    return () => {
      void lock?.release()
    }
  }, [])
  const people =
    me.role === "teen"
      ? [me]
      : householdMembers(s, hh.id).filter((m) => m.status !== "invite_expired")
  const m = s.members[people.some((p) => p.id === who) ? who : me.id]
  const apple =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent)
  if (loading) return <LoadingBlock text="Getting your pass…" rows={3} />
  return (
    <AppPage title="Check-in pass" className="max-w-[380px]">
      <Card>
        <div className="gap-m flex flex-col">
          {people.length > 1 ? (
            <SelectBox
              label="Showing"
              hideLabel
              value={m.id}
              onChange={setWho}
              options={people.map((p) => ({
                value: p.id,
                label:
                  p.id === me.id
                    ? `${p.firstName} ${p.lastName} (you)`
                    : `${p.firstName} ${p.lastName}`,
              }))}
            />
          ) : null}
          <CheckInPass s={s} member={m} now={now} />
          <Button variant="outline" size="sm" disabled aria-disabled="true">
            <Apple aria-hidden="true" data-icon="inline-start" />
            {apple ? "Add to Apple Wallet" : "Add to Google Wallet"} · Coming
            soon
          </Button>
          <p className="gap-xs flex items-center justify-center text-body-m text-muted-foreground sm:text-body-s">
            <SunMedium className="size-4 shrink-0" aria-hidden="true" />
            Turn your screen brightness up.
          </p>
        </div>
      </Card>
    </AppPage>
  )
}
