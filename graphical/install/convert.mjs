// Converts the member app onto the shared theme's units and writes the result. Run it from the app root, after
// `node graphical/install/analyze-styles.mjs` and `node graphical/install/import.mjs`:
//   node graphical/install/convert.mjs [--dry-run]
//
// Why not `npx graphical-install`: install fits Graphical's units to the app's own use first. This app uses Body S
// and the small spacing steps most, so the fit moved Body M to 14 px and halved the spacing scale. The member app and
// the marketing site install one theme from graphicalui.com (themes/graphical.json), so the units must stay as
// that theme has them. The installer's check mode converts a fresh analysis onto the installed theme's
// units without refitting; this script writes what that conversion plans: the rewritten sources and the project
// files (role map, generated CSS, report). The installed theme document is written back unchanged.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { installConversion } from "@graphical/editor/install"

const dryRun = process.argv.includes("--dry-run")
const root = process.cwd()
const result = await installConversion({ root, check: true })

const changed = []
for (const [path, { before, after }] of result.sources) {
  const file = join(root, path)
  // Install compares files again before replacing them; do the same, so a concurrent edit is never overwritten.
  const current = await readFile(file, "utf8")
  if (current !== before)
    throw new Error(`${path} changed after the analysis. Re-run it.`)
  if (before !== after) changed.push([file, after])
}
const project = [...result.project].filter(
  ([path]) => path !== "graphical/themes/graphical.json"
)
console.log(
  `${changed.length} source files, ${project.length} project files${dryRun ? " (dry run)" : ""}`
)
if (!dryRun) {
  for (const [file, text] of changed) await writeFile(file, text)
  for (const [path, text] of project) {
    const file = join(root, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
}
