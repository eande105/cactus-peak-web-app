"use client"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-start justify-center gap-m px-m"
    >
      <h1 className="font-display-wide text-display-s font-heavy">
        Something went wrong on our side.
      </h1>
      <p className="text-muted-foreground">
        Your bookings are safe. Try again, or call{" "}
        <a className="tabular text-link underline" href="tel:4805550142">
          (480) 555-0142
        </a>
        .
      </p>
      <p className="tabular text-body-xs text-muted-foreground">
        Error id: {error.digest ?? "client"}
      </p>
      <div className="flex gap-xs">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<a href="/help" />}>
          Message the front desk
        </Button>
      </div>
    </main>
  )
}
