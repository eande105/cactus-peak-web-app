"use client"

// Shared with marketing-site/components/map/brand-map.tsx. Keep the two files identical. Each app wraps it in its own
// ClubMap, which supplies the pin label and the zoom buttons in that app's components.
//
// MapLibre's script loads on the client only, after the map mounts, so pages without a map never download it. Its
// CSS is imported in app/globals.css, in the components layer, beside the brand rules for its controls. Pins are
// React content portalled into MapLibre markers: they stay real buttons in the tab order and can use any app
// component. The map style comes from the live theme tokens (brand-map-style.ts) and is swapped when the colour
// mode changes.

import type { Map as MapLibreMap, Marker } from "maplibre-gl"
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { brandMapStyle, readMapTokens } from "./brand-map-style"

// Turbopack renames the bundle, so MapLibre cannot find its worker next to itself. scripts/copy-map-worker.mjs
// copies the worker into public/ with the package version in the name, which keeps old caches from mixing versions.
const WORKER_URL = "/maplibre/maplibre-gl-worker-6.16.0.mjs"
// Mesa and Gilbert with room to pan, so a visitor cannot lose the clubs off the edge of the map.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-112.25, 33.1],
  [-111.35, 33.65],
]

export type MapPin = { id: string; lat: number; lng: number }
export type MapApi = {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function BrandMap<P extends MapPin>({
  pins,
  selected,
  spotlight,
  renderPin,
  renderControls,
  focus,
  interactive = true,
  zoom = 14,
  label,
  className,
  style,
  fallback,
}: {
  pins: P[]
  selected?: string | null
  /**
   * The pin the page points at, such as the pin of a hovered list row. It sits over its neighbours, and when its pin
   * or label is out of view the map frames every pin again, so it shows among the others.
   */
  spotlight?: string | null
  renderPin: (pin: P, active: boolean) => ReactNode
  renderControls?: (api: MapApi) => ReactNode
  /** Centre on this pin at `zoom` instead of fitting every pin. */
  focus?: string
  /** Off: a still picture of the place, no pan, zoom or keyboard focus. Pins stay clickable. */
  interactive?: boolean
  zoom?: number
  label: string
  className?: string
  style?: CSSProperties
  fallback?: ReactNode
}) {
  const box = useRef<HTMLElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({})
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const focusPin = focus ? pins.find((p) => p.id === focus) : undefined

  const frame = useCallback(
    (animate: boolean) => {
      const m = map.current
      const list = pinsRef.current
      if (!m || !list.length) return
      const duration = animate && !reducedMotion() ? 600 : 0
      const one = focus ? list.find((p) => p.id === focus) : undefined
      if (one || list.length === 1) {
        const p = one ?? list[0]
        m.easeTo({ center: [p.lng, p.lat], zoom, duration })
        return
      }
      const lngs = list.map((p) => p.lng)
      const lats = list.map((p) => p.lat)
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        // Extra room at the top for the pin and its label, which stand above the point.
        {
          padding: { top: 96, bottom: 40, left: 72, right: 88 },
          maxZoom: 14,
          duration,
        }
      )
    },
    [focus, zoom]
  )

  // Create the map once. Props that change later are applied by the effects below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the map is built once; later prop changes have their own effects
  useEffect(() => {
    let cancelled = false
    let observer: MutationObserver | undefined
    const markerMap = markers.current
    import("maplibre-gl")
      .then((lib) => {
        if (cancelled || !box.current) return
        lib.setWorkerUrl(WORKER_URL)
        const start = focusPin ?? pinsRef.current[0]
        const m = new lib.Map({
          container: box.current,
          style: brandMapStyle(readMapTokens()) as never,
          center: start ? [start.lng, start.lat] : [-111.78, 33.38],
          zoom: start && (focusPin || pinsRef.current.length === 1) ? zoom : 11,
          interactive,
          // A page scroll over the map scrolls the page. Pinch or Ctrl/Cmd + scroll zooms the map.
          cooperativeGestures: interactive,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxBounds: MAX_BOUNDS,
          minZoom: 9,
          maxZoom: 17,
          attributionControl: { compact: true },
          reduceMotion: reducedMotion() || undefined,
        })
        m.touchZoomRotate.disableRotation()
        map.current = m
        m.on("load", () => {
          if (cancelled) return
          setStatus("ready")
          frame(false)
        })
        m.on("error", (e) => {
          // Tile and glyph misses are not fatal. Only a failure before the first load means no map.
          if (!m.loaded()) console.warn("Map failed to load", e.error)
        })
        m.once("idle", () => setStatus((s) => (s === "loading" ? "ready" : s)))
        for (const p of pinsRef.current) addMarker(lib, m, p.id, p)
        setHosts(collect(markerMap))
        // next-themes switches the colour mode with a class on <html>.
        observer = new MutationObserver(() =>
          m.setStyle(brandMapStyle(readMapTokens()) as never)
        )
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        })
      })
      .catch((e) => {
        console.warn("Map unavailable", e)
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
      observer?.disconnect()
      for (const mk of markerMap.values()) mk.remove()
      markerMap.clear()
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add and remove markers when the pin list changes (a filter hides a club), then frame the new set.
  const pinKey = pins.map((p) => p.id).join(",")
  // biome-ignore lint/correctness/useExhaustiveDependencies: pinKey stands for the pin list
  useEffect(() => {
    const m = map.current
    if (!m) return
    let alive = true
    import("maplibre-gl").then((lib) => {
      if (!alive) return
      const keep = new Set(pins.map((p) => p.id))
      for (const [id, mk] of markers.current) {
        if (!keep.has(id)) {
          mk.remove()
          markers.current.delete(id)
        }
      }
      for (const p of pins) {
        const mk = markers.current.get(p.id)
        if (mk) mk.setLngLat([p.lng, p.lat])
        else addMarker(lib, m, p.id, p)
      }
      setHosts(collect(markers.current))
      if (m.loaded()) frame(true)
    })
    return () => {
      alive = false
    }
  }, [pinKey])

  function addMarker(
    lib: typeof import("maplibre-gl"),
    m: MapLibreMap,
    id: string,
    p: MapPin
  ) {
    const el = document.createElement("div")
    el.dataset.pin = id
    // The pin's point is the bottom centre of its tail.
    const mk = new lib.Marker({ element: el, anchor: "bottom" })
      .setLngLat([p.lng, p.lat])
      .addTo(m)
    markers.current.set(id, mk)
  }

  // True when the pin and its label sit inside the map, clear of the zoom buttons' strip on the right.
  const inView = useCallback((id: string) => {
    const m = map.current
    const el = markers.current.get(id)?.getElement()
    if (!m || !el) return true
    const pin = el.getBoundingClientRect()
    const box = m.getContainer().getBoundingClientRect()
    return (
      pin.left >= box.left + 8 &&
      pin.right <= box.right - 56 &&
      pin.top >= box.top + 8 &&
      pin.bottom <= box.bottom - 24
    )
  }, [])

  // Lift the selected pin over its neighbours and bring it into view.
  useEffect(() => {
    for (const [id, mk] of markers.current)
      mk.getElement().style.zIndex =
        id === selected ? "3" : id === spotlight ? "2" : ""
  }, [selected, spotlight])
  useEffect(() => {
    const m = map.current
    const p = selected ? pinsRef.current.find((x) => x.id === selected) : null
    if (!m || !p || !interactive || focus || inView(p.id)) return
    m.easeTo({ center: [p.lng, p.lat], duration: reducedMotion() ? 0 : 500 })
  }, [selected, interactive, focus, inView])

  // Bring the spotlit pin into view with the others. The short wait keeps a pointer that crosses several rows from
  // moving the map for each one. A pin already in view leaves the map where the member put it.
  useEffect(() => {
    if (!spotlight || !interactive || focus) return
    const t = window.setTimeout(() => {
      const m = map.current
      if (!m?.loaded() || m.isMoving() || inView(spotlight)) return
      frame(true)
    }, 150)
    return () => window.clearTimeout(t)
  }, [spotlight, interactive, focus, inView, frame])

  const api: MapApi = {
    zoomIn: () => map.current?.zoomIn({ duration: reducedMotion() ? 0 : 250 }),
    zoomOut: () =>
      map.current?.zoomOut({ duration: reducedMotion() ? 0 : 250 }),
    reset: () => frame(true),
  }

  return (
    <div
      className={cn("relative isolate overflow-hidden bg-muted", className)}
      style={style}
    >
      <section
        ref={box}
        aria-label={label}
        className="brand-map absolute inset-0"
      />
      {status === "error" ? (
        <div className="p-m absolute inset-0 grid place-items-center">
          {fallback ?? <p>Map unavailable. Use the address instead.</p>}
        </div>
      ) : null}
      {status === "ready" && interactive && renderControls ? (
        <div className="absolute right-3 bottom-7 z-3">
          {renderControls(api)}
        </div>
      ) : null}
      {pins.map((p) =>
        hosts[p.id]
          ? createPortal(renderPin(p, selected === p.id), hosts[p.id], p.id)
          : null
      )}
    </div>
  )
}

const collect = (list: Map<string, Marker>) =>
  Object.fromEntries([...list].map(([id, mk]) => [id, mk.getElement()]))

// The small-cut Rib Peak symbol: five equal ribs on a 16-unit grid, drawn for 32 px and below (brand guidelines §1).
const RIB_PEAK =
  "M16,240L16,229.99L48,174.56L48,240ZM64,240L64,146.85L96,91.43L96,240ZM112,240L112,63.71L128,36L144,63.71L144,240ZM160,240L160,91.43L192,146.85L192,240ZM208,240L208,174.56L240,229.99L240,240Z"

/**
 * The club pin: a Saguaro Night sign with a sand Rib Peak, on a short tail that marks the point. The selected pin
 * turns Arizona Copper. Both are approved logo pairs. `children` sits in a chip above the sign.
 */
export function BrandPin({
  active,
  children,
  chipClassName,
}: {
  active: boolean
  children?: ReactNode
  chipClassName?: string
}) {
  return (
    <span
      className={cn(
        "gap-xxs flex flex-col items-center",
        "ease-out origin-bottom transition-transform duration-150",
        "motion-reduce:transition-none",
        active && "scale-108"
      )}
    >
      {children ? <span className={chipClassName}>{children}</span> : null}
      <svg
        width="34"
        height="42"
        viewBox="0 0 34 42"
        aria-hidden="true"
        className="block drop-shadow-sm"
      >
        <path
          d="M7 1h20a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-5.5L17 41l-4.5-8H7a6 6 0 0 1-6-6V7a6 6 0 0 1 6-6Z"
          className={cn(
            "stroke-background stroke-[1.5]",
            active ? "fill-primary" : "fill-night"
          )}
        />
        <g transform="translate(7 6) scale(0.078125)">
          <path d={RIB_PEAK} fill="#F6F1E8" />
        </g>
      </svg>
    </span>
  )
}
