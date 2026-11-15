"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Detail, useInboxItems } from "@/components/inbox/inbox"
import { AppPage, Card } from "@/components/kit/app"
import { EmptyState } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"

/**
 * One notice or thread as its own screen. A phone opens it from the inbox list. The title is in the page bar, and
 * the reading pane is one bordered block.
 */
export default function ThreadPage({ id }: { id: string }) {
  const router = useRouter()
  const items = useInboxItems()
  const item = items.find((i) => (i.kind === "notice" ? i.n.id : i.t.id) === id)
  const back = { href: "/inbox", label: "Inbox" }
  if (!item)
    return (
      <AppPage title="Inbox" back={back} width="narrow">
        <Card>
          <EmptyState
            className="py-m"
            title="We couldn't find that message"
            action={
              <Button size="sm" render={<Link href="/inbox" />}>
                Back to Inbox
              </Button>
            }
          />
        </Card>
      </AppPage>
    )
  return (
    <AppPage
      title={item.kind === "notice" ? item.n.title : item.t.with}
      meta={
        item.kind === "thread" ? (
          <p className="truncate text-body-m text-muted-foreground sm:text-body-s">
            {item.t.subject}
          </p>
        ) : undefined
      }
      back={back}
      width="narrow"
    >
      <Card>
        <Detail item={item} head={false} onBack={() => router.push("/inbox")} />
      </Card>
    </AppPage>
  )
}
