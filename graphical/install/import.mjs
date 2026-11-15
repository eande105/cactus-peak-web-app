// Writes graphical/install/import.json, the input to `graphical-install`. Run it from the app root:
//   node graphical/install/import.mjs
//
// document: the installed account theme (themes/graphical.json, from graphicalui.com through install/pull-theme.mjs).
// roleMap:  every token app/globals.css defines, mapped to the Graphical token it aliases.
// source:   the @theme roles' rendered values, which the fit reads. The color tokens are plain aliases of the
//           Graphical token they map to, so the document's own values are their authored values.
import { readFile, writeFile } from "node:fs/promises"
import { cssVariablesProfile } from "@graphical/editor/install"

const installed = JSON.parse(
  await readFile(new URL("../themes/graphical.json", import.meta.url), "utf8")
)

const document = structuredClone(installed)
// install names the theme after the analysis's appName; a style name here would switch on that style's treatments.
delete document.theme.name

const defined = { path: "app/globals.css", selector: ":root" }
const color = (variable, token) => ({ variable, token, format: "css", defined })
const themed = (variable, token, format) => ({
  variable,
  token,
  format,
  defined: { path: "app/globals.css", selector: "@theme inline" },
})

// Each semantic color, the Graphical token it aliases (palette slots as installed: color-1 Arizona Copper,
// color-2 Copper Deep, color-3 Monsoon Sky, color-4 Chili, color-5 Saguaro Night). The member app raises its
// surfaces from a dark canvas in dark mode, so its surface roles change step with the mode.
const semantic = {
  // shadcn roles
  background: { light: "neutral-3", dark: "neutral-1" },
  foreground: "neutral-10",
  card: { light: "neutral-1", dark: "neutral-3" },
  "card-foreground": "neutral-10",
  popover: { light: "neutral-1", dark: "neutral-3" },
  "popover-foreground": "neutral-10",
  primary: "color-1",
  "primary-foreground": "on:color-1",
  secondary: "neutral-3",
  "secondary-foreground": "neutral-10",
  muted: "neutral-4",
  "muted-foreground": "neutral-8",
  accent: "color-1-transparent",
  "accent-foreground": "neutral-10",
  destructive: "error",
  border: { light: "neutral-5", dark: "neutral-4" },
  input: "neutral-6",
  ring: "color-3",
  // App roles without a shadcn slot
  "input-hover": "neutral-8",
  hover: "neutral-3-transparent",
  "secondary-hover": "neutral-4",
  "primary-hover": "color-2",
  "destructive-hover": "color-4",
  "border-strong": "neutral-6",
  "border-strong-hover": "neutral-8",
  "disabled-foreground": "neutral-6",
  "success-subtle": "success-transparent",
  "warning-subtle": "warning-transparent",
  "danger-subtle": "error-transparent",
  night: "color-5",
  "night-foreground": { light: "neutral-3", dark: "neutral-10" },
  "night-muted": { light: "neutral-5", dark: "neutral-8" },
  "night-rule": {
    light: "neutral-3-transparent",
    dark: "neutral-10-transparent",
  },
  link: "color-2",
  // The content sheet beside the sidebar; cards sit on it.
  sheet: "neutral-2",
}
// Tailwind names with no shadcn variable behind them.
const themeOnly = { focus: "color-3" }

const roleMap = cssVariablesProfile({
  modes: { kind: "class", dark: "dark" },
  tokens: [
    ...Object.entries(semantic).map(([name, token]) =>
      color(`--${name}`, token)
    ),
    // Mode-dependent roles keep their @theme entry as var(--name), the alias that changes step with the mode.
    ...Object.entries({ ...semantic, ...themeOnly })
      .filter(([, token]) => typeof token === "string")
      .map(([name, token]) => themed(`--color-${name}`, token, "css")),
    // Tailwind @theme roles. Each names the Graphical step it renders, so the fit keeps the theme's units.
    themed("--radius-sm", "radius.xs", "px"),
    themed("--radius-md", "radius.s", "px"),
    themed("--radius-lg", "radius.m", "px"),
    themed("--radius-2xl", "radius.xl", "px"),
    themed("--font-weight-normal", "weight.body.regular", "number"),
    themed("--font-weight-semibold", "weight.body.heavy", "number"),
  ],
  appearance: {},
})
// cssVariablesProfile takes no fixed list, so set it on the result.
// Category colors carry fixed class-category meanings with their own light and dark values (spec 01, 2.2). The count
// badge, the pass accent and the photo band keep their own values too.
const categories = [
  "strength",
  "cycle",
  "conditioning",
  "mind-body",
  "aqua",
  "court",
  "recovery",
  "youth",
]
roleMap.fixed = [
  ...categories.flatMap((key) => [`--cat-${key}`, `--cat-${key}-text`]),
  "--cat-tint-strength",
  "--on-cat",
  "--dawn",
  "--photo-band",
  "--badge-danger",
  "--badge-danger-fg",
  "--color-dawn",
  "--color-photo-band",
  "--color-badge-danger",
  "--color-badge-danger-fg",
  "--color-on-cat",
  "--color-cat",
  "--color-cat-text",
  "--color-cat-tint",
  "--color-background",
  "--color-card",
  "--color-popover",
  "--color-muted",
  "--color-border",
  "--color-night-foreground",
  "--color-night-muted",
  "--color-night-rule",
]

// What each @theme role renders today (the roles alias these steps).
const t = installed.theme
const authored = {
  "--radius-sm": `${t.radius.xs}px`,
  "--radius-md": `${t.radius.s}px`,
  "--radius-lg": `${t.radius.m}px`,
  "--radius-2xl": `${t.radius.xl}px`,
  "--font-weight-normal": `${t.fonts.body.weights.regular}`,
  "--font-weight-semibold": `${t.fonts.body.weights.heavy}`,
}
const source = { light: authored, dark: authored }

await writeFile(
  new URL("./import.json", import.meta.url),
  `${JSON.stringify({ document, roleMap, source }, null, 2)}\n`
)
