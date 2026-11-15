"use client"

// Loaded only in development, by graphical/editor-root.tsx, after the page has hydrated. The loader keeps the app
// on screen while the editor loads, and restores it without the editor if the editor fails to load or render.
import { GraphicalEditorLoader } from "@graphical/editor/loader"
import { usePathname, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

type HostProps = { children: ReactNode; route: string }

const loadEditor = async () => ({
  GraphicalInstalledEditor: (await import("./installed-editor")).default,
})

export default function DevelopmentEditor({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  // The committed page, with its query, so an edit to one element stays on the page where it was made.
  const route = search ? `${pathname}?${search}` : pathname
  return (
    <GraphicalEditorLoader<HostProps> loadEditor={loadEditor} route={route}>
      {children}
    </GraphicalEditorLoader>
  )
}
