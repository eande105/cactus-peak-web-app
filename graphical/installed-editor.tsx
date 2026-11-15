"use client"

// Loaded only in development, through graphical/development-editor.tsx. The Graphical editor for this app: it
// previews theme and element edits live, and Copy for agent hands them to graphical-adopt to write into source.
import "./editor.css"
import {
  GraphicalInstalledEditor,
  readGraphicalProject,
} from "@graphical/editor/native"
import { useTheme } from "next-themes"
import { type ReactNode, useCallback } from "react"
import project from "./project.json"
import roleMap from "./role-map.json"
import theme from "./themes/graphical.json"

// Every project theme's JSON, by its path in project.json. Add new themes here.
const current = readGraphicalProject(
  project,
  { "themes/graphical.json": theme },
  roleMap
)

export default function InstalledEditor({
  children,
  route,
}: {
  children: ReactNode
  route: string
}) {
  // next-themes owns the color mode, so the editor's light/dark switch goes through it.
  const { resolvedTheme, setTheme } = useTheme()
  const onColorModeChange = useCallback(
    (mode: "light" | "dark") => setTheme(mode),
    [setTheme]
  )
  return (
    <GraphicalInstalledEditor
      document={current.document}
      roleMap={current.roleMap}
      handoffContext={current.handoffContext}
      route={route}
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      onColorModeChange={onColorModeChange}
      adoptSkillPath=".agents/skills/graphical-adopt/SKILL.md"
    >
      {children}
    </GraphicalInstalledEditor>
  )
}
