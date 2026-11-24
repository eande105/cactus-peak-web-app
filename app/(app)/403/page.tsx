import Link from "next/link"
import { StatusPage } from "@/components/app/status-page"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <StatusPage
      object="pass"
      title="This page isn't open to you"
      body="Your role on the plan can't open it. Ask the person who manages your plan."
      actions={<Button render={<Link href="/today" />}>Back to Today</Button>}
    />
  )
}
