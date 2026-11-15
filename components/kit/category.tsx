import { CategoryIcon } from "@/components/kit/icons"
import { CATEGORY_BY_ID } from "@/lib/data/catalog"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

// Category colour is never the only signal: icon and name always show. Text sits on the tint, never on a muted fill.
export function CategoryBadge({
  id,
  size = "sm",
  className,
  nameOnly,
}: {
  id: CategoryId
  size?: "sm" | "md"
  className?: string
  nameOnly?: boolean
}) {
  return (
    <span
      className={cn(
        `cat-${id}`,
        "inline-flex items-center gap-xxs corner-xs bg-cat-tint font-heavy text-cat-text",
        size === "sm"
          ? "px-xs py-xxs text-body-xs"
          : "px-xs py-xxs text-body-s",
        className
      )}
    >
      {nameOnly ? null : (
        <CategoryIcon
          id={id}
          className={size === "sm" ? "size-3.5" : "size-4"}
        />
      )}
      {CATEGORY_BY_ID[id].name}
    </span>
  )
}
