"use client"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { SuccessPanel } from "@/components/booking/success-panel"
import {
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
import {
  Banner,
  CheckRow,
  FormField,
  LoadingBlock,
  SwitchRow,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { addFamilyMember, ageFrom } from "@/lib/actions"
import {
  daysInCycle,
  householdMembers,
  householdMonthly,
  nextBillingDate,
} from "@/lib/engine"
import { fmtDayShort, fmtMoney } from "@/lib/time"
import type { Member } from "@/lib/types"

const BACK = { href: "/family", label: "Family" }
const ROLE = { adult: "Adult", teen: "Teen", child: "Child" } as const

function Inner() {
  const { s, me, hh, now } = useApp()
  const sp = useSearchParams()
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<"adult" | "child" | "visit">(
    sp.get("who") === "adult" ? "adult" : "child"
  )
  const [f, setF] = useState({
    first: "",
    last: me.lastName,
    dob: "",
    email: "",
    notes: "",
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const [perm, setPerm] = useState({
    classes: true,
    courts: false,
    lanes: false,
    coachMessages: true,
  })
  const [pickup, setPickup] = useState<string[]>([hh.primaryId])
  const [sign, setSign] = useState("")
  const [created, setCreated] = useState<{ m: Member; today: number } | null>(
    null
  )
  const [busy, setBusy] = useState(false)
  const [serverErr, setServerErr] = useState("")
  if (me.role !== "primary") return null
  const age = /^\d{4}-\d{2}-\d{2}$/.test(f.dob) ? ageFrom(f.dob, now) : null
  const role =
    kind === "adult" ? "adult" : age !== null && age >= 13 ? "teen" : "child"
  const price = role === "adult" ? 39 : 19
  const { days, left } = daysInCycle(hh, now)
  const today = Math.round(((price * left) / days) * 100) / 100
  const newTotal = householdMonthly(s, hh).total + price
  const members = householdMembers(s, hh.id).filter(
    (m) => m.role === "primary" || m.role === "adult"
  )
  const validateDetails = () => {
    const e: Record<string, string> = {}
    if (!f.first.trim()) e.first = "Enter your first name."
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob))
      e.dob = "Enter a date like 2015-03-14."
    else if (kind === "adult" && (age ?? 0) < 18)
      e.dob = `${f.first || "They"} is ${age}, so they join as a child. Adults are 18 and over.`
    else if (kind === "child" && (age ?? 99) >= 18)
      e.dob = "Adults are 18 and over. Pick Another adult."
    if (
      (kind === "adult" || (age ?? 0) >= 13) &&
      !/^\S+@\S+\.\S+$/.test(f.email)
    )
      e.email = "Check the email address. It should look like you@example.com."
    setErr(e)
    return !Object.keys(e).length
  }
  const submit = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 700))
    const r = addFamilyMember({
      first: f.first.trim(),
      last: f.last.trim(),
      dob: f.dob,
      email: f.email,
      notes: f.notes,
      kind: kind === "adult" ? "adult" : "child",
      permissions: perm,
      pickup,
    })
    setBusy(false)
    if (r.ok) setCreated({ m: r.member, today: r.today })
    else setServerErr(r.message)
  }
  if (created)
    return (
      <SuccessPanel
        className={RESULT_WIDTH}
        headline={
          created.m.role === "adult"
            ? `Invitation sent to ${created.m.firstName}`
            : `${created.m.firstName} is on your plan`
        }
        summary={[
          {
            label: "Role",
            value:
              ROLE[created.m.role === "primary" ? "adult" : created.m.role],
          },
          { label: "Adds", value: `${fmtMoney(price, false)} per month` },
          { label: "Charged today", value: fmtMoney(created.today) },
        ]}
        pill={
          created.m.role === "adult" ? "Invitation sent" : "Added to your plan"
        }
        primary={<Button render={<Link href="/family" />}>Go to family</Button>}
        rows={
          created.m.role === "adult"
            ? []
            : [
                {
                  label: `Set up ${created.m.firstName}'s pass`,
                  href: `/family/${created.m.id}`,
                },
              ]
        }
      />
    )
  const visit = kind === "visit"
  return (
    <Task
      title="Add to your plan"
      step={step}
      of={3}
      close={BACK}
      aside={
        <FlowAside title="Your plan after this">
          {visit ? (
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              A guest pass does not change your plan.
            </p>
          ) : (
            <Facts
              items={[
                ...(f.first.trim()
                  ? [
                      {
                        label: ROLE[role],
                        value: `${f.first.trim()} ${f.last.trim()}`,
                      },
                    ]
                  : []),
                {
                  label: "Adds",
                  value: (
                    <span className="tabular">
                      {fmtMoney(price, false)} per month
                    </span>
                  ),
                },
                {
                  label: "Charged today",
                  value: <span className="tabular">{fmtMoney(today)}</span>,
                  hint: (
                    <span className="tabular">
                      {left} of {days} days
                    </span>
                  ),
                },
                {
                  label: "New monthly total",
                  value: (
                    <span className="tabular">{fmtMoney(newTotal, false)}</span>
                  ),
                  hint: (
                    <span className="tabular">
                      From {fmtDayShort(nextBillingDate(hh, now))}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </FlowAside>
      }
      footer={
        <StepFooter
          back={
            step > 1
              ? { label: "Back", onClick: () => setStep(step - 1) }
              : { label: "Cancel", href: "/family" }
          }
        >
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 2 && !validateDetails()) return
                setStep(step + 1)
              }}
              disabled={step === 1 && visit}
            >
              Continue
            </Button>
          ) : (
            <Button
              loading={busy}
              disabled={role !== "adult" && sign.trim().length < 3}
              onClick={() => void submit()}
            >
              Add member
            </Button>
          )}
        </StepFooter>
      }
    >
      {step === 1 ? (
        <>
          <Group label="Who are you adding?">
            <ChoiceList
              label="Who are you adding?"
              value={kind}
              onChange={setKind}
              options={[
                {
                  value: "adult",
                  label: "Another adult (18+)",
                  line: "Gets their own login and pass.",
                  end: "+$39 per month",
                },
                {
                  value: "child",
                  label: "A child or teen (6 months–17)",
                  line: "Kids club is included. Teens get a login.",
                  end: "+$19 per month",
                },
                {
                  value: "visit",
                  label: "Someone who is visiting",
                  line: "One visit, one club.",
                  end: "Guest pass",
                },
              ]}
            />
          </Group>
          {visit ? (
            <Banner
              tone="info"
              title="A visitor needs a guest pass, not a place on your plan."
              actions={
                <Button size="sm" render={<Link href="/guest-passes" />}>
                  Send a guest pass
                </Button>
              }
            />
          ) : null}
        </>
      ) : null}
      {step === 2 ? (
        <form
          className="gap-m flex flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (validateDetails()) setStep(3)
          }}
          noValidate
        >
          <Group label="Details">
            <div className="gap-m grid sm:grid-cols-2">
              <FormField label="First name" error={err.first}>
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="off"
                    value={f.first}
                    onChange={(e) => setF({ ...f, first: e.target.value })}
                  />
                )}
              </FormField>
              <FormField label="Last name">
                {(p) => (
                  <Input
                    {...p}
                    value={f.last}
                    onChange={(e) => setF({ ...f, last: e.target.value })}
                  />
                )}
              </FormField>
            </div>
            <FormField
              label="Date of birth"
              error={err.dob}
              help={
                kind === "adult" ? "Format: 1988-03-14" : "Format: 2015-03-14"
              }
            >
              {(p) => (
                <Input
                  {...p}
                  autoComplete="off"
                  placeholder="YYYY-MM-DD"
                  value={f.dob}
                  onChange={(e) => setF({ ...f, dob: e.target.value })}
                />
              )}
            </FormField>
            {age !== null && kind === "child" && age < 18 ? (
              <InfoLine>
                {f.first || "They"} is {age}, so they join as a{" "}
                {age >= 13 ? "teen" : "child"}.
              </InfoLine>
            ) : null}
            {kind === "adult" || (age ?? 0) >= 13 ? (
              <FormField label="Email" error={err.email}>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    autoComplete="off"
                    placeholder="you@example.com"
                    value={f.email}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                  />
                )}
              </FormField>
            ) : null}
            {kind === "child" ? (
              <FormField
                label="Allergies and medical notes"
                help="We share these with kids club staff."
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={f.notes}
                    onChange={(e) => setF({ ...f, notes: e.target.value })}
                  />
                )}
              </FormField>
            ) : null}
          </Group>
          {role === "teen" ? (
            <Group
              label={`What can ${f.first || "they"} do?`}
              hint={`Emergency contact: ${me.firstName} ${me.lastName}. You can change it on the profile.`}
              className="pt-m rule-t"
            >
              <SwitchRow
                checked={perm.classes}
                onChange={(c) => setPerm({ ...perm, classes: c })}
              >
                Classes (Teen OK)
              </SwitchRow>
              <SwitchRow
                checked={perm.courts}
                onChange={(c) => setPerm({ ...perm, courts: c })}
              >
                Court reservations
              </SwitchRow>
              <SwitchRow
                checked={perm.lanes}
                onChange={(c) => setPerm({ ...perm, lanes: c })}
                disabled={(age ?? 0) < 14}
              >
                Lap lanes (14 and up)
              </SwitchRow>
              <SwitchRow
                checked={perm.coachMessages}
                onChange={(c) => setPerm({ ...perm, coachMessages: c })}
              >
                Teen can message coaches
              </SwitchRow>
            </Group>
          ) : role === "child" ? (
            <Group
              label="Authorised pick-up adults"
              hint={`Emergency contact: ${me.firstName} ${me.lastName}. You can change it on the profile.`}
              className="pt-m rule-t"
            >
              <fieldset className="gap-s flex flex-col">
                <legend className="sr-only">Authorised pick-up adults</legend>
                {members.map((m) => (
                  <CheckRow
                    key={m.id}
                    checked={pickup.includes(m.id)}
                    onChange={(on) =>
                      setPickup((p) =>
                        on ? [...p, m.id] : p.filter((x) => x !== m.id)
                      )
                    }
                  >
                    {m.firstName} {m.lastName}
                  </CheckRow>
                ))}
              </fieldset>
            </Group>
          ) : (
            <InfoLine className="pt-m rule-t">
              We email {f.email || "them"} an invite to set up a login and a
              pass. The invite lasts 14 days.
            </InfoLine>
          )}
          <button type="submit" className="sr-only">
            Continue
          </button>
        </form>
      ) : null}
      {step === 3 ? (
        <>
          <Group label="Review">
            <Highlight
              label={`Add ${f.first.trim()} ${f.last.trim()}`}
              value={`+${fmtMoney(price, false)}`}
              unit="per month"
            >
              <InfoLine>
                <span className="tabular">
                  We charge {fmtMoney(today)} to {cardLabel(hh.card)} today.
                  Your total becomes {fmtMoney(newTotal, false)} per month from{" "}
                  {fmtDayShort(nextBillingDate(hh, now))}.
                </span>
              </InfoLine>
            </Highlight>
          </Group>
          <Facts
            items={[
              { label: "Name", value: `${f.first.trim()} ${f.last.trim()}` },
              { label: "Joins as", value: ROLE[role] },
              {
                label: "Date of birth",
                value: <span className="tabular">{f.dob}</span>,
              },
              ...(role !== "child" && f.email
                ? [{ label: "Email", value: f.email }]
                : []),
              {
                label: "Card",
                value: <span className="tabular">{cardLabel(hh.card)}</span>,
              },
            ]}
          />
          {role !== "adult" ? (
            <FormField
              label="Guardian e-signature"
              help={`Type your full name to sign the waiver for ${f.first}.`}
            >
              {(p) => (
                <Input
                  {...p}
                  value={sign}
                  onChange={(e) => setSign(e.target.value)}
                  placeholder={`${me.firstName} ${me.lastName}`}
                />
              )}
            </FormField>
          ) : null}
          {serverErr ? <FlowError>{serverErr}</FlowError> : null}
        </>
      ) : null}
    </Task>
  )
}
export default function AddMember() {
  return (
    <Suspense fallback={<LoadingBlock text="Loading…" />}>
      <Inner />
    </Suspense>
  )
}
