/**
 * Shared types for the Cactus Peak graphics system.
 * This file holds types only, so Node can load the graphics modules with type stripping
 * (scripts/export-graphics.mjs) and Next can bundle them without a build step.
 */

/**
 * Tones. The first eight match `PhotoTone` in lib/types.ts; pine and amber add the cycle and conditioning
 * category colours. Each maps to one palette variable (see paint.ts).
 */
export type Tone =
  | "copper"
  | "night"
  | "sage"
  | "teal"
  | "gold"
  | "plum"
  | "sand"
  | "rose"
  | "pine"
  | "amber"

/** Fields that every shape shares. */
type Common<P extends string> = {
  fill?: P
  stroke?: P
  sw?: number
  cap?: "round" | "butt"
  join?: "round" | "miter"
  /** A stroke dash pattern in viewBox units, as SVG writes it ("2 3"). */
  dash?: string
  opacity?: number
}
/**
 * Intermediate representation for every drawing. Coordinates are in viewBox units.
 * `P` is the paint vocabulary. The gym objects use `ObjPaint`.
 */
export type El<P extends string = ObjPaint> =
  | (Common<P> & {
      k: "rect"
      x: number
      y: number
      w: number
      h: number
      rx?: number
    })
  | (Common<P> & { k: "circle"; cx: number; cy: number; r: number })
  | (Common<P> & {
      k: "ellipse"
      cx: number
      cy: number
      rx: number
      ry: number
    })
  | (Common<P> & { k: "path"; d: string; rule?: "evenodd" })
  | (Common<P> & { k: "poly"; pts: ReadonlyArray<readonly [number, number]> })
  /** A group. x, y and s place it (translate then uniform scale), so a motif never distorts. */
  | {
      k: "g"
      ch: El<P>[]
      x?: number
      y?: number
      s?: number
      opacity?: number
      flipX?: boolean
    }

/** A finished drawing: a viewBox size plus the elements, back to front. */
export type Drawing<P extends string = ObjPaint> = {
  w: number
  h: number
  els: El<P>[]
}

/**
 * Paint roles for the gym objects (objects.ts, compose.ts). A scheme resolves them (scheme.ts).
 * a: the object body. b: the object's one detail. field: the ground. block: a Rack colour block.
 * accent: the one accent block in a Rack.
 */
export type ObjPaint = "a" | "b" | "field" | "block" | "accent" | "none"
