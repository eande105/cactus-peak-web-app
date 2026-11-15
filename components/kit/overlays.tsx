"use client"
import type { ReactNode } from "react"
import { AlertDialog, Dialog, Drawer } from "@/components/graphical"
import { X } from "@/components/icons"
import { useMedia } from "@/hooks/use-media"
import { cn } from "@/lib/utils"

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
  className,
  hideTitle,
  hideClose,
  initialFocus,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  wide?: boolean
  className?: string
  hideTitle?: boolean
  /** No close button: for a dialog that Esc and a click outside close, such as the command menu. */
  hideClose?: boolean
  initialFocus?: React.RefObject<HTMLElement | null>
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          className={cn(
            "gap-m",
            // A dialog whose content needs the room (a form with fields side by side, a list of options, a search). From
            // 640 px it is 560 px wide: the utilities beat the runtime's base-layer width and its 420 px popup cap only at
            // that breakpoint, so on a phone it keeps the modal's own width.
            wide &&
              "sm:w-[min(560px,calc(100vw-var(--space-xl)))] sm:max-w-none",
            className
          )}
          initialFocus={initialFocus}
        >
          <div
            className={cn(
              "flex items-start justify-between gap-m",
              hideTitle && hideClose && "sr-only"
            )}
          >
            <Dialog.Title
              className={cn(
                "text-body-l font-heavy text-balance",
                hideTitle && "sr-only"
              )}
            >
              {title}
            </Dialog.Title>
            {hideClose ? null : (
              <Dialog.Close
                aria-label="Close"
                className={cn(
                  "grid size-11 shrink-0 place-items-center",
                  "-mt-s -mr-s corner-s",
                  "hover:bg-muted"
                )}
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            )}
          </div>
          {description ? (
            <Dialog.Description className="text-body-m text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">
              {typeof title === "string" ? title : "Dialog"}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  const wide = useMedia("(min-width: 768px)")
  if (!wide) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Viewport>
            <Drawer.Popup>
              <Drawer.Content>
                <span
                  aria-hidden="true"
                  className="mx-auto h-1 w-10 corner-full bg-input"
                />
                <Drawer.Title className="text-body-l font-heavy text-balance">
                  {title}
                </Drawer.Title>
                {description ? (
                  <Drawer.Description className="text-body-m text-muted-foreground">
                    {description}
                  </Drawer.Description>
                ) : null}
                <div className={cn("flex flex-col gap-m", className)}>
                  {children}
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup className={cn("gap-m", className)}>
          <AlertDialog.Title className="text-body-l font-heavy text-balance">
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="text-body-m text-muted-foreground">
              {description}
            </AlertDialog.Description>
          ) : null}
          {children}
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

// Right-docked sheet from 768px, bottom sheet below. Used for class detail and filters.
export function SideSheet({
  open,
  onOpenChange,
  title,
  children,
  label,
  onClosed,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title?: ReactNode
  label: string
  children: ReactNode
  onClosed?: () => void
}) {
  const wide = useMedia("(min-width: 768px)")
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={wide ? "right" : "down"}
      onOpenChangeComplete={(o) => {
        if (!o) onClosed?.()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Viewport className="side-drawer-viewport">
          <Drawer.Popup
            className="side-drawer !gap-zero !p-zero"
            aria-label={label}
          >
            <Drawer.Content className="min-h-full !gap-zero">
              <Drawer.Title className={title ? "sr-only" : "sr-only"}>
                {title ?? label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                {label}
              </Drawer.Description>
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
export { Drawer }
