import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Offline() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-start justify-center gap-m px-m"
    >
      <h1 className="font-display-wide text-display-s font-heavy">
        You&apos;re offline.
      </h1>
      <p className="text-muted-foreground">
        These still work: your pass and your bookings. We will update everything
        when you reconnect.
      </p>
      <ul className="flex gap-xs">
        <li>
          <Button variant="outline" render={<Link href="/pass" />}>
            Pass
          </Button>
        </li>
        <li>
          <Button variant="outline" render={<Link href="/bookings" />}>
            Bookings
          </Button>
        </li>
      </ul>
      <Button render={<Link href="/today" />}>Try again</Button>
    </main>
  )
}
