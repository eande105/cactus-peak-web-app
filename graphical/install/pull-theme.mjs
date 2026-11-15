// Installs the theme saved on graphicalui.com into this app. The account theme ("Cactus Peak Athletic" in the
// Graphical project) is the source of truth for both Cactus Peak apps; graphical/themes/graphical.json is this app's
// installed copy of it. Run it from the app root with the registry link from Graphical:
//   Use theme → Install just the theme → theme, skills, and all Base UI components → Terminal
//   node graphical/install/pull-theme.mjs https://www.graphicalui.com/r/<id>.json [--dry-run]
// Then regenerate: npx graphical-install --theme graphical, node graphical/install/write-merge-config.mjs,
// node graphical/install/write-theme-reference.mjs, pnpm format.
//
// The script copies the account theme unchanged, with two app-owned values: each font role names the next/font
// variable that lib/fonts.ts loads (gui: graphical-adopt fonts.md, "On import"), and the theme keeps the display name
// graphical-install gave it. The link is a snapshot: copy a fresh one from Graphical after each account change.
import { readFile, writeFile } from "node:fs/promises"

const url = process.argv.find((arg) =>
  /^https:\/\/www\.graphicalui\.com\/r\/[\w-]+\.json$/.test(arg)
)
if (!url)
  throw new Error(
    "Pass the registry link from Graphical: https://www.graphicalui.com/r/<id>.json"
  )
const dryRun = process.argv.includes("--dry-run")

const response = await fetch(url)
if (!response.ok) throw new Error(`${url} answered ${response.status}.`)
const item = await response.json()
const themeFile = item.files?.find((file) =>
  /components\/graphical\/theme\.ts$/.test(file.target ?? file.path ?? "")
)
if (!themeFile) throw new Error("The registry item has no theme document.")
const source = themeFile.content
const account = JSON.parse(
  source.slice(
    source.indexOf("{", source.indexOf("ThemeDocument =")),
    source.lastIndexOf("}") + 1
  )
)

const path = new URL("../themes/graphical.json", import.meta.url)
const installed = JSON.parse(await readFile(path, "utf8"))
const loader = {
  body: "var(--font-inter), system-ui, sans-serif",
  display: "var(--font-archivo), system-ui, sans-serif",
  data: "var(--font-archivo), system-ui, sans-serif",
}
const accountFamilies = { body: "Inter", display: "Archivo", data: "Archivo" }
for (const [role, family] of Object.entries(accountFamilies)) {
  const font = account.theme.fonts?.[role]
  if (!font?.family?.includes(family))
    throw new Error(
      `The account's ${role} font is ${font?.family}, not ${family}. Load it in lib/fonts.ts and update this script.`
    )
  font.family = loader[role]
}
account.theme.name = installed.theme.name

const next = `${JSON.stringify(account, null, 2)}\n`
const current = `${JSON.stringify(installed, null, 2)}\n`
console.log(
  next === current
    ? "The installed theme already matches the account theme."
    : `The account theme differs from the installed theme${dryRun ? " (dry run, nothing written)" : "; wrote graphical/themes/graphical.json"}.`
)
if (!dryRun && next !== current) await writeFile(path, next)
