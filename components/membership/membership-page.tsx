"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { capital, IconPill, Section } from "@/components/account/parts"
import { AccountScreen, SummaryCard } from "@/components/account/screen"
import { useApp } from "@/components/app/use-app"
import {
  CalendarDays,
  Check,
  ChevronRight,
  IdCard,
  Pause,
} from "@/components/icons"
import { Card, Facts } from "@/components/kit/app"
import { Confirm } from "@/components/kit/overlays"
import { Banner, LoadingBlock, StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import {
  cancelFreeze,
  keepMembership,
  resumeCost,
  resumeEarly,
  undoPlanChange,
} from "@/lib/actions"
import { CLUB_BY_SLUG, PLANS } from "@/lib/data/catalog"
import {
  householdMonthly,
  nextBillingDate,
  paymentDaysLate,
} from "@/lib/engine"
import {
  DAY,
  fmtDateFull,
  fmtDay,
  fmtDayLong,
  fmtDayShort,
  fmtMoney,
} from "@/lib/time"
import { toast } from "@/lib/toast"

/**
 * Membership: the two plan actions in the page bar, the plan and the next bill as two summary cards, what the plan
 * includes, the details, the fees,
 * one offer for the next plan, and the way out as a quiet row at the end. A scheduled freeze, a freeze, an end date
 * and a plan change each show as a banner with the action that reverses it.
 */
export default function MembershipPage() {
  const { s, me, hh, now } = useApp()
  const [loading, setLoading] = useState(false)
  const [resume, setResume] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (loading) return <LoadingBlock text="Loading your membership…" rows={4} />
  const plan = PLANS[hh.plan]
  const money = householdMonthly(s, hh)
  const next = nextBillingDate(hh, now)
  const primary = me.role === "primary"
  const late = paymentDaysLate(s, me.id, now)
  const pill =
    hh.status === "frozen" ? (
      <IconPill tone="info" icon={Pause}>
        Frozen
      </IconPill>
    ) : hh.status === "freeze_scheduled" ? (
      <IconPill tone="info" icon={Pause}>
        Freeze scheduled
      </IconPill>
    ) : late >= 0 ? (
      <StatusPill tone="danger">Payment failed</StatusPill>
    ) : hh.status === "cancel_scheduled" ? (
      <StatusPill tone="warning">Ends {fmtDayShort(hh.cancelOn!)}</StatusPill>
    ) : hh.pendingPlan ? (
      <StatusPill tone="info">
        Changing on {fmtDayShort(hh.pendingPlan.on)}
      </StatusPill>
    ) : null
  const rc = resumeCost(s, hh, now)
  // A banner with a primary action (resume, keep) takes the screen's one primary button.
  const bannerLeads =
    primary &&
    ((hh.status === "frozen" && !!hh.freeze) ||
      (hh.status === "cancel_scheduled" && !!hh.cancelOn))
  return (
    <AccountScreen
      width="wide"
      meta={
        primary && !pill ? undefined : (
          <span className="gap-xs flex flex-wrap items-center">
            {primary ? null : (
              <span className="text-body-m text-muted-foreground sm:text-body-s">
                Managed by {s.members[hh.primaryId].firstName}
              </span>
            )}
            {pill}
          </span>
        )
      }
      actions={
        primary ? (
          <>
            <Button
              variant="outline"
              render={<Link href="/membership/freeze" />}
            >
              Freeze
            </Button>
            <Button
              variant={bannerLeads ? "outline" : "primary"}
              render={<Link href="/membership/change-plan" />}
            >
              Change plan
            </Button>
          </>
        ) : undefined
      }
    >
      {hh.status === "freeze_scheduled" && hh.freeze && primary ? (
        <Banner
          tone="info"
          icon={Pause}
          title={`Freeze scheduled: ${fmtDayShort(hh.freeze.start)} – ${fmtDayShort(hh.freeze.end)}`}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                cancelFreeze()
                toast({
                  title: "Freeze cancelled",
                  description: "You're active as usual.",
                })
              }}
            >
              Cancel freeze
            </Button>
          }
        >
          Resumes {fmtDayShort(hh.freeze.resume)}.
        </Banner>
      ) : null}
      {hh.status === "frozen" && hh.freeze && primary ? (
        <Banner
          tone="info"
          icon={Pause}
          title={`Frozen until ${fmtDay(hh.freeze.resume - DAY)}`}
          actions={
            <Button size="sm" onClick={() => setResume(true)}>
              Resume early
            </Button>
          }
        >
          Your pass and bookings pause until {fmtDay(hh.freeze.resume)}.
        </Banner>
      ) : null}
      {hh.status === "cancel_scheduled" && hh.cancelOn && primary ? (
        <Banner
          tone="warning"
          title={`Membership ends ${fmtDay(hh.cancelOn)}`}
          actions={
            <Button
              size="sm"
              onClick={() => {
                keepMembership()
                toast({
                  title: "Welcome back",
                  description: "Your membership continues.",
                })
              }}
            >
              Keep my membership
            </Button>
          }
        >
          You keep full access until then.
        </Banner>
      ) : null}
      {hh.pendingPlan && primary ? (
        <Banner
          tone="info"
          title={`Changing to ${PLANS[hh.pendingPlan.plan].name} on ${fmtDayShort(hh.pendingPlan.on)}`}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                undoPlanChange()
                toast({ title: "Change undone" })
              }}
            >
              Undo change
            </Button>
          }
        />
      ) : null}

      <div id="yp" className="gap-s grid sm:grid-cols-2">
        <SummaryCard
          icon={IdCard}
          label="Plan"
          value={plan.name}
          meta={`${fmtMoney(plan.price, false)} a month`}
        />
        <SummaryCard
          icon={CalendarDays}
          label={primary ? "Next bill" : "Renews"}
          value={primary ? fmtMoney(money.total) : fmtDayLong(next)}
          meta={primary ? fmtDayLong(next) : undefined}
        />
      </div>
      {/* Change plan is the page header's main button, so it is not repeated as a row. */}

      <Section id="inc" title="Included">
        <div className="p-m corner-m raised">
          <ul className="gap-x-l gap-y-xs grid text-body-m sm:grid-cols-2 sm:text-body-s">
            {plan.perks.map((p) => (
              <li key={p} className="gap-xs flex items-start">
                <Check
                  className="size-5 h-lh shrink-0 text-success"
                  aria-hidden="true"
                />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="det" title="Details">
        <div className="px-m corner-m raised">
          <Facts
            items={[
              ...(primary && money.adults + money.kids > 0
                ? [
                    {
                      label: "Family add-ons",
                      value: `${fmtMoney(money.adultTotal + money.kidTotal, false)} a month`,
                    },
                  ]
                : []),
              { label: "Home club", value: CLUB_BY_SLUG[me.homeClub].name },
              { label: "Member since", value: fmtDateFull(hh.memberSince) },
            ]}
          />
        </div>
      </Section>

      {primary ? (
        <Section id="fees" title="Fees">
          <div className="px-m corner-m raised">
            <Facts
              items={[
                {
                  label: "Annual facility fee",
                  value: "$49, charged in March",
                },
                { label: "Enrollment", value: "$0 during Fall climb" },
                { label: "Freeze", value: "$10 a month, 1–3 months" },
                { label: "Cancel", value: "30 days' notice" },
              ]}
            />
          </div>
        </Section>
      ) : null}

      {hh.plan !== "summit" && primary ? (
        <Card tone="night" as="aside">
          <div className="gap-m flex flex-wrap items-center justify-between">
            <p className="max-w-[44ch] text-body-m font-heavy text-pretty sm:text-body-s">
              Summit adds the recovery suite, 9-day booking and 4 guest passes.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="!text-night-foreground !ring-night-foreground/40 hover:!bg-night-foreground/10"
              render={<Link href="/membership/change-plan" />}
            >
              Compare plans
            </Button>
          </div>
        </Card>
      ) : null}

      {primary && hh.status !== "cancel_scheduled" ? (
        <Link
          id="end"
          href="/membership/cancel"
          className="gap-s py-s flex min-h-11 items-center justify-between text-body-m font-medium text-muted-foreground rule-t hover:text-foreground sm:text-body-s"
        >
          Cancel membership
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}

      <Confirm
        open={resume}
        onOpenChange={setResume}
        title="Resume today?"
        description="Your pass works right away."
      >
        <Facts
          items={[
            {
              label: "Charge today",
              value: <span className="tabular">{fmtMoney(rc.amount)}</span>,
              hint: `${rc.left} of ${rc.days} days left in this cycle`,
            },
            {
              label: "Card",
              value: `${capital(hh.card.brand)} ending ${hh.card.last4}`,
            },
          ]}
        />
        <div className="gap-xs flex flex-col">
          <Button
            className="w-full"
            onClick={() => {
              const r = resumeEarly()
              setResume(false)
              if (r.ok)
                toast({
                  title: "Welcome back",
                  description: "Your pass works again.",
                })
            }}
          >
            Resume membership
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setResume(false)}
          >
            Not now
          </Button>
        </div>
      </Confirm>
    </AccountScreen>
  )
}
