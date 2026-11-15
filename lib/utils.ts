import { type ClassValue, clsx } from "clsx"
import { createCn } from "cn/config"
import graphicalClasses from "@/graphical/generated/tailwind-merge.cjs"

// shadcn's `cn` package merges the classes, extended with Graphical's classes (graphical/generated/
// tailwind-merge.cjs), so a caller's `text-body-s` replaces `text-body-m`, `corner-zero` replaces `corner-m`, and
// `font-heavy` replaces `font-regular`, the way Tailwind's own classes do.
// The app's own steps join Graphical's: the section rhythm (app/globals.css).
const merge = createCn({
  extend: {
    ...graphicalClasses.extend,
    theme: {
      ...graphicalClasses.extend?.theme,
      spacing: [
        ...(graphicalClasses.extend?.theme?.spacing ?? []),
        "section",
        "section-l",
      ],
    },
  },
})

// The outer clsx call returns the merged string unchanged. Graphical's style tools follow class lists through a
// helper that returns a clsx, classnames or tailwind-merge call, and they don't know the `cn` package yet.
// Without it, `graphical-install --check` can't see the classes passed to cn().
export function cn(...inputs: ClassValue[]) {
  return clsx(merge(...inputs))
}
