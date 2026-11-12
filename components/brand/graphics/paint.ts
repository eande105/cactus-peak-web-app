import type { Tone } from "./types"

/** The palette variable for each tone. Same mapping as the photo slots in components/brand/atoms.tsx. */
export const toneVar: Record<Tone, string> = {
  copper: "--cat-strength",
  night: "--night",
  sage: "--cat-mind-body",
  teal: "--cat-aqua",
  gold: "--cat-court",
  plum: "--cat-recovery",
  sand: "--neutral-7",
  rose: "--cat-youth",
  pine: "--cat-cycle",
  amber: "--cat-conditioning",
}

/** The tone of each class category, so a category Tile matches the category colour on badges. */
export const categoryTone = {
  strength: "copper",
  cycle: "pine",
  conditioning: "amber",
  "mind-body": "sage",
  aqua: "teal",
  court: "gold",
  recovery: "plum",
  youth: "rose",
} as const satisfies Record<string, Tone>

// ---------- Hex resolution (export script, scheme.ts) ----------

const lin = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const gam = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
function toOklab(hex: string): [number, number, number] {
  const v = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((i) =>
    lin(parseInt(v.slice(i, i + 2), 16) / 255)
  )
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function fromOklab([L, A, B]: [number, number, number]): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return (
    "#" +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, gam(c))) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  )
}
/** color-mix(in oklab, a pct%, b) as hex. */
export function mixHex(a: string, b: string, pct: number): string {
  const x = toOklab(a),
    y = toOklab(b),
    t = pct / 100
  return fromOklab([
    x[0] * t + y[0] * (1 - t),
    x[1] * t + y[1] * (1 - t),
    x[2] * t + y[2] * (1 - t),
  ])
}
