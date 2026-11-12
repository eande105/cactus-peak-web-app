import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { categoryArt } from "./category-art"
import {
  type CropOptions,
  crop,
  markTile,
  type RackLayout,
  rack,
  row,
  tile,
} from "./compose"
import { parseRatio } from "./engine"
import {
  type CategoryId,
  type ClubId,
  categoryObject,
  clubObjects,
  generalObjects,
  type ObjectId,
  objects,
} from "./objects"
import { OBJECT_CSS, objPaintCss, type Scheme, schemeStyle } from "./scheme"
import { elementsToSvg } from "./serialize"
import type { Drawing, ObjPaint } from "./types"

/** "16/9", "4:3" or a number (width ÷ height). */
export type Ratio = string | number

type ObjShared = {
  /** Accessible name. Without it the graphic is decorative and hidden from assistive tech. */
  label?: string
  /** Fill a positioned parent (absolute, inset 0) instead of setting its own aspect ratio. */
  fill?: boolean
  className?: string
  style?: CSSProperties
}

/** Render an object drawing. The scheme sets the field, body and detail colours for both themes. */
function ObjSvg({
  drawing,
  scheme,
  label,
  fill,
  className,
  style,
}: { drawing: Drawing<ObjPaint>; scheme: Scheme } & ObjShared) {
  const html = `<style>${OBJECT_CSS}</style>${elementsToSvg(drawing.els, objPaintCss, "style")}`
  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const, focusable: false as const }
  return (
    <svg
      viewBox={`0 0 ${Math.round(drawing.w * 100) / 100} ${drawing.h}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "cpo",
        fill ? "absolute inset-0 size-full" : "block h-auto w-full",
        className
      )}
      style={{
        ...(schemeStyle(scheme) as CSSProperties),
        ...(fill ? {} : { aspectRatio: `${drawing.w} / ${drawing.h}` }),
        ...style,
      }}
      {...a11y}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: markup is serialized from the in-repo drawing data, never from user input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * One gym object (the Tile). `cut` sets it in a tint square with a 60° corner, for pickers and
 * empty states at 64–160 px. Bare by default, for lists at 16–48 px.
 */
export function GymObject({
  id,
  scheme = "sand",
  cut = false,
  ...rest
}: ObjShared & { id: ObjectId; scheme?: Scheme; cut?: boolean }) {
  return <ObjSvg drawing={tile(id, cut)} scheme={scheme} {...rest} />
}

/**
 * The Rib Peak brand mark in an object's place: the focal point of a section graphic (a lit disc or badge).
 * It takes the scheme's body tone, so it reads as Sand on a Copper or Night disc.
 */
export function BrandMark({
  scheme = "sand",
  ...rest
}: ObjShared & { scheme?: Scheme }) {
  return <ObjSvg drawing={markTile()} scheme={scheme} {...rest} />
}

/**
 * The bare Tiles of `ids` as SVG symbols, drawn once for a composition that repeats objects hundreds of times.
 * Place it once in the page and draw each copy with `ObjectUse`. The symbols take their colours from the scheme of
 * each copy, because custom properties inherit into a `<use>`.
 */
export function ObjectDefs({
  ids,
  prefix,
}: {
  ids: readonly ObjectId[]
  prefix: string
}) {
  const html = `<style>${OBJECT_CSS}</style>${[...new Set(ids)]
    .map(
      (id) =>
        `<symbol id="${prefix}-${id}" viewBox="0 0 100 100">${elementsToSvg(tile(id).els, objPaintCss, "style")}</symbol>`
    )
    .join("")}`
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="absolute size-0 overflow-hidden"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: markup is serialized from the in-repo drawing data, never from user input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** One copy of a symbol from `ObjectDefs`, in a scheme. Decorative. */
export function ObjectUse({
  id,
  prefix,
  scheme = "sand",
  className,
  style,
}: {
  id: ObjectId
  prefix: string
  scheme?: Scheme
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 100"
      className={cn("cpo block", className)}
      style={{ ...(schemeStyle(scheme) as CSSProperties), ...style }}
    >
      <use href={`#${prefix}-${id}`} />
    </svg>
  )
}

/**
 * The hero graphic of a class-type page: a composition drawn from how the category's classes run (a load for
 * strength, a climb profile for cycle, a circuit, a breath, lanes, a court, a wind-down, a ladder). Pass the
 * frame's ratio. Night by default.
 */
export function CategoryArt({
  category,
  ratio = "16/10",
  scheme = "night",
  ...rest
}: ObjShared & { category: CategoryId; ratio?: Ratio; scheme?: Scheme }) {
  return (
    <ObjSvg
      drawing={categoryArt(category, parseRatio(ratio))}
      scheme={scheme}
      {...rest}
    />
  )
}

/** The Tile for a class category: the category's object in the category colour. */
export function CategoryTile({
  category,
  cut = false,
  ...rest
}: ObjShared & { category: CategoryId; cut?: boolean }) {
  return (
    <ObjSvg
      drawing={tile(categoryObject[category], cut)}
      scheme={{ category }}
      {...rest}
    />
  )
}

/**
 * The Rack: a grid of object tiles for an image slot without a photo. Pass the container's ratio.
 * `layout` picks the arrangement (see RackLayout in compose.ts): `wall` (default) and `stagger` fill
 * the frame; `cluster`, `arc`, `orbit`, `spotlight`, `hub`, `climb` and `ascent` centre on a lit `focus` tile; `frame`
 * keeps the middle clear for a heading; `fade` is a grid that fades out. `seed` keeps it stable.
 */
export function ObjectRack({
  ratio = "4/3",
  ids = generalObjects,
  rows,
  seed = 1,
  layout = "wall",
  focus,
  shape,
  scheme = "night",
  ...rest
}: ObjShared & {
  ratio?: Ratio
  ids?: readonly ObjectId[]
  rows?: number
  seed?: number
  layout?: RackLayout
  focus?: ObjectId
  shape?: "square" | "disc"
  scheme?: Scheme
}) {
  return (
    <ObjSvg
      drawing={rack(parseRatio(ratio), {
        ids,
        rows,
        seed,
        layout,
        focus,
        shape,
      })}
      scheme={scheme}
      {...rest}
    />
  )
}

/** A club's Set: its three objects in a row. Always show the club's name beside it. */
export function ClubSet({
  club,
  scheme = "sand",
  ...rest
}: ObjShared & { club: ClubId; scheme?: Scheme }) {
  return <ObjSvg drawing={row(clubObjects[club])} scheme={scheme} {...rest} />
}

/** The Row: one object for each item, so the count carries the point. */
export function ObjectRow({
  ids,
  scheme = "sand",
  ...rest
}: ObjShared & { ids: readonly ObjectId[]; scheme?: Scheme }) {
  return <ObjSvg drawing={row(ids)} scheme={scheme} {...rest} />
}

/** The Crop: one object at 2–3× size, cut by the frame. Pair it with a real figure. */
export function ObjectCrop({
  id,
  ratio = "1/1",
  scheme = "sand",
  scale,
  x,
  y,
  ...rest
}: ObjShared & CropOptions & { id: ObjectId; ratio?: Ratio; scheme?: Scheme }) {
  return (
    <ObjSvg
      drawing={crop(id, parseRatio(ratio), { scale, x, y })}
      scheme={scheme}
      {...rest}
    />
  )
}

/** The plain-text name of an object, for accessible labels. */
export const objectLabel = (id: ObjectId) => objects[id].label
