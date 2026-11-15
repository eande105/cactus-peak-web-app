"use client"
import { SessionDetail } from "@/components/booking/session-detail"
import { AppPage } from "@/components/kit/app"
import { sessionById } from "@/lib/data/sessions"

/** The class detail as a full page: the content column, and from 1024 px the sticky booking card beside it. */
export function SessionPage({ id }: { id: string }) {
  const se = sessionById(id)
  return (
    <AppPage
      title={se?.name ?? "Class"}
      back={{ href: "/schedule", label: "Schedule" }}
      width="narrow"
      className="lg:max-w-[66rem]"
    >
      <SessionDetail id={id} mode="page" />
    </AppPage>
  )
}
