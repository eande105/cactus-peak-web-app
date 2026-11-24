"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Section } from "@/components/account/parts"
import { IconTile, SummaryCard } from "@/components/account/screen"
import { openPass } from "@/components/app/pass-dialog"
import { Th } from "@/components/app/screen-parts"
import { useApp } from "@/components/app/use-app"
import { RemoveMemberConfirm, RolePill } from "@/components/family/parts"
import { Menu } from "@/components/graphical"
import {
  Check,
  CreditCard,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "@/components/icons"
import { AppPage } from "@/components/kit/app"
import {
  EmptyState,
  LoadingBlock,
  PersonAvatar,
  Segmented,
  StatusPill,
} from "@/components/kit/ui"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { resendInvite, resolveRequest, undoRemoveMember } from "@/lib/actions"
import { announce } from "@/lib/announce"
import { PLANS } from "@/lib/data/catalog"
import {
  householdMembers,
  householdMonthly,
  nextBillingDate,
} from "@/lib/engine"
import { DAY, fmtDayShort, fmtDowTime, fmtMoney } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Member } from "@/lib/types"
import { openDialog } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

type Show = "all" | "adults" | "kids"

// The cell padding of the members table: the first and last cells line up with the card's own padding.
const CELL = "px-s first:pl-m last:pr-m"

const RULES = [
  {
    q: "How family pricing works",
    icon: Wallet,
    a: "Everyone follows the main plan. Add-ons are $39 per adult and $19 per child or teen, every month. Kids club is included for children 12 and under.",
  },
  {
    q: "What teens can do",
    icon: ShieldCheck,
    a: "Teens 13 to 17 book Teen OK classes. You can turn on court reservations and lap lanes (14 and up). Teen personal training needs your approval. You can see their bookings and check-ins.",
  },
  {
    q: "Moving to a new plan",
    icon: TrendingUp,
    a: "Upgrades start now and are prorated by day. Downgrades start on your next billing date. Everyone moves together.",
  },
]

/** One member as a table row: who, role, status, what they may do, and the actions in a menu. */
function MemberRow({
  m,
  canEdit,
  onRemove,
}: {
  m: Member
  canEdit: boolean
  onRemove: (m: Member) => void
}) {
  const { s, now } = useApp()
  // The pass is scanned at the front desk from a phone, so the menu offers it only on a touch device.
  const next = s.bookings
    .filter(
      (b) => b.memberId === m.id && b.status === "booked" && b.start > now
    )
    .sort((a, b) => a.start - b.start)[0]
  const visits = s.visits.filter(
    (v) => v.memberId === m.id && now - v.at < 30 * DAY
  ).length
  // Only the states that need the primary member differ from the usual "Active".
  const unusual =
    !!m.endsOn ||
    m.status === "invited" ||
    m.status === "invite_expired" ||
    (m.role === "child" && !m.allergyNotes)
  const pill = m.endsOn ? (
    <StatusPill tone="warning">Ends {fmtDayShort(m.endsOn)}</StatusPill>
  ) : m.status === "invited" ? (
    <StatusPill tone="info">Invited</StatusPill>
  ) : m.status === "invite_expired" ? (
    <StatusPill tone="warning">Invite expired</StatusPill>
  ) : m.role === "child" && !m.allergyNotes ? (
    <StatusPill tone="warning">Add allergy notes</StatusPill>
  ) : (
    // Most members are active, so the usual state is quiet text with a green check; only the states that need the
    // primary member are pills.
    <span className="gap-xxs inline-flex items-center">
      <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
      Active
    </span>
  )
  const can =
    m.role === "child"
      ? m.allergyNotes
        ? "Kids club ready"
        : "Needs allergy notes"
      : m.role === "teen" && m.permissions
        ? `Classes ${m.permissions.classes ? "on" : "off"} · Courts ${m.permissions.courts ? "on" : "off"} · Lap lanes ${m.permissions.lanes ? "on" : "off"}`
        : m.role === "primary"
          ? "Billing owner"
          : m.status === "invited"
            ? "Invite pending"
            : "Own login and pass"
  const remind = () => {
    resendInvite(m.id)
    toast({ title: `Reminder sent to ${m.firstName}` })
  }
  return (
    <tr>
      {/* `max-w-0` with `w-full` lets the name cell shrink, so the long line truncates and the table stays in 375 px. */}
      <td className={cn(CELL, "py-xs w-full max-w-0")}>
        <div className="gap-s flex min-w-0 items-center">
          <PersonAvatar
            name={`${m.firstName} ${m.lastName}`}
            hue={m.hue}
            size={32}
            className="shrink-0"
          />
          <div className="min-w-0">
            <Link
              href={`/family/${m.id}`}
              className="block truncate font-medium hover:underline"
            >
              {m.firstName} {m.lastName}
            </Link>
            <p className="tabular truncate text-muted-foreground">
              Age {m.age} ·{" "}
              {next
                ? `Next: ${fmtDowTime(next.start)} ${next.title}`
                : "Nothing booked"}
            </p>
            {/* On a phone the Status column is hidden so names keep their room; a state that differs shows here. */}
            {unusual && <div className="mt-xxs md:hidden">{pill}</div>}
          </div>
        </div>
      </td>
      <td className={cn(CELL, "max-md:hidden")}>
        <RolePill role={m.role} />
      </td>
      <td className={cn(CELL, "whitespace-nowrap max-md:hidden")}>{pill}</td>
      <td
        className={cn(
          CELL,
          "whitespace-nowrap text-muted-foreground max-lg:hidden"
        )}
      >
        {can}
      </td>
      <td className={cn(CELL, "tabular text-right max-lg:hidden")}>{visits}</td>
      <td className={cn(CELL, "w-11 text-right")}>
        {canEdit ? (
          <Menu.Root>
            <Menu.Trigger
              aria-label={`Actions for ${m.firstName}`}
              className="!p-zero !grid !size-9 !place-items-center !bg-transparent hover:!bg-muted max-md:!size-11"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" sideOffset={6}>
                <Menu.Popup>
                  <Menu.Item render={<Link href={`/family/${m.id}`} />}>
                    Edit profile
                  </Menu.Item>
                  {m.role === "teen" ? (
                    <Menu.Item
                      render={<Link href={`/family/${m.id}#permissions`} />}
                    >
                      Permissions
                    </Menu.Item>
                  ) : null}
                  <Menu.Item onClick={() => openPass(m.id)}>Pass</Menu.Item>
                  {m.status === "invited" ? (
                    <Menu.Item onClick={remind}>Resend invite</Menu.Item>
                  ) : null}
                  {m.endsOn ? (
                    <Menu.Item
                      onClick={() => {
                        undoRemoveMember(m.id)
                        toast({ title: `${m.firstName} stays on your plan` })
                      }}
                    >
                      Keep on plan
                    </Menu.Item>
                  ) : m.role !== "primary" ? (
                    <Menu.Item
                      className="!text-destructive"
                      onClick={() => onRemove(m)}
                    >
                      Remove
                    </Menu.Item>
                  ) : null}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ) : m.status === "invited" ? (
          <Button size="sm" variant="ghost" onClick={remind}>
            Remind
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

/**
 * Household: the cost in three summary cards, the requests that wait for an answer, the members as one table in a
 * card, and how family plans work. The primary member adds, edits and removes; other adults read.
 */
export default function FamilyPage() {
  const { s, me, hh, now } = useApp()
  const [loading, setLoading] = useState(false)
  const [rm, setRm] = useState<Member | null>(null)
  const [show, setShow] = useState<Show>("all")
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const members = householdMembers(s, hh.id)
  const m = householdMonthly(s, hh)
  const order = { primary: 0, adult: 1, teen: 2, child: 3 } as const
  const sorted = [...members].sort((a, b) => order[a.role] - order[b.role])
  const canEdit = me.role === "primary"
  const isAdult = (x: Member) => x.role === "primary" || x.role === "adult"
  const adults = sorted.filter(isAdult)
  // The filter is useful only when the household has both groups.
  const canFilter = adults.length > 0 && adults.length < sorted.length
  const shown =
    !canFilter || show === "all"
      ? sorted
      : sorted.filter((x) => isAdult(x) === (show === "adults"))
  if (loading) return <LoadingBlock text="Loading your household…" rows={4} />
  const next = nextBillingDate(hh, now)
  const ids = new Set(members.map((x) => x.id))
  const pending = s.requests.filter(
    (r) =>
      r.status === "pending" &&
      r.expiresAt > now &&
      ids.has(r.teenId) &&
      (r.parentId === me.id || canEdit)
  )
  return (
    <AppPage
      title="Household"
      meta={
        <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
          {PLANS[hh.plan].name}
        </p>
      }
      actions={
        canEdit ? (
          <Button size="sm" render={<Link href="/family/add" />}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add a member
          </Button>
        ) : undefined
      }
    >
      {/* The cost in three cards, the same card as Overview and Billing. Monthly total opens Billing for the primary
          member, who owns it. */}
      <ul
        id="fam-cost"
        className="gap-s grid grid-cols-2 sm:grid-cols-3 max-sm:[&>*:last-child]:col-span-2"
      >
        <li>
          <SummaryCard
            className="h-full"
            icon={Users}
            label="Members"
            value={members.length}
            meta={[
              plural(adults.length, "adult", "adults"),
              m.kids
                ? plural(m.kids, "child or teen", "children and teens")
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </li>
        <li>
          <SummaryCard
            className="h-full"
            icon={CreditCard}
            label="Monthly total"
            value={fmtMoney(m.total, false)}
            meta={`Next charge ${fmtDayShort(next)}`}
            href={canEdit ? "/billing" : undefined}
          />
        </li>
        <li>
          <SummaryCard
            className="h-full"
            icon={Wallet}
            label="Add-ons"
            value={fmtMoney(m.adultTotal + m.kidTotal, false)}
            meta={
              m.adults || m.kids
                ? [
                    m.adults
                      ? `${plural(m.adults, "adult", "adults")} ${fmtMoney(m.adultTotal, false)}`
                      : "",
                    m.kids
                      ? `${plural(m.kids, "child", "children")} ${fmtMoney(m.kidTotal, false)}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : `Plan ${fmtMoney(m.base, false)} only`
            }
          />
        </li>
      </ul>

      {pending.length ? (
        <Section
          id="approvals"
          title="Pending approvals"
          line={plural(
            pending.length,
            "request to answer",
            "requests to answer"
          )}
        >
          <ul className="corner-m raised [&>li+li]:rule-t">
            {pending.map((r) => {
              const teen = s.members[r.teenId]
              return (
                <li
                  key={r.id}
                  className="gap-x-s gap-y-xs px-m py-s flex flex-wrap items-center"
                >
                  <PersonAvatar
                    name={`${teen.firstName} ${teen.lastName}`}
                    hue={teen.hue}
                    size={32}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 basis-48 text-body-m sm:text-body-s">
                    <p className="font-medium text-pretty">
                      {teen.firstName}: {r.title}
                    </p>
                    <p className="tabular text-pretty text-muted-foreground">
                      {r.note ? `"${r.note}" · ` : ""}Expires{" "}
                      {fmtDowTime(r.expiresAt)}
                    </p>
                  </div>
                  <div className="gap-xs flex items-center max-sm:ml-[calc(32px+var(--space-s))]">
                    <Button
                      size="sm"
                      onClick={() => openDialog("approve", r.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const res = resolveRequest(r.id, false)
                        if (res.ok) announce("Declined.")
                        else toast({ type: "error", title: res.message })
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}

      <Section
        id="members"
        title="Members"
        line={plural(shown.length, "member", "members")}
        action={
          canFilter ? (
            <Segmented<Show>
              size="sm"
              label="Show members"
              value={show}
              onChange={setShow}
              options={[
                { value: "all", label: "All" },
                { value: "adults", label: "Adults" },
                { value: "kids", label: "Teens and children" },
              ]}
            />
          ) : undefined
        }
      >
        <div className="overflow-hidden corner-m raised">
          <table className="w-full text-body-m sm:text-body-s">
            <caption className="sr-only">Members of your household</caption>
            <thead className="bg-muted/50">
              <tr>
                <Th className={CELL}>Member</Th>
                <Th className={cn(CELL, "max-md:hidden")}>Role</Th>
                <Th className={cn(CELL, "max-md:hidden")}>Status</Th>
                <Th className={cn(CELL, "max-lg:hidden")}>Permissions</Th>
                <Th end className={cn(CELL, "max-lg:hidden")}>
                  Visits, 30 days
                </Th>
                <Th className={cn(CELL, "w-11")}>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody className="[&>tr]:rule-t">
              {shown.map((x) => (
                <MemberRow
                  key={x.id}
                  m={x}
                  canEdit={canEdit}
                  onRemove={setRm}
                />
              ))}
            </tbody>
          </table>
          {/* The header already has "Add a member" for the primary member, so the empty state does not repeat it. */}
          {members.length === 1 ? (
            <div className="rule-t">
              <EmptyState object="playground" title="It's just you for now" />
            </div>
          ) : null}
        </div>
      </Section>

      <Section id="fh" title="How it works">
        <div className="px-m corner-m raised">
          <Accordion>
            {RULES.map((r) => (
              <AccordionItem key={r.q} value={r.q}>
                <AccordionTrigger>
                  <span className="gap-s flex items-center">
                    <IconTile icon={r.icon} />
                    {r.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="max-w-[60ch] pl-[calc(2rem+var(--space-s))] text-body-m text-pretty text-muted-foreground sm:text-body-s">
                  {r.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <RemoveMemberConfirm
        member={rm}
        ends={next}
        onClose={() => setRm(null)}
      />
    </AppPage>
  )
}
