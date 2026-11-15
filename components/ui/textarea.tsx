import type * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full min-w-0 hairline",
        "corner-s px-s py-s",
        "text-body-m",
        "bg-card text-foreground ring-input transition-[box-shadow]",
        "placeholder:text-muted-foreground hover:ring-input-hover focus-visible:ring-accent disabled:bg-muted disabled:text-disabled-foreground aria-invalid:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
