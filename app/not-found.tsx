import Link from "next/link"
import { StatusPage } from "@/components/app/status-page"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <StatusPage
      standalone
      object="location"
      title="We couldn't find that page"
      body="The link may be old, or the page moved. Try Today or the schedule."
      actions={
        <>
          <Button render={<Link href="/today" />}>Back to Today</Button>
          <Button variant="outline" render={<Link href="/schedule" />}>
            Open the schedule
          </Button>
        </>
      }
    />
  )
}
