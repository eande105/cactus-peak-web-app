"use client"
import { useEffect, useState } from "react"

/** Put this on a control in a page that opens the pass, so the phone header hides its own Pass button beside it. */
export const PASS_ANCHOR = { "data-pass-anchor": "" } as const

/**
 * True while a page's own pass control (marked with `PASS_ANCHOR`) is on screen below the phone header. The header
 * Pass button hides then, so one screen never shows two ways to open the same pass, and comes back once the member
 * scrolls past the card. A page with no marked control always gets the header button.
 *
 * `path` restarts the watch on navigation. `top` is the header height, so a control under the header counts as gone.
 */
export function usePassInView(path: string, top: number) {
  const [inView, setInView] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `path` restarts the watch on navigation, so the last page's anchors are dropped
  useEffect(() => {
    const seen = new Map<Element, boolean>()
    const update = () => {
      for (const el of seen.keys()) if (!el.isConnected) seen.delete(el)
      setInView([...seen.values()].some(Boolean))
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting)
        update()
      },
      { rootMargin: `-${top}px 0px 0px 0px` }
    )
    // Pages render their cards after the member's data loads, so watch for anchors that arrive later.
    const scan = () => {
      for (const el of document.querySelectorAll("[data-pass-anchor]")) {
        if (!seen.has(el)) {
          seen.set(el, false)
          io.observe(el)
        }
      }
      update()
    }
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [path, top])
  return inView
}
