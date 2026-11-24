import Link from "next/link"
import { StatusPage } from "@/components/app/status-page"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <StatusPage
      object="cone"
      title="We're doing a short upgrade"
      body="We'll be back by 6 am. Your bookings are safe."
      actions={
        <Button variant="outline" render={<Link href="/help" />}>
          Contact the front desk
        </Button>
      }
    />
  )
}
