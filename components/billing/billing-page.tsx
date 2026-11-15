"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { capital, IconPill, Section } from "@/components/account/parts"
import { useApp } from "@/components/app/use-app"
import { Check, Download, TriangleAlert } from "@/components/icons"
import {
  AppPage,
  Card,
  Facts,
  Row,
  Rows,
  Stat,
  Stats,
} from "@/components/kit/app"
import {
  Banner,
  EmptyState,
  LoadingBlock,
  SelectBox,
  StatusPill,
} from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { makeDefaultCard, retryPayment, setBillingField } from "@/lib/actions"
import { announce } from "@/lib/announce"
import {
  guestPassesLeft,
  householdMonthly,
  nextBillingDate,
  paymentDaysLate,
  ptCreditsLeft,
} from "@/lib/engine"
import { fmtDateFull, fmtDayShort, fmtMoney } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Invoice } from "@/lib/types"
import { openDialog } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

/**
 * The status of an invoice. `inTable` is for the invoice list, where nearly every row is paid: a paid row shows quiet
 * text with a green check, and only the states that differ (open, failed, refunded) are pills.
 */
export const statusPill = (st: Invoice["status"], inTable?: boolean) =>
  st === "paid" && inTable ? (
    <span className="gap-xxs inline-flex items-center">
      <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
      Paid
    </span>
  ) : st === "paid" ? (
    <IconPill tone="success" icon={Check}>
      Paid
    </IconPill>
  ) : st === "failed" ? (
    <IconPill tone="danger" icon={TriangleAlert}>
      Failed
    </IconPill>
  ) : st === "refunded" ? (
    <StatusPill tone="neutral">Refunded</StatusPill>
  ) : (
    <StatusPill tone="info">Open</StatusPill>
  )
export const download = (i: Invoice) => {
  const blob = new Blob(
    [`Cactus Peak Athletic\nInvoice ${i.id}\n${i.desc}\n${fmtMoney(i.amount)}`],
    { type: "text/plain" }
  )
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `invoice-${i.id}.txt`
  a.click()
}

/**
 * One billing detail as the value of a fact: the value with a small Edit action. Edit turns the value into a field.
 * The field saves on blur.
 */
function EditableValue({
  label,
  value,
  field,
}: {
  label: string
  value: string
  field: "billingName" | "billingAddress" | "receiptEmail"
}) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(value)
  const [saved, setSaved] = useState(false)
  if (edit)
    return (
      <Input
        aria-label={label}
        className="w-64 max-w-full"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setBillingField(field, v)
          setEdit(false)
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }}
        autoFocus
      />
    )
  return (
    <span className="gap-s flex items-center justify-end">
      {saved ? (
        <span role="status" className="shrink-0 text-success">
          Saved
        </span>
      ) : null}
      <span className="min-w-0 break-words">{value}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEdit(true)}
        aria-label={`Edit ${label}`}
      >
        Edit
      </Button>
    </span>
  )
}

/** One card on file as a row of the payment method block: the card, one fact, and the status and action at the right. */
function CardOnFile({
  title,
  line,
  end,
  className,
}: {
  title: string
  line: ReactNode
  end: ReactNode
  className?: string
}) {
  return (
    <li
      className={cn(
        "px-m py-s gap-x-m gap-y-xs flex flex-wrap items-center justify-between text-body-m sm:text-body-s",
        className
      )}
    >
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate font-medium">{title}</p>
        <p className="tabular text-muted-foreground">{line}</p>
      </div>
      <div className="gap-xs flex flex-wrap items-center">{end}</div>
    </li>
  )
}

const TH =
  "h-9 px-s text-body-xs font-medium whitespace-nowrap text-muted-foreground first:pl-zero last:pr-zero"
const TD = "px-s py-xs first:pl-zero last:pr-zero"
const PER_PAGE = 10

/**
 * Billing: what the household pays next and what it has left as one block of numbers, the card that pays as one
 * bordered row, the monthly charges and the receipt details as facts, and every invoice in a bare table.
 * A declined card shows first, with the retry.
 */
export default function BillingPage() {
  const { s, me, hh, now } = useApp()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [retrying, setRetrying] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  if (me.role !== "primary") return null
  if (loading) return <LoadingBlock text="Loading your billing…" rows={4} />
  const money = householdMonthly(s, hh)
  const late = paymentDaysLate(s, me.id, now)
  const cur =
    (new Date(now - 7 * 3600_000).getUTCFullYear() % 100) * 100 +
    new Date(now - 7 * 3600_000).getUTCMonth() +
    1
  const months =
    (hh.card.expYear - (cur - (cur % 100)) / 100) * 12 +
    hh.card.expMonth -
    (cur % 100)
  const expiring = months <= 2 && months >= 0
  const inv = hh.invoices
    .filter(
      (i) =>
        filter === "all" ||
        (filter === "membership"
          ? i.kind === "membership"
          : filter === "training"
            ? i.kind === "training"
            : filter === "guest"
              ? i.kind === "guest"
              : i.kind === "fee")
    )
    .sort((a, b) => b.date - a.date)
  const pages = Math.max(1, Math.ceil(inv.length / PER_PAGE))
  const rows = inv.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const brand = capital(hh.card.brand)
  const { left } = guestPassesLeft(s, hh.id, now)
  const dl = (i: Invoice) => (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Download invoice for ${fmtDayShort(i.date)} (PDF)`}
      onClick={() => download(i)}
    >
      <Download aria-hidden="true" />
    </Button>
  )
  return (
    <AppPage title="Billing">
      {late >= 0 ? (
        <Banner
          role="status"
          tone={late >= 6 ? "danger" : "warning"}
          title={`Card declined ${fmtDayShort(hh.paymentFailedAt ?? now)}. ${
            late >= 8
              ? "New bookings are paused."
              : `${Math.max(0, 7 - late)} days of full access left.`
          }`}
          actions={
            <Button
              size="sm"
              variant="outline"
              loading={retrying}
              onClick={async () => {
                setRetrying(true)
                await new Promise((r) => setTimeout(r, 800))
                const r = retryPayment()
                setRetrying(false)
                if (r.ok) announce("Paid. Your membership is active.")
              }}
            >
              {retrying ? "Trying…" : "Try again"}
            </Button>
          }
        />
      ) : null}

      <Stats>
        <Stat
          label="Next charge"
          value={fmtMoney(money.total)}
          hint={fmtDateFull(nextBillingDate(hh, now))}
        />
        <Stat label="Training sessions left" value={ptCreditsLeft(hh)} />
        <Stat
          label="Guest passes left this cycle"
          value={left}
          hint={`${hh.guestPassesBought} bought`}
        />
      </Stats>

      <Section
        id="pm"
        title="Payment method"
        action={
          hh.backupCard ? undefined : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openDialog("card")}
            >
              Add a backup card
            </Button>
          )
        }
      >
        <ul className="flex flex-col corner-m raised [&>li+li]:rule-t">
          <CardOnFile
            title={`${brand} ending ${hh.card.last4}`}
            line={`Expires ${String(hh.card.expMonth).padStart(2, "0")}/${hh.card.expYear}`}
            end={
              <>
                {expiring ? (
                  <IconPill tone="warning" icon={TriangleAlert}>
                    Expires soon
                  </IconPill>
                ) : null}
                <StatusPill>Default</StatusPill>
                <Button
                  size="sm"
                  variant={late >= 0 ? "primary" : "outline"}
                  onClick={() => openDialog("card")}
                >
                  Update card
                </Button>
              </>
            }
          />
          {hh.backupCard ? (
            <CardOnFile
              title={`${capital(hh.backupCard.brand)} ending ${hh.backupCard.last4}`}
              line="Backup. Kept for 30 days."
              end={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Make ${hh.backupCard.brand} ending ${hh.backupCard.last4} default again`}
                  onClick={() => {
                    makeDefaultCard()
                    toast({
                      title: `${hh.backupCard!.brand} ending ${hh.backupCard!.last4} is now the default`,
                    })
                  }}
                >
                  Make default
                </Button>
              }
            />
          ) : null}
        </ul>
      </Section>

      <Section id="nc" title="Monthly charges">
        <Facts
          className="rule-t"
          items={[
            { label: capital(hh.plan), value: fmtMoney(money.base) },
            ...(money.adults
              ? [{ label: "Adult add-on", value: fmtMoney(money.adultTotal) }]
              : []),
            ...(money.kids
              ? [
                  {
                    label: `Child add-ons, ${money.kids} × $19.00`,
                    value: fmtMoney(money.kidTotal),
                  },
                ]
              : []),
            { label: "Annual facility fee", value: "$49, charged in March" },
          ]}
        />
      </Section>

      <Section id="bd" title="Billing details">
        <Facts
          className="rule-t"
          items={(
            [
              ["Name", hh.billingName, "billingName"],
              ["Billing address", hh.billingAddress, "billingAddress"],
              ["Receipt email", hh.receiptEmail, "receiptEmail"],
            ] as const
          ).map(([label, value, field]) => ({
            label,
            value: <EditableValue label={label} value={value} field={field} />,
          }))}
        />
      </Section>

      <Card
        id="invoices"
        tone="bare"
        title="Invoices"
        action={
          <SelectBox
            label="Show"
            hideLabel
            className="w-40"
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setPage(1)
            }}
            options={[
              { value: "all", label: "All" },
              { value: "membership", label: "Membership" },
              { value: "training", label: "Training" },
              { value: "guest", label: "Guest passes" },
              { value: "fee", label: "Fees" },
            ]}
          />
        }
        footer={
          rows.length ? (
            <>
              <p className="tabular mr-auto text-body-m text-muted-foreground sm:text-body-s">
                Showing {(page - 1) * PER_PAGE + 1}–
                {(page - 1) * PER_PAGE + rows.length} of {inv.length}
              </p>
              {pages > 1 ? (
                <nav
                  aria-label="Invoice pages"
                  className="gap-xs flex items-center"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </>
          ) : undefined
        }
      >
        {rows.length ? (
          <>
            {/* A table from 640 px. */}
            <div className="overflow-x-auto max-sm:hidden">
              <table className="w-full text-left text-body-s">
                <caption className="sr-only">Invoices</caption>
                <thead>
                  <tr className="rule-b">
                    <th scope="col" className={TH}>
                      Date
                    </th>
                    <th scope="col" className={TH}>
                      Description
                    </th>
                    <th scope="col" className={TH}>
                      Status
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Amount
                    </th>
                    <th scope="col" className={`${TH} w-px`}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr+tr]:rule-t">
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <th
                        scope="row"
                        className={`${TD} tabular font-medium whitespace-nowrap`}
                      >
                        {fmtDayShort(i.date)}
                      </th>
                      <td className={`${TD} text-muted-foreground`}>
                        {i.desc}
                      </td>
                      <td className={TD}>{statusPill(i.status, true)}</td>
                      <td className={`${TD} tabular text-right`}>
                        {fmtMoney(i.amount)}
                      </td>
                      <td className="pl-s py-xxs whitespace-nowrap">
                        <span className="gap-xs flex items-center justify-end">
                          <Link
                            href={`/billing/invoices/${i.id}`}
                            aria-label={`View invoice for ${fmtDayShort(i.date)}`}
                            className="font-medium text-link hover:underline"
                          >
                            View
                          </Link>
                          {dl(i)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Rows below 640 px. */}
            <Rows label="Invoices" className="sm:hidden">
              {rows.map((i) => (
                <Row
                  key={i.id}
                  href={`/billing/invoices/${i.id}`}
                  title={i.desc}
                  line={
                    <span className="tabular">
                      {fmtDayShort(i.date)} · {fmtMoney(i.amount)}
                    </span>
                  }
                  end={
                    <>
                      {statusPill(i.status, true)}
                      {dl(i)}
                    </>
                  }
                />
              ))}
            </Rows>
          </>
        ) : (
          <EmptyState
            title={
              hh.invoices.length
                ? "No invoices of this type."
                : "No invoices yet."
            }
            body={
              hh.invoices.length
                ? undefined
                : "Your first invoice shows here after your first charge."
            }
          />
        )}
      </Card>
    </AppPage>
  )
}
