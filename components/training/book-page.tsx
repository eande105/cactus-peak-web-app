"use client"
import Link from "next/link"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
  type Choice,
  ChoiceList,
  cardLabel,
  FlowAside,
  FlowError,
  Highlight,
  InfoLine,
  RESULT_WIDTH,
  StepFooter,
} from "@/components/flows/parts"
import { Facts, Group, Task } from "@/components/kit/app"
import { CoachArt } from "@/components/kit/brand-art"
import { MiniCalendar } from "@/components/kit/calendar"
import {
  Banner,
  EmptyState,
  FormField,
  LoadingBlock,
  SelectBox,
} from "@/components/kit/ui"
import { SlotHoldTimer } from "@/components/reserve/common"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { bookPT, moveReservation } from "@/lib/actions"
import { announce } from "@/lib/announce"
import {
  CLUB_BY_SLUG,
  COACH_BY_SLUG,
  PT_PACKS,
  PT_PRICE,
} from "@/lib/data/catalog"
import { cancelNote, ptCreditsLeft, ptOpenSlots } from "@/lib/engine"
import {
  dateKey,
  dayStart,
  fmtDay,
  fmtDayLong,
  fmtDowTime,
  fmtMoney,
  fmtRange,
  fmtTime,
  MIN,
  parts,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Booking } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

type Pay = "credit" | "intro" | "single" | "pack"

function Inner({ slug }: { slug: string }) {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const sp = useSearchParams()
  const offline = useOffline()
  const coach = COACH_BY_SLUG[slug]
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const moveId = sp.get("move")
  const moving = moveId ? s.bookings.find((b) => b.id === moveId) : undefined
  const slots = useMemo(() => ptOpenSlots(s, slug, now), [s, slug, now])
  const first = slots[0]
  const [club, setClub] = useState(moving?.clubSlug ?? coach?.clubs[0] ?? "")
  const [day, setDay] = useState<number>(
    sp.get("t")
      ? dayStart(Number(sp.get("t")))
      : first
        ? dayStart(first)
        : dayStart(now)
  )
  const [slot, setSlot] = useState<number | null>(
    sp.get("t") ? Number(sp.get("t")) : null
  )
  const [hold, setHold] = useState(() => (sp.get("t") ? now + 5 * MIN : 0))
  const [ext, setExt] = useState(false)
  const [pay, setPay] = useState<Pay>(
    ptCreditsLeft(hh) > 0
      ? "credit"
      : hh.plan === "summit" && hh.ptIntroLeft > 0
        ? "intro"
        : "single"
  )
  const [pack, setPack] = useState("8")
  const [note, setNote] = useState("")
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [done, setDone] = useState<{ b: Booking; packLeft: number } | null>(
    null
  )
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (coach) document.title = `Book ${coach.name} · Cactus Peak Athletic`
  }, [coach])
  if (!coach) notFound()
  const first1 = coach.name.split(" ")[0]
  const daySlots = slots.filter((x) => dayStart(x) === day)
  const marks = new Set(slots.map((x) => dateKey(x)))
  const am = daySlots.filter((x) => parts(x).h < 12)
  const pm = daySlots.filter((x) => parts(x).h >= 12)
  const choose = (t: number) => {
    setError("")
    setSlot(t)
    setHold(now + 5 * MIN)
    setExt(false)
    announce(`${fmtDowTime(t)} selected.`)
  }
  const payOptions: Choice<Pay>[] = [
    ...(ptCreditsLeft(hh) > 0
      ? [
          {
            value: "credit" as const,
            label: "Use a pack credit",
            line: `${ptCreditsLeft(hh)} left in your ${hh.ptPack?.total}-pack`,
            end: "Included",
          },
        ]
      : []),
    ...(hh.plan === "summit"
      ? [
          {
            value: "intro" as const,
            label: "Summit intro session",
            line:
              hh.ptIntroLeft > 0
                ? `${hh.ptIntroLeft} left this quarter`
                : "None left this quarter",
            end: "Free",
            disabled: hh.ptIntroLeft <= 0,
          },
        ]
      : []),
    {
      value: "single",
      label: "Single session",
      line: "45 minutes",
      end: fmtMoney(PT_PRICE, false),
    },
    {
      value: "pack",
      label: "Buy a pack",
      line: "4, 8 or 12 sessions. Packs last 12 months.",
      end: PT_PACKS.length
        ? `From ${fmtMoney(Math.min(...PT_PACKS.map((p) => p.price)), false)}`
        : undefined,
    },
  ]
  const total =
    pay === "single"
      ? PT_PRICE
      : pay === "pack"
        ? PT_PACKS.find((p) => String(p.sessions) === pack)!.price
        : 0
  const confirm = async () => {
    if (!slot) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    if (moving) {
      const r = moveReservation(moving.id, { start: slot })
      setBusy(false)
      if (r.ok) {
        toast({ title: "Session moved", description: fmtDowTime(slot) })
        router.push("/bookings")
      } else setError(r.message)
      return
    }
    const r = bookPT({
      coachSlug: slug,
      start: slot,
      clubSlug: club,
      pay,
      packSessions: Number(pack),
      note: note.trim() || undefined,
    })
    setBusy(false)
    if (r.ok) {
      setDone({ b: r.booking, packLeft: r.packLeft })
      announce(`You're booked with ${first1}.`)
    } else {
      setError(r.message)
      announce(r.message)
      if (r.code === "SLOT_TAKEN") {
        setSlot(null)
        setStep(1)
      }
    }
  }
  if (done)
    return (
      <SuccessPanel
        className={RESULT_WIDTH}
        pill={
          done.b.status === "pending_approval"
            ? "Waiting for a parent"
            : "Training booked"
        }
        headline={`${coach.name}, ${fmtDowTime(done.b.start)}`}
        summary={[
          {
            label: "When",
            value: `${fmtDay(done.b.start)} · ${fmtRange(done.b.start, done.b.end)}`,
          },
          { label: "Where", value: CLUB_BY_SLUG[done.b.clubSlug].name },
          { label: "Payment", value: done.b.payment },
          ...(hh.ptPack
            ? [
                {
                  label: `${hh.ptPack.total}-pack`,
                  value: `${done.packLeft} left`,
                },
              ]
            : []),
          { label: "Reference", value: done.b.ref },
        ]}
        event={{
          title: `Training with ${coach.name}`,
          start: done.b.start,
          end: done.b.end,
          location: CLUB_BY_SLUG[done.b.clubSlug].address,
        }}
        extra={(() => {
          const c = cancelNote(s, me.id, done.b.start, now, "pt")
          return (
            <InfoLine tone={c.late ? "warning" : "info"}>{c.text}</InfoLine>
          )
        })()}
        rows={[
          { label: `Message ${first1}`, href: "/inbox" },
          { label: "Club details", href: `/clubs/${done.b.clubSlug}` },
        ]}
        onDone={() => router.push("/training")}
        doneLabel="Back to Training"
      />
    )
  if (loading)
    return <LoadingBlock text={`Checking ${first1}'s times…`} rows={4} />
  const cancel = slot ? cancelNote(s, me.id, slot, now, "pt") : null
  const payLabel = moving
    ? "No charge to move"
    : pay === "credit"
      ? "Pack credit"
      : pay === "intro"
        ? "Summit intro session"
        : pay === "single"
          ? "Single session"
          : `${pack}-session pack`
  return (
    <Task
      title={moving ? `Move your session with ${first1}` : `Book ${coach.name}`}
      step={step}
      of={3}
      close={{ href: `/training/coaches/${slug}`, label: coach.name }}
      aside={
        <FlowAside title="Session">
          <div className="gap-s flex flex-col">
            <div className="gap-s flex items-center">
              <CoachArt
                name={coach.name}
                roles={coach.specialties}
                size={40}
                className="shrink-0"
              />
              <div className="min-w-0 text-body-m sm:text-body-s">
                <p className="truncate font-medium">{coach.name}</p>
                <p className="truncate text-muted-foreground">
                  Personal training · 45 minutes
                </p>
              </div>
            </div>
            <Facts
              className="rule-t"
              items={[
                { label: "Club", value: CLUB_BY_SLUG[club].name },
                {
                  label: "Time",
                  value: slot ? (
                    <span className="tabular">{fmtDay(slot)}</span>
                  ) : (
                    "Not picked"
                  ),
                  hint: slot ? (
                    <span className="tabular">
                      {fmtRange(slot, slot + 45 * MIN)}
                    </span>
                  ) : undefined,
                },
                {
                  label: "Price",
                  value: (
                    <span className="tabular">
                      {total
                        ? fmtMoney(total)
                        : moving
                          ? "No charge"
                          : "Included"}
                    </span>
                  ),
                  hint: moving ? undefined : payLabel,
                },
              ]}
            />
            {slot && hold ? (
              <div className="pt-s rule-t">
                <SlotHoldTimer
                  holdUntil={hold}
                  now={now}
                  what="this time"
                  canExtend={!ext}
                  onExtend={() => {
                    setHold((h) => h + 5 * MIN)
                    setExt(true)
                  }}
                  onExpire={() => {
                    setSlot(null)
                    setHold(0)
                    setStep(1)
                    toast({
                      type: "info",
                      title: "Your hold ended",
                      description: "The time is open to others. Pick it again?",
                    })
                  }}
                />
              </div>
            ) : null}
          </div>
        </FlowAside>
      }
      footer={
        <StepFooter
          back={
            step > 1
              ? {
                  label: "Back",
                  onClick: () => setStep((st) => (st - 1) as 1 | 2),
                }
              : { label: "Cancel", href: `/training/coaches/${slug}` }
          }
        >
          {step < 3 ? (
            <Button
              disabled={step === 1 ? !slot : note.length > 500}
              onClick={() => setStep((st) => (st + 1) as 2 | 3)}
            >
              Continue
            </Button>
          ) : (
            <Button
              loading={busy}
              disabled={offline || !slot}
              onClick={() => void confirm()}
            >
              {moving
                ? "Move session"
                : me.role === "teen"
                  ? "Send request"
                  : pay === "pack"
                    ? "Book session and buy pack"
                    : "Book session"}
            </Button>
          )}
        </StepFooter>
      }
    >
      {moving ? (
        <Banner
          tone="neutral"
          title={`Original selection: ${fmtDay(moving.start)}, ${fmtTime(moving.start)}`}
        />
      ) : null}
      {step === 1 ? (
        <>
          {coach.clubs.length > 1 ? (
            <SelectBox
              label="Club"
              value={club}
              onChange={setClub}
              options={coach.clubs.map((c) => ({
                value: c,
                label: CLUB_BY_SLUG[c].name,
              }))}
              className="max-w-xs"
            />
          ) : null}
          <Group
            label="Pick a time"
            hint="Arizona time. A dot marks a day with open times."
          >
            <div className="@container">
              <div className="grid corner-m raised @lg:grid-cols-[minmax(0,1fr)_13rem]">
                <div className="p-m flex justify-center">
                  <MiniCalendar
                    today={now}
                    selected={day}
                    onSelect={(d) => {
                      setDay(d)
                      setSlot(null)
                    }}
                    marks={marks}
                    disabled={(d) =>
                      d < dayStart(now)
                        ? "Past"
                        : !marks.has(dateKey(d))
                          ? "No openings"
                          : false
                    }
                    label="Open days"
                  />
                </div>
                <div className="gap-s p-m flex min-w-0 flex-col rule-t @lg:rule-l @lg:rule-t-0">
                  <h3 className="font-heavy">{fmtDayLong(day)}</h3>
                  {daySlots.length ? (
                    <div
                      role="radiogroup"
                      aria-label="Open times"
                      className="gap-s flex flex-col"
                    >
                      <TimeList
                        label="Morning"
                        times={am}
                        value={slot}
                        onChoose={choose}
                      />
                      <TimeList
                        label="Afternoon"
                        times={pm}
                        value={slot}
                        onChoose={choose}
                      />
                    </div>
                  ) : (
                    <EmptyState
                      title={`No open times with ${first1} this day.`}
                      body="Pick a day with a dot, or try another coach."
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href="/training" />}
                        >
                          See other coaches
                        </Button>
                      }
                      className="px-zero py-zero"
                    />
                  )}
                </div>
              </div>
            </div>
          </Group>
        </>
      ) : null}
      {step === 2 ? (
        <>
          {!moving ? (
            <Group label="How do you want to pay?">
              <ChoiceList
                label="Payment"
                value={pay}
                onChange={setPay}
                options={payOptions}
              />
            </Group>
          ) : null}
          {!moving && pay === "pack" ? (
            <Group label="Pack size">
              <ChoiceList
                label="Pack size"
                value={pack}
                onChange={setPack}
                options={PT_PACKS.map((p) => ({
                  value: String(p.sessions),
                  label: `${p.sessions} sessions`,
                  line: `${fmtMoney(p.price / p.sessions, false)} each`,
                  end: fmtMoney(p.price, false),
                }))}
              />
            </Group>
          ) : null}
          <FormField
            label="Note for your coach (optional)"
            help={`Injuries, goals, what to avoid. Only ${first1} and club staff see this.`}
            error={
              note.length > 500 ? "Keep notes under 500 characters." : undefined
            }
          >
            {(f) => (
              <Textarea
                {...f}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </FormField>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Group label="Review">
            <Highlight
              label={
                slot ? (
                  <span className="tabular">
                    {coach.name} · {fmtDowTime(slot)}
                  </span>
                ) : (
                  coach.name
                )
              }
              value={
                total ? fmtMoney(total) : moving ? "No charge" : "1 pack credit"
              }
              unit={total ? "today" : undefined}
            >
              {cancel ? (
                <InfoLine tone={cancel.late ? "warning" : "info"}>
                  {cancel.text}
                </InfoLine>
              ) : null}
            </Highlight>
          </Group>
          <Facts
            items={[
              ...(total
                ? [
                    {
                      label: "Card",
                      value: (
                        <>
                          <span className="tabular">{cardLabel(hh.card)}</span>{" "}
                          <button
                            type="button"
                            className="text-link underline"
                            onClick={() => openDialog("card")}
                          >
                            Change
                          </button>
                        </>
                      ),
                    },
                  ]
                : []),
              ...(note.trim() ? [{ label: "Note", value: note.trim() }] : []),
            ]}
          />
          {me.role === "teen" ? (
            <Banner tone="neutral" title="Your parent needs to approve this.">
              We send them a request. The time is held for 24 hours.
            </Banner>
          ) : null}
        </>
      ) : null}
      {error ? <FlowError>{error}</FlowError> : null}
    </Task>
  )
}
/** The open times of one part of the day, as a stacked list of full-width buttons. */
function TimeList({
  label,
  times,
  value,
  onChoose,
  className,
}: {
  label: string
  times: number[]
  value: number | null
  onChoose: (t: number) => void
  className?: string
}) {
  if (!times.length) return null
  return (
    <div className={cn("gap-xs flex flex-col", className)}>
      <p className="text-muted-foreground">{label}</p>
      <ul className="gap-xs grid grid-cols-2 @lg:grid-cols-1">
        {times.map((t) => (
          <li key={t}>
            {/* biome-ignore lint/a11y/useSemanticElements: time buttons styled as buttons, a native radio input would change the markup and styling */}
            <button
              type="button"
              role="radio"
              aria-checked={value === t}
              onClick={() => onChoose(t)}
              className={cn(
                "tabular px-s flex min-h-11 w-full items-center justify-center corner-s font-medium hairline ring-input sm:min-h-9",
                value === t
                  ? "bg-night text-night-foreground"
                  : "bg-card hover:bg-muted"
              )}
            >
              {fmtTime(t)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BookPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={null}>
      <Inner slug={slug} />
    </Suspense>
  )
}
