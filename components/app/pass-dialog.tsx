"use client"
import Link from "next/link"
import { useState } from "react"
import { CheckInPass, passState } from "@/components/app/check-in-pass"
import { useApp } from "@/components/app/use-app"
import { Drawer } from "@/components/graphical"
import { Smartphone } from "@/components/icons"
import { Modal } from "@/components/kit/overlays"
import { Segmented } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { useMedia } from "@/hooks/use-media"
import { householdMembers } from "@/lib/engine"
import { toast } from "@/lib/toast"
import type { Member } from "@/lib/types"
import { closeDialog, openDialog, useDialog } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

/**
 * The one way to open the pass. Every Pass button, the pass card on You, the family pages and the command menu call
 * this. `memberId` picks whose pass opens first; the member can switch inside the dialog.
 */
export function openPass(memberId?: string) {
  openDialog("pass", { memberId })
}

type Parts = {
  title: string
  description?: string
  body: React.ReactNode
  /** The primary action, if any. Cancel is added by the frame. */
  action?: React.ReactNode
}

/**
 * The pass popup. Two choices decide how it looks:
 * - What it shows follows the pointer, because the code is scanned from a phone at the front desk. A touch screen
 *   gets the pass with its QR code. A computer gets a prompt to text the pass to the member's phone, with the member
 *   number as the fallback.
 * - Its frame follows the width. From 768 px it is a dialog, after the shadcn "With Form" dialog: a header with a
 *   title and one line, the body, and a footer with Cancel and the action. Below 768 px it is a drawer from the
 *   bottom, after the shadcn drawer: a swipe handle instead of a close button, and full-width actions.
 */
export function PassDialog() {
  const payload = useDialog<{ memberId?: string } | true>("pass")
  const { s, me, now, hh } = useApp()
  const onTouch = useMedia("(pointer: coarse)")
  const wide = useMedia("(min-width: 768px)")
  const [picked, setPicked] = useState<string | null>(null)
  const people =
    me.role === "teen"
      ? [me]
      : householdMembers(s, hh.id).filter((m) => m.status !== "invite_expired")
  const asked = payload && payload !== true ? (payload.memberId ?? null) : null
  const want = picked ?? asked ?? me.id
  const m = s.members[people.some((p) => p.id === want) ? want : me.id]
  const open = !!payload
  const close = () => {
    setPicked(null)
    closeDialog("pass")
  }
  const picker =
    people.length > 1 ? (
      <Segmented
        label="Pass for"
        value={m.id}
        onChange={setPicked}
        options={people.map((p) => ({ value: p.id, label: p.firstName }))}
        size="sm"
      />
    ) : null
  const parts: Parts = onTouch
    ? {
        title: "Pass",
        body: (
          <>
            {picker}
            <CheckInPass s={s} member={m} now={now} variant="sheet" />
          </>
        ),
      }
    : sendParts(m, picker, close)

  if (wide)
    return (
      <Modal
        open={open}
        onOpenChange={(o) => !o && close()}
        title={parts.title}
        description={parts.description}
        hideTitle={onTouch}
      >
        <div className="gap-m flex flex-col">{parts.body}</div>
        {parts.action ? (
          <div className="gap-xs pt-xs flex justify-end">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            {parts.action}
          </div>
        ) : null}
      </Modal>
    )

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => !o && close()}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Viewport className="side-drawer-viewport">
          <Drawer.Popup className="side-drawer !gap-zero !pt-zero !max-h-[calc(100dvh-var(--space-l))]">
            {/* The swipe handle replaces the close button: drag down, or tap the backdrop, to close. */}
            <div
              aria-hidden="true"
              className="py-s flex shrink-0 cursor-grab justify-center active:cursor-grabbing"
            >
              <span className="h-1 w-12 rounded-full bg-muted-foreground/40" />
            </div>
            <Drawer.Content className="gap-m flex flex-col">
              <div
                className={cn("gap-xxs flex flex-col", onTouch && "sr-only")}
              >
                <Drawer.Title className="text-body-l font-heavy text-balance">
                  {parts.title}
                </Drawer.Title>
                <Drawer.Description className="text-body-m text-pretty text-muted-foreground">
                  {parts.description ?? "Your member pass"}
                </Drawer.Description>
              </div>
              {parts.body}
              {parts.action ? (
                <div className="gap-xs flex flex-col">
                  {parts.action}
                  <Button variant="outline" onClick={close}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** The send-to-phone prompt, for a computer. */
function sendParts(
  member: Member,
  picker: React.ReactNode,
  onDone: () => void
): Parts {
  return {
    title: "Send your pass to your phone",
    description: "The front desk scans it from your phone.",
    body: <SendBody member={member} picker={picker} onDone={onDone} />,
    action: <SendAction member={member} onDone={onDone} />,
  }
}

function SendBody({
  member,
  picker,
  onDone,
}: {
  member: Member
  picker: React.ReactNode
  onDone: () => void
}) {
  const { s, prefs, now } = useApp()
  const last4 = prefs.phone.replace(/\D/g, "").slice(-4)
  const st = passState(s, member, now)
  return (
    <>
      {picker}
      {st.kind !== "valid" ? (
        <p className="text-body-s text-pretty">
          <span className="font-heavy">{st.line}</span> At the desk, give the
          member number <span className="tabular">{member.memberNumber}</span>.
        </p>
      ) : last4 ? (
        <p className="gap-xs flex items-center text-body-s">
          <Smartphone
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="tabular">Phone ending {last4}</span>
          <Link
            href="/settings/profile"
            onClick={onDone}
            className="ml-auto text-link underline underline-offset-4"
          >
            Change
          </Link>
        </p>
      ) : null}
    </>
  )
}

function SendAction({
  member,
  onDone,
}: {
  member: Member
  onDone: () => void
}) {
  const { s, me, prefs, now } = useApp()
  const last4 = prefs.phone.replace(/\D/g, "").slice(-4)
  if (passState(s, member, now).kind !== "valid") return null
  if (!last4)
    return (
      <Button render={<Link href="/settings/profile" />} onClick={onDone}>
        Add a phone number
      </Button>
    )
  return (
    <Button
      onClick={() => {
        toast({
          title: `Pass link sent to the phone ending ${last4}`,
          description:
            member.id === me.id ? undefined : `${member.firstName}'s pass`,
        })
        onDone()
      }}
    >
      Send to my phone
    </Button>
  )
}
