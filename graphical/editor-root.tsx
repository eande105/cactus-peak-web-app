"use client"

// Mounts the Graphical editor around the app in development only. The import sits inside a compile-time
// NODE_ENV branch, so production builds contain no editor code or CSS. Production renders the app as it is.
import { type ComponentType, type ReactNode, useEffect, useState } from "react"

type ShellProps = { children: ReactNode }

const loadDevelopmentEditor =
  process.env.NODE_ENV === "development"
    ? () => import("./development-editor")
    : null

export default function EditorRoot({ children }: ShellProps) {
  const [Editor, setEditor] = useState<ComponentType<ShellProps> | null>(null)
  useEffect(() => {
    if (!loadDevelopmentEditor) return
    let active = true
    void loadDevelopmentEditor().then(
      ({ default: editor }) => {
        if (active) setEditor(() => editor)
      },
      (error) => {
        if (active)
          console.error("Graphical shell unavailable; app retained.", error)
      }
    )
    return () => {
      active = false
    }
  }, [])
  return Editor ? <Editor>{children}</Editor> : children
}
