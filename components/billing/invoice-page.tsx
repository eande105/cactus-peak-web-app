"use client"
import { notFound } from "next/navigation"
import { Section } from "@/components/account/parts"
import { useApp } from "@/components/app/use-app"
import { download, statusPill } from "@/components/billing/billing-page"
import { cardLabel } from "@/components/flows/parts"
import { Download } from "@/components/icons"
import { AppPage, Card, Facts } from "@/components/kit/app"
import { Button } from "@/components/ui/button"
import { fmtDateFull, fmtMoney } from "@/lib/time"

/**
 * One invoice: the lines and the total on the sheet at the left, how and to whom it was billed as a summary card at
 * the right.
 */
export default function InvoicePage({ id }: { id: string }) {
  const { me, hh } = useApp()
  const inv = hh.invoices.find((i) => i.id === id)
  if (me.role !== "primary") return null
  if (!inv) notFound()
  return (
    <AppPage
      back={{ href: "/billing", label: "Billing" }}
      title={fmtDateFull(inv.date)}
      meta={statusPill(inv.status)}
      actions={
        <Button variant="outline" onClick={() => download(inv)}>
          <Download aria-hidden="true" data-icon="inline-start" />
          Download PDF
        </Button>
      }
    >
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section id="inv-charges" title={inv.desc}>
          <div className="px-m corner-m raised">
            <Facts
              items={[
                ...inv.lines.map((l) => ({
                  label: l.label,
                  value: <span className="tabular">{fmtMoney(l.amount)}</span>,
                })),
                {
                  label: "Total",
                  value: (
                    <span className="tabular font-heavy text-foreground">
                      {fmtMoney(inv.amount)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </Section>
        <Card id="inv-payment" title="Payment">
          <Facts
            items={[
              { label: "Invoice", value: inv.id },
              {
                label: "Card",
                value: cardLabel(hh.card),
              },
              {
                label: "Billed to",
                value: hh.billingName,
                hint: hh.billingAddress,
              },
            ]}
          />
        </Card>
      </div>
    </AppPage>
  )
}
