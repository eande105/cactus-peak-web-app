# Synced copy: do not edit here

This folder is a copy of `marketing-site/components/brand/graphics/`, the source of truth for the
Cactus Peak gym objects and their compositions (Rack, Set, Row, Crop, Tile).
The web app uses the React components, so the graphics follow the theme with no extra code.

To change a graphic, edit the marketing site module, then copy it here:

```sh
node scripts/sync-brand-graphics.mjs          # from web-app/
node scripts/sync-brand-graphics.mjs --check  # exit 1 if this copy differs
```

The script copies every file except this note, and it removes any file that the source no longer has. The module needs only `cn` from `@/lib/utils` and the
theme variables `--neutral-1` … `--neutral-10`, `--night` and `--cat-*`, which the web app already has.
Rules for use: `brand-graphics/README.md`.
