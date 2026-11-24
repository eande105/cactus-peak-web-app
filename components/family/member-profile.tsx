"use client"
import { notFound, useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { openPass } from "@/components/app/pass-dialog"
import { useApp } from "@/components/app/use-app"
import { IosMemberIntro } from "@/components/family/ios-member-intro"
import { RemoveMemberConfirm } from "@/components/family/parts"
import { AppPage, Card, Facts, Row, Rows } from "@/components/kit/app"
import {
  Banner,
  CheckRow,
  FormField,
  PersonAvatar,
  StatusPill,
  SwitchRow,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  setTeenPermission,
  undoRemoveMember,
  updateMember,
} from "@/lib/actions"
import { householdMembers, nextBillingDate } from "@/lib/engine"
import { DAY, fmtDayShort, fmtDowTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type PermissionKey = Parameters<typeof setTeenPermission>[1]

/** A list of switches or checkboxes inside a `flush` card: one control for each row, a rule between the rows. */
function ControlRows({
  label,
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "[&>li]:px-m [&>li]:py-s flex flex-col rule-t [&>li+li]:rule-t",
        className
      )}
    >
      {children}
    </ul>
  )
}

/**
 * One member of the household, for the primary member. The sections are bordered blocks with a heading, in a
 * column of 640 px at most; the activity is beside them from 1024 px. Each field saves when the member leaves it.
 * Removal is the last, quiet row.
 */
export default function MemberProfile({ id }: { id: string }) {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const m = s.members[id]
  const [saved, setSaved] = useState("")
  const [first, setFirst] = useState(m?.firstName ?? "")
  const [last, setLast] = useState(m?.lastName ?? "")
  const [notes, setNotes] = useState(m?.allergyNotes ?? "")
  const [confirm, setConfirm] = useState(false)
  if (!m || m.householdId !== hh.id) notFound()
  const mark = (t: string) => {
    setSaved(t)
    setTimeout(() => setSaved(""), 3000)
  }
  const next = s.bookings
    .filter(
      (b) => b.memberId === m.id && b.status === "booked" && b.start > now
    )
    .sort((a, b) => a.start - b.start)
  const visits = s.visits.filter(
    (v) => v.memberId === m.id && now - v.at < 30 * DAY
  ).length
  const save = (patch: Parameters<typeof updateMember>[1]) => {
    updateMember(m.id, patch)
    mark("Saved")
  }
  const allow = (key: PermissionKey, on: boolean) => {
    setTeenPermission(m.id, key, on)
    mark("Saved")
  }
  const adults = householdMembers(s, hh.id).filter(
    (x) => x.role === "primary" || x.role === "adult"
  )
  const back = { href: "/family", label: "Household" }
  const name = `${m.firstName} ${m.lastName}`
  const ends = nextBillingDate(hh, now)
  if (me.role !== "primary")
    return (
      <AppPage back={back} title={name} width="narrow">
        <Banner tone="info" title="Only the primary member edits profiles." />
      </AppPage>
    )
  return (
    <AppPage
      back={back}
      // The intro below shows the name and role, so the heading is for screen readers only.
      title={<span className="sr-only">{name}</span>}
      meta={
        m.endsOn ? (
          <StatusPill tone="warning">Ends {fmtDayShort(m.endsOn)}</StatusPill>
        ) : null
      }
      actions={
        <p
          role="status"
          className="text-body-m font-medium text-success sm:text-body-s"
        >
          {saved}
        </p>
      }
    >
      <IosMemberIntro member={m} paused={hh.status === "frozen"} />
      <div className="gap-m grid items-start lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <div className="gap-m flex min-w-0 flex-col">
          <Card
            title="Profile"
            description={`Member number ${m.memberNumber} · Age ${m.age}`}
            id="pr"
          >
            <div className="gap-m flex flex-col">
              <div className="gap-s flex flex-wrap items-center">
                <PersonAvatar
                  name={name}
                  hue={m.hue}
                  size={48}
                  className="shrink-0"
                />
                <Button variant="outline" size="sm" disabled>
                  Add a photo · Coming soon
                </Button>
              </div>
              <div className="@container">
                <div className="gap-m grid grid-cols-1 @md:grid-cols-2">
                  <FormField label="First name">
                    {(p) => (
                      <Input
                        {...p}
                        value={first}
                        onChange={(e) => setFirst(e.target.value)}
                        onBlur={() => save({ firstName: first })}
                      />
                    )}
                  </FormField>
                  <FormField label="Last name">
                    {(p) => (
                      <Input
                        {...p}
                        value={last}
                        onChange={(e) => setLast(e.target.value)}
                        onBlur={() => save({ lastName: last })}
                      />
                    )}
                  </FormField>
                  <FormField
                    label="Date of birth"
                    help="Read-only after it is set."
                  >
                    {(p) => (
                      <Input
                        {...p}
                        readOnly
                        className="tabular"
                        value={m.dob}
                      />
                    )}
                  </FormField>
                </div>
              </div>
            </div>
          </Card>
          {m.role === "child" ? (
            <Card title="Health notes" id="hn">
              <FormField
                label="Allergies and medical notes"
                help="Shared with kids club staff."
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() =>
                      save({ allergyNotes: notes.trim() || undefined })
                    }
                  />
                )}
              </FormField>
            </Card>
          ) : null}
          {m.role === "child" ? (
            <Card title="Pick-up adults" id="pu" flush>
              <ControlRows label="Authorised pick-up adults">
                {adults.map((a) => (
                  <li key={a.id}>
                    <CheckRow
                      checked={!!m.pickup?.includes(a.id)}
                      onChange={(on) =>
                        save({
                          pickup: on
                            ? [...(m.pickup ?? []), a.id]
                            : (m.pickup ?? []).filter((x) => x !== a.id),
                        })
                      }
                    >
                      {a.firstName} {a.lastName}
                    </CheckRow>
                  </li>
                ))}
              </ControlRows>
            </Card>
          ) : null}
          {m.role === "teen" ? (
            <Card title="Permissions" id="permissions" flush>
              <ControlRows>
                {(
                  [
                    {
                      key: "classes",
                      label: "Classes (Teen OK)",
                      on: m.permissions?.classes ?? true,
                    },
                    {
                      key: "courts",
                      label: "Court reservations",
                      on: !!m.permissions?.courts,
                    },
                    {
                      key: "lanes",
                      label: "Lap lanes (14 and up)",
                      on: !!m.permissions?.lanes,
                      disabled: m.age < 14,
                    },
                    {
                      key: "coachMessages",
                      label: "Teen can message coaches",
                      on: m.permissions?.coachMessages ?? true,
                    },
                  ] satisfies {
                    key: PermissionKey
                    label: string
                    on: boolean
                    disabled?: boolean
                  }[]
                ).map((x) => (
                  <li key={x.key}>
                    <SwitchRow
                      checked={x.on}
                      disabled={x.disabled}
                      onChange={(c) => allow(x.key, c)}
                    >
                      {x.label}
                    </SwitchRow>
                  </li>
                ))}
              </ControlRows>
            </Card>
          ) : null}
          {m.role !== "primary" ? (
            <Card flush as="div">
              <Rows>
                {m.endsOn ? (
                  <Row
                    title={`${m.firstName} leaves the plan`}
                    line={
                      <span className="tabular">
                        Access ends {fmtDayShort(m.endsOn)}
                      </span>
                    }
                    end={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          undoRemoveMember(m.id)
                          toast({ title: `${m.firstName} stays on your plan` })
                        }}
                      >
                        Keep on plan
                      </Button>
                    }
                  />
                ) : (
                  <Row
                    title={`Remove ${m.firstName}`}
                    line={
                      <span className="tabular">
                        Access ends {fmtDayShort(ends)}
                      </span>
                    }
                    end={
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setConfirm(true)}
                      >
                        Remove
                      </Button>
                    }
                  />
                )}
              </Rows>
            </Card>
          ) : null}
        </div>

        <Card
          title="Activity"
          description={`${visits} ${visits === 1 ? "visit" : "visits"} in the last 30 days`}
          id="ac"
          as="aside"
          action={
            <Button variant="outline" size="sm" onClick={() => openPass(m.id)}>
              Pass
            </Button>
          }
        >
          <Facts
            items={[
              {
                label: "Upcoming bookings",
                value: next.length,
                hint: next.length
                  ? next.slice(0, 3).map((b) => (
                      <span key={b.id} className="block">
                        {fmtDowTime(b.start)} · {b.title}
                      </span>
                    ))
                  : undefined,
              },
            ]}
          />
        </Card>
      </div>

      <RemoveMemberConfirm
        member={confirm ? m : null}
        ends={ends}
        onClose={() => setConfirm(false)}
        onRemoved={() => router.push("/family")}
      />
    </AppPage>
  )
}
