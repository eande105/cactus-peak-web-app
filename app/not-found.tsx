import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-start justify-center gap-m px-m"
    >
      <p className="eyebrow text-muted-foreground">404</p>
      <h1 className="font-display-wide text-display-s font-heavy">
        We couldn&apos;t find that page.
      </h1>
      <p className="text-muted-foreground">
        Try the schedule, or go back to Today.
      </p>
      <div className="flex gap-xs">
        <Button render={<Link href="/today" />}>Back to Home</Button>
        <Button variant="outline" render={<Link href="/schedule" />}>
          Open the schedule
        </Button>
      </div>
    </main>
  )
}
