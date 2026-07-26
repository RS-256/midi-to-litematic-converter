/**
 * Class strings shared by the templates.
 *
 * The markup is built from template literals rather than components, so the
 * recurring Tailwind combinations live here to keep them in one place. The
 * values mirror the primitives of the sibling tool site (rs256.net/actions/):
 * same radii, borders, and type scale.
 *
 * Each constant is a complete set: never combine two of them on one element, or
 * conflicting utilities (width, font-size) would resolve by stylesheet order.
 */

export const CARD = "rounded-xl border border-line bg-surface p-5"

export const CARD_TITLE = "font-display text-[15px] font-bold"

export const CARD_HINT = "mt-0.5 text-[12.5px] text-muted"

export const FIELD_LABEL = "text-[12.5px] font-medium text-muted"

const CONTROL = [
  "rounded-lg border border-line bg-base px-2.5 py-1.5 text-ink transition-colors",
  "hover:border-accent-soft disabled:cursor-not-allowed disabled:opacity-45"
].join( " " )

export const INPUT = `w-full ${ CONTROL } text-[13px]`

/** Block ids and other identifiers read better in monospace. */
export const INPUT_MONO = `w-full ${ CONTROL } font-mono text-xs`

/** Narrow numeric field used inside the percussion table. */
export const INPUT_NUMBER = `${ CONTROL } w-20 text-[13px]`

/** Same shape as the primary action on rs256.net/actions/. */
export const PRIMARY_BUTTON = [
  "w-full cursor-pointer rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors",
  "hover:bg-accent-strong disabled:cursor-wait disabled:opacity-45 dark:text-[#17111a]"
].join( " " )

export const SECONDARY_BUTTON = [
  "cursor-pointer rounded-full border border-line px-4 py-1.5 text-[13px] text-muted transition-colors",
  "hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
].join( " " )

/** Read-only block used for file info, summaries, and stats. */
export const READOUT = "rounded-lg border border-line bg-base px-3.5 py-3 text-[13px] leading-relaxed text-muted"

/** Scrollable monospace output (notes preview, placement JSON). */
export const CODE_BLOCK = [
  "overflow-auto rounded-lg border border-line bg-base p-4",
  "font-mono text-[12px] leading-relaxed whitespace-pre text-muted"
].join( " " )

export const CHECKBOX = "size-3.5 cursor-pointer accent-accent"

export const TOGGLE_LABEL = "flex cursor-pointer items-center gap-1.5 text-[12px] text-muted"
