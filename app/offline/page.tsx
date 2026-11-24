import Link from "next/link"
import { StatusPage } from "@/components/app/status-page"
import { Button } from "@/components/ui/button"

export default function Offline() {
  return (
    <StatusPage
      standalone
      object="water-bottle"
      title="You're offline"
      body="Your pass and your bookings still work. We update everything when you reconnect."
      actions={
        <>
          <Button render={<Link href="/today" />}>Try again</Button>
          <Button variant="outline" render={<Link href="/pass" />}>
            Pass
          </Button>
          <Button variant="outline" render={<Link href="/bookings" />}>
            Bookings
          </Button>
        </>
      }
    />
  )
}
