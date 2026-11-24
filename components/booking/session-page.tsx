"use client"
import Link from "next/link"
import { SessionDetail } from "@/components/booking/session-detail"
import { ArrowLeft } from "@/components/icons"

/**
 * The class detail as a full page. The hero carries the title, so the page has no bar title of its own: below `lg` a
 * back button sits over the hero, and from `lg` a back link sits above it. From `lg` the sticky booking card sits beside
 * the content column.
 */
export function SessionPage({ id }: { id: string }) {
  return (
    <div className="gap-m flex w-full max-w-[720px] flex-col lg:max-w-[66rem]">
      <Link
        href="/schedule"
        className="gap-xs inline-flex w-fit items-center text-body-s text-muted-foreground hover:text-foreground max-lg:hidden"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        Schedule
      </Link>
      <SessionDetail id={id} mode="page" />
    </div>
  )
}
