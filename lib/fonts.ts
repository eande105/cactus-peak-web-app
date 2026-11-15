import { Archivo, Inter } from "next/font/google"

// Graphical's font roles (graphical/themes/graphical.json): Inter for body, Archivo for display and data.
// Both are variable files, so one request covers every role weight: Inter 400, 500, 600 and Archivo 400 to 800.
// next/font renames each family, so the theme's role stacks name these loader variables, not the family names.
// app/layout.tsx puts both classes on <html>, so theme.css's --font-* roles resolve everywhere, portals included.
export const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-archivo",
})
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})
