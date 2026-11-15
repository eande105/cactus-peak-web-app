"use client"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useEffect } from "react"
import { TriangleAlert } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { loadStore, retryLoad, useStore, useStoreStatus } from "@/lib/store"

// Loads the signed-in household from Supabase before member pages render.
// Shows a skeleton in the shape of the page while it loads, and a real error with a retry if it fails.
export function HouseholdGate({
  children,
  skeleton,
}: {
  children: ReactNode
  skeleton: ReactNode
}) {
  const s = useStore()
  const status = useStoreStatus()
  const router = useRouter()
  const path = usePathname()
  useEffect(() => {
    void loadStore()
  }, [])
  useEffect(() => {
    if (status.kind === "signed-out")
      router.replace(`/sign-in?next=${encodeURIComponent(path)}`)
  }, [status.kind, router, path])

  if (status.kind === "error" && !s)
    return <LoadError message={status.message} />
  if (!s) return skeleton
  return children
}

function LoadError({ message }: { message: string }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-start justify-center gap-s px-m"
    >
      <div role="alert" className="flex flex-col items-start gap-s">
        <TriangleAlert className="size-6 text-warning" aria-hidden="true" />
        <h1 className="font-display-wide font-display-wide text-body-xxl font-heavy">
          We couldn&apos;t load your account.
        </h1>
        <p className="text-muted-foreground">
          {offline
            ? "You're offline. Connect, then try again."
            : "Your bookings are safe. Try again in a moment."}
        </p>
        <Button onClick={() => void retryLoad()}>Try again</Button>
        <p className="text-body-xs text-muted-foreground">Error: {message}</p>
      </div>
    </main>
  )
}

// Same frame as the signed-in shell: the sidebar, the top bar, then cards.
export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true">
      <div className="gap-s p-s hidden w-60 shrink-0 flex-col rule-r lg:flex">
        <Skeleton className="h-8 w-36" />
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="gap-s px-m lg:px-l flex h-14 items-center rule-b">
          <Skeleton className="h-9 w-64 max-sm:hidden" />
          <Skeleton className="ml-auto h-9 w-20" />
          <Skeleton className="size-8 corner-full" />
        </div>
        <main id="main" className="gap-m p-m lg:p-l flex flex-1 flex-col">
          <p role="status" className="sr-only">
            Loading your day…
          </p>
          <Skeleton className="h-8 w-40" />
          <div className="gap-m grid lg:grid-cols-[3fr_2fr]">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </main>
      </div>
    </div>
  )
}

// The onboarding flow is a single narrow column.
export function FlowSkeleton() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-m px-m pt-xl"
    >
      <p role="status" className="sr-only">
        Loading…
      </p>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-40 w-full" />
    </main>
  )
}
