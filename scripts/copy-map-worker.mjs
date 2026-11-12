// Copies the MapLibre worker into public/maplibre/ with the package version in the file name.
// Turbopack renames the MapLibre bundle, so MapLibre cannot find the worker beside itself.
// components/map/brand-map.tsx points setWorkerUrl() at this copy. Runs before `dev` and `build`.
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const app = join(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(join(app, "package.json"))
const pkg = dirname(require.resolve("maplibre-gl/package.json"))
const { version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"))
const out = join(app, "public", "maplibre")
const name = `maplibre-gl-worker-${version}.mjs`

mkdirSync(out, { recursive: true })
for (const f of readdirSync(out)) if (f !== name) rmSync(join(out, f))
copyFileSync(join(pkg, "dist", "maplibre-gl-worker.mjs"), join(out, name))
console.log(`MapLibre worker: public/maplibre/${name}`)
