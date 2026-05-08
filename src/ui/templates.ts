import { PERCUSSION_PRESETS, TRACK_COLORS } from "../constants";
import { countNotesByMidi, getPercussionName } from "../domain/percussion";
import {
  formatPercussionNotesPreview,
  formatTrackNotesPreview,
} from "../domain/previewFormatters";
import { getPitchStats } from "../domain/pitch";
import type { TrackData, TrackSettings } from "../types";
import { escapeHtml } from "../utils/dom";
import { midiToNoteName } from "../utils/format";

export function renderAppShell(): string {
  return `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <h1>Noteblock Litematic Generator</h1>
          <p class="description">
            Convert MIDI tracks into Minecraft note block litematic layouts.
          </p>
        </div>
      </header>

      <section class="top-grid">
        <section class="card top-card">
          <label class="file-label" for="midi-file">
            Select MIDI file
          </label>

          <input
            id="midi-file"
            type="file"
            accept=".mid,.midi,audio/midi"
          />

          <div id="file-info" class="file-info">
            No file selected.
          </div>
        </section>

        <section class="card top-card">
          <h2>Export Settings</h2>

          <div class="settings-grid">
            <label>
              Litematic version:
              <select id="litematic-version-select" class="setting-select" disabled>
                <option value="7" selected>Version 7</option>
              </select>
            </label>

            <label>
              Blocks per quarter note:
              <input
                id="blocks-per-quarter-input"
                class="setting-input"
                type="number"
                min="1"
                step="1"
                value="4"
              />
            </label>

            <label>
              Repeater base block:
              <input
                id="repeater-base-block-input"
                class="setting-input"
                type="text"
                value="minecraft:white_concrete"
              />
            </label>

            <p class="setting-help">
              The builder uses twice this value internally so note durations align with repeater timing.
              Litematic v7 only for now.
            </p>
          </div>
        </section>

        <section class="card top-card">
          <h2>MIDI Summary</h2>
          <div id="midi-summary" class="midi-summary">
            No MIDI data loaded.
          </div>
        </section>
      </section>

      <section class="workspace">
        <aside class="card track-sidebar">
          <h2>Tracks</h2>
          <div id="track-list" class="track-list">
            No tracks loaded.
          </div>
        </aside>

        <section class="main-panel">
          <section class="card">
            <div class="section-header piano-roll-header">
              <h2>Piano Roll</h2>
              <label class="zoom-control">
                <span>Zoom</span>
                <input
                  id="piano-roll-zoom-input"
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.05"
                  value="1"
                />
                <span id="piano-roll-zoom-value" class="zoom-value">100%</span>
              </label>
            </div>
            <div id="piano-roll" class="piano-roll empty">
              No MIDI data loaded.
            </div>
          </section>

          <section class="card">
            <h2>Selected Track Settings</h2>
            <div id="selected-track-settings" class="selected-track-settings">
              No track selected.
            </div>
          </section>

          <section class="card">
            <div class="section-header">
              <h2>Placement Preview</h2>
              <button id="download-litematic-button" class="primary-button" type="button">
                Download .litematic
              </button>
            </div>

            <pre id="placement-preview" class="placement-preview">No placement data.</pre>
          </section>
        </section>
      </section>
    </main>
  `;
}

export function renderTrackListHtml(args: {
  tracks: TrackData[];
  selectedTrackIndex: number | null;
  getSettings: (trackIndex: number) => TrackSettings;
}): string {
  return args.tracks
    .map((track) => {
      const settings = args.getSettings(track.trackIndex);
      const isSelected = args.selectedTrackIndex === track.trackIndex;
      const color = getTrackColor(track.trackIndex);

      return `
        <div
          class="track-row ${isSelected ? "selected" : ""}"
          data-track-index="${track.trackIndex}"
        >
          <button
            type="button"
            class="track-select-button"
            data-track-index="${track.trackIndex}"
          >
            <span class="track-color" style="background: ${color}"></span>
            <span class="track-name">
              ${escapeHtml(track.trackName)}
              ${
                track.isPercussion
                  ? `<span class="percussion-badge">Percussion</span>`
                  : ""
              }
            </span>
            <span class="track-count">${track.notes.length} notes</span>
          </button>

          <label class="track-toggle">
            <input
              type="checkbox"
              class="track-visible-checkbox"
              data-track-index="${track.trackIndex}"
              ${settings.visible ? "checked" : ""}
            />
            Show
          </label>

          <label class="track-toggle">
            <input
              type="checkbox"
              class="track-export-checkbox"
              data-track-index="${track.trackIndex}"
              ${settings.exportEnabled ? "checked" : ""}
            />
            Export
          </label>
        </div>
      `;
    })
    .join("");
}

export function renderPianoGridHtml(args: {
  leftPad: number;
  topPad: number;
  rowHeight: number;
  pxPerBlock: number;
  minMidi: number;
  maxMidi: number;
  maxQuarter: number;
  height: number;
  blocksPerQuarterNote: number;
}): string {
  const horizontalLines: string[] = [];

  for (let midi = args.minMidi; midi <= args.maxMidi; midi++) {
    const y = args.topPad + (args.maxMidi - midi) * args.rowHeight;
    const isC = midi % 12 === 0;

    horizontalLines.push(`
      <line
        x1="${args.leftPad}"
        y1="${y}"
        x2="100%"
        y2="${y}"
        class="${isC ? "grid-line octave" : "grid-line"}"
      />
    `);

    if (isC) {
      horizontalLines.push(`
        <text
          x="${args.leftPad - 8}"
          y="${y + args.rowHeight - 2}"
          text-anchor="end"
          class="pitch-label"
        >
          ${midiToNoteName(midi)}
        </text>
      `);
    }
  }

  const verticalLines: string[] = [];

  for (let quarter = 0; quarter <= args.maxQuarter; quarter++) {
    const x = args.leftPad + quarter * args.blocksPerQuarterNote * args.pxPerBlock;
    const isMeasure = quarter % 4 === 0;

    verticalLines.push(`
      <line
        x1="${x}"
        y1="0"
        x2="${x}"
        y2="${args.height}"
        class="${isMeasure ? "beat-line measure" : "beat-line"}"
      />
    `);
  }

  return `
    <rect x="0" y="0" width="100%" height="100%" class="piano-bg" />
    ${horizontalLines.join("")}
    ${verticalLines.join("")}
  `;
}

export function renderNormalTrackSettingsHtml(
  track: TrackData,
  settings: TrackSettings,
): string {
  const stats = getPitchStats(track, settings);

  return `
    <div class="selected-track-header">
      <span class="track-color large" style="background: ${getTrackColor(
        track.trackIndex,
      )}"></span>
      <div>
        <strong>${escapeHtml(track.trackName)}</strong><br />
        <span class="muted">Track ${track.trackIndex} / ${
          track.notes.length
        } notes</span>
      </div>
    </div>

    <div class="settings-grid">
      <label>
        noteBlockPitch 12 base note:
        <select id="selected-base-midi" class="setting-select">
          ${renderBaseNoteOptions(settings.baseMidi)}
        </select>
      </label>

      <label>
        Normal block:
        <input
          id="normal-block-input"
          class="setting-input"
          type="text"
          value="${escapeHtml(settings.normalBlockId)}"
        />
      </label>

      <label>
        High overflow block:
        <input
          id="high-overflow-block-input"
          class="setting-input"
          type="text"
          value="${escapeHtml(settings.highOverflowBlockId)}"
        />
      </label>

      <label>
        Low overflow block:
        <input
          id="low-overflow-block-input"
          class="setting-input"
          type="text"
          value="${escapeHtml(settings.lowOverflowBlockId)}"
        />
      </label>
    </div>

    <div class="track-stats">
      <strong>Raw in range:</strong> ${stats.none}<br />
      <strong>High overflow corrected:</strong> ${stats.high}<br />
      <strong>Low overflow corrected:</strong> ${stats.low}
    </div>

    <details class="notes-details">
      <summary>Notes preview</summary>
      <pre class="notes-output">${escapeHtml(
        formatTrackNotesPreview(track, settings, 120),
      )}</pre>
    </details>
  `;
}

export function renderPercussionTrackSettingsHtml(
  track: TrackData,
  settings: TrackSettings,
): string {
  const counts = countNotesByMidi(track);

  return `
    <div class="selected-track-header">
      <span class="track-color large" style="background: ${getTrackColor(
        track.trackIndex,
      )}"></span>
      <div>
        <strong>${escapeHtml(track.trackName)}</strong><br />
        <span class="muted">Track ${track.trackIndex} / Percussion / ${
          track.notes.length
        } notes</span>
      </div>
    </div>

    <p class="warning-text">
      This track is marked as percussion. Each MIDI note is mapped manually to a block and note value.
    </p>

    <div class="percussion-toolbar">
      <label class="preset-label">
        Preset:
        <select id="percussion-preset-select" class="setting-select compact-select">
          ${renderPercussionPresetOptions()}
        </select>
      </label>

      <button
        id="apply-percussion-preset-button"
        class="secondary-button"
        type="button"
      >
        Apply preset
      </button>

      <button
        id="reset-percussion-mapping-button"
        class="secondary-button"
        type="button"
      >
        Reset mappings
      </button>
    </div>

    <div class="percussion-table-wrap">
      <table class="percussion-table">
        <thead>
          <tr>
            <th>Enabled</th>
            <th>MIDI</th>
            <th>Name</th>
            <th>Count</th>
            <th>Block ID</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${settings.percussionMappings
            .map((mapping) => {
              const count = counts.get(mapping.midi) ?? 0;

              return `
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      class="percussion-enabled-input"
                      data-midi="${mapping.midi}"
                      ${mapping.enabled ? "checked" : ""}
                    />
                  </td>
                  <td>${mapping.midi}</td>
                  <td>${escapeHtml(getPercussionName(mapping.midi))}</td>
                  <td>${count}</td>
                  <td>
                    <input
                      type="text"
                      class="percussion-block-input"
                      data-midi="${mapping.midi}"
                      value="${escapeHtml(mapping.blockId)}"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      class="percussion-note-input"
                      data-midi="${mapping.midi}"
                      min="0"
                      max="24"
                      step="1"
                      value="${mapping.note}"
                    />
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <details class="notes-details">
      <summary>Notes preview</summary>
      <pre class="notes-output">${escapeHtml(
        formatPercussionNotesPreview(track, settings, 120),
      )}</pre>
    </details>
  `;
}

export function getTrackColor(trackIndex: number): string {
  return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
}

function renderBaseNoteOptions(selectedMidi: number): string {
  const options: string[] = [];

  for (let midi = 0; midi <= 127; midi++) {
    const selected = midi === selectedMidi ? "selected" : "";

    options.push(`
      <option value="${midi}" ${selected}>
        ${midiToNoteName(midi)} / MIDI ${midi}
      </option>
    `);
  }

  return options.join("");
}

function renderPercussionPresetOptions(): string {
  return Object.entries(PERCUSSION_PRESETS)
    .map(([presetId, preset]) => {
      return `
        <option value="${presetId}">
          ${escapeHtml(preset.label)}
        </option>
      `;
    })
    .join("");
}
