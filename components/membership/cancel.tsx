"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
  CheckList,
  ChoiceList,
  FlowAside,
  InfoLine,
  RESULT_WIDTH,
  StepFooter,
} from "@/components/flows/parts"
import { Facts, Group, Task } from "@/components/kit/app"
import { Banner, FormField, LoadingBlock } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cancelDate, keepMembership, scheduleCancel } from "@/lib/actions"
import { announce } from "@/lib/announce"
import {
  householdMonthly,
  nextBillingDate,
  paymentDaysLate,
} from "@/lib/engine"
import { fmtDay, fmtDayShort, fmtMoney } from "@/lib/time"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const BACK = { href: "/membership", label: "Membership" }
const REASONS = [
  { value: "price", label: "Too expensive" },
  { value: "moving", label: "Moving" },
  { value: "injury", label: "Injury or health" },
  { value: "unused", label: "I'm not using it" },
  { value: "schedule", label: "Schedule doesn't fit" },
  { value: "club", label: "Another club" },
  { value: "other", label: "Other" },
]
type Offer = { title: string; line: string; href: string; action: string }
const FREEZE: Offer = {
  title: "Freeze instead",
  line: "$10 per month, 1 to 3 months. Your plan and streak stay.",
  href: "/membership/freeze",
  action: "Freeze instead",
}

export default function CancelPage() {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [reason, setReason] = useState("")
  const [other, setOther] = useState("")
  const [done, setDone] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250)
    return () => clearTimeout(t)
  }, [])
  if (me.role !== "primary") return null
  if (loading) return <LoadingBlock text="Loading…" rows={3} />
  const on = cancelDate(hh, now)
  const total = householdMonthly(s, hh).total
  const late = paymentDaysLate(s, me.id, now) >= 0
  const saving = total - householdMonthly(s, hh, "trailhead").total
  const next = nextBillingDate(hh, now)
  const trailhead: Offer = {
    title: "Switch to Trailhead",
    line:
      hh.plan !== "trailhead" && saving > 0
        ? `$54 per month, one home club. ${fmtMoney(saving, false)} a month less than your ${fmtMoney(total, false)} today.`
        : "$54 per month, one home club.",
    href: "/membership/change-plan",
    action: "Change plan",
  }
  const offers: Offer[] =
    reason === "price"
      ? [...(hh.plan !== "trailhead" ? [trailhead] : []), FREEZE]
      : reason === "injury" || reason === "unused"
        ? [FREEZE]
        : reason === "moving"
          ? [
              {
                title: "Moving near another club?",
                line: "Ridge covers all 5 clubs.",
                href: "/membership/change-plan",
                action: "Change plan",
              },
            ]
          : reason === "schedule"
            ? [
                {
                  title: "Try a new time",
                  line: "Climb Cycle, Desert Flow Yoga and Switchback HIIT have spots this week.",
                  href: "/schedule",
                  action: "See schedule",
                },
              ]
            : []
  const hasOffer = offers.length > 0
  const doCancel = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    const r = scheduleCancel(reason)
    setBusy(false)
    if (r.ok) {
      setDone(r.on)
      announce(`Your membership ends ${fmtDay(r.on)}.`)
    }
  }
  if (done || hh.status === "cancel_scheduled")
    return (
      <SuccessPanel
        className={RESULT_WIDTH}
        headline={`Your membership ends ${fmtDay(done ?? hh.cancelOn!)}`}
        pill="Cancellation scheduled"
        summary={[
          { label: "Access", value: "Full access until then" },
          { label: "Receipt", value: "Sent by email" },
          {
            label: "Sign-in after",
            value: "90 days, for invoices and to reactivate",
          },
        ]}
        primary={
          <Button
            onClick={() => {
              keepMembership()
              toast({
                title: "Welcome back",
                description: "Your membership continues.",
              })
              router.push("/membership")
            }}
          >
            Keep my membership
          </Button>
        }
        rows={[
          {
            label: "Download visit history (CSV)",
            onClick: () =>
              toast({
                title: "Visit history downloaded",
                description: "visits.csv",
              }),
          },
          { label: "Back to Membership", href: "/membership" },
        ]}
      />
    )
  const terms = [
    {
      label: "Access",
      text: `You keep full access until ${fmtDayShort(on)}.`,
    },
    { label: "Family", text: "Family members end on the same date." },
    {
      label: "Training",
      text: "Unused sessions are refunded at the price you paid per session.",
    },
    {
      label: "Guest passes and bookings",
      text: `Cancelled after ${fmtDayShort(on)} with no late-cancel strike.`,
    },
    { label: "Visit history", text: "Available to download." },
  ]
  return (
    <Task
      title="Cancel membership"
      step={step}
      of={3}
      close={BACK}
      aside={
        <FlowAside title="If you cancel">
          <Facts
            items={[
              {
                label: "Ends",
                value: <span className="tabular">{fmtDay(on)}</span>,
              },
              {
                label: "Last charge",
                value: (
                  <span className="tabular">
                    {fmtDayShort(next)} · {fmtMoney(total)}
                  </span>
                ),
              },
              { label: "Annual fee in March", value: "None" },
            ]}
          />
        </FlowAside>
      }
      footer={
        step === 1 ? (
          <StepFooter
            back={{ label: "Keep my membership", href: "/membership" }}
          >
            <Button
              variant="ghost"
              onClick={() => {
                setReason("")
                setStep(3)
              }}
            >
              Skip
            </Button>
            <Button onClick={() => setStep(hasOffer ? 2 : 3)}>Continue</Button>
          </StepFooter>
        ) : step === 2 ? (
          <StepFooter back={{ label: "Back", onClick: () => setStep(1) }}>
            <Button variant="outline" onClick={() => setStep(3)}>
              Continue to cancel
            </Button>
            <Button render={<Link href="/membership" />}>
              Keep my membership
            </Button>
          </StepFooter>
        ) : (
          <StepFooter
            back={{
              label: "Back",
              onClick: () => setStep(hasOffer ? 2 : 1),
            }}
          >
            <Button variant="outline" render={<Link href="/membership" />}>
              Keep my membership
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => void doCancel()}
            >
              Cancel membership
            </Button>
          </StepFooter>
        )
      }
    >
      {step === 1 ? (
        <>
          <Group label="Why are you leaving?" hint="Optional">
            <ChoiceList
              label="Why are you leaving?"
              value={reason}
              onChange={setReason}
              options={REASONS}
            />
            {reason === "other" ? (
              <FormField label="Tell us more (optional)">
                {(p) => (
                  <Input
                    {...p}
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                  />
                )}
              </FormField>
            ) : null}
          </Group>
          <InfoLine>
            <span className="tabular">
              If you cancel, you keep full access until {fmtDay(on)}.
            </span>
          </InfoLine>
        </>
      ) : null}
      {step === 2 ? (
        <Group label="Other options">
          <ul className="gap-xs flex flex-col">
            {offers.map((o) => (
              <OfferRow key={o.title} offer={o} />
            ))}
          </ul>
        </Group>
      ) : null}
      {step === 3 ? (
        <>
          <Group label={`Your membership ends ${fmtDay(on)}`}>
            <CheckList items={terms} />
          </Group>
          {late ? (
            <Banner tone="warning">
              <span className="tabular">
                You owe {fmtMoney(total)} from{" "}
                {fmtDayShort(hh.paymentFailedAt ?? now)}. Pay it to close your
                account.
              </span>
            </Banner>
          ) : null}
        </>
      ) : null}
    </Task>
  )
}

/** One other option: what it is, one line, and the link to it. It has the frame of a choice row. */
function OfferRow({ offer, className }: { offer: Offer; className?: string }) {
  return (
    <li
      className={cn(
        "gap-s p-s flex flex-wrap items-center justify-between corner-m raised",
        className
      )}
    >
      <span className="min-w-0 flex-1 basis-56">
        <span className="block font-medium">{offer.title}</span>
        <span className="tabular block text-pretty text-muted-foreground">
          {offer.line}
        </span>
      </span>
      <Button size="sm" variant="outline" render={<Link href={offer.href} />}>
        {offer.action}
      </Button>
    </li>
  )
}
