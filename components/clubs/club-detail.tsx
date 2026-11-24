"use client"
import { notFound } from "next/navigation"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/use-app"
import {
  AmenitiesSection,
  ClassesSection,
  ClubActions,
  ClubHero,
  CoachesSection,
  CrowdSection,
  DetailsSection,
  HoursSection,
  ReserveSection,
  SetClubAction,
} from "@/components/clubs/club-detail-parts"
import { AppPage, TabButtons } from "@/components/kit/app"
import { LoadingBlock } from "@/components/kit/ui"
import { CLUB_BY_SLUG } from "@/lib/data/catalog"
import { sessionsForDay } from "@/lib/data/sessions"
import { dayStart } from "@/lib/time"

type Tab = "overview" | "classes" | "amenities"

/**
 * One club as a place card (the iOS Maps pattern). The map head, the title, the strip and the actions are the same on
 * every width. Below `lg` the sections follow in one column with no tabs. From `lg` the tabs return (Overview,
 * Classes, Amenities) and Overview is two columns: Crowd and Hours on the left, Reserve and Details on the right.
 * Both layouts are in the page and CSS shows one, so the page needs no width check.
 */
export default function ClubDetail({ slug }: { slug: string }) {
  const { now } = useApp()
  const club = CLUB_BY_SLUG[slug]
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>("overview")
  // biome-ignore lint/correctness/useExhaustiveDependencies: slug restarts the fake load delay when the club changes
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [slug])
  if (!club) notFound()
  if (loading) return <LoadingBlock text="Loading club…" rows={5} />
  const classCount = sessionsForDay(slug, dayStart(now)).filter(
    (x) => x.start > now
  ).length

  return (
    <AppPage
      // The page bar is for a wide screen. On a phone the map head replaces it (its back chip and its title).
      className="max-lg:[&>header]:hidden"
      back={{ href: "/clubs", label: "Clubs" }}
      title={<span className="sr-only">{club.name}</span>}
      actions={
        <div className="max-lg:hidden">
          <SetClubAction slug={slug} />
        </div>
      }
      tabs={
        <div className="max-lg:hidden">
          <TabButtons<Tab>
            label="Club sections"
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Overview" },
              { value: "classes", label: "Classes", count: classCount },
              { value: "amenities", label: "Amenities" },
            ]}
          />
        </div>
      }
    >
      <ClubHero slug={slug} />
      <ClubActions slug={slug} />

      {/* Phone: every section in one column. */}
      <div className="gap-l flex flex-col lg:hidden">
        <ReserveSection slug={slug} />
        <ClassesSection slug={slug} />
        <CrowdSection slug={slug} />
        <HoursSection slug={slug} />
        <AmenitiesSection slug={slug} />
        <CoachesSection slug={slug} />
        <DetailsSection slug={slug} />
        <div className="flex justify-center">
          <SetClubAction slug={slug} />
        </div>
      </div>

      {/* Desktop: the tab picks the block. */}
      <div className="max-lg:hidden">
        {tab === "overview" ? (
          <div className="gap-l grid grid-cols-2 items-start">
            <div className="gap-l flex min-w-0 flex-col">
              <CrowdSection slug={slug} />
              <HoursSection slug={slug} />
            </div>
            <div className="gap-l flex min-w-0 flex-col">
              <ReserveSection slug={slug} />
              <DetailsSection slug={slug} />
            </div>
          </div>
        ) : null}
        {tab === "classes" ? <ClassesSection slug={slug} /> : null}
        {tab === "amenities" ? (
          <div className="gap-l flex flex-col">
            <AmenitiesSection slug={slug} />
            <CoachesSection slug={slug} />
          </div>
        ) : null}
      </div>
    </AppPage>
  )
}
