"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import { CancelDialog } from "@/components/booking/cancel-dialog"
import { SuccessPanel } from "@/components/booking/success-panel"
import { InfoLine } from "@/components/flows/parts"
import { AppPage, Card, Row, Rows } from "@/components/kit/app"
import { EmptyState, StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { CLUB_BY_SLUG } from "@/lib/data/catalog"
import { cancelNote } from "@/lib/engine"
import { fmtDay, fmtRange } from "@/lib/time"

const BACK = { href: "/bookings", label: "Bookings" }

export default function ConfirmedPage({ id }: { id: string }) {
  const { s, now } = useApp()
  const router = useRouter()
  const [cancel, setCancel] = useState(false)
  const b = s.bookings.find((x) => x.id === id)
  useEffect(() => {
    if (b)
      document.title = `${b.resource ?? b.title}, ${fmtRange(b.start, b.end)} · Cactus Peak Athletic`
  }, [b])
  if (!b)
    return (
      <AppPage title="Reservation" back={BACK} width="narrow">
        <Card>
          <EmptyState
            className="py-zero"
            title="We couldn't find that reservation."
            action={
              <Button size="sm" render={<Link href="/bookings" />}>
                See bookings
              </Button>
            }
          />
        </Card>
      </AppPage>
    )
  const club = CLUB_BY_SLUG[b.clubSlug]
  const cn0 = cancelNote(s, b.memberId, b.start, now, b.kind)
  return (
    <AppPage title="Reservation confirmed" back={BACK} width="narrow">
      <SuccessPanel
        headline={b.resource ?? b.title}
        summary={[
          {
            label: "Sport",
            value: (b.sport ?? "").replace(/^./, (c) => c.toUpperCase()),
          },
          { label: "Club", value: club.name },
          {
            label: "When",
            value: `${fmtDay(b.start)} · ${fmtRange(b.start, b.end)}`,
          },
          { label: "Reference", value: b.ref },
        ]}
        event={{
          title: b.title,
          start: b.start,
          end: b.end,
          location: `${club.name}, ${club.address}`,
          uid: b.id,
        }}
        shareText={`https://my.cactuspeakathletic.example/invite/${b.ref}`}
        rows={[
          {
            label: "Get directions",
            href: `https://maps.google.com/?q=${encodeURIComponent(club.address)}`,
          },
          {
            label: "Call the club",
            href: `tel:${club.phone.replace(/\D/g, "")}`,
          },
          { label: "Club details", href: `/clubs/${club.slug}` },
        ]}
        onDone={() => router.push("/bookings")}
        doneLabel="See bookings"
      />
      {b.players?.length ? (
        <Card title="Players" tone="bare">
          <Rows label="Players">
            {b.players.map((p) => (
              <Row
                key={p.name}
                title={p.name}
                className="px-zero!"
                end={
                  // Only the states that differ from a confirmed player get a pill.
                  p.status === "confirmed" ? undefined : (
                    <StatusPill tone="info">
                      {p.status === "guest" ? "Guest pass sent" : "Invited"}
                    </StatusPill>
                  )
                }
              />
            ))}
          </Rows>
        </Card>
      ) : null}
      <Card
        title="Cancellation"
        tone="plain"
        footer={
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => setCancel(true)}
          >
            Cancel reservation
          </Button>
        }
      >
        <InfoLine
          tone={cn0.late ? "warning" : "info"}
          className="text-body-m sm:text-body-s"
        >
          {cn0.text}
        </InfoLine>
      </Card>
      <CancelDialog booking={b} open={cancel} onOpenChange={setCancel} />
      <span className="sr-only">{now}</span>
    </AppPage>
  )
}
