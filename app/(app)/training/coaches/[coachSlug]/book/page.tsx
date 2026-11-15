import { notFound } from "next/navigation"
import BookPage from "@/components/training/book-page"
import { getCatalog } from "@/lib/data/catalog-server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ coachSlug: string }>
}) {
  const { coachSlug } = await params
  const coach = (await getCatalog()).coaches.find((x) => x.slug === coachSlug)
  return { title: coach ? `Book ${coach.name}` : "Book a coach" }
}

export default async function Page({
  params,
}: {
  params: Promise<{ coachSlug: string }>
}) {
  const { coachSlug } = await params
  const { coaches } = await getCatalog()
  if (!coaches.some((x) => x.slug === coachSlug)) notFound()
  return <BookPage slug={coachSlug} />
}
