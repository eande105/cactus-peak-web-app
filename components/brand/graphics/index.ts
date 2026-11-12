/**
 * Cactus Peak graphics system: the gym objects (VISUAL-IDENTITY.md). Import components and ids from here:
 *   import { ObjectRack, ClubSet, CategoryTile, GymObject, ObjectCrop } from "@/components/brand/graphics"
 * Objects and id maps: objects.ts (art in nucleo-art.ts). Compositions: compose.ts. Colours: scheme.ts.
 * Export to standalone SVG: node scripts/export-graphics.mjs (writes ../brand-graphics/svg/objects and /category).
 */

export {
  BrandMark,
  CategoryArt,
  CategoryTile,
  ClubSet,
  GymObject,
  ObjectCrop,
  ObjectDefs,
  ObjectRack,
  ObjectRow,
  ObjectUse,
  objectLabel,
  type Ratio,
} from "./components"
export type { RackLayout } from "./compose"
export {
  type CategoryId,
  type ClubId,
  categoryObject,
  categoryRelated,
  classObjects,
  clubObjects,
  coachObjects,
  generalObjects,
  type ObjectId,
  objectIds,
  objects,
  type PlanId,
  planObjects,
  type SpaceId,
  spaceObjects,
} from "./objects"
export { categoryTone, toneVar } from "./paint"
export type { BrandScheme, Scheme } from "./scheme"
export type { Tone } from "./types"
