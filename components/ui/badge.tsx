import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Kit badge (Graphical has no badge): radius xs, Body S heavy, a 1px edge drawn as a shadow.
// Each tone has its own colour, so a status reads at a glance and two statuses never look alike. Every text colour
// was checked at 4.5:1 or more in both modes:
// - success and info are coloured text on the surface with an edge in the same colour. Their text on their own tint
//   is under 4.5:1, so they take no fill. They are the calm states: done, open, active.
// - warning and danger are coloured text on their own tint. They are the states that need the member.
// - accent is Copper Deep (the link colour) on the Copper tint: the member's own thing, such as the home club.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-xxs corner-xs px-xs py-xxs text-body-s font-heavy whitespace-nowrap has-data-[icon=inline-end]:pr-xxs has-data-[icon=inline-start]:pl-xxs [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-foreground",
        outline: "bg-transparent text-foreground hairline ring-input",
        success:
          "bg-transparent text-success hairline ring-success-translucent",
        info: "bg-transparent text-color-3 hairline ring-color-3-translucent",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-destructive",
        accent: "bg-accent text-link",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

function Badge({
  className,
  tone = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ tone }), className) },
      props
    ),
    render,
    state: { slot: "badge", tone },
  })
}

export { Badge, badgeVariants }
