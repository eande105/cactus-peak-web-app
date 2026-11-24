import Link from "next/link"
import type { ReactNode } from "react"
import { GymObject, type ObjectId } from "@/components/brand/graphics"
import { cn } from "@/lib/utils"

/**
 * One layout for the pages that say why a member can't go on: no access, maintenance, not found and offline. After
 * the incident.io and Snowflake empty pages: one object, a title, one line and the next steps, centred in the space
 * the page has. Inside the shell it fills the content sheet. Outside the shell (`standalone`) it fills the window and
 * carries the brand mark, because no sidebar says where the member is.
 */
export function StatusPage({
  object,
  title,
  body,
  actions,
  children,
  standalone = false,
}: {
  object: ObjectId
  title: string
  body: ReactNode
  actions: ReactNode
  /** Extra content under the actions, such as the places that still work offline. */
  children?: ReactNode
  standalone?: boolean
}) {
  const content = (
    <div className="gap-l mx-auto flex w-full max-w-[440px] flex-col items-center text-center">
      <GymObject id={object} cut className="size-20" />
      <div className="gap-xs flex flex-col">
        <h1
          className={cn(
            "font-display-wide font-heavy text-balance",
            standalone ? "text-display-s" : "text-display-xs"
          )}
        >
          {title}
        </h1>
        <p className="text-body-m text-pretty text-muted-foreground">{body}</p>
      </div>
      <div className="gap-xs flex flex-wrap items-center justify-center">
        {actions}
      </div>
      {children}
    </div>
  )

  if (!standalone) {
    return (
      <div className="px-m py-xxl grid min-h-[min(70dvh,640px)] place-items-center">
        {content}
      </div>
    )
  }

  return (
    <main
      id="main"
      className={cn("px-m py-xl flex min-h-dvh flex-col items-center")}
    >
      <Link href="/today" aria-label="Cactus Peak Athletic" className="mb-auto">
        {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
        <img
          src="/brand/cpa-horizontal-color.svg"
          alt="Cactus Peak Athletic"
          className="h-10 w-auto dark:hidden"
        />
        {/* biome-ignore lint/performance/noImgElement: static SVG brand mark, next/image adds nothing */}
        <img
          src="/brand/cpa-horizontal-reversed.svg"
          alt=""
          className="hidden h-10 w-auto dark:block"
        />
      </Link>
      <div className="py-xxl w-full">{content}</div>
      <div className="mt-auto" />
    </main>
  )
}
