import type { Drawing, El, ObjPaint } from "./types"

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const n = (v: number) => String(Math.round(v * 100) / 100)

/**
 * Turn a drawing into SVG markup. `paint` resolves a role to a colour string (CSS or hex).
 * "attr" mode writes presentation attributes (static files). "style" mode writes inline styles (React).
 */
export function elementsToSvg<P extends string = ObjPaint>(
  els: El<P>[],
  paint: (p: P) => string,
  mode: "attr" | "style" = "attr"
): string {
  const out: string[] = []
  const walk = (e: El<P>) => {
    if (e.k === "g") {
      const tf =
        e.x !== undefined || e.y !== undefined || e.s !== undefined || e.flipX
          ? ` transform="translate(${n(e.x ?? 0)} ${n(e.y ?? 0)})${e.s !== undefined ? ` scale(${n(e.s)})` : ""}${e.flipX ? " scale(-1 1)" : ""}"`
          : ""
      const op = e.opacity !== undefined ? ` opacity="${n(e.opacity)}"` : ""
      out.push(`<g${tf}${op}>`)
      for (const c of e.ch) walk(c)
      out.push("</g>")
      return
    }
    // Object drawings always set a fill. A stroke without a fill gets none.
    const fill = paint(e.fill ?? ((e.stroke ? "none" : "a") as P))
    const stroke = e.stroke ? paint(e.stroke) : undefined
    let geo = ""
    if (e.k === "rect")
      geo = `<rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.w)}" height="${n(e.h)}"${e.rx ? ` rx="${n(e.rx)}"` : ""}`
    else if (e.k === "circle")
      geo = `<circle cx="${n(e.cx)}" cy="${n(e.cy)}" r="${n(e.r)}"`
    else if (e.k === "ellipse")
      geo = `<ellipse cx="${n(e.cx)}" cy="${n(e.cy)}" rx="${n(e.rx)}" ry="${n(e.ry)}"`
    else if (e.k === "path")
      geo = `<path d="${e.d}"${e.rule ? ` fill-rule="${e.rule}"` : ""}`
    else {
      // Drop repeated points, so no path carries stray vertices.
      const pts = e.pts
        .map(([x, y]) => `${n(x)},${n(y)}`)
        .filter((p, i, a) => p !== a[(i + a.length - 1) % a.length])
      geo = `<polygon points="${pts.join(" ")}"`
    }
    const strokeAttrs: Record<string, string> = stroke
      ? {
          stroke,
          "stroke-width": n(e.sw ?? 1),
          "stroke-linecap": e.cap ?? "round",
          "stroke-linejoin": e.join ?? "round",
          ...(e.dash ? { "stroke-dasharray": e.dash } : {}),
        }
      : {}
    if (mode === "attr") {
      const a = Object.entries({ fill, ...strokeAttrs })
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("")
      out.push(
        `${geo}${a}${e.opacity !== undefined ? ` opacity="${n(e.opacity)}"` : ""}/>`
      )
    } else {
      const a = Object.entries({ fill, ...strokeAttrs })
        .map(([k, v]) => `${k}:${v}`)
        .join(";")
      out.push(
        `${geo} style="${a}"${e.opacity !== undefined ? ` opacity="${n(e.opacity)}"` : ""}/>`
      )
    }
  }
  for (const e of els) walk(e)
  return out.join("")
}

/** A full standalone SVG document with resolved colours (for the export script). */
export function drawingToSvg<P extends string = ObjPaint>(
  d: Drawing<P>,
  paint: (p: P) => string,
  opts: { title?: string; width?: number } = {}
): string {
  const width = opts.width ?? d.w
  const height = Math.round((width * d.h) / d.w)
  // Escape the title: a raw "&" (as in "Mind & Body") makes the file invalid XML, and <img> shows nothing.
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(d.w)} ${n(d.h)}" width="${width}" height="${height}"${opts.title ? ' role="img"' : ""}>${title}${elementsToSvg(d.els, paint, "attr")}</svg>`
}
