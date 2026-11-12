import { field, r2, tileAt } from "./compose"
import {
  type CategoryId,
  categoryObject,
  categoryRelated,
  type ObjectId,
} from "./objects"
import type { Drawing, El } from "./types"

/*
 * The hero graphics of the class-type pages: the category's objects, and nothing else. There are no tracks, courts
 * or other scenes (VISUAL-IDENTITY.md, section 4). A few rings (circles or rounded rectangles) radiate from the lit
 * tile, and the other tiles sit on them, so the background and the icons make one figure. Only the shape, the
 * centre, the spacing and the places on the rings change with the kind of class.
 * Each hero keeps the Rack's rules: brand colours on a Night field, one lit tile with the category's object, square
 * tiles only, gaps of at least 15 % of a tile, and nothing that touches or overlaps.
 * The canvas is 100 units high and 100 × ratio wide. Sizes are shares of the height; rectangles also take a share
 * of the frame's ratio. A tile that would leave the frame on a narrow ratio is left out, not squeezed in.
 */

/** A place on ring `ring`: an angle in degrees (0 is right, 90 is up) on a circle, or a point on a rectangle's
 * edge, where `[u, v]` are shares of its half width and half height. */
type Place = { ring: number; s: number } & (
  | { deg: number }
  | { at: [number, number] }
)

type Hero = {
  shape: "circle" | "rect"
  /** The lit tile's centre, as shares of the frame. */
  c: [number, number]
  /** Ring radii (circles) or half heights (rectangles), as shares of the height. */
  radii: number[]
  /** Rectangles only: the rings' width-to-height ratio, as a share of the frame's ratio. */
  wide?: number
  lit: number
  place: Place[]
}

const corners = (ring: number, s: number): Place[] =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => ({ ring, s, at: [u, v] as [number, number] }))

const heroes: Record<CategoryId, Hero> = {
  /** Rack: square rings, with tiles on every corner and edge of the first one, like plates on a rack. */
  strength: {
    shape: "rect",
    c: [0.5, 0.5],
    radii: [0.27, 0.43, 0.62],
    wide: 0.95,
    lit: 0.25,
    place: [
      ...corners(0, 0.15),
      { ring: 0, s: 0.15, at: [0, -1] },
      { ring: 0, s: 0.15, at: [0, 1] },
      { ring: 1, s: 0.14, at: [-1, 0] },
      { ring: 1, s: 0.14, at: [1, 0] },
    ],
  },

  /** Wheel: circles with tiles set like spokes, turned a little on each ring, as a wheel turns. */
  cycle: {
    shape: "circle",
    c: [0.5, 0.5],
    radii: [0.36, 0.54, 0.73, 0.95],
    lit: 0.26,
    place: [
      { ring: 0, s: 0.15, deg: 45 },
      { ring: 0, s: 0.15, deg: 135 },
      { ring: 0, s: 0.15, deg: 225 },
      { ring: 0, s: 0.15, deg: 315 },
      { ring: 1, s: 0.14, deg: 0 },
      { ring: 1, s: 0.14, deg: 180 },
      { ring: 2, s: 0.12, deg: 26 },
      { ring: 2, s: 0.12, deg: 154 },
      { ring: 2, s: 0.12, deg: 206 },
      { ring: 2, s: 0.12, deg: 334 },
    ],
  },

  /** Circuit: two rectangles with stations at the corners and the sides, worked in turn around the lit rope. */
  conditioning: {
    shape: "rect",
    c: [0.5, 0.5],
    radii: [0.21, 0.36, 0.54],
    wide: 0.9,
    lit: 0.25,
    place: [
      { ring: 0, s: 0.15, at: [-1, 0] },
      { ring: 0, s: 0.15, at: [1, 0] },
      ...corners(1, 0.15),
      { ring: 1, s: 0.14, at: [0, -1] },
      { ring: 1, s: 0.14, at: [0, 1] },
    ],
  },

  /** Breath: wide-spaced circles and only four tiles, far apart, so most of the frame is calm. */
  "mind-body": {
    shape: "circle",
    c: [0.5, 0.5],
    radii: [0.3, 0.56, 0.86],
    lit: 0.28,
    place: [
      { ring: 0, s: 0.15, deg: 0 },
      { ring: 0, s: 0.15, deg: 180 },
      { ring: 1, s: 0.14, deg: 24 },
      { ring: 1, s: 0.14, deg: 156 },
      { ring: 1, s: 0.14, deg: 204 },
      { ring: 1, s: 0.14, deg: 336 },
    ],
  },

  /** Ripples: circles that spread from the lit water on the left, with tiles carried out to the right. */
  aqua: {
    shape: "circle",
    c: [0.4, 0.5],
    radii: [0.26, 0.44, 0.62, 0.8, 1.02],
    lit: 0.27,
    place: [
      { ring: 0, s: 0.14, deg: 180 },
      { ring: 1, s: 0.14, deg: 128 },
      { ring: 1, s: 0.14, deg: 232 },
      { ring: 1, s: 0.15, deg: 48 },
      { ring: 1, s: 0.15, deg: -48 },
      { ring: 2, s: 0.14, deg: 0 },
      { ring: 3, s: 0.13, deg: 22 },
      { ring: 3, s: 0.13, deg: -22 },
    ],
  },

  /** Doubles: rectangles in the frame's shape, with the tiles mirrored left and right of the lit paddle. */
  court: {
    shape: "rect",
    c: [0.5, 0.5],
    radii: [0.28, 0.42, 0.62],
    wide: 0.95,
    lit: 0.26,
    place: [
      ...corners(0, 0.16),
      { ring: 1, s: 0.15, at: [-1, 0] },
      { ring: 1, s: 0.15, at: [1, 0] },
    ],
  },

  /** Wind down: circles that spread from the lit stones low on the right, with tiles that grow smaller and quieter
   * as they move away. */
  recovery: {
    shape: "circle",
    c: [0.72, 0.56],
    radii: [0.3, 0.47, 0.64, 0.82, 1.0],
    lit: 0.29,
    place: [
      { ring: 0, s: 0.15, deg: 150 },
      { ring: 0, s: 0.14, deg: 245 },
      { ring: 1, s: 0.14, deg: 60 },
      { ring: 1, s: 0.15, deg: 195 },
      { ring: 2, s: 0.13, deg: 140 },
      { ring: 3, s: 0.13, deg: 178 },
      { ring: 4, s: 0.12, deg: 158 },
      { ring: 4, s: 0.12, deg: 194 },
    ],
  },

  /** Play: rectangles set off the middle, with tiles of mixed sizes dropped on them in no strict order. */
  youth: {
    shape: "rect",
    c: [0.5, 0.5],
    radii: [0.22, 0.36, 0.46],
    wide: 0.9,
    lit: 0.24,
    place: [
      { ring: 0, s: 0.14, at: [1, -1] },
      { ring: 0, s: 0.16, at: [-1, 0.35] },
      { ring: 1, s: 0.14, at: [0.35, 1] },
      { ring: 1, s: 0.13, at: [1, 0.1] },
      { ring: 1, s: 0.15, at: [-0.55, -1] },
      { ring: 1, s: 0.13, at: [-1, 0.75] },
      { ring: 2, s: 0.13, at: [1, 0.6] },
      { ring: 2, s: 0.12, at: [-1, -0.35] },
    ],
  },
}

/** The hero graphic of a class-type page, for its frame's ratio (width ÷ height). */
export function categoryArt(category: CategoryId, ratio: number): Drawing {
  const H = 100,
    W = 100 * ratio
  const h = heroes[category]
  const cx = h.c[0] * W,
    cy = h.c[1] * H
  const a = h.shape === "rect" ? (h.wide ?? 1) * ratio : 1
  const ids: readonly ObjectId[] = categoryRelated[category]

  const ring = (r: number, i: number, fill: boolean): El => {
    const R = r * H
    // The bands stack from the outside in, so the frame grows lighter toward the lit tile. The outlines fade
    // outward for the same reason.
    const paint = fill
      ? { fill: "block" as const, opacity: 0.22 }
      : {
          fill: "none" as const,
          stroke: "block" as const,
          sw: 0.8,
          opacity: 1 - (0.5 * i) / Math.max(1, h.radii.length - 1),
        }
    return h.shape === "circle"
      ? { k: "circle", cx: r2(cx), cy: r2(cy), r: r2(R), ...paint }
      : {
          k: "rect",
          x: r2(cx - R * a),
          y: r2(cy - R),
          w: r2(2 * R * a),
          h: r2(2 * R),
          rx: r2(Math.min(0.6 * R, (0.09 + 0.05 * i) * H)),
          ...paint,
        }
  }
  const bands = [...h.radii]
    .reverse()
    .map((r, j) => ring(r, h.radii.length - 1 - j, true))
  const lines = h.radii.map((r, i) => ring(r, i, false))

  const tiles: El[] = []
  let k = 0
  for (const p of h.place) {
    const R = h.radii[p.ring] * H
    const [x, y] =
      "deg" in p
        ? [
            cx + R * Math.cos((p.deg * Math.PI) / 180),
            cy - R * Math.sin((p.deg * Math.PI) / 180),
          ]
        : [cx + p.at[0] * R * a, cy + p.at[1] * R]
    // The ring places are listed at their base size; 1.15 sets the scale of all of them against the lit tile.
    const s = p.s * 1.15 * H
    // A narrow frame has no room for the outer places; those tiles are left out.
    if (x - s / 2 < 0.03 * W || x + s / 2 > 0.97 * W) continue
    if (y - s / 2 < 0.04 * H || y + s / 2 > 0.96 * H) continue
    tiles.push(
      tileAt(ids[k++ % ids.length], x, y, s, {
        opacity: 0.95 - 0.12 * p.ring,
      })
    )
  }
  tiles.push(tileAt(categoryObject[category], cx, cy, h.lit * H, { lit: true }))

  return { w: W, h: H, els: [field(W, H), ...bands, ...lines, ...tiles] }
}
