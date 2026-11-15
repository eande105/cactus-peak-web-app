"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { NoticeRow, useNoticeAction } from "@/components/app/notices"
import { useApp } from "@/components/app/use-app"
import { Inbox as InboxIcon, MessageSquare } from "@/components/icons"
import { AppPage, Rows, TabButtons } from "@/components/kit/app"
import { EmptyState, LoadingBlock, SelectBox } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMedia } from "@/hooks/use-media"
import {
  deleteNotice,
  markAllRead,
  markNoticeRead,
  resolveRequest,
  sendMessage,
  unreadNotices,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { fmtCountdown, fmtDayTime, fmtRelative, fmtTime } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Notice, Thread } from "@/lib/types"
import { cn } from "@/lib/utils"

type Item =
  | { kind: "notice"; n: Notice; at: number }
  | { kind: "thread"; t: Thread; at: number }

type TabId = "all" | "action" | "messages"

const TAB_LABEL: Record<TabId, string> = {
  all: "All",
  action: "Needs action",
  messages: "Messages",
}

/** The head of the reading pane: what is open, and one quiet line under it (the time, the subject). */
function DetailHead({
  title,
  line,
  className,
}: {
  title?: ReactNode
  line: ReactNode
  className?: string
}) {
  return (
    <div className={cn("gap-xxs flex flex-col", className)}>
      {title ? (
        <h2 className="font-display-wide text-body-xl font-heavy text-balance">
          {title}
        </h2>
      ) : null}
      <p className="tabular text-body-m text-muted-foreground sm:text-body-s">
        {line}
      </p>
    </div>
  )
}

/** One message of a thread. The member's own messages sit at the right on the dark field. */
function Bubble({
  mine,
  text,
  at,
  className,
}: {
  mine: boolean
  text: string
  at: number
  className?: string
}) {
  return (
    <li
      className={cn(
        "px-s py-xs max-w-[80%] corner-m text-body-m sm:text-body-s",
        mine
          ? "self-end bg-night text-night-foreground"
          : "self-start bg-muted",
        className
      )}
    >
      <p>{text}</p>
      <p
        className={cn(
          "tabular",
          mine ? "text-night-foreground/80" : "text-muted-foreground"
        )}
      >
        {fmtDayTime(at)}
      </p>
    </li>
  )
}

/**
 * A coach or front desk thread in the inbox list. It has the same shape as `NoticeRow`, so the list reads as one
 * column: icon, name with the time at the right, and the last message under it.
 */
function ThreadRow({
  t,
  at,
  selected,
  onOpen,
  className,
}: {
  t: Thread
  at: number
  selected?: boolean
  onOpen: () => void
  className?: string
}) {
  const { now } = useApp()
  return (
    <li
      className={cn(
        "gap-s px-m py-s relative flex",
        selected && "bg-accent",
        className
      )}
    >
      <MessageSquare
        className="mt-xxs size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={selected}
        className={cn(
          "min-h-11 min-w-0 flex-1",
          "py-xxs",
          "text-left text-body-m",
          "outline-none",
          "focus-visible:underline sm:text-body-s"
        )}
      >
        <span className="gap-xs flex items-start justify-between">
          <span className="min-w-0 truncate">{t.with}</span>
          <span className="tabular shrink-0 text-muted-foreground">
            {fmtRelative(at, now)}
          </span>
        </span>
        <span className="block truncate text-muted-foreground">
          {t.messages.at(-1)?.text ?? t.subject}
        </span>
      </button>
    </li>
  )
}

/**
 * The open notice or thread. On desktop it is the reading pane of the inbox. On a phone it is the thread page,
 * which draws the title in its page bar and passes `head={false}`.
 */
export function Detail({
  item,
  onBack,
  head = true,
}: {
  item: Item | undefined
  /** Runs after the notice is deleted, so a phone goes back to the list. */
  onBack?: () => void
  head?: boolean
}) {
  const { s, now } = useApp()
  const act = useNoticeAction()
  const [text, setText] = useState("")
  const id = item ? (item.kind === "notice" ? item.n.id : item.t.id) : ""
  // biome-ignore lint/correctness/useExhaustiveDependencies: the timer must restart only when the open notice changes, not on every store update
  useEffect(() => {
    if (item?.kind !== "notice" || item.n.readAt) return
    const t = setTimeout(() => markNoticeRead(item.n.id), 2000)
    return () => clearTimeout(t)
  }, [id])
  if (!item)
    return (
      <EmptyState
        icon={InboxIcon}
        title="No notification selected"
        body="Select a notification to read it."
        className="h-full justify-center"
      />
    )
  if (item.kind === "thread") {
    const t = s.threads.find((x) => x.id === item.t.id)!
    return (
      <div className="gap-m flex h-full min-h-full flex-col">
        {head ? <DetailHead title={t.with} line={t.subject} /> : null}
        <ul className="gap-xs flex flex-1 flex-col" aria-label="Messages">
          {t.messages.map((m, i) => (
            <Bubble
              // biome-ignore lint/suspicious/noArrayIndexKey: messages have no id and the thread only appends
              key={i}
              mine={m.from === "me"}
              text={m.text}
              at={m.at}
            />
          ))}
          {!t.messages.length ? (
            <li className="text-body-m text-muted-foreground sm:text-body-s">
              No messages yet.
            </li>
          ) : null}
        </ul>
        <form
          className="gap-xs pt-m flex flex-col rule-t"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            sendMessage(t.id, text.trim())
            setText("")
            announce("Message sent.")
          }}
        >
          <label htmlFor="composer" className="sr-only">
            Message
          </label>
          <Textarea
            id="composer"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${t.with.replace("Coach ", "")}`}
          />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={!text.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    )
  }
  const n = item.n
  const hold = n.bookingId
    ? s.bookings.find((b) => b.id === n.bookingId)
    : undefined
  const left = hold?.status === "held" ? (hold.holdExpiresAt ?? 0) - now : 0
  const canAct =
    n.needsAction &&
    !n.done &&
    !!n.actionLabel &&
    !(n.type === "hold" && left <= 0)
  return (
    <div className="gap-m flex flex-col">
      <DetailHead title={head ? n.title : undefined} line={fmtDayTime(n.at)} />
      <p className="max-w-[60ch] text-body-m text-pretty sm:text-body-s">
        {n.done ?? n.body}
        {left > 0 && hold?.holdExpiresAt
          ? ` Confirm by ${fmtTime(hold.holdExpiresAt)}.`
          : ""}
      </p>
      {/* One primary: the action the notice asks for. The others are quiet, and Delete is the quietest. The actions and the links share one row. */}
      <div className="gap-xs flex flex-wrap items-center">
        {canAct ? (
          <Button size="sm" onClick={() => act(n)}>
            {n.type === "hold"
              ? `Confirm spot · ${fmtCountdown(left)}`
              : n.actionLabel}
          </Button>
        ) : null}
        {n.type === "teen_request" &&
        n.requestId &&
        n.needsAction &&
        !n.done ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const r = resolveRequest(n.requestId!, false)
              if (r.ok) announce("Declined.")
              else toast({ type: "error", title: r.message })
            }}
          >
            Decline
          </Button>
        ) : null}
        {!n.readAt ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markNoticeRead(n.id)}
          >
            Mark as read
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            deleteNotice(n.id)
            toast({ title: "Notice deleted" })
            onBack?.()
          }}
        >
          Delete
        </Button>
        {n.type === "late_cancel" ? (
          <>
            <Link href="/bookings" className="text-link underline">
              See my bookings
            </Link>
            <Link href="/help" className="text-link underline">
              How late cancels work
            </Link>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function useInboxItems() {
  const { s, me } = useApp()
  return useMemo(() => {
    const mine = s.notices
      .filter((n) => n.memberId === me.id)
      .map<Item>((n) => ({ kind: "notice", n, at: n.at }))
    const threads = s.threads
      .filter((t) => t.memberId === me.id)
      .map<Item>((t) => ({ kind: "thread", t, at: t.messages.at(-1)?.at ?? 0 }))
    return [...mine, ...threads].sort((a, b) => b.at - a.at)
  }, [s.notices, s.threads, me.id])
}

/**
 * Inbox: one bordered block that fills the height under the page bar from 1024 px. The list column is at the left
 * with the tabs in its head, a rule, then the reading pane. Each column scrolls on its own.
 * On a phone the block is the list, and a row opens the thread page.
 */
export default function InboxPage() {
  const router = useRouter()
  const wide = useMedia("(min-width: 1024px)")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>("all")
  const [filter, setFilter] = useState("all")
  const [sel, setSel] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const items = useInboxItems()
  const list = items.filter(
    (i) =>
      (tab === "all"
        ? true
        : tab === "messages"
          ? i.kind === "thread"
          : i.kind === "notice" && i.n.needsAction && !i.n.done) &&
      (filter === "all" ||
        (i.kind === "notice" ? i.n.filter === filter : filter === "training"))
  )
  const current =
    list.find((i) => (i.kind === "notice" ? i.n.id : i.t.id) === sel) ??
    (wide ? list[0] : undefined)
  if (loading) return <LoadingBlock text="Loading your inbox…" rows={5} />
  const unread = items.filter((i) => i.kind === "notice" && !i.n.readAt).length
  const action = items.filter(
    (i) => i.kind === "notice" && i.n.needsAction && !i.n.done
  ).length
  const empty =
    tab === "all"
      ? "You're all caught up"
      : tab === "action"
        ? "Nothing needs you right now"
        : "No messages yet"
  const open = (id: string) => (wide ? setSel(id) : router.push(`/inbox/${id}`))
  return (
    <AppPage title="Inbox" width="wide">
      {/* The height is the viewport less the sheet margin (1rem), the page bar (2.25rem) and three `l` gaps. */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] corner-m raised lg:h-[calc(100dvh-3.25rem-3*var(--space-l))] lg:min-h-112 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col lg:rule-r">
          <TabButtons<TabId>
            label="Inbox"
            value={tab}
            onChange={setTab}
            className="px-m shrink-0"
            items={[
              {
                value: "all",
                label: TAB_LABEL.all,
                count: unread || undefined,
              },
              {
                value: "action",
                label: TAB_LABEL.action,
                count: action || undefined,
              },
              { value: "messages", label: TAB_LABEL.messages },
            ]}
          />
          {/* The list's controls sit under the tabs, so the page bar holds only the title and never wraps at 375 px. */}
          <div className="gap-s px-m py-s flex shrink-0 flex-wrap items-center justify-between">
            <SelectBox
              label="Topic"
              hideLabel
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All topics" },
                { value: "bookings", label: "Bookings" },
                { value: "billing", label: "Billing" },
                { value: "news", label: "Club news" },
                { value: "training", label: "Training" },
              ]}
              className="w-40"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!unread}
              onClick={() => {
                const ids = markAllRead()
                toast({
                  title: "All caught up",
                  action: { label: "Undo", onClick: () => unreadNotices(ids) },
                })
              }}
            >
              Mark all read
            </Button>
          </div>
          <div
            id="inbox-panel"
            role="tabpanel"
            aria-label={TAB_LABEL[tab]}
            className="min-h-0 flex-1 lg:overflow-y-auto"
          >
            {list.length ? (
              // An unread notice has the blue dot and a heavy title, so its row needs no tint of its own.
              <Rows label="Notifications">
                {list.map((i) =>
                  i.kind === "notice" ? (
                    <NoticeRow
                      key={i.n.id}
                      n={i.n}
                      variant="list"
                      selected={wide && current === i}
                      onOpen={() => open(i.n.id)}
                    />
                  ) : (
                    <ThreadRow
                      key={i.t.id}
                      t={i.t}
                      at={i.at}
                      selected={wide && current === i}
                      onOpen={() => open(i.t.id)}
                    />
                  )
                )}
              </Rows>
            ) : (
              <EmptyState
                title={empty}
                action={
                  tab === "messages" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href="/training" />}
                    >
                      Find a coach
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
        {wide ? (
          <div className="p-m lg:p-l min-h-0 min-w-0 overflow-y-auto">
            <Detail item={current} />
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
