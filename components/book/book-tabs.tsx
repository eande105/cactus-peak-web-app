"use client"
import type { ReactNode } from "react"
import { useApp } from "@/components/app/use-app"
import { AppPage, TabLinks } from "@/components/kit/app"

const TABS = [
  { href: "/schedule", label: "Classes", match: "/schedule" },
  { href: "/reserve/courts", label: "Courts", match: "/reserve/courts" },
  { href: "/reserve/lanes", label: "Lap lanes", match: "/reserve/lanes" },
  {
    href: "/reserve/kids-club",
    label: "Kids club",
    match: "/reserve/kids-club",
  },
  { href: "/training", label: "Training", match: "/training" },
] as const

/**
 * The Book workspace: one screen with a tab for each thing a member can book.
 * Every bookable page is a `BookPage`. `actions` sit at the right end of the page bar.
 */
export function BookPage({
  actions,
  children,
}: {
  actions?: ReactNode
  children: ReactNode
}) {
  const { me } = useApp()
  const adult = me.role === "primary" || me.role === "adult"
  const tabs = TABS.filter((t) =>
    t.href === "/reserve/kids-club"
      ? adult
      : t.href === "/reserve/courts"
        ? me.role !== "teen"
        : true
  )
  return (
    <AppPage
      title="Book"
      width="wide"
      actions={actions}
      tabs={
        <TabLinks label="What to book" items={tabs.map((t) => ({ ...t }))} />
      }
    >
      {children}
    </AppPage>
  )
}
