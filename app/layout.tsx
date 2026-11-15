import type { Metadata, Viewport } from "next"

import "./globals.css"
import { CatalogBoundary } from "@/components/app/catalog-boundary"
import { theme } from "@/components/graphical/theme"
import { GraphicalThemeProvider } from "@/components/graphical-theme-provider"
import { ThemeProvider } from "@/components/theme-provider"
import EditorRoot from "@/graphical/editor-root"
import { getCatalog } from "@/lib/data/catalog-server"
import { archivo, inter } from "@/lib/fonts"
import { Toaster } from "@/lib/toast"

export const metadata: Metadata = {
  title: {
    default: "Cactus Peak Athletic",
    template: "%s · Cactus Peak Athletic",
  },
  description:
    "The Cactus Peak Athletic member portal. Sample project, not a real gym.",
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }] },
  manifest: "/site.webmanifest",
}
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#121A16" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Clubs, classes, coaches and plans come from Supabase. A failed read shows app/global-error.tsx.
  const catalog = await getCatalog()
  return (
    <html
      lang="en-US"
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} antialiased`}
    >
      <body>
        <ThemeProvider>
          <GraphicalThemeProvider document={theme}>
            <Toaster>
              <CatalogBoundary catalog={catalog}>
                {/* The Graphical editor, in development only (graphical/editor-root.tsx). */}
                <EditorRoot>
                  <div className="isolate min-h-dvh">{children}</div>
                </EditorRoot>
              </CatalogBoundary>
            </Toaster>
          </GraphicalThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
