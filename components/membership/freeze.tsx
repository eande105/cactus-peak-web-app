"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
  CheckList,
  ChoiceList,
  cardLabel,
  FlowAside,
  FlowError,
  Highlight,
  InfoLine,
  RESULT_WIDTH,
  StepFooter,
} from "@/components/flows/parts"
import {
  AppPage,
  Card,
  Facts,
  Group,
  Row,
  Rows,
  Task,
} from "@/components/kit/app"
import {
  Banner,
  EmptyState,
  LoadingBlock,
  SelectBox,
  StatusPill,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { cancelFreeze, scheduleFreeze } from "@/lib/actions"
import { announce } from "@/lib/announce"
import {
  billingDatesFrom,
  householdMembers,
  householdMonthly,
  paymentDaysLate,
} from "@/lib/engine"
import {
  DAY,
  fmtDay,
  fmtDayShort,
  fmtDowTime,
  fmtMoney,
  parts,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import { openDialog } from "@/lib/ui-state"

const BACK = { href: "/membership", label: "Membership" }
const LENGTHS = [1, 2, 3] as const
const monthsText = (n: number) => `${n} ${n === 1 ? "month" : "months"}`

export default function FreezePage() {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState<1 | 2 | 3>(1)
  const dates = billingDatesFrom(hh, now + 30 * DAY, 4)
  const [start, setStart] = useState(String(dates[0]))
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (me.role !== "primary") return null
  if (loading) return <LoadingBlock text="Loading…" rows={3} />
  const st = Number(start)
  const p = parts(st)
  const resume = Date.UTC(p.y, p.m + months, p.d, 7, 0)
  const end = resume - DAY
  const total = householdMonthly(s, hh).total
  const ids = householdMembers(s, hh.id).map((m) => m.id)
  const affected = s.bookings.filter(
    (b) =>
      ids.includes(b.memberId) &&
      ["booked", "waitlisted"].includes(b.status) &&
      b.start >= st &&
      b.start < resume
  )
  const undo = () => {
    cancelFreeze()
    toast({
      title: "Freeze cancelled",
      description: "You're active as usual.",
    })
  }
  if (hh.status === "freeze_scheduled" && hh.freeze && !done)
    return (
      <AppPage
        title="Freeze membership"
        back={BACK}
        width="narrow"
        meta={<StatusPill tone="info">Freeze scheduled</StatusPill>}
      >
        <Card
          title="Scheduled freeze"
          footer={
            <Button size="sm" variant="outline" onClick={undo}>
              Cancel freeze
            </Button>
          }
        >
          <Facts
            items={[
              {
                label: "Frozen",
                value: (
                  <span className="tabular">
                    {fmtDayShort(hh.freeze.start)} –{" "}
                    {fmtDayShort(hh.freeze.end)}
                  </span>
                ),
              },
              {
                label: "Resumes",
                value: (
                  <span className="tabular">
                    {fmtDayShort(hh.freeze.resume)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </AppPage>
    )
  if (hh.status === "frozen" && !done)
    return (
      <AppPage title="Freeze membership" back={BACK} width="narrow">
        <Card>
          <EmptyState
            className="py-zero"
            object="key"
            title="You're frozen right now."
            body="Resume from Membership to book again."
            action={
              <Button size="sm" render={<Link href="/membership" />}>
                Back to Membership
              </Button>
            }
          />
        </Card>
      </AppPage>
    )
  const blocked = paymentDaysLate(s, me.id, now) >= 0
  const confirm = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    const r = scheduleFreeze(months, st)
    setBusy(false)
    if (r.ok) {
      setDone(true)
      announce(`Freeze set: ${fmtDayShort(st)} to ${fmtDayShort(end)}.`)
    } else setError(r.message)
  }
  if (done)
    return (
      <SuccessPanel
        className={RESULT_WIDTH}
        headline={`Freeze set: ${fmtDayShort(st)} – ${fmtDayShort(end)}`}
        pill="Freeze scheduled"
        summary={[
          {
            label: "Length",
            value: `${monthsText(months)} · ${fmtMoney(10 * months)}`,
          },
          { label: "Starts", value: fmtDay(st) },
          { label: "Resumes", value: fmtDay(resume) },
          {
            label: "Normal price after",
            value: `${fmtMoney(total)} per month`,
          },
          {
            label: "Cancel the freeze",
            value: `Any time before ${fmtDay(st)}`,
          },
        ]}
        rows={[
          { label: "Back to Membership", href: "/membership" },
          {
            label: "Cancel freeze",
            onClick: () => {
              undo()
              router.push("/membership")
            },
          },
        ]}
      />
    )
  const changes = [
    { label: "Pass", text: "Pauses for everyone on your plan." },
    {
      label: "Bookings",
      text: affected.length
        ? "Bookings inside the freeze are cancelled with no late-cancel strike."
        : "You have no bookings in this time.",
    },
    {
      label: "Kids club, courts, lanes",
      text: "Reservations in this time are cancelled.",
    },
    {
      label: "Guest passes",
      text: "Guest passes pause. Passes you sent for these dates are cancelled and returned.",
    },
    {
      label: "Training",
      text: "Sessions in this time are cancelled. Your credits come back and your pack dates move out by the length of the freeze.",
    },
    {
      label: "Billing",
      text: `You pay $10.00 on ${fmtDayShort(st)}. Your normal price of ${fmtMoney(total)} returns on ${fmtDayShort(resume)}.`,
    },
  ]
  // The date a freeze of `n` months ends, for the start the member picked.
  const resumeFor = (n: number) => Date.UTC(p.y, p.m + n, p.d, 7, 0)
  return (
    <Task
      title="Freeze membership"
      step={step}
      of={3}
      close={BACK}
      aside={
        <FlowAside title="Freeze summary">
          <Facts
            items={[
              {
                label: "Length",
                value: <span className="tabular">{monthsText(months)}</span>,
              },
              {
                label: "Frozen",
                value: (
                  <span className="tabular">
                    {fmtDayShort(st)} – {fmtDayShort(end)}
                  </span>
                ),
              },
              {
                label: "Resumes",
                value: <span className="tabular">{fmtDayShort(resume)}</span>,
              },
              {
                label: "Freeze price",
                value: <span className="tabular">{fmtMoney(10 * months)}</span>,
                hint: "$10 per month",
              },
              {
                label: "Price after",
                value: (
                  <span className="tabular">{fmtMoney(total)} per month</span>
                ),
              },
            ]}
          />
        </FlowAside>
      }
      footer={
        <StepFooter
          back={
            step > 1
              ? { label: "Back", onClick: () => setStep(step - 1) }
              : { label: "Cancel", href: "/membership" }
          }
        >
          {step < 3 ? (
            <Button disabled={blocked} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              loading={busy}
              disabled={blocked}
              onClick={() => void confirm()}
            >
              Freeze membership
            </Button>
          )}
        </StepFooter>
      }
    >
      {blocked ? (
        <Banner
          tone="warning"
          role="status"
          title="Card declined. Update your card to freeze."
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDialog("card")}
            >
              Update card
            </Button>
          }
        />
      ) : null}
      {step === 1 ? (
        <>
          <Group label="How long do you want to freeze?">
            <ChoiceList
              label="Length"
              value={String(months)}
              onChange={(v) => setMonths(Number(v) as 1 | 2 | 3)}
              options={LENGTHS.map((n) => ({
                value: String(n),
                label: monthsText(n),
                line: (
                  <span className="tabular">
                    Resumes {fmtDayShort(resumeFor(n))}
                  </span>
                ),
                end: fmtMoney(10 * n, false),
              }))}
            />
          </Group>
          <SelectBox
            label="Start on"
            value={start}
            onChange={setStart}
            options={dates.map((d) => ({
              value: String(d),
              label: fmtDay(d),
            }))}
            className="max-w-xs"
          />
          <InfoLine>
            A freeze needs 30 days&apos; notice. To freeze sooner,{" "}
            <Link href="/inbox" className="text-link underline">
              message the front desk
            </Link>
            .
          </InfoLine>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Group
            label="What changes"
            hint={
              <span className="tabular">
                {fmtDayShort(st)} – {fmtDayShort(end)}
              </span>
            }
          >
            <CheckList items={changes} />
          </Group>
          {affected.length ? (
            <Group label="Bookings in this time">
              <Rows label="Bookings in this time" className="rule-t">
                {affected.slice(0, 6).map((b) => (
                  <Row
                    key={b.id}
                    className="px-zero!"
                    title={b.title}
                    line={
                      <span className="tabular">
                        {fmtDowTime(b.start)} ·{" "}
                        {s.members[b.memberId].firstName}
                      </span>
                    }
                    end={
                      <StatusPill tone="warning">Will be cancelled</StatusPill>
                    }
                  />
                ))}
              </Rows>
              {affected.length > 6 ? (
                <p className="tabular text-muted-foreground">
                  And {affected.length - 6} more.
                </p>
              ) : null}
            </Group>
          ) : null}
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Group label="Review and pay">
            <Highlight
              label={`Freeze for ${monthsText(months)}`}
              value={fmtMoney(10, false)}
              unit="per month"
            >
              <InfoLine>
                <span className="tabular">
                  Your pass pauses on {fmtDay(st)}. Your normal price of{" "}
                  {fmtMoney(total)} returns on {fmtDay(resume)}.
                </span>
              </InfoLine>
            </Highlight>
          </Group>
          <Facts
            items={[
              {
                label: "First charge",
                value: (
                  <span className="tabular">
                    {fmtMoney(10)} on {fmtDayShort(st)}
                  </span>
                ),
              },
              {
                label: "Card",
                value: <span className="tabular">{cardLabel(hh.card)}</span>,
              },
              {
                label: "Cancel the freeze",
                value: (
                  <span className="tabular">
                    Any time before {fmtDayShort(st)}
                  </span>
                ),
              },
            ]}
          />
          {error ? <FlowError>{error}</FlowError> : null}
        </>
      ) : null}
    </Task>
  )
}
