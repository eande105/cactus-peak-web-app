// Writes graphical/generated/tailwind-merge.cjs: Graphical's classes for the class merger in lib/utils.ts.
//   node graphical/install/write-merge-config.mjs
//
// graphical-install writes this file only for apps that depend on tailwind-merge. This app merges with shadcn's
// `cn` package, whose `createCn` takes the same config, so this script writes it with the package's own generator.
// Run it after `graphical-install --theme`, so it follows the active theme's steps.
import { readFile, writeFile } from "node:fs/promises"
import {
  previewCssVariables,
  tailwindMergeConfig,
} from "@graphical/editor/install"

const project = JSON.parse(
  await readFile(new URL("../project.json", import.meta.url), "utf8")
)
const active = project.themes.find((theme) => theme.id === project.active)
const document = JSON.parse(
  await readFile(new URL(`../${active.path}`, import.meta.url), "utf8")
)
// The cn package's config matches tailwind-merge 3.
const config = tailwindMergeConfig(
  previewCssVariables(document.theme, "light"),
  3
)
await writeFile(
  new URL("../generated/tailwind-merge.cjs", import.meta.url),
  config
)
