"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, Suspense, useEffect, useState } from "react"
import { CheckInPass } from "@/components/app/check-in-pass"
import { useApp } from "@/components/app/use-app"
import { CategoryTile } from "@/components/brand/graphics"
import { ChoiceList, InfoLine, StepFooter } from "@/components/flows/parts"
import { Switch, Toggle } from "@/components/graphical"
import { Group } from "@/components/kit/app"
import { ClubArt } from "@/components/kit/brand-art"
import { CategoryBadge } from "@/components/kit/category"
import { BusynessMeter } from "@/components/kit/ribs"
import { Banner, Segmented, SwitchRow } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import {
  addPasskey,
  changeHomeClub,
  setNotifCell,
  setPrefs,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CATEGORIES, CLUBS } from "@/lib/data/catalog"
import { liveBusyness } from "@/lib/engine"
import { toast } from "@/lib/toast"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

const GOALS = [
  ["build-strength", "Build strength"],
  ["move-more", "Move more"],
  ["event", "Train for an event"],
  ["stay-consistent", "Stay consistent"],
  ["recover", "Recover well"],
] as const
const TITLES = [
  "Where do you train most?",
  "What do you like?",
  "What are you aiming for?",
  "How should we reach you?",
  "Your pass and calendar",
]
const TOPICS = [
  ["reminders", "Class reminders (60 min before)"],
  ["waitlist", "Waitlist and held spots"],
  ["changes", "Booking changes"],
  ["news", "Club news"],
  ["billing", "Billing (email always on)"],
  ["coach", "Coach messages"],
] as const

function Inner() {
  const { s, me, hh, prefs, now } = useApp()
  const router = useRouter()
  const sp = useSearchParams()
  const start = Math.min(5, Math.max(1, Number(sp.get("step")) || 1))
  const [step, setStep] = useState(start)
  const [club, setClub] = useState(me.homeClub)
  const [push, setPush] = useState("")
  useEffect(() => {
    announce(`Step ${step} of 5`)
  }, [step])
  const next = () => {
    setPrefs(me.id, {
      onboardingStep: Math.max(
        prefs.onboardingStep < 6 ? step + 1 : 6,
        step + 1
      ),
    })
    if (step === 1 && club !== me.homeClub) changeHomeClub(me.id, club)
    if (step === 5) {
      setPrefs(me.id, { onboardingStep: 6 })
      toast({ title: "You're set. Here's your first week." })
      router.replace("/today")
    } else setStep(step + 1)
  }
  const skip = () => {
    if (step === 5) {
      setPrefs(me.id, { onboardingStep: 6 })
      router.replace("/today")
    } else {
      setPrefs(me.id, { onboardingStep: step + 1 })
      setStep(step + 1)
    }
  }
  const teen = me.role === "teen"
  const feed = `webcal://my.cactuspeakathletic.example/api/calendar/${prefs.calendarToken}.ics`
  return (
    <StepCard
      title={TITLES[step - 1]}
      step={step}
      of={5}
      footer={
        <StepFooter
          back={
            step > 1
              ? { label: "Back", onClick: () => setStep(step - 1) }
              : undefined
          }
        >
          {step > 1 ? (
            <Button variant="ghost" onClick={skip}>
              Skip for now
            </Button>
          ) : null}
          <Button onClick={next}>{step === 5 ? "Finish" : "Continue"}</Button>
        </StepFooter>
      }
    >
      {step === 1 ? (
        <>
          {(["Mesa", "Gilbert"] as const).map((city) => (
            <Group key={city} label={city}>
              <ChoiceList
                label={city}
                value={club}
                onChange={setClub}
                options={CLUBS.filter((c) => c.city === city).map((c) => ({
                  value: c.slug,
                  label: c.name,
                  line: (
                    <BusynessMeter
                      level={liveBusyness(c.slug, now).level}
                      variant="inline"
                    />
                  ),
                  lead: (
                    <ClubArt
                      slug={c.slug}
                      ratio="4/3"
                      className="w-14 corner-xs"
                    />
                  ),
                }))}
              />
            </Group>
          ))}
          {hh.plan === "trailhead" ? (
            <InfoLine>
              Trailhead books at one club. You can change it once per billing
              cycle.
            </InfoLine>
          ) : null}
        </>
      ) : null}
      {step === 2 ? (
        <>
          <div className="@container">
            <ul className="gap-xs grid grid-cols-2 @md:grid-cols-4">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Toggle
                    pressed={prefs.interests.includes(c.id as CategoryId)}
                    onPressedChange={() =>
                      setPrefs(me.id, {
                        interests: prefs.interests.includes(c.id as CategoryId)
                          ? prefs.interests.filter((x) => x !== c.id)
                          : [...prefs.interests, c.id as CategoryId],
                      })
                    }
                    className="gap-xs flex w-full flex-col items-stretch text-left whitespace-normal"
                  >
                    <CategoryTile
                      category={c.id as CategoryId}
                      cut
                      className="size-12"
                    />
                    <CategoryBadge
                      id={c.id as CategoryId}
                      size="md"
                      nameOnly
                      className="w-fit"
                    />
                  </Toggle>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-m rule-t">
            <SwitchRow
              checked={prefs.firstTimersFirst}
              onChange={(c) => setPrefs(me.id, { firstTimersFirst: c })}
            >
              Show first-timer classes first
            </SwitchRow>
          </div>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <ChoiceList
            label="Goal"
            value={prefs.goal}
            onChange={(v) => setPrefs(me.id, { goal: v })}
            options={GOALS.map(([v, l]) => ({ value: v, label: l }))}
          />
          <Group label="Visits per week" className="pt-m rule-t">
            <Segmented
              label="Visits per week"
              value={prefs.weeklyTarget}
              onChange={(v) => setPrefs(me.id, { weeklyTarget: v })}
              options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                value: n,
                label: String(n),
              }))}
            />
          </Group>
        </>
      ) : null}
      {step === 4 ? (
        <>
          {teen && me.parentId ? (
            <Banner
              tone="neutral"
              title={`${s.members[me.parentId].firstName} also gets booking alerts.`}
            />
          ) : null}
          <div>
            <table className="w-full text-left">
              <caption className="sr-only">
                Notification topics and channels
              </caption>
              <thead>
                <tr className="rule-b">
                  <th scope="col" className={cn(TH, "text-left")}>
                    Topic
                  </th>
                  {["Push", "Email", "Text"].map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(TH, "w-16 text-center")}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOPICS.map(([t, l]) => (
                  <tr key={t} className="rule-b">
                    <th scope="row" className="pr-s py-xs font-medium">
                      {l}
                    </th>
                    {(["push", "email", "text"] as const).map((c) => (
                      <td key={c} className="py-xs text-center">
                        <Switch.Root
                          aria-label={`${l}, ${c}`}
                          checked={
                            t === "billing" && c === "email"
                              ? true
                              : prefs.notif[t][c]
                          }
                          disabled={t === "billing" && c === "email"}
                          onCheckedChange={async (on) => {
                            if (
                              c === "push" &&
                              on &&
                              typeof Notification !== "undefined" &&
                              Notification.permission === "default"
                            ) {
                              const r = await Notification.requestPermission()
                              if (r === "denied")
                                setPush(
                                  "Push is blocked in this browser. Use email or text."
                                )
                            }
                            setNotifCell(me.id, t, c, !!on)
                          }}
                        >
                          <Switch.Thumb />
                        </Switch.Root>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {push ? (
            <p role="status" className="text-muted-foreground">
              {push}
            </p>
          ) : null}
        </>
      ) : null}
      {step === 5 ? (
        <>
          <CheckInPass s={s} member={me} now={now} variant="compact" />
          <Group label="Calendar feed" className="pt-m rule-t">
            <p className="tabular break-all text-muted-foreground">{feed}</p>
            <div className="gap-xs flex flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(feed)
                  toast({ title: "Link copied" })
                }}
              >
                Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={
                  <a
                    href="https://calendar.google.com/calendar/r"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                Open in Google Calendar
              </Button>
            </div>
          </Group>
          <div className="gap-s pt-m flex flex-wrap items-center justify-between rule-t">
            <h3 className="font-heavy">Passkey for this device</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addPasskey("This device")
                toast({ title: "Passkey added" })
              }}
            >
              Add a passkey
            </Button>
          </div>
        </>
      ) : null}
    </StepCard>
  )
}

const TH =
  "py-xs text-body-xs font-medium whitespace-nowrap text-muted-foreground"

/** One step of the welcome flow: the question as the title, the step count, the progress bar, and the actions. */
function StepCard({
  title,
  step,
  of,
  footer,
  children,
  className,
}: {
  title: string
  step: number
  of: number
  footer: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col corner-m raised", className)}>
      <header className="p-m">
        <h1
          id="page-title"
          tabIndex={-1}
          className="font-display-wide text-body-xl font-heavy text-balance outline-none"
        >
          {title}
        </h1>
        <p
          role="status"
          className="tabular text-body-m text-muted-foreground sm:text-body-s"
        >
          Step {step} of {of}
        </p>
      </header>
      <div className="h-0.5 bg-muted" aria-hidden="true">
        <div
          className="h-full w-(--step) bg-primary transition-[width] motion-reduce:transition-none"
          style={{ "--step": `${(step / of) * 100}%` } as React.CSSProperties}
        />
      </div>
      <div className="gap-m p-m flex flex-col text-body-m sm:text-body-s">
        {children}
      </div>
      <footer className="p-m flex rule-t">{footer}</footer>
    </section>
  )
}

export default function Welcome() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
