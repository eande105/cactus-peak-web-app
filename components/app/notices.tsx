"use client"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/app/use-app"
import {
  Bell,
  CalendarCheck,
  Clock3,
  CreditCard,
  Dumbbell,
  MessageSquare,
  Newspaper,
  ShieldAlert,
  Smile,
  Users,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  confirmHold,
  deleteNotice,
  markNoticeRead,
  resolveRequest,
} from "@/lib/actions"
import { announce } from "@/lib/announce"
import { fmtCountdown, fmtRelative } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Notice } from "@/lib/types"
import { openDialog } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

const ICON: Record<Notice["type"], typeof Bell> = {
  hold: Clock3,
  booked: CalendarCheck,
  card: CreditCard,
  coach: MessageSquare,
  teen_request: Users,
  late_cancel: ShieldAlert,
  feedback: Smile,
  club: Newspaper,
  court_invite: Dumbbell,
  billing: CreditCard,
  waitlist: Clock3,
}

export function useNoticeAction() {
  const { s, now } = useApp()
  const router = useRouter()
  return (n: Notice) => {
    if (n.type === "hold" && n.bookingId) {
      const r = confirmHold(n.bookingId)
      if (r.ok) announce("Spot confirmed. You're booked.")
      else toast({ type: "error", title: r.message })
    } else if (n.type === "card") openDialog("card")
    else if (n.type === "feedback" && n.bookingId)
      openDialog("feedback", n.bookingId)
    else if (n.type === "teen_request" && n.requestId) {
      openDialog("approve", n.requestId)
    }
    void s
    void now
    void router
  }
}

export function NoticeRow({
  n,
  variant,
  selected,
  onOpen,
}: {
  n: Notice
  variant: "popover" | "list"
  selected?: boolean
  onOpen?: () => void
}) {
  const { s, now } = useApp()
  const act = useNoticeAction()
  const Icon = ICON[n.type] ?? Bell
  const hold =
    n.type === "hold" && n.bookingId
      ? s.bookings.find((b) => b.id === n.bookingId)
      : undefined
  const holdLeft =
    hold?.status === "held" && hold.holdExpiresAt ? hold.holdExpiresAt - now : 0
  const warm = n.type === "hold" || n.type === "late_cancel"
  return (
    <li
      className={cn(
        "relative flex gap-s px-m py-s",
        selected && "bg-accent",
        selected && !warm && "rule-l rule-primary",
        warm && "border-l-[3px] border-warning"
      )}
    >
      <Icon
        className={cn(
          "mt-xxs size-4 shrink-0",
          warm ? "text-warning" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            markNoticeRead(n.id)
            onOpen?.()
          }}
          className="block min-h-11 w-full py-xxs text-left"
        >
          <span className="flex items-start justify-between gap-xs">
            <span
              className={cn(
                "text-body-s font-heavy",
                n.readAt && "font-regular"
              )}
            >
              {!n.readAt ? (
                <span
                  className="mr-xs inline-block size-2 corner-full bg-color-3 align-middle"
                  aria-hidden="true"
                />
              ) : null}
              {!n.readAt ? <span className="sr-only">Unread. </span> : null}
              {n.title}
            </span>
            <span className="tabular shrink-0 text-body-xs text-muted-foreground">
              {fmtRelative(n.at, now)}
            </span>
          </span>
          <span className="block text-body-s text-muted-foreground">
            {n.done ?? n.body}
          </span>
        </button>
        {n.needsAction &&
        !n.done &&
        n.actionLabel &&
        !(n.type === "hold" && holdLeft <= 0) ? (
          <div className="mt-xs flex flex-wrap gap-xs">
            <Button
              size="sm"
              variant={n.type === "hold" ? "primary" : "outline"}
              onClick={() => act(n)}
            >
              {n.type === "hold" && holdLeft > 0
                ? `Confirm spot · ${fmtCountdown(holdLeft)}`
                : n.actionLabel}
            </Button>
            {n.type === "teen_request" && n.requestId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resolveRequest(n.requestId!, false)
                }}
              >
                Decline
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {variant === "list" ? (
        <button
          type="button"
          className="sr-only"
          onClick={() => deleteNotice(n.id)}
        >
          Delete notification
        </button>
      ) : null}
    </li>
  )
}
