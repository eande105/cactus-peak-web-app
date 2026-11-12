// Shared with marketing-site/components/map/brand-map-style.ts. Keep the two files identical.
//
// Builds the MapLibre style for the brand map from the live theme tokens, so the map follows the theme in both
// colour modes and a token change needs no edit here. The tiles are OpenFreeMap vector tiles (OpenMapTiles schema,
// free, no key). The style draws only what helps a visitor find a club: land, parks, water and canals, roads, rail,
// buildings when close, and street and place names. Points of interest stay off so the club pins carry the map.

const SOURCE = "https://tiles.openfreemap.org/planet"
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
// The tile host serves Noto Sans glyphs only. Inter has no glyph set there.
const FONT_REGULAR = ["Noto Sans Regular"]
const FONT_BOLD = ["Noto Sans Bold"]
const FONT_ITALIC = ["Noto Sans Italic"]

const TOKENS = [
  "--neutral-1",
  "--neutral-2",
  "--neutral-3",
  "--neutral-4",
  "--neutral-5",
  "--neutral-6",
  "--neutral-7",
  "--neutral-8",
  "--neutral-10",
  "--primary",
  "--cat-aqua",
  "--cat-mind-body",
] as const
type Token = (typeof TOKENS)[number]

type Rgb = [number, number, number]

// Tokens can be any CSS colour (hex today, oklch or color-mix later). A 1 px canvas turns each one into sRGB.
function toRgb(value: string, ctx: CanvasRenderingContext2D | null): Rgb {
  if (!ctx) return [128, 128, 128]
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = "#808080"
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

const hex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`

/** Mixes `b` into `a` by `t` (0 to 1) in sRGB, the same as color-mix(in srgb, a, b t%). */
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export function readMapTokens(root: HTMLElement = document.documentElement) {
  const css = getComputedStyle(root)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  const out = {} as Record<Token, Rgb>
  for (const t of TOKENS) out[t] = toRgb(css.getPropertyValue(t).trim(), ctx)
  return { tokens: out, dark: root.classList.contains("dark") }
}

// Width stops by zoom for each road class. Values are line widths in px at that zoom.
const widths = {
  motorway: [6, 0.8, 10, 2.2, 14, 7, 17, 22],
  major: [8, 0.5, 11, 1.4, 14, 5, 17, 16],
  minor: [11, 0.3, 14, 2.4, 17, 10],
} as const
const width = (stops: readonly number[], extra = 0) => [
  "interpolate",
  ["exponential", 1.4],
  ["zoom"],
  ...stops.map((v, i) => (i % 2 ? v + extra : v)),
]

const MAJOR = ["primary", "trunk", "secondary", "tertiary"]
const MINOR = ["minor", "service", "residential", "unclassified"]
const name = ["coalesce", ["get", "name:en"], ["get", "name"]]

export function brandMapStyle({
  tokens: c,
  dark,
}: ReturnType<typeof readMapTokens>) {
  // The neutral scale runs light to dark in light mode and dark to light in dark mode. Land sits on the page tone
  // and roads lift off it: lighter than land in light mode, a step lighter than land in dark mode.
  const land = dark ? c["--neutral-1"] : c["--neutral-3"]
  const road = dark ? c["--neutral-4"] : c["--neutral-1"]
  const casing = dark ? c["--neutral-2"] : c["--neutral-5"]
  const minorRoad = dark ? c["--neutral-3"] : c["--neutral-1"]
  const water = mix(land, c["--cat-aqua"], dark ? 0.32 : 0.28)
  const park = mix(land, c["--cat-mind-body"], dark ? 0.16 : 0.14)
  const scrub = mix(land, c["--cat-mind-body"], 0.06)
  const building = dark ? c["--neutral-2"] : c["--neutral-4"]
  const buildingEdge = dark ? c["--neutral-3"] : c["--neutral-5"]
  const freeway = mix(road, c["--primary"], dark ? 0.34 : 0.22)
  const freewayCasing = mix(casing, c["--primary"], dark ? 0.2 : 0.45)
  const label = c["--neutral-8"]
  const labelSoft = c["--neutral-7"]
  const halo = land

  return {
    version: 8 as const,
    glyphs: GLYPHS,
    sources: { omt: { type: "vector" as const, url: SOURCE } },
    layers: [
      {
        id: "land",
        type: "background",
        paint: { "background-color": hex(land) },
      },
      {
        id: "landcover",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["grass", "wood", "scrub", "farmland"]],
        ],
        paint: { "fill-color": hex(scrub) },
      },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": hex(park) },
      },
      {
        id: "landuse-civic",
        type: "fill",
        source: "omt",
        "source-layer": "landuse",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["pitch", "stadium", "school", "university", "cemetery"]],
        ],
        paint: { "fill-color": hex(mix(land, park, 0.6)) },
      },
      {
        id: "aeroway",
        type: "fill",
        source: "omt",
        "source-layer": "aeroway",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": hex(building), "fill-opacity": 0.6 },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": hex(water) },
      },
      // The East Valley's canals are waterways. They are the clearest local landmark after the freeways.
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        paint: {
          "line-color": hex(mix(water, c["--cat-aqua"], 0.25)),
          "line-width": width([10, 0.6, 14, 2, 17, 5]),
        },
      },
      {
        id: "building",
        type: "fill",
        source: "omt",
        "source-layer": "building",
        minzoom: 14,
        paint: {
          "fill-color": hex(building),
          "fill-outline-color": hex(buildingEdge),
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 1],
        },
      },
      {
        id: "rail",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["==", ["get", "class"], "rail"],
        minzoom: 11,
        paint: {
          "line-color": hex(c["--neutral-6"]),
          "line-width": 1,
          "line-dasharray": [3, 2],
          "line-opacity": 0.6,
        },
      },
      ...(
        [
          ["minor", MINOR, minorRoad, casing, widths.minor, 12],
          ["major", MAJOR, road, casing, widths.major, 8],
          [
            "motorway",
            ["motorway"],
            freeway,
            freewayCasing,
            widths.motorway,
            5,
          ],
        ] as const
      ).flatMap(([id, classes, fill, edge, stops, minzoom]) => {
        const filter = [
          "all",
          ["in", ["get", "class"], ["literal", classes]],
          ["!=", ["get", "brunnel"], "tunnel"],
        ]
        const layout = { "line-cap": "round", "line-join": "round" }
        return [
          {
            id: `road-${id}-casing`,
            type: "line",
            source: "omt",
            "source-layer": "transportation",
            minzoom,
            filter,
            layout,
            paint: { "line-color": hex(edge), "line-width": width(stops, 1.5) },
          },
          {
            id: `road-${id}`,
            type: "line",
            source: "omt",
            "source-layer": "transportation",
            minzoom,
            filter,
            layout,
            paint: { "line-color": hex(fill), "line-width": width(stops) },
          },
        ]
      }),
      {
        id: "water-name",
        type: "symbol",
        source: "omt",
        "source-layer": "waterway",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": name,
          "text-font": FONT_ITALIC,
          "text-size": 11,
        },
        paint: {
          "text-color": hex(c["--cat-aqua"]),
          "text-halo-color": hex(halo),
          "text-halo-width": 1.2,
        },
      },
      {
        id: "road-name",
        type: "symbol",
        source: "omt",
        "source-layer": "transportation_name",
        minzoom: 12,
        filter: [
          "in",
          ["get", "class"],
          ["literal", [...MAJOR, ...MINOR, "motorway"]],
        ],
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "ref"], name],
          "text-font": FONT_REGULAR,
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 12],
        },
        paint: {
          "text-color": hex(labelSoft),
          "text-halo-color": hex(halo),
          "text-halo-width": 1.4,
        },
      },
      {
        id: "place-neighbourhood",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 12,
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["suburb", "neighbourhood", "quarter"]],
        ],
        layout: {
          "text-field": name,
          "text-font": FONT_BOLD,
          "text-size": 10,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.14,
        },
        paint: {
          "text-color": hex(labelSoft),
          "text-halo-color": hex(halo),
          "text-halo-width": 1.4,
        },
      },
      {
        id: "place-town",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: {
          "text-field": name,
          "text-font": FONT_BOLD,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 12, 13, 16],
          "text-letter-spacing": 0.04,
        },
        paint: {
          "text-color": hex(label),
          "text-halo-color": hex(halo),
          "text-halo-width": 1.6,
        },
      },
    ],
  }
}
