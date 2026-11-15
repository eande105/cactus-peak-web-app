import type { Metadata } from "next"
import MemberProfile from "@/components/family/member-profile"

export const metadata: Metadata = { title: "Household member" }

export default async function Page({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  return <MemberProfile id={memberId} />
}
