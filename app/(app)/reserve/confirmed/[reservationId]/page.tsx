import type { Metadata } from "next"
import ConfirmedPage from "@/components/reserve/confirmed-page"

export const metadata: Metadata = { title: "Reservation confirmed" }

export default async function Page({
  params,
}: {
  params: Promise<{ reservationId: string }>
}) {
  const { reservationId } = await params
  return <ConfirmedPage id={reservationId} />
}
