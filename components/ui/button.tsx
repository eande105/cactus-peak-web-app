import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

// Button, converted to the Graphical assignments in gui/components/cactus-peak-athletic/button.md.
// Common to every variant: radius s, ui font, label type role (size s, line s, heavy), 1px edge drawn as a shadow,
// hover and focus states, 1px press movement, small motion. Variants:
//   primary    fill color-1, padding s / l (44px tall), hover fill color-6 plus elevation s
//   secondary  fill neutral-3, edge neutral-6, padding s / m (44px tall), hover fill neutral-4 and edge neutral-8
//   outline    no fill, edge neutral-6, hover fill neutral-3 at 20% and edge neutral-8
//   ghost      no fill, no edge, hover fill neutral-4
//   destructive (Graphical "danger") fill error, padding s / m (44px tall), hover fill color-7 plus elevation s
//   link       app-specific text link, kept: Graphical has no equivalent
// Focus: the global :focus-visible ring (color-5, 2px) and the edge turns color-1 at 20%.
// Disabled: neutral-6 text. Outline and ghost stay transparent (outline keeps its neutral-6 edge), as in Graphical.
// Filled variants use the muted fill. muted is neutral-4 here, not Graphical's neutral-3, because the page itself is
// neutral-3 (Sand) in app/globals.css; a neutral-3 disabled fill would disappear into the page.
// Sizes are the member app's, not Graphical's (Graphical Button has no sizes and is 44px tall). The app is a dense
// tool, so it uses two heights: md is 36px and sm is 28px. Both grow to 44px on a phone. lg (48px) is for the pages
// outside the app shell: sign-in, error, offline.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-xs corner-s text-body-s font-heavy whitespace-nowrap hairline ring-transparent transition-[background-color,color,box-shadow,translate] select-none focus-visible:ring-accent active:translate-y-(--motion-press-distance) disabled:pointer-events-none disabled:bg-muted disabled:text-disabled-foreground disabled:shadow-none disabled:ring-border/20 disabled:hover:bg-muted aria-busy:pointer-events-none motion-reduce:transition-none motion-reduce:active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground ring-accent hover:bg-primary-hover hover:shadow-(--shadow-s)",
        secondary:
          "bg-secondary text-secondary-foreground ring-border-strong hover:bg-secondary-hover hover:ring-border-strong-hover",
        outline:
          "bg-transparent text-foreground ring-border-strong hover:bg-hover hover:ring-border-strong-hover disabled:bg-transparent disabled:ring-border-strong disabled:hover:bg-transparent",
        ghost:
          "bg-transparent text-foreground hover:bg-secondary-hover disabled:bg-transparent disabled:ring-transparent disabled:hover:bg-transparent",
        destructive:
          "bg-destructive text-primary-foreground ring-destructive/20 hover:bg-destructive-hover hover:shadow-(--shadow-s)",
        link: "min-h-0 corner-xs bg-transparent px-zero text-primary underline underline-offset-4 shadow-none hover:decoration-2 active:translate-y-0",
      },
      size: {
        md: "",
        lg: "px-l py-m",
        // A touch-only overlay (TouchTarget) lifts the hit area of sm and icon to 44px.
        sm: "relative gap-xs px-s py-xxs has-data-[icon=inline-end]:pr-xs has-data-[icon=inline-start]:pl-xs max-sm:min-h-11 max-sm:px-s",
        icon: "relative size-11 sm:size-9",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: "md",
        className:
          "px-m py-xs has-data-[icon=inline-end]:pr-s has-data-[icon=inline-start]:pl-s max-sm:min-h-11",
      },
      {
        variant: ["secondary", "outline", "ghost", "destructive"],
        size: "md",
        className:
          "px-s py-xs has-data-[icon=inline-end]:pr-xs has-data-[icon=inline-start]:pl-xs max-sm:min-h-11",
      },
      {
        variant: "link",
        size: ["md", "lg", "sm"],
        className: "px-zero py-zero",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

// Invisible overlay that makes a small control at least 44px square for touch. Mouse users do not get it.
// Put it as a direct child of a `relative` control.
function TouchTarget() {
  return (
    <span
      className="absolute top-1/2 left-1/2 size-[max(100%,calc(var(--spacing)*11))] -translate-1/2 pointer-fine:hidden"
      aria-hidden="true"
    />
  )
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    // Shows a spinner, keeps the label width, and blocks clicks. Sets aria-busy.
    loading?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      nativeButton={props.render ? false : undefined}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="relative inline-flex items-center justify-center">
          <span className="inline-flex items-center gap-xs opacity-0">
            {children}
          </span>
          <Loader2Icon
            className="absolute size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        </span>
      ) : (
        children
      )}
      {size === "sm" || size === "icon" ? <TouchTarget /> : null}
    </ButtonPrimitive>
  )
}

export type { ButtonProps }
export { Button, buttonVariants, TouchTarget }
