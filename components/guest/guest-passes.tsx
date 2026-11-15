"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { Menu } from "@/components/graphical"
import { MoreHorizontal } from "@/components/icons"
import {
  AppPage,
  Card,
  Facts,
  Row,
  Rows,
  Stat,
  Stats,
} from "@/components/kit/app"
import { Confirm, Modal } from "@/components/kit/overlays"
import {
  Banner,
  CheckRow,
  EmptyState,
  FormField,
  LoadingBlock,
  SelectBox,
  StatusPill,
} from "@/components/kit/ui"
import { Stepper } from "@/components/reserve/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  cancelGuestPass,
  editGuestContact,
  resendGuestPass,
  sendGuestPass,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { CLUB_BY_SLUG, CLUBS, PLANS } from "@/lib/data/catalog"
import { guestPassesLeft } from "@/lib/engine"
import {
  addDays,
  DAY,
  dateKey,
  dayStart,
  fmtDay,
  fmtDayShort,
  fmtMoney,
  fromKey,
} from "@/lib/time"
import { toast } from "@/lib/toast"
import type { GuestPass } from "@/lib/types"

function SendDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { s, hh, now, club } = useApp()
  const { left } = guestPassesLeft(s, hh.id, now)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [clubSlug, setClubSlug] = useState(club)
  const [date, setDate] = useState(dateKey(addDays(dayStart(now), 4)))
  const [teen, setTeen] = useState(false)
  const [msg, setMsg] = useState("")
  const [count, setCount] = useState(1)
  const [err, setErr] = useState<Record<string, string>>({})
  const [done, setDone] = useState<{ until: number; paid: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const reset = () => {
    setName("")
    setContact("")
    setDone(null)
    setErr({})
    setCount(1)
    setTeen(false)
    setMsg("")
  }
  const buying = left <= 0 || count > left
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Enter your guest's name."
    if (!/^\S+@\S+\.\S+$/.test(contact) && !/^\D*(\d\D*){10}$/.test(contact))
      e.contact =
        "Check the email or mobile number. Use 10 digits for a mobile."
    const d = fromKey(date)
    if (!date || d < dayStart(now) || d > dayStart(now) + 14 * DAY)
      e.date = "Pick a date in the next 14 days."
    setErr(e)
    if (Object.keys(e).length) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    const r = sendGuestPass({
      name: name.trim(),
      contact,
      clubSlug,
      visitDate: d,
      message: msg,
      count: left <= 0 ? count : 1,
    })
    setBusy(false)
    if (r.ok) {
      setDone({ until: r.validUntil, paid: r.paid })
      announce(`Pass sent to ${name.split(" ")[0]}.`)
    } else setErr({ form: r.message })
  }
  const link = `https://my.cactuspeakathletic.example/g/${name.toLowerCase().replace(/\W+/g, "") || "guest"}`
  return (
    <Modal
      wide
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
      title={done ? `Pass sent to ${name.split(" ")[0]}` : "Send a guest pass"}
      description={
        done
          ? `Valid until ${fmtDayShort(done.until)}.`
          : "One visit, one club. Guests are 18 or older, or 16 and 17 with a parent."
      }
    >
      {done ? (
        <div className="gap-m flex flex-col">
          <StatusPill tone="success" className="w-fit">
            Sent
          </StatusPill>
          <div className="gap-s flex">
            <Input
              readOnly
              aria-label="Guest pass link"
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(link)
                toast({ title: "Link copied" })
              }}
            >
              Copy link
            </Button>
          </div>
          {done.paid ? (
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              Charged {fmtMoney(20 * done.paid)} to {hh.card.brand} ending{" "}
              {hh.card.last4}.
            </p>
          ) : null}
          <div className="flex justify-between">
            <button
              type="button"
              className="min-h-11 text-body-m font-medium text-link underline sm:text-body-s"
              onClick={() => {
                reset()
              }}
            >
              Send another
            </button>
            <Button
              onClick={() => {
                onOpenChange(false)
                reset()
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="gap-m flex flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          noValidate
        >
          {err.form ? (
            <p
              role="alert"
              className="px-m py-s corner-s bg-danger-subtle text-body-m font-heavy sm:text-body-s"
            >
              {err.form}
            </p>
          ) : null}
          <FormField label="Guest's name" error={err.name}>
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField
            label="Guest's email or mobile number"
            help="We send the pass here."
            error={err.contact}
          >
            {(p) => (
              <Input
                {...p}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="off"
              />
            )}
          </FormField>
          <div className="gap-m grid sm:grid-cols-2">
            <SelectBox
              label="Club"
              value={clubSlug}
              onChange={setClubSlug}
              options={CLUBS.map((c) => ({ value: c.slug, label: c.name }))}
            />
            <FormField
              label="Visit date"
              help="Within 14 days."
              error={err.date}
            >
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </FormField>
          </div>
          <CheckRow checked={teen} onChange={setTeen}>
            My guest is 16 or 17
          </CheckRow>
          {teen ? (
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              A parent or guardian signs a waiver.
            </p>
          ) : null}
          {left <= 0 ? (
            <Stepper
              label="How many guests?"
              value={count}
              min={1}
              max={4}
              onChange={setCount}
            />
          ) : null}
          <FormField label="Message (optional)" help="200 characters.">
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                maxLength={200}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
            )}
          </FormField>
          <Facts
            className="px-m corner-s bg-muted"
            items={
              buying
                ? [
                    {
                      label: "Cost",
                      value: (
                        <span className="tabular">
                          {fmtMoney(20 * (left <= 0 ? count : 1), false)}
                        </span>
                      ),
                      hint: "$20 per guest",
                    },
                    {
                      label: "Charged to",
                      value: `${hh.card.brand} ending ${hh.card.last4}`,
                    },
                  ]
                : [
                    {
                      label: "Cost",
                      value: `1 of ${PLANS[hh.plan].guestPasses} included passes`,
                    },
                  ]
            }
          />
          <div className="gap-s pt-xs flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {buying
                ? `Pay ${fmtMoney(20 * (left <= 0 ? count : 1), false)} and send`
                : "Send guest pass"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

const STATUS: Record<
  GuestPass["status"],
  { label: string; tone: "success" | "info" | "warning" }
> = {
  sent: { label: "Sent", tone: "info" },
  opened: { label: "Opened", tone: "info" },
  used: { label: "Used", tone: "success" },
  cancelled: { label: "Cancelled", tone: "warning" },
  expired: { label: "Expired", tone: "warning" },
}

const RULES = [
  "One visit, one club",
  "Guests are 18 or older (16 and 17 with a parent)",
  "Valid 14 days",
  "Guests sign a waiver on their phone",
  "Unused passes don't roll over",
]

/** The row menu of a pass the guest has not used yet: resend, edit contact, copy link, cancel. */
function PassMenu({
  pass: g,
  onEdit,
  onCancel,
}: {
  pass: GuestPass
  onEdit: () => void
  onCancel: () => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for ${g.guestName}'s pass`}
        className="!grid !size-11 !place-items-center !bg-transparent !p-zero hover:!bg-muted md:!size-9"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup>
            <Menu.Item
              onClick={() => {
                resendGuestPass(g.id)
                toast({
                  title: `Pass sent again to ${g.guestName.split(" ")[0]}`,
                })
              }}
            >
              Resend
            </Menu.Item>
            <Menu.Item onClick={onEdit}>Edit contact</Menu.Item>
            <Menu.Item
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `https://my.cactuspeakathletic.example/g/${g.id}`
                )
                toast({ title: "Link copied" })
              }}
            >
              Copy link
            </Menu.Item>
            <Menu.Item className="!text-destructive" onClick={onCancel}>
              Cancel pass
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/**
 * Guest passes: how many are left as one block of numbers, one primary action in the page bar to send a pass, and
 * each sent pass as a row on the sheet with its status. The rules sit in a quiet well at the end.
 * A pass the guest has not used yet has a menu: resend, edit contact, copy link, cancel.
 */
export default function GuestPasses({ openSend }: { openSend?: boolean }) {
  const { s, me, hh, now } = useApp()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [send, setSend] = useState(!!openSend)
  const [cancel, setCancel] = useState<GuestPass | null>(null)
  const [edit, setEdit] = useState<GuestPass | null>(null)
  const [contact, setContact] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (me.role === "teen") return null
  if (loading) return <LoadingBlock text="Loading guest passes…" rows={3} />
  const { included, left } = guestPassesLeft(s, hh.id, now)
  const passes = s.guestPasses
    .filter((g) => g.householdId === hh.id)
    .map((g) =>
      g.status === "sent" && g.validUntil < now
        ? { ...g, status: "expired" as const }
        : g
    )
    .sort((a, b) => b.sentAt - a.sentAt)
  const valid = passes.filter(
    (g) => g.status === "sent" || g.status === "opened"
  ).length
  const frozen = hh.status === "frozen"
  const trail = hh.plan === "trailhead"
  return (
    <AppPage
      title="Guest passes"
      actions={
        <Button disabled={frozen} onClick={() => setSend(true)}>
          {trail && left <= 0 ? "Buy a guest pass: $20" : "Send a guest pass"}
        </Button>
      }
    >
      {frozen ? (
        <Banner tone="info" title="Guest passes pause while frozen." />
      ) : null}
      <Stats>
        <Stat
          label="Passes left this month"
          value={
            <>
              {left}
              <span className="text-muted-foreground"> of {included}</span>
            </>
          }
          hint={
            included
              ? "Resets on your billing date"
              : `0 included with ${PLANS[hh.plan].name}`
          }
        />
        <Stat label="Day pass" value="$20" hint="For each guest" />
      </Stats>

      <Card
        id="sent"
        tone="bare"
        title="Sent"
        description={valid ? `${valid} valid now` : undefined}
      >
        {passes.length ? (
          <Rows label="Sent guest passes">
            {passes.map((g) => {
              const live = g.status === "sent" || g.status === "opened"
              // Usual states are quiet: the line already says "Valid until" or "Used". Only the others get a pill.
              const quiet =
                g.status === "opened"
                  ? "Opened"
                  : g.status === "used" && !g.usedOn
                    ? "Used"
                    : null
              const pill = g.status === "cancelled" || g.status === "expired"
              return (
                <Row
                  key={g.id}
                  title={g.guestName}
                  line={
                    <span className="tabular">
                      {CLUB_BY_SLUG[g.clubSlug].name} ·{" "}
                      {g.status === "used" && g.usedOn
                        ? `Used ${fmtDayShort(g.usedOn)}`
                        : fmtDay(g.visitDate)}
                      {live
                        ? ` · Valid until ${fmtDayShort(g.validUntil)}`
                        : ""}
                    </span>
                  }
                  end={
                    <>
                      {quiet ? (
                        <span className="text-muted-foreground">{quiet}</span>
                      ) : null}
                      {pill ? (
                        <StatusPill tone={STATUS[g.status].tone}>
                          {STATUS[g.status].label}
                        </StatusPill>
                      ) : null}
                      {live ? (
                        <PassMenu
                          pass={g}
                          onEdit={() => {
                            setEdit(g)
                            setContact(g.contact)
                          }}
                          onCancel={() => setCancel(g)}
                        />
                      ) : (
                        <span
                          className="size-11 md:size-9"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  }
                />
              )
            })}
          </Rows>
        ) : (
          <EmptyState
            object="gym-bag"
            title="No guest passes sent yet."
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={frozen}
                onClick={() => setSend(true)}
              >
                Send a guest pass
              </Button>
            }
          />
        )}
      </Card>

      <Card id="rl" tone="plain" title="Rules">
        <ul className="gap-xxs flex list-disc flex-col pl-m text-body-m sm:text-body-s">
          {RULES.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Card>

      <SendDialog
        open={send}
        onOpenChange={(o) => {
          setSend(o)
          if (!o && openSend) router.replace("/guest-passes")
        }}
      />
      <Confirm
        open={!!cancel}
        onOpenChange={(o) => !o && setCancel(null)}
        title="Cancel this pass?"
        description={
          cancel
            ? `${cancel.guestName} won't be able to use this link. ${cancel.bought ? "We'll refund $20.00." : "We'll return the pass to your balance."}`
            : undefined
        }
      >
        <div className="gap-xs flex flex-col">
          <Button className="w-full" onClick={() => setCancel(null)}>
            Keep pass
          </Button>
          <Button
            variant="ghost"
            className="w-full !text-destructive"
            onClick={() => {
              cancelGuestPass(cancel!.id)
              toast({ title: "Pass cancelled" })
              setCancel(null)
            }}
          >
            Cancel pass
          </Button>
        </div>
      </Confirm>
      <Modal
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        title="Edit contact"
        description={
          edit ? `Update where we send ${edit.guestName}'s pass.` : undefined
        }
      >
        <FormField label="Guest's email or mobile number">
          {(p) => (
            <Input
              {...p}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          )}
        </FormField>
        <div className="gap-xs pt-xs flex justify-end">
          <Button variant="outline" onClick={() => setEdit(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              editGuestContact(edit!.id, contact)
              toast({ title: "Contact updated" })
              setEdit(null)
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </AppPage>
  )
}
