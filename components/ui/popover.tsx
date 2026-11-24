"use client"

import type { ComponentProps } from "react"

import { Popover as GraphicalPopover } from "@/components/graphical"
import { cn } from "@/lib/utils"

// The shadcn popover (base-nova: Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle,
// PopoverDescription) on the Graphical Popover. The theme owns the
// surface: the card fill, the edge as a box shadow, the M elevation, M corners and padding, the S gap, the width caps
// and the scroll at the available height. shadcn's own surface classes are left out, so they do not compete with it.

function Popover(props: ComponentProps<typeof GraphicalPopover.Root>) {
  return <GraphicalPopover.Root data-slot="popover" {...props} />
}

function PopoverTrigger(
  props: ComponentProps<typeof GraphicalPopover.Trigger>
) {
  return <GraphicalPopover.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * The positioned popup. `sideOffset` defaults to the popover's gap (XS, 8 px), as the specification asks. `anchor`
 * places it against another element than its trigger, for a popover that one list opens from many rows.
 * `finalFocus` is where focus goes when it closes.
 */
function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  anchor,
  collisionPadding = 16,
  finalFocus,
  initialFocus,
  ...props
}: ComponentProps<typeof GraphicalPopover.Popup> &
  Pick<
    ComponentProps<typeof GraphicalPopover.Positioner>,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "anchor"
    | "collisionPadding"
  >) {
  return (
    <GraphicalPopover.Portal>
      <GraphicalPopover.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionPadding={collisionPadding}
      >
        <GraphicalPopover.Popup
          data-slot="popover-content"
          finalFocus={finalFocus}
          initialFocus={initialFocus}
          className={cn("outline-none", className)}
          {...props}
        />
      </GraphicalPopover.Positioner>
    </GraphicalPopover.Portal>
  )
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("gap-xxs flex min-w-0 flex-col", className)}
      {...props}
    />
  )
}

function PopoverTitle(props: ComponentProps<typeof GraphicalPopover.Title>) {
  return <GraphicalPopover.Title data-slot="popover-title" {...props} />
}

function PopoverDescription(
  props: ComponentProps<typeof GraphicalPopover.Description>
) {
  return (
    <GraphicalPopover.Description data-slot="popover-description" {...props} />
  )
}

/** The popover's close control. Render it inside `PopoverContent`; style it as the caller's control. */
function PopoverClose(props: ComponentProps<typeof GraphicalPopover.Close>) {
  return <GraphicalPopover.Close data-slot="popover-close" {...props} />
}

export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
