"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useApp } from "@/components/app/use-app"
import { AppPage, Card, Row, Rows } from "@/components/kit/app"
import { EmptyState } from "@/components/kit/ui"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ensureThread, sendMessage } from "@/lib/actions"
import { CLUBS, FAQ } from "@/lib/data/catalog"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

/** A phone number as a link, for the end of a row. */
function TelLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\D/g, "")}`}
      className={cn(
        "tabular font-medium whitespace-nowrap text-link hover:underline",
        className
      )}
    >
      {phone}
    </a>
  )
}

/**
 * Help: the search field at the top, the answers as groups of accordion rows directly on the sheet, and from
 * 1024 px a right column with the two ways to reach a person. A message to the front desk becomes a thread in
 * the inbox.
 */
export default function Help() {
  const { me } = useApp()
  const router = useRouter()
  const [q, setQ] = useState("")
  const [msg, setMsg] = useState("")
  const groups = FAQ.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) => !q || (i.q + i.a).toLowerCase().includes(q.toLowerCase())
    ),
  })).filter((g) => g.items.length)
  const found = groups.reduce((n, g) => n + g.items.length, 0)
  return (
    <AppPage title="Help">
      <div className="gap-s flex flex-wrap items-center">
        <div className="w-full max-w-[480px]">
          <label htmlFor="help-q" className="sr-only">
            Search help
          </label>
          <Input
            id="help-q"
            type="search"
            placeholder="Search help"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {q ? (
          <p
            role="status"
            className="tabular text-body-m text-muted-foreground sm:text-body-s"
          >
            {found} {found === 1 ? "answer" : "answers"}
          </p>
        ) : null}
      </div>
      <div className="gap-l grid items-start lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="gap-l flex min-w-0 flex-col">
          {groups.length ? (
            groups.map((g) => (
              <Card
                key={g.group}
                tone="bare"
                id={`h-${g.group}`}
                title={g.group}
              >
                <Accordion>
                  {g.items.map((i) => (
                    <AccordionItem key={i.q} value={i.q}>
                      <AccordionTrigger>{i.q}</AccordionTrigger>
                      <AccordionContent className="max-w-[60ch] text-body-m text-pretty text-muted-foreground sm:text-body-s">
                        {i.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ))
          ) : (
            <EmptyState
              title={`No answers for "${q}"`}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ block: "nearest" })
                    document.getElementById("fd")?.focus()
                  }}
                >
                  Message the front desk
                </Button>
              }
              secondary={
                <Button size="sm" variant="ghost" onClick={() => setQ("")}>
                  Clear search
                </Button>
              }
            />
          )}
        </div>
        <div
          id="contact"
          className="gap-m flex min-w-0 scroll-mt-24 flex-col lg:sticky lg:top-[calc(var(--bar-h)+var(--space-m))]"
        >
          <Card id="ct" title="Contact" flush>
            <Rows className="rule-t">
              <Row
                title="Member services"
                end={<TelLink phone="(480) 555-0100" />}
              />
              {CLUBS.map((c) => (
                <Row
                  key={c.slug}
                  title={c.name}
                  line={c.city}
                  end={<TelLink phone={c.phone} />}
                />
              ))}
            </Rows>
          </Card>
          <Card
            id="fd-h"
            title="Message the front desk"
            footer={
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast({
                      title: "Report sent",
                      description: "Thanks. We'll look into it.",
                    })
                  }
                >
                  Report a problem
                </Button>
                <Button
                  size="sm"
                  disabled={!msg.trim()}
                  onClick={() => {
                    const id = ensureThread("Front desk", "Help")
                    sendMessage(id, msg.trim())
                    setMsg("")
                    toast({
                      title: "Message sent",
                      description: "Find the reply in your inbox.",
                    })
                    router.push(`/inbox/${id}`)
                  }}
                >
                  Send message
                </Button>
              </>
            }
          >
            <div className="gap-xs flex flex-col">
              <label htmlFor="fd" className="sr-only">
                Your message
              </label>
              <Textarea
                id="fd"
                rows={4}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="How can we help?"
              />
              <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
                Staffed 6 am–8 pm. Replies within the hour.
              </p>
            </div>
          </Card>
          <Card tone="plain" as="div">
            <p className="text-body-m text-muted-foreground sm:text-body-s">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {me.firstName} {me.lastName}
              </span>
              . Demo data resets from the account menu.
            </p>
          </Card>
        </div>
      </div>
    </AppPage>
  )
}
