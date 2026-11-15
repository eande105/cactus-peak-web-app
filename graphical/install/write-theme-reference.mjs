// Writes gui/themes/cactus-peak-athletic.md from the installed theme, so the guidance describes what the app
// actually runs. Run it after `graphical-install --theme`:
//   node graphical/install/write-theme-reference.mjs
import { readFile, writeFile } from "node:fs/promises"

const read = (path) => readFile(new URL(path, import.meta.url), "utf8")
const css = await read("../generated/theme.css")
const roleMap = JSON.parse(await read("../role-map.json"))
const block = (selector) => {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf("\n}", start))
  return Object.fromEntries(
    [...body.matchAll(/^\s+(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2]])
  )
}
const light = block(":root")
const dark = block(".dark")
const steps = ["xxs", "xs", "s", "m", "l", "xl", "xxl"]
const row = (cells) => `| ${cells.join(" | ")} |`
const table = (head, rows) =>
  [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n")
const colors = Object.keys(light).filter((name) =>
  /^--(color-\d+|neutral-\d+|success|warning|error)$/.test(name)
)
const semantic = roleMap.tokens.filter(
  (role) =>
    !role.variable.startsWith("--color-") &&
    typeof role.token !== "undefined" &&
    !/^(text|radius|weight)\./.test(String(role.token))
)
const md = `# Cactus Peak Athletic

Generated from \`graphical/themes/graphical.json\` and \`graphical/generated/theme.css\` by
\`graphical/install/write-theme-reference.mjs\`. Don't edit it by hand: change the theme, run
\`npx graphical-install --theme graphical\`, then run the script again.

The theme switches with next-themes' \`dark\` class on \`<html>\`. Every variable below is defined at \`:root\` (light)
and \`.dark\`. Component assignments for the bundled Base UI components are in
[the assignment tables](cactus-peak-athletic-components.md).

## Fonts

${table(
  ["Role", "Family", "Regular", "Medium", "Heavy", "Class"],
  ["body", "display", "data"].map((role) => [
    role,
    `\`${light[`--font-${role}`]}\``,
    light[`--weight-${role}-regular`],
    light[`--weight-${role}-medium`],
    light[`--weight-${role}-heavy`],
    `\`font-${role}\``,
  ])
)}

\`--font-inter\` and \`--font-archivo\` come from next/font (lib/fonts.ts). \`font-regular\`, \`font-medium\` and
\`font-heavy\` take the weights of the nearest font class (\`.font-display-wide\` and \`.tabular\` set the display
and data weights).

## Colors

${table(
  ["Token", "Light", "Dark", "Class"],
  colors.map((name) => [
    `\`${name}\``,
    `\`${light[name]}\``,
    `\`${dark[name] ?? light[name]}\``,
    `\`bg-${name.slice(2)}\``,
  ])
)}

Each color also has \`-translucent\` and \`-transparent\` levels, and \`--on-*\` names its readable foreground.

### App aliases (app/globals.css)

Use these semantic classes in UI code. Each aliases one Graphical color.

${table(
  ["Alias", "Graphical token"],
  semantic.map((role) => [
    `\`${role.variable}\``,
    typeof role.token === "string"
      ? `\`${role.token}\``
      : `light \`${role.token.light}\`, dark \`${role.token.dark}\``,
  ])
)}

## Type

${table(
  ["Step", "Body size / line", "Class", "Display size / line", "Class"],
  steps.map((step) => [
    step.toUpperCase(),
    `${light[`--size-${step}`]} / ${light[`--line-${step}`]}`,
    `\`text-body-${step}\``,
    `${light[`--display-size-${step}`]} / ${light[`--display-line-${step}`]}`,
    `\`text-display-${step}\``,
  ])
)}

A text style sets size, line height and tracking. Set the weight with \`font-regular\`, \`font-medium\` or
\`font-heavy\`.

## Spacing, corners and strokes

${table(
  ["Step", "Space", "Class", "Corner", "Class"],
  ["zero", ...steps].map((step) => [
    step,
    light[`--space-${step}`] ?? "",
    light[`--space-${step}`] ? `\`p-${step}\`, \`gap-${step}\`` : "",
    light[`--radius-${step}`] ?? "",
    light[`--radius-${step}`] ? `\`corner-${step}\`` : "",
  ])
)}

Corner \`full\` is \`${light["--radius-full"]}\`. Strokes: \`--border-s\` ${light["--border-s"]}, \`--border-m\`
${light["--border-m"]}, \`--border-l\` ${light["--border-l"]}. Visible edges are box shadows (\`hairline\`,
\`hairline-l\` and the \`rule-*\` utilities in app/globals.css); \`edge-*\` sets a native border width.
Widths, heights and insets keep Tailwind's numeric scale (\`w-4\`, \`size-11\`).

## Shadows and motion

${table(
  ["Token", "Light", "Dark"],
  [
    "--shadow-s",
    "--shadow-m",
    "--shadow-l",
    "--motion-duration",
    "--motion-easing",
    "--motion-large-duration",
    "--motion-large-easing",
  ].map((name) => [
    `\`${name}\``,
    `\`${light[name]}\``,
    `\`${dark[name] ?? light[name]}\``,
  ])
)}
`
await writeFile(
  new URL("../../gui/themes/cactus-peak-athletic.md", import.meta.url),
  md
)
