import { PERCUSSION_PRESETS, TRACK_COLOR_COUNT } from "../constants"
import { countNotesByMidi, getPercussionName } from "../domain/percussion"
import { getPitchStats } from "../domain/pitch"
import { formatPercussionNotesPreview, formatTrackNotesPreview } from "../domain/previewFormatters"
import type { TrackData, TrackSettings } from "../types"
import { escapeHtml } from "../utils/dom"
import { midiToNoteName } from "../utils/format"
import { renderSiteFooter, renderSiteHeader, TOOL_NAME } from "./layout"
import {
  CARD,
  CARD_HINT,
  CARD_TITLE,
  CHECKBOX,
  CODE_BLOCK,
  FIELD_LABEL,
  INPUT,
  INPUT_MONO,
  INPUT_NUMBER,
  PRIMARY_BUTTON,
  READOUT,
  SECONDARY_BUTTON,
  TOGGLE_LABEL
} from "./styles"

export function renderAppShell(): string {
  return `
    ${ renderSiteHeader() }

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 pt-7 pb-12 sm:px-6">
      <div class="mb-6">
        <h1 class="font-display text-[26px] font-extrabold tracking-tight">
          ${ TOOL_NAME }<span class="text-accent">.</span>
        </h1>
        <p class="text-muted">
          Turn MIDI tracks into Minecraft note block layouts and export them as a .litematic schematic.
          Everything runs in your browser.
        </p>
      </div>

      <section class="grid items-start gap-5 lg:grid-cols-3">
        ${ renderFileCard() }
        ${ renderSummaryCard() }
        ${ renderExportCard() }
      </section>

      <section class="mt-5 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        ${ renderTrackSidebar() }

        <!-- minmax(0,1fr) keeps the wide percussion table inside its scroll area. -->
        <div class="grid grid-cols-[minmax(0,1fr)] gap-5">
          ${ renderPianoRollCard() }
          ${ renderSelectedTrackCard() }
          ${ renderPlacementCard() }
        </div>
      </section>
    </main>

    ${ renderSiteFooter() }
  `
}

function renderFileCard(): string {
  return `
    <section class="${ CARD }">
      <h2 class="${ CARD_TITLE }">MIDI file</h2>
      <p class="${ CARD_HINT }">Pick a .mid or .midi file to load its tracks.</p>

      <label class="mt-4 block ${ FIELD_LABEL }" for="midi-file">Select MIDI file</label>
      <input
        id="midi-file"
        type="file"
        accept=".mid,.midi,audio/midi"
        class="mt-1.5 w-full cursor-pointer text-[12.5px] text-muted
          file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent-soft
          file:px-3.5 file:py-1.5 file:text-[12.5px] file:font-bold file:text-accent-strong
          hover:file:bg-accent hover:file:text-surface disabled:cursor-not-allowed disabled:opacity-45"
      />

      <div id="file-info" class="mt-4 ${ READOUT }">No file selected.</div>
    </section>
  `
}

function renderSummaryCard(): string {
  return `
    <section class="${ CARD }">
      <h2 class="${ CARD_TITLE }">MIDI summary</h2>
      <p class="${ CARD_HINT }">Timing and track counts read from the file.</p>

      <div id="midi-summary" class="mt-4 ${ READOUT }">No MIDI data loaded.</div>
    </section>
  `
}

function renderExportCard(): string {
  return `
    <section class="${ CARD }">
      <h2 class="${ CARD_TITLE }">Export settings</h2>
      <p class="${ CARD_HINT }">Applied to every exported track.</p>

      <div class="mt-4 grid gap-3.5">
        <label class="grid gap-1.5">
          <span class="${ FIELD_LABEL }">Litematic version</span>
          <select id="litematic-version-select" class="${ INPUT }">
            <option value="7" selected>Version 7</option>
            <option value="6">Version 6</option>
          </select>
        </label>

        <label class="grid gap-1.5">
          <span class="${ FIELD_LABEL }">Blocks per quarter note</span>
          <input id="blocks-per-quarter-input" class="${ INPUT }" type="number" min="1" step="1" value="4" />
        </label>

        <label class="grid gap-1.5">
          <span class="${ FIELD_LABEL }">Initial measures to skip</span>
          <input id="start-measure-offset-input" class="${ INPUT }" type="number" min="0" step="1" value="0" />
        </label>

        <label class="grid gap-1.5">
          <span class="${ FIELD_LABEL }">Repeater base block</span>
          <input
            id="repeater-base-block-input"
            class="${ INPUT_MONO }"
            type="text"
            value="minecraft:white_concrete"
          />
        </label>

        <p class="text-[12px] leading-relaxed text-muted">
          The builder uses twice this value internally so note durations align with repeater timing.
        </p>

        <button id="download-litematic-button" class="${ PRIMARY_BUTTON }" type="button">
          Download .litematic
        </button>
      </div>
    </section>
  `
}

function renderTrackSidebar(): string {
  return `
    <!-- The list can be long, so on wide screens it stays put and scrolls by itself. -->
    <aside class="${ CARD } lg:sticky lg:top-[72px] lg:max-h-[calc(100svh-88px)] lg:overflow-auto">
      <h2 class="${ CARD_TITLE }">Tracks</h2>
      <p class="${ CARD_HINT }">Choose what to preview and what to export.</p>

      <div id="track-list" class="mt-4 grid gap-2 text-[13px] text-muted">No tracks loaded.</div>
    </aside>
  `
}

function renderPianoRollCard(): string {
  return `
    <section class="${ CARD }">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="${ CARD_TITLE }">Piano roll</h2>
          <p class="${ CARD_HINT }">Click a note to select its track.</p>
        </div>

        <label class="flex items-center gap-2.5 text-[12.5px] text-muted">
          <span class="${ FIELD_LABEL }">Zoom</span>
          <input
            id="piano-roll-zoom-input"
            type="range"
            min="0.25"
            max="4"
            step="0.05"
            value="1"
            class="w-40 cursor-pointer accent-accent"
          />
          <span id="piano-roll-zoom-value" class="min-w-11 text-right tabular-nums">100%</span>
        </label>
      </div>

      <div id="piano-roll" class="piano-roll empty">No MIDI data loaded.</div>
    </section>
  `
}

function renderSelectedTrackCard(): string {
  return `
    <section class="${ CARD }">
      <h2 class="${ CARD_TITLE }">Selected track</h2>
      <p class="${ CARD_HINT }">Block mapping for the track highlighted in the list.</p>

      <div id="selected-track-settings" class="mt-4 text-[13px] text-muted">No track selected.</div>
    </section>
  `
}

function renderPlacementCard(): string {
  return `
    <section class="${ CARD }">
      <h2 class="${ CARD_TITLE }">Placement preview</h2>
      <p class="${ CARD_HINT }">The sub-regions that will be written to the file.</p>

      <pre id="placement-preview" class="mt-4 max-h-[520px] ${ CODE_BLOCK }">No placement data.</pre>
    </section>
  `
}

export function renderTrackListHtml( args: {
  tracks: TrackData[]
  selectedTrackIndex: number | null
  getSettings: ( trackIndex: number ) => TrackSettings
} ): string {
  return args.tracks
    .map( ( track ) => {
      const settings = args.getSettings( track.trackIndex )
      const isSelected = args.selectedTrackIndex === track.trackIndex

      return `
        <div
          class="track-row rounded-xl border border-line bg-base p-2.5 transition-colors ${
            isSelected ? "selected" : ""
          }"
          data-track-index="${ track.trackIndex }"
        >
          <button
            type="button"
            class="track-select-button flex w-full cursor-pointer items-center gap-2 text-left"
            data-track-index="${ track.trackIndex }"
          >
            <span class="size-3 flex-none rounded-full" style="background: ${ getTrackColor( track.trackIndex ) }"></span>
            <span class="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
              ${ escapeHtml( track.trackName ) }
            </span>
            ${
              track.isPercussion
                ? `<span class="flex-none rounded-full bg-warn-field px-1.5 py-px text-[10.5px] font-bold text-warn-ink">
                     Perc
                   </span>`
                : ""
            }
          </button>

          <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-5">
            <span class="text-[12px] text-muted">${ track.notes.length } notes</span>

            <span class="flex items-center gap-3">
              <label class="${ TOGGLE_LABEL }">
                <input
                  type="checkbox"
                  class="track-visible-checkbox ${ CHECKBOX }"
                  data-track-index="${ track.trackIndex }"
                  ${ settings.visible ? "checked" : "" }
                />
                Show
              </label>

              <label class="${ TOGGLE_LABEL }">
                <input
                  type="checkbox"
                  class="track-export-checkbox ${ CHECKBOX }"
                  data-track-index="${ track.trackIndex }"
                  ${ settings.exportEnabled ? "checked" : "" }
                />
                Export
              </label>
            </span>
          </div>
        </div>
      `
    } )
    .join( "" )
}

export function renderPianoGridHtml( args: {
  leftPad: number
  topPad: number
  rowHeight: number
  pxPerBlock: number
  minMidi: number
  maxMidi: number
  height: number
  verticalLines: PianoRollVerticalLine[]
  blocksPerQuarterNote: number
} ): string {
  const horizontalLines: string[] = []

  for ( let midi = args.minMidi; midi <= args.maxMidi; midi++ ) {
    const y = args.topPad + ( args.maxMidi - midi ) * args.rowHeight
    const isC = midi % 12 === 0

    horizontalLines.push( `
      <line
        x1="${ args.leftPad }"
        y1="${ y }"
        x2="100%"
        y2="${ y }"
        class="${ isC ? "grid-line octave" : "grid-line" }"
      />
    ` )

    if ( isC ) {
      horizontalLines.push( `
        <text
          x="${ args.leftPad - 8 }"
          y="${ y + args.rowHeight - 2 }"
          text-anchor="end"
          class="pitch-label"
        >
          ${ midiToNoteName( midi ) }
        </text>
      ` )
    }
  }

  const verticalLines: string[] = []

  for ( const line of args.verticalLines ) {
    const x = args.leftPad + ( line.ticks / line.ppq ) * args.blocksPerQuarterNote * args.pxPerBlock

    verticalLines.push( `
      <line
        x1="${ x }"
        y1="0"
        x2="${ x }"
        y2="${ args.height }"
        class="${ line.isMeasure ? "beat-line measure" : "beat-line" }"
      />
    ` )
  }

  return `
    <rect x="0" y="0" width="100%" height="100%" class="piano-bg" />
    ${ horizontalLines.join( "" ) }
    ${ verticalLines.join( "" ) }
  `
}

export type PianoRollVerticalLine = {
  ticks: number
  ppq: number
  isMeasure: boolean
}

export function renderNormalTrackSettingsHtml( track: TrackData, settings: TrackSettings ): string {
  const stats = getPitchStats( track, settings )

  return `
    ${ renderSelectedTrackHeader( track, `Track ${ track.trackIndex } / ${ track.notes.length } notes` ) }

    <div class="mt-4 grid gap-3.5 sm:grid-cols-2">
      <label class="grid gap-1.5">
        <span class="${ FIELD_LABEL }">noteBlockPitch 12 base note</span>
        <select id="selected-base-midi" class="${ INPUT }">
          ${ renderBaseNoteOptions( settings.baseMidi ) }
        </select>
      </label>

      <label class="grid gap-1.5">
        <span class="${ FIELD_LABEL }">Normal block</span>
        <input
          id="normal-block-input"
          class="${ INPUT_MONO }"
          type="text"
          value="${ escapeHtml( settings.normalBlockId ) }"
        />
      </label>

      <label class="grid gap-1.5">
        <span class="${ FIELD_LABEL }">High overflow block</span>
        <input
          id="high-overflow-block-input"
          class="${ INPUT_MONO }"
          type="text"
          value="${ escapeHtml( settings.highOverflowBlockId ) }"
        />
      </label>

      <label class="grid gap-1.5">
        <span class="${ FIELD_LABEL }">Low overflow block</span>
        <input
          id="low-overflow-block-input"
          class="${ INPUT_MONO }"
          type="text"
          value="${ escapeHtml( settings.lowOverflowBlockId ) }"
        />
      </label>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-3">
      ${ renderStatTile( "In range", stats.none, "bg-ok-field text-ok-ink" ) }
      ${ renderStatTile( "High overflow", stats.high, "bg-info-field text-info-ink" ) }
      ${ renderStatTile( "Low overflow", stats.low, "bg-warn-field text-warn-ink" ) }
    </div>

    ${ renderNotesPreview( formatTrackNotesPreview( track, settings, 120 ) ) }
  `
}

export function renderPercussionTrackSettingsHtml( track: TrackData, settings: TrackSettings ): string {
  const counts = countNotesByMidi( track )

  return `
    ${ renderSelectedTrackHeader( track, `Track ${ track.trackIndex } / Percussion / ${ track.notes.length } notes` ) }

    <p class="mt-3 rounded-[10px] bg-info-field px-3.5 py-2.5 text-[12.5px] leading-relaxed text-info-ink">
      This track is marked as percussion. Each MIDI note is mapped manually to a block and note value.
    </p>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <label class="grid gap-1.5">
        <span class="${ FIELD_LABEL }">Preset</span>
        <select id="percussion-preset-select" class="${ INPUT } w-70">
          ${ renderPercussionPresetOptions() }
        </select>
      </label>

      <button id="apply-percussion-preset-button" class="${ SECONDARY_BUTTON }" type="button">
        Apply preset
      </button>

      <button id="reset-percussion-mapping-button" class="${ SECONDARY_BUTTON }" type="button">
        Reset mappings
      </button>
    </div>

    <div class="mt-4 overflow-auto rounded-lg border border-line bg-base">
      <table class="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr class="border-b border-line bg-surface text-left text-[12px] text-muted">
            <th class="px-3 py-2 font-medium">Enabled</th>
            <th class="px-3 py-2 font-medium">MIDI</th>
            <th class="px-3 py-2 font-medium">Name</th>
            <th class="px-3 py-2 font-medium">Count</th>
            <th class="px-3 py-2 font-medium">Block ID</th>
            <th class="px-3 py-2 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          ${ settings.percussionMappings
            .map( ( mapping ) => {
              const count = counts.get( mapping.midi ) ?? 0

              return `
                <tr class="border-b border-line last:border-b-0">
                  <td class="px-3 py-1.5">
                    <input
                      type="checkbox"
                      class="percussion-enabled-input ${ CHECKBOX }"
                      data-midi="${ mapping.midi }"
                      ${ mapping.enabled ? "checked" : "" }
                    />
                  </td>
                  <td class="px-3 py-1.5 tabular-nums text-ink">${ mapping.midi }</td>
                  <td class="px-3 py-1.5 whitespace-nowrap text-ink">
                    ${ escapeHtml( getPercussionName( mapping.midi ) ) }
                  </td>
                  <td class="px-3 py-1.5 tabular-nums text-muted">${ count }</td>
                  <td class="px-3 py-1.5">
                    <input
                      type="text"
                      class="percussion-block-input ${ INPUT_MONO } min-w-52"
                      data-midi="${ mapping.midi }"
                      value="${ escapeHtml( mapping.blockId ) }"
                    />
                  </td>
                  <td class="px-3 py-1.5">
                    <input
                      type="number"
                      class="percussion-note-input ${ INPUT_NUMBER }"
                      data-midi="${ mapping.midi }"
                      min="0"
                      max="24"
                      step="1"
                      value="${ mapping.note }"
                    />
                  </td>
                </tr>
              `
            } )
            .join( "" ) }
        </tbody>
      </table>
    </div>

    ${ renderNotesPreview( formatPercussionNotesPreview( track, settings, 120 ) ) }
  `
}

/** Track colors are theme-aware, so the palette lives in CSS. */
export function getTrackColor( trackIndex: number ): string {
  return `var(--track-${ trackIndex % TRACK_COLOR_COUNT })`
}

function renderSelectedTrackHeader( track: TrackData, meta: string ): string {
  return `
    <div class="flex items-center gap-3">
      <span class="size-4 flex-none rounded-full" style="background: ${ getTrackColor( track.trackIndex ) }"></span>
      <div class="min-w-0">
        <strong class="block truncate text-[15px] font-bold text-ink">${ escapeHtml( track.trackName ) }</strong>
        <span class="text-[12px] text-muted">${ meta }</span>
      </div>
    </div>
  `
}

function renderStatTile( label: string, value: number, tone: string ): string {
  return `
    <div class="rounded-lg px-3.5 py-2.5 ${ tone }">
      <div class="text-[12px] opacity-80">${ label }</div>
      <div class="font-display text-lg font-bold tabular-nums">${ value }</div>
    </div>
  `
}

function renderNotesPreview( content: string ): string {
  return `
    <details class="mt-4">
      <summary class="cursor-pointer text-[12.5px] font-medium text-muted transition-colors hover:text-accent-strong">
        Notes preview
      </summary>
      <pre class="mt-2 max-h-[440px] ${ CODE_BLOCK }">${ escapeHtml( content ) }</pre>
    </details>
  `
}

function renderBaseNoteOptions( selectedMidi: number ): string {
  const options: string[] = []

  for ( let midi = 0; midi <= 127; midi++ ) {
    const selected = midi === selectedMidi ? "selected" : ""

    options.push( `
      <option value="${ midi }" ${ selected }>
        ${ midiToNoteName( midi ) } / MIDI ${ midi }
      </option>
    ` )
  }

  return options.join( "" )
}

function renderPercussionPresetOptions(): string {
  return Object.entries( PERCUSSION_PRESETS )
    .map( ( [ presetId, preset ] ) => {
      return `
        <option value="${ presetId }">
          ${ escapeHtml( preset.label ) }
        </option>
      `
    } )
    .join( "" )
}
