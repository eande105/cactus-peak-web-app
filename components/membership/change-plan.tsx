"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
  CheckList,
  cardLabel,
  FlowError,
  Highlight,
  InfoLine,
  PlanColumn,
  RESULT_WIDTH,
  StepFooter,
} from "@/components/flows/parts"
import { Check, Minus } from "@/components/icons"
import { AppPage, Card, Facts, Group, Task } from "@/components/kit/app"
import {
  Banner,
  EmptyState,
  LoadingBlock,
  SelectBox,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { changePlan, downgradeImpact, previewUpgrade } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUBS, PLANS } from "@/lib/data/catalog"
import {
  householdMonthly,
  nextBillingDate,
  paymentDaysLate,
} from "@/lib/engine"
import { DAY, fmtDay, fmtDayShort, fmtDelta, fmtMoney } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { PlanId } from "@/lib/types"
import { openDialog, useOffline } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const BACK = { href: "/membership", label: "Membership" }
const ORDER: PlanId[] = ["trailhead", "ridge", "summit"]
const ROWS: { label: string; v: (p: PlanId) => React.ReactNode }[] = [
  {
    label: "Clubs",
    v: (p) => (p === "trailhead" ? "Home club only" : "All 5 clubs"),
  },
  {
    label: "Group classes",
    v: (p) =>
      p === "trailhead" ? "Every class at your club" : "Every class at all 5",
  },
  {
    label: "Pools",
    v: (p) =>
      p === "trailhead" ? "At your club, if it has one" : "All 3 pools",
  },
  { label: "Booking window", v: (p) => `${PLANS[p].window} days` },
  {
    label: "Courts, 3 days ahead",
    v: (p) => p !== "trailhead",
  },
  { label: "Guest passes", v: (p) => `${PLANS[p].guestPasses} per month` },
  { label: "Recovery suite or lounge", v: (p) => p === "summit" },
  { label: "Towel service", v: (p) => p === "summit" },
  {
    label: "PT intro session",
    v: (p) => (p === "summit" ? "1 per quarter" : false),
  },
  { label: "Kids club (child add-on, 3 clubs)", v: () => true },
]

export default function ChangePlan() {
  const { s, me, hh, now } = useApp()
  const offline = useOffline()
  const [loading, setLoading] = useState(false)
  const [to, setTo] = useState<PlanId | null>(null)
  const [club, setClub] = useState(me.homeClub)
  const [step, setStep] = useState(1)
  const [done, setDone] = useState<{
    plan: PlanId
    scheduled: boolean
    today: number
  } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (me.role !== "primary") return null
  if (loading) return <LoadingBlock text="Loading plans…" rows={4} />
  if (hh.status === "frozen")
    return (
      <AppPage title="Change plan" back={BACK} width="narrow">
        <Card>
          <EmptyState
            className="py-zero"
            title="Resume your membership first."
            body="Plan changes start after you resume."
            action={
              <Button size="sm" render={<Link href="/membership" />}>
                Back to Membership
              </Button>
            }
          />
        </Card>
      </AppPage>
    )
  const cur = hh.plan
  const up = to && PLANS[to].price > PLANS[cur].price
  const pv = to && up ? previewUpgrade(s, hh, to, now) : null
  const imp = to && !up && to !== cur ? downgradeImpact(s, hh, club, now) : null
  const money = householdMonthly(s, hh)
  const nextTotal = to ? householdMonthly(s, hh, to).total : 0
  const locked = !!hh.pendingPlan || hh.status === "payment_failed"
  const picked = !!to && to !== cur
  const confirm = async () => {
    if (!to) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 700))
    const r = changePlan(to, club)
    setBusy(false)
    if (r.ok) {
      setDone({ plan: to, scheduled: r.scheduled, today: r.today })
      announce(
        r.scheduled
          ? `Changing to ${PLANS[to].name} on ${fmtDayShort(imp!.on)}.`
          : `You're on ${PLANS[to].name}.`
      )
      if (!r.scheduled)
        toast({
          title: `You can now book ${PLANS[to].window} days ahead.`,
        })
    } else setError(r.message)
  }
  if (done)
    return (
      <SuccessPanel
        className={RESULT_WIDTH}
        pill={done.scheduled ? "Plan change scheduled" : "Plan changed"}
        headline={
          done.scheduled
            ? `Changing to ${PLANS[done.plan].name} on ${fmtDayShort(imp?.on ?? now)}`
            : `You're on ${PLANS[done.plan].name}`
        }
        summary={[
          {
            label: "Plan",
            value: `${PLANS[done.plan].name} · ${fmtMoney(PLANS[done.plan].price, false)} per month`,
          },
          ...(done.scheduled
            ? [{ label: "Until then", value: PLANS[cur].name }]
            : [
                { label: "Charged today", value: fmtMoney(done.today) },
                { label: "Receipt", value: hh.receiptEmail },
              ]),
          {
            label: "Next charge",
            value: `${fmtDayShort(nextBillingDate(hh, now))} · ${fmtMoney(householdMonthly(s, hh, done.plan).total)}`,
          },
        ]}
        extra={
          done.scheduled ? (
            <InfoLine>
              You can undo the change from Membership before it starts.
            </InfoLine>
          ) : null
        }
        rows={[{ label: "Back to Membership", href: "/membership" }]}
      />
    )
  const lost =
    to === "trailhead"
      ? [
          "Other clubs: not included in Trailhead",
          "Courts: not included in Trailhead",
          "1 guest pass per month ends",
        ]
      : [
          "Recovery suite ends",
          "9-day booking becomes 7 days",
          "Guest passes drop to 1 per month",
        ]
  const gained = to
    ? [
        ...(to === "summit"
          ? ["The recovery suite", "9-day booking", "4 guest passes per month"]
          : ["All 5 clubs", "Courts", "1 guest pass per month"]),
        `Everyone in your household gets ${PLANS[to].name} access`,
      ]
    : []
  return (
    <>
      <Task
        title="Change plan"
        step={step}
        of={2}
        close={BACK}
        footer={
          step === 1 ? (
            <StepFooter back={{ label: "Cancel", href: "/membership" }}>
              <Button
                disabled={!picked || locked}
                onClick={() => {
                  setError("")
                  setStep(2)
                }}
              >
                Continue
              </Button>
            </StepFooter>
          ) : (
            <StepFooter back={{ label: "Back", onClick: () => setStep(1) }}>
              <Button
                loading={busy}
                disabled={
                  !picked || offline || paymentDaysLate(s, me.id, now) >= 0
                }
                onClick={() => void confirm()}
              >
                Confirm change
              </Button>
            </StepFooter>
          )
        }
      >
        {hh.pendingPlan ? (
          <Banner
            tone="info"
            title={`Already changing to ${PLANS[hh.pendingPlan.plan].name} on ${fmtDayShort(hh.pendingPlan.on)}`}
          >
            Undo that change from Membership first.
          </Banner>
        ) : null}
        {hh.status === "payment_failed" ? (
          <Banner
            tone="danger"
            title="Fix your payment first."
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
            <Group label="Choose a plan">
              <div className="@container">
                {/* biome-ignore lint/a11y/useSemanticElements: a group of plan columns with toggle buttons, a fieldset would change the layout */}
                <div
                  role="group"
                  aria-label="Plan"
                  className="gap-xs grid grid-cols-1 @lg:grid-cols-3"
                >
                  {ORDER.map((p) => {
                    const delta = PLANS[p].price - PLANS[cur].price
                    return (
                      <PlanColumn
                        key={p}
                        name={PLANS[p].name}
                        price={fmtMoney(PLANS[p].price, false)}
                        line={PLANS[p].blurb}
                        perks={PLANS[p].perks}
                        current={p === cur}
                        selected={to === p}
                        note={
                          p === cur
                            ? undefined
                            : `${fmtDelta(delta)} a month, starts ${
                                delta > 0
                                  ? "today"
                                  : fmtDayShort(
                                      downgradeImpact(s, hh, club, now).on
                                    )
                              }`
                        }
                        action={
                          p === cur ? undefined : (
                            <Button
                              variant="outline"
                              aria-pressed={to === p}
                              disabled={locked}
                              onClick={() => {
                                setTo(p)
                                setError("")
                              }}
                            >
                              {to === p ? (
                                <>
                                  <Check
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                  />
                                  Selected
                                </>
                              ) : (
                                `Choose ${PLANS[p].name}`
                              )}
                            </Button>
                          )
                        }
                      />
                    )
                  })}
                </div>
              </div>
            </Group>
            <InfoLine>
              <span className="tabular">
                Family add-ons stay $39 per adult and $19 per child. Your total
                today is {fmtMoney(money.total)} per month.
              </span>
            </InfoLine>
            <Group label="Compare plans">
              <div className="-mx-m overflow-x-auto">
                <div className="px-m inline-block min-w-full align-middle">
                  <table className="w-full min-w-[32rem] text-left">
                    <caption className="sr-only">
                      Compare Trailhead, Ridge and Summit
                    </caption>
                    <thead>
                      <tr className="rule-b">
                        <th scope="col" className={cn(TH, "w-2/5")}>
                          Feature
                        </th>
                        {ORDER.map((p) => (
                          <th
                            key={p}
                            scope="col"
                            className={cn(TH, to === p && "text-foreground")}
                          >
                            {PLANS[p].name}
                            {p === cur ? (
                              <span className="sr-only"> (current plan)</span>
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((r) => (
                        <tr key={r.label} className="rule-b">
                          <th
                            scope="row"
                            className="pr-s py-xs text-left font-medium"
                          >
                            {r.label}
                          </th>
                          {ORDER.map((p) => (
                            <td
                              key={p}
                              className="pr-s py-xs text-muted-foreground last:pr-zero"
                            >
                              <CompareCell value={r.v(p)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Group>
          </>
        ) : null}
        {step === 2 && picked && to ? (
          <>
            <Group
              label={`Change to ${PLANS[to].name}`}
              hint={
                <span className="tabular">
                  {up ? "Starts today" : `Starts ${fmtDay(imp!.on)}`}
                </span>
              }
            >
              <Highlight
                label={PLANS[to].name}
                value={fmtMoney(PLANS[to].price, false)}
                unit="per month"
              >
                <InfoLine>
                  <span className="tabular">
                    {up && pv
                      ? `We charge ${fmtMoney(pv.today)} today for ${pv.left} of ${pv.days} days. Your new total of ${fmtMoney(nextTotal)} starts ${fmtDayShort(pv.next)}.`
                      : `You keep ${PLANS[cur].name} until ${fmtDayShort(imp!.on)}. Your new total of ${fmtMoney(nextTotal)} starts then.`}
                  </span>
                </InfoLine>
              </Highlight>
            </Group>
            <Group label={up ? "What you gain" : "What ends"}>
              {up ? (
                <CheckList items={gained} />
              ) : (
                <CheckList items={lost} tone="x" />
              )}
            </Group>
            <Group label="Cost">
              <Facts
                items={[
                  ...(up && pv
                    ? [
                        {
                          label: "Plan difference",
                          value: (
                            <span className="tabular">
                              {fmtMoney(pv.diff, false)} per month
                            </span>
                          ),
                        },
                        {
                          label: "Prorated for",
                          value: (
                            <span className="tabular">
                              {fmtDayShort(now)} – {fmtDayShort(pv.next - DAY)}
                            </span>
                          ),
                          hint: (
                            <span className="tabular">
                              {pv.left} of {pv.days} days
                            </span>
                          ),
                        },
                        {
                          label: "Charged today",
                          value: (
                            <span className="tabular">
                              {fmtMoney(pv.today)}
                            </span>
                          ),
                        },
                      ]
                    : [
                        {
                          label: "Until then",
                          value: `You keep ${PLANS[cur].name}`,
                        },
                      ]),
                  {
                    label: "Monthly charge",
                    value: (
                      <span className="tabular">
                        {PLANS[to].name} {fmtMoney(PLANS[to].price, false)}
                      </span>
                    ),
                    hint:
                      money.adults || money.kids ? (
                        <span className="tabular">
                          {[
                            money.adults
                              ? `${money.adults} adult ${fmtMoney(money.adultTotal, false)}`
                              : "",
                            money.kids
                              ? `${money.kids} ${money.kids === 1 ? "child" : "children"} ${fmtMoney(19, false)} each`
                              : "",
                          ]
                            .filter(Boolean)
                            .map((x) => `+ ${x}`)
                            .join(" ")}
                        </span>
                      ) : undefined,
                  },
                  {
                    label: "New monthly total",
                    value: (
                      <span className="tabular">{fmtMoney(nextTotal)}</span>
                    ),
                    hint: (
                      <span className="tabular">
                        From {fmtDayShort(up ? pv!.next : imp!.on)}
                      </span>
                    ),
                  },
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
                ]}
              />
            </Group>
            {!up && to === "trailhead" ? (
              <>
                <SelectBox
                  label="Home club (required)"
                  value={club}
                  onChange={setClub}
                  options={CLUBS.map((c) => ({ value: c.slug, label: c.name }))}
                  className="max-w-xs"
                />
                {imp && (imp.other || imp.courts) ? (
                  <Banner tone="warning">
                    <span className="tabular">
                      {imp.other} {imp.other === 1 ? "booking" : "bookings"} at
                      other clubs after {fmtDayShort(imp.on)}
                      {imp.courts
                        ? ` and ${imp.courts} court ${imp.courts === 1 ? "reservation" : "reservations"}`
                        : ""}{" "}
                      will be cancelled. No late-cancel strike.
                    </span>
                  </Banner>
                ) : null}
              </>
            ) : null}
            {error ? (
              <FlowError>
                {error}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => openDialog("card")}
                >
                  Update your card
                </button>
              </FlowError>
            ) : null}
          </>
        ) : null}
      </Task>
    </>
  )
}

const TH =
  "pr-s py-xs text-left text-body-xs font-medium whitespace-nowrap text-muted-foreground last:pr-zero"

/** One cell of the plan comparison: included, not included, or the value. */
function CompareCell({ value }: { value: React.ReactNode }) {
  if (value === true)
    return (
      <>
        <Check className="size-4 text-success" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    )
  if (value === false)
    return (
      <>
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    )
  return <span className="tabular">{value}</span>
}
