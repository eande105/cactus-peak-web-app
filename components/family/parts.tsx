"use client"
import { Facts } from "@/components/kit/app"
import { Confirm } from "@/components/kit/overlays"
import { StatusPill } from "@/components/kit/ui"
import { Button } from "@/components/ui/button"
import { removeFamilyMember, undoRemoveMember } from "@/lib/actions"
import { fmtDayShort } from "@/lib/time"
import { toast } from "@/lib/toast"
import type { Member } from "@/lib/types"

export const ROLE = {
  primary: "Primary",
  adult: "Adult",
  teen: "Teen",
  child: "Child",
} as const

/** The role of a member as a pill. The primary member has the accent pill. */
export function RolePill({
  role,
  className,
}: {
  role: Member["role"]
  className?: string
}) {
  return (
    <StatusPill
      tone={role === "primary" ? "accent" : "outline"}
      className={className}
    >
      {ROLE[role]}
    </StatusPill>
  )
}

/**
 * The dialog that removes a member from the plan. It states what happens, and "Keep" is its primary action.
 * `member` is null while the dialog is closed. `onRemoved` runs after the removal, for a screen that must leave.
 */
export function RemoveMemberConfirm({
  member,
  ends,
  onClose,
  onRemoved,
  className,
}: {
  member: Member | null
  /** The day access ends: the next billing date. */
  ends: number
  onClose: () => void
  onRemoved?: () => void
  className?: string
}) {
  return (
    <Confirm
      open={!!member}
      onOpenChange={(o) => !o && onClose()}
      title={`Remove ${member?.firstName} from your plan?`}
      className={className}
    >
      <Facts
        items={[
          { label: "Access ends", value: fmtDayShort(ends) },
          {
            label: "Bookings after that date",
            value: "Cancelled, no late-cancel strike",
          },
          { label: "Refund for this month", value: "None" },
        ]}
      />
      <div className="gap-xs flex flex-col">
        <Button className="w-full" onClick={onClose}>
          Keep {member?.firstName}
        </Button>
        <Button
          variant="ghost"
          className="w-full !text-destructive"
          onClick={() => {
            if (!member) return
            const id = member.id
            removeFamilyMember(id)
            toast({
              title: `${member.firstName} will be removed ${fmtDayShort(ends)}`,
              action: { label: "Undo", onClick: () => undoRemoveMember(id) },
            })
            onClose()
            onRemoved?.()
          }}
        >
          Remove {member?.firstName}
        </Button>
      </div>
    </Confirm>
  )
}
