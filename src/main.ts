import { Midi } from "@tonejs/midi";
import "./style.css";
import {
  writeLitematicV7,
  type BlockPlacement,
} from "./litematic/writeLitematicV7";

type RawNote = {
  name: string;
  midi: number;
  time: number;
  ticks: number;
  duration: number;
  durationTicks: number;
  velocity: number;
};

type TrackData = {
  trackIndex: number;
  trackName: string;
  isPercussion: boolean;
  notes: RawNote[];
};

type LitematicVersion = 7;

type ExportSettings = {
  litematicVersion: LitematicVersion;
  blocksPerQuarterNote: number;
  repeaterBaseBlockId: string;
};

type PercussionMapping = {
  midi: number;
  enabled: boolean;
  blockId: string;
  note: number;
};

type PercussionPresetEntry = {
  blockId: string;
  note: number;
  enabled?: boolean;
};

type PercussionPreset = {
  label: string;
  mappings: Record<number, PercussionPresetEntry>;
};

type TrackSettings = {
  trackIndex: number;
  visible: boolean;
  exportEnabled: boolean;
  baseMidi: number;
  normalBlockId: string;
  highOverflowBlockId: string;
  lowOverflowBlockId: string;
  percussionMappings: PercussionMapping[];
};

type PitchCorrection = "none" | "high" | "low";

type CorrectedPitch = {
  pitch: number;
  correction: PitchCorrection;
  rawPitch: number;
};

const DEFAULT_BASE_MIDI = 66; // F#4
const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  litematicVersion: 7,
  blocksPerQuarterNote: 4,
  repeaterBaseBlockId: "minecraft:white_concrete",
};

const DEFAULT_NORMAL_BLOCK = "minecraft:grass_block";
const DEFAULT_HIGH_OVERFLOW_BLOCK = "minecraft:diamond_block";
const DEFAULT_LOW_OVERFLOW_BLOCK = "minecraft:diamond_ore";

const TRACK_COLORS = [
  "#7dd3fc",
  "#86efac",
  "#fde047",
  "#f0abfc",
  "#93c5fd",
  "#fdba74",
  "#c4b5fd",
  "#fca5a5",
  "#67e8f9",
  "#bef264",
  "#f9a8d4",
  "#a7f3d0",
];

const DEFAULT_PERCUSSION_BLOCK = "minecraft:stone";
const DEFAULT_PERCUSSION_NOTE = 0;

const GM_PERCUSSION_NAMES: Record<number, string> = {
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  60: "Hi Bongo",
  61: "Low Bongo",
  62: "Mute Hi Conga",
  63: "Open Hi Conga",
  64: "Low Conga",
  65: "High Timbale",
  66: "Low Timbale",
  67: "High Agogo",
  68: "Low Agogo",
  69: "Cabasa",
  70: "Maracas",
  71: "Short Whistle",
  72: "Long Whistle",
  73: "Short Guiro",
  74: "Long Guiro",
  75: "Claves",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  78: "Mute Cuica",
  79: "Open Cuica",
  80: "Mute Triangle",
  81: "Open Triangle",
};

const PERCUSSION_PRESETS = {
  genericMinecraft: {
    label: "Generic Minecraft Percussion",
    mappings: {
      // Bass drums
      35: { blockId: "minecraft:stone", note: 0 },
      36: { blockId: "minecraft:stone", note: 0 },

      // Stick / snare / clap
      37: { blockId: "minecraft:sand", note: 4 },
      38: { blockId: "minecraft:sand", note: 6 },
      39: { blockId: "minecraft:sand", note: 8 },
      40: { blockId: "minecraft:sand", note: 10 },

      // Toms
      41: { blockId: "minecraft:clay", note: 3 },
      43: { blockId: "minecraft:clay", note: 5 },
      45: { blockId: "minecraft:clay", note: 7 },
      47: { blockId: "minecraft:clay", note: 9 },
      48: { blockId: "minecraft:clay", note: 11 },
      50: { blockId: "minecraft:clay", note: 13 },

      // Hi-hats / cymbals
      42: { blockId: "minecraft:glass", note: 16 },
      44: { blockId: "minecraft:glass", note: 18 },
      46: { blockId: "minecraft:glass", note: 20 },
      49: { blockId: "minecraft:gold_block", note: 18 },
      51: { blockId: "minecraft:gold_block", note: 16 },
      52: { blockId: "minecraft:gold_block", note: 20 },
      53: { blockId: "minecraft:gold_block", note: 22 },
      55: { blockId: "minecraft:gold_block", note: 21 },
      57: { blockId: "minecraft:gold_block", note: 19 },
      59: { blockId: "minecraft:gold_block", note: 17 },

      // Small percussion
      54: { blockId: "minecraft:glass", note: 12 },
      56: { blockId: "minecraft:iron_block", note: 18 },
      58: { blockId: "minecraft:iron_block", note: 12 },
      69: { blockId: "minecraft:glass", note: 10 },
      70: { blockId: "minecraft:glass", note: 8 },
      75: { blockId: "minecraft:wood", note: 12 },
      76: { blockId: "minecraft:wood", note: 14 },
      77: { blockId: "minecraft:wood", note: 10 },

      // Bongos / congas / timbales
      60: { blockId: "minecraft:wood", note: 16 },
      61: { blockId: "minecraft:wood", note: 12 },
      62: { blockId: "minecraft:wood", note: 14 },
      63: { blockId: "minecraft:wood", note: 16 },
      64: { blockId: "minecraft:wood", note: 10 },
      65: { blockId: "minecraft:clay", note: 16 },
      66: { blockId: "minecraft:clay", note: 12 },
      67: { blockId: "minecraft:gold_block", note: 14 },
      68: { blockId: "minecraft:gold_block", note: 10 },

      // Whistles / guiro / triangle
      71: { blockId: "minecraft:glass", note: 22 },
      72: { blockId: "minecraft:glass", note: 20 },
      73: { blockId: "minecraft:glass", note: 14 },
      74: { blockId: "minecraft:glass", note: 16 },
      80: { blockId: "minecraft:iron_block", note: 20 },
      81: { blockId: "minecraft:iron_block", note: 22 },
    },
  },
} satisfies Record<string, PercussionPreset>;

type PercussionPresetId = keyof typeof PERCUSSION_PRESETS;

let loadedTracks: TrackData[] = [];
let trackSettingsMap = new Map<number, TrackSettings>();
let exportSettings: ExportSettings = { ...DEFAULT_EXPORT_SETTINGS };
let selectedTrackIndex: number | null = null;
let currentPpq = 480;

const app = getElement<HTMLDivElement>("#app");

app.innerHTML = `
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
          <h2>Piano Roll</h2>
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

const fileInput = getElement<HTMLInputElement>("#midi-file");
const fileInfo = getElement<HTMLDivElement>("#file-info");
const blocksPerQuarterInput = getElement<HTMLInputElement>(
  "#blocks-per-quarter-input",
);
const repeaterBaseBlockInput = getElement<HTMLInputElement>(
  "#repeater-base-block-input",
);
const midiSummary = getElement<HTMLDivElement>("#midi-summary");
const trackList = getElement<HTMLDivElement>("#track-list");
const pianoRoll = getElement<HTMLDivElement>("#piano-roll");
const selectedTrackSettings = getElement<HTMLDivElement>(
  "#selected-track-settings",
);
const placementPreview = getElement<HTMLPreElement>("#placement-preview");
const downloadLitematicButton = getElement<HTMLButtonElement>(
  "#download-litematic-button",
);

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];

  if (!file) {
    clearLoadedMidi();
    return;
  }

  fileInfo.innerHTML = `
    <strong>Selected file:</strong><br />
    Name: ${escapeHtml(file.name)}<br />
    Size: ${formatBytes(file.size)}<br />
    Type: ${escapeHtml(file.type || "unknown")}
  `;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    currentPpq = midi.header.ppq;

    loadedTracks = midi.tracks.map((track, trackIndex) => {
      const notes: RawNote[] = track.notes
        .map((note) => ({
          name: note.name,
          midi: note.midi,
          time: note.time,
          ticks: note.ticks,
          duration: note.duration,
          durationTicks: note.durationTicks,
          velocity: note.velocity,
        }))
        .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

      return {
        trackIndex,
        trackName: track.name || `Track ${trackIndex}`,
        isPercussion: Boolean(track.instrument?.percussion),
        notes,
      };
    });

    trackSettingsMap = createDefaultTrackSettings(loadedTracks);
    selectedTrackIndex = loadedTracks.find((track) => track.notes.length > 0)
      ?.trackIndex ?? loadedTracks[0]?.trackIndex ?? null;

    const tempos = midi.header.tempos;
    const firstTempo = tempos[0];

    renderAll({
      temposCount: tempos.length,
      firstTempoBpm: firstTempo?.bpm,
    });
  } catch (error) {
    console.error(error);

    loadedTracks = [];
    trackSettingsMap.clear();
    selectedTrackIndex = null;

    midiSummary.textContent = "Failed to parse MIDI file.";
    trackList.textContent = "No tracks loaded.";
    pianoRoll.textContent =
      error instanceof Error ? error.message : String(error);
    selectedTrackSettings.textContent = "No track selected.";
    placementPreview.textContent = "No placement data.";
  }
});

blocksPerQuarterInput.addEventListener("change", () => {
  const value = Number(blocksPerQuarterInput.value);

  if (!Number.isFinite(value) || value <= 0) {
    blocksPerQuarterInput.value = String(exportSettings.blocksPerQuarterNote);
    return;
  }

  exportSettings = {
    ...exportSettings,
    blocksPerQuarterNote: Math.round(value),
  };

  renderAll();
});

repeaterBaseBlockInput.addEventListener("change", () => {
  const blockId = repeaterBaseBlockInput.value.trim();

  if (!blockId) {
    repeaterBaseBlockInput.value = exportSettings.repeaterBaseBlockId;
    return;
  }

  exportSettings = {
    ...exportSettings,
    repeaterBaseBlockId: blockId,
  };

  renderAll();
});

function renderAll(
  midiMeta: { temposCount?: number; firstTempoBpm?: number } = {},
): void {
  renderMidiSummary(midiMeta);
  renderTrackList();
  renderPianoRoll();
  renderSelectedTrackSettings();
  renderPlacementPreview();
}

function renderMidiSummary(
  midiMeta: { temposCount?: number; firstTempoBpm?: number } = {},
): void {
  if (loadedTracks.length === 0) {
    midiSummary.textContent = "No MIDI data loaded.";
    return;
  }

  const totalNotes = loadedTracks.reduce(
    (sum, track) => sum + track.notes.length,
    0,
  );

  const exportTracks = loadedTracks.filter((track) => {
    return trackSettingsMap.get(track.trackIndex)?.exportEnabled;
  });

  midiSummary.innerHTML = `
    <strong>Litematic version:</strong> ${exportSettings.litematicVersion}<br />
    <strong>Blocks per quarter note:</strong> ${exportSettings.blocksPerQuarterNote}<br />
    <strong>Tracks:</strong> ${loadedTracks.length}<br />
    <strong>Export tracks:</strong> ${exportTracks.length}<br />
    <strong>PPQ:</strong> ${currentPpq}<br />
    <strong>Tempos:</strong> ${midiMeta.temposCount ?? "loaded"}<br />
    <strong>First tempo:</strong> ${
      midiMeta.firstTempoBpm
        ? `${midiMeta.firstTempoBpm.toFixed(2)} BPM`
        : "unknown / unchanged"
    }<br />
    <strong>Total notes:</strong> ${totalNotes}<br />
    <strong>Repeater base block:</strong> ${escapeHtml(exportSettings.repeaterBaseBlockId)}<br />
  `;
}

function renderTrackList(): void {
  if (loadedTracks.length === 0) {
    trackList.textContent = "No tracks loaded.";
    return;
  }

  trackList.innerHTML = loadedTracks
    .map((track) => {
      const settings = getTrackSettings(track.trackIndex);
      const isSelected = selectedTrackIndex === track.trackIndex;
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

  trackList
    .querySelectorAll<HTMLButtonElement>(".track-select-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedTrackIndex = Number(button.dataset.trackIndex);
        renderAll();
      });
    });

  trackList
    .querySelectorAll<HTMLInputElement>(".track-visible-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const trackIndex = Number(checkbox.dataset.trackIndex);
        const settings = getTrackSettings(trackIndex);
        settings.visible = checkbox.checked;
        renderAll();
      });
    });

  trackList
    .querySelectorAll<HTMLInputElement>(".track-export-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const trackIndex = Number(checkbox.dataset.trackIndex);
        const settings = getTrackSettings(trackIndex);
        settings.exportEnabled = checkbox.checked;
        renderAll();
      });
    });
}

function renderPianoRoll(): void {
  const previousScroll = pianoRoll.querySelector<HTMLDivElement>(".piano-scroll");

  const previousScrollLeft = previousScroll?.scrollLeft ?? 0;
  const previousScrollTop = previousScroll?.scrollTop ?? 0;

  const visibleTracks = loadedTracks.filter((track) => {
    return getTrackSettings(track.trackIndex).visible;
  });

  const visibleNotes = visibleTracks.flatMap((track) =>
    track.notes.map((note) => ({ track, note })),
  );

  if (visibleNotes.length === 0) {
    pianoRoll.className = "piano-roll empty";
    pianoRoll.textContent = "No visible notes.";
    return;
  }

  pianoRoll.className = "piano-roll";

  const leftPad = 64;
  const topPad = 24;
  const rowHeight = 10;
  const pxPerBlock = 18;
  const rightPad = 80;
  const bottomPad = 24;

  const minMidi = Math.max(
    0,
    Math.min(...visibleNotes.map(({ note }) => note.midi)) - 2,
  );
  const maxMidi = Math.min(
    127,
    Math.max(...visibleNotes.map(({ note }) => note.midi)) + 2,
  );

  const maxTick = Math.max(
    ...visibleNotes.map(({ note }) => note.ticks + note.durationTicks),
  );

  const maxQuarter = Math.ceil(maxTick / currentPpq) + 1;
  const width =
    leftPad +
    maxQuarter * exportSettings.blocksPerQuarterNote * pxPerBlock +
    rightPad;
  const height = topPad + (maxMidi - minMidi + 1) * rowHeight + bottomPad;

  const grid = renderPianoGrid({
    leftPad,
    topPad,
    rowHeight,
    pxPerBlock,
    minMidi,
    maxMidi,
    maxQuarter,
    height,
  });

  const notesSvg = visibleNotes
    .map(({ track, note }) => {
      const x =
        leftPad +
        (note.ticks / currentPpq) *
          exportSettings.blocksPerQuarterNote *
          pxPerBlock;

      const noteWidth = Math.max(
        4,
        (note.durationTicks / currentPpq) *
          exportSettings.blocksPerQuarterNote *
          pxPerBlock,
      );

      const y = topPad + (maxMidi - note.midi) * rowHeight;
      const isSelected = selectedTrackIndex === track.trackIndex;
      const opacity =
        selectedTrackIndex === null || isSelected ? "0.95" : "0.25";
      const stroke = isSelected ? "#ffffff" : "#27272a";
      const color = getTrackColor(track.trackIndex);

      return `
        <rect
          class="piano-note"
          data-track-index="${track.trackIndex}"
          x="${x.toFixed(2)}"
          y="${y.toFixed(2)}"
          width="${noteWidth.toFixed(2)}"
          height="${Math.max(4, rowHeight - 2)}"
          rx="2"
          fill="${color}"
          opacity="${opacity}"
          stroke="${stroke}"
          stroke-width="${isSelected ? 1.5 : 0.5}"
        />
      `;
    })
    .join("");

  pianoRoll.innerHTML = `
    <div class="piano-scroll">
      <svg
        class="piano-svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="MIDI piano roll"
      >
        ${grid}
        ${notesSvg}
      </svg>
    </div>
  `;

  const nextScroll = pianoRoll.querySelector<HTMLDivElement>(".piano-scroll");

  if (nextScroll) {
    nextScroll.scrollLeft = previousScrollLeft;
    nextScroll.scrollTop = previousScrollTop;
  }

  const svg = pianoRoll.querySelector<SVGSVGElement>("svg");

  svg?.addEventListener("click", (event) => {
    const target = event.target as SVGElement;
    const trackIndexValue = target.dataset.trackIndex;

    if (trackIndexValue === undefined) {
      return;
    }

    selectedTrackIndex = Number(trackIndexValue);
    renderAll();
  });
}

function renderPianoGrid(args: {
  leftPad: number;
  topPad: number;
  rowHeight: number;
  pxPerBlock: number;
  minMidi: number;
  maxMidi: number;
  maxQuarter: number;
  height: number;
}): string {
  const {
    leftPad,
    topPad,
    rowHeight,
    pxPerBlock,
    minMidi,
    maxMidi,
    maxQuarter,
    height,
  } = args;

  const horizontalLines: string[] = [];

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const y = topPad + (maxMidi - midi) * rowHeight;
    const isC = midi % 12 === 0;

    horizontalLines.push(`
      <line
        x1="${leftPad}"
        y1="${y}"
        x2="100%"
        y2="${y}"
        class="${isC ? "grid-line octave" : "grid-line"}"
      />
    `);

    if (isC) {
      horizontalLines.push(`
        <text
          x="${leftPad - 8}"
          y="${y + rowHeight - 2}"
          text-anchor="end"
          class="pitch-label"
        >
          ${midiToNoteName(midi)}
        </text>
      `);
    }
  }

  const verticalLines: string[] = [];

  for (let quarter = 0; quarter <= maxQuarter; quarter++) {
    const x =
      leftPad + quarter * exportSettings.blocksPerQuarterNote * pxPerBlock;
    const isMeasure = quarter % 4 === 0;

    verticalLines.push(`
      <line
        x1="${x}"
        y1="0"
        x2="${x}"
        y2="${height}"
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

function renderSelectedTrackSettings(): void {
  if (selectedTrackIndex === null) {
    selectedTrackSettings.textContent = "No track selected.";
    return;
  }

  const track = loadedTracks.find(
    (candidate) => candidate.trackIndex === selectedTrackIndex,
  );

  if (!track) {
    selectedTrackSettings.textContent = "Selected track was not found.";
    return;
  }

  const settings = getTrackSettings(track.trackIndex);
  if (track.isPercussion) {
    renderPercussionTrackSettings(track, settings);
    return;
  }

  const stats = getPitchStats(track, settings);

  selectedTrackSettings.innerHTML = `
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

    ${
      track.isPercussion
        ? `<p class="warning-text">
            This track is marked as percussion. Dedicated percussion handling will be added later.
          </p>`
        : ""
    }

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

  getElement<HTMLSelectElement>("#selected-base-midi").addEventListener(
    "change",
    (event) => {
      settings.baseMidi = Number((event.target as HTMLSelectElement).value);
      renderAll();
    },
  );

  getElement<HTMLInputElement>("#normal-block-input").addEventListener(
    "change",
    (event) => {
      settings.normalBlockId = (event.target as HTMLInputElement).value.trim();
      renderAll();
    },
  );

  getElement<HTMLInputElement>("#high-overflow-block-input").addEventListener(
    "change",
    (event) => {
      settings.highOverflowBlockId = (
        event.target as HTMLInputElement
      ).value.trim();
      renderAll();
    },
  );

  getElement<HTMLInputElement>("#low-overflow-block-input").addEventListener(
    "change",
    (event) => {
      settings.lowOverflowBlockId = (
        event.target as HTMLInputElement
      ).value.trim();
      renderAll();
    },
  );
}

function renderPercussionTrackSettings(
  track: TrackData,
  settings: TrackSettings,
): void {
  const counts = countNotesByMidi(track);

  selectedTrackSettings.innerHTML = `
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

  getElement<HTMLButtonElement>(
    "#apply-percussion-preset-button",
  ).addEventListener("click", () => {
    const presetSelect = getElement<HTMLSelectElement>(
      "#percussion-preset-select",
    );

    const presetId = parsePercussionPresetId(presetSelect.value);

    settings.percussionMappings = applyPercussionPreset(
      settings.percussionMappings,
      presetId,
    );

    renderAll();
  });

  getElement<HTMLButtonElement>(
    "#reset-percussion-mapping-button",
  ).addEventListener("click", () => {
    settings.percussionMappings = createDefaultPercussionMappings(track);
    renderAll();
  });

  selectedTrackSettings
    .querySelectorAll<HTMLInputElement>(".percussion-enabled-input")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const mapping = getPercussionMapping(settings, Number(input.dataset.midi));
        mapping.enabled = input.checked;
        renderPlacementPreview();
      });
    });

  selectedTrackSettings
    .querySelectorAll<HTMLInputElement>(".percussion-block-input")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const mapping = getPercussionMapping(settings, Number(input.dataset.midi));
        const value = input.value.trim();

        if (!value) {
          input.value = mapping.blockId;
          return;
        }

        mapping.blockId = value;
        renderPlacementPreview();
      });
    });

  selectedTrackSettings
    .querySelectorAll<HTMLInputElement>(".percussion-note-input")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const mapping = getPercussionMapping(settings, Number(input.dataset.midi));
        const value = clampInteger(Number(input.value), 0, 24);

        mapping.note = value;
        input.value = String(value);
        renderPlacementPreview();
      });
    });
}

function renderPlacementPreview(): void {
  const exportTracks = loadedTracks.filter((track) => {
    return getTrackSettings(track.trackIndex).exportEnabled;
  });

  if (exportTracks.length === 0) {
    placementPreview.textContent = "No export tracks selected.";
    return;
  }

  const regions = exportTracks.map((track, exportIndex) => {
    const settings = getTrackSettings(track.trackIndex);
    const trackYOffset = -3 * exportIndex;

    const placements = buildTrackPlacements(
      track,
      settings,
      exportSettings,
      currentPpq,
      trackYOffset,
    );

    return {
      name: sanitizeRegionName(track.trackName, track.trackIndex),
      placements,
    };
  });

  placementPreview.textContent = JSON.stringify(
    {
      litematicVersion: exportSettings.litematicVersion,
      blocksPerQuarterNote: exportSettings.blocksPerQuarterNote,
      subRegions: regions,
    },
    null,
    2,
  );
}

function buildTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
): BlockPlacement[] {
  if (track.isPercussion) {
    return buildPercussionTrackPlacements(
      track,
      settings,
      currentExportSettings,
      ppq,
      trackYOffset,
    );
  }

  return buildNormalTrackPlacements(
    track,
    settings,
    currentExportSettings,
    ppq,
    trackYOffset,
  );
}

function buildNormalTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
): BlockPlacement[] {
  const placements: BlockPlacement[] = [];
  const laneEndXList: number[] = [];

  const effectiveBlocksPerQuarterNote =
    currentExportSettings.blocksPerQuarterNote * 2;

  for (const note of track.notes) {
    const x = Math.round(
      (note.ticks / ppq) * effectiveBlocksPerQuarterNote,
    );

    const noteLengthBlocks = Math.max(
      1,
      Math.round(
        (note.durationTicks / ppq) * effectiveBlocksPerQuarterNote,
      ),
    );

    const z = allocateLane(laneEndXList, x, noteLengthBlocks);

    const correctedPitch = correctNoteBlockPitch(note.midi, settings.baseMidi);
    const instrumentBlock = getInstrumentBlockForCorrection(
      correctedPitch.correction,
      settings,
    );

    addNoteLayoutPlacements({
      placements,
      x,
      y: trackYOffset,
      z,
      noteLengthBlocks,
      baseBlockId: instrumentBlock,
      noteBlockPitch: correctedPitch.pitch,
      repeaterBaseBlockId: currentExportSettings.repeaterBaseBlockId,
    });
  }

  return placements;
}

function addNoteLayoutPlacements(args: {
  placements: BlockPlacement[];
  x: number;
  y: number;
  z: number;
  noteLengthBlocks: number;
  baseBlockId: string;
  noteBlockPitch: number;
  repeaterBaseBlockId: string;
}): void {
  const {
    placements,
    x,
    y,
    z,
    noteLengthBlocks,
    baseBlockId,
    noteBlockPitch,
    repeaterBaseBlockId,
  } = args;

  placements.push({
    x,
    y,
    z,
    blockId: baseBlockId,
  });

  placements.push({
    x,
    y: y + 1,
    z,
    blockId: "minecraft:note_block",
    properties: {
      instrument: "harp",
      note: String(noteBlockPitch),
      powered: "false",
    },
  });

  for (let offset = 1; offset < noteLengthBlocks; offset++) {
    const isRepeaterPosition = offset % 2 === 1;

    placements.push({
      x: x + offset,
      y,
      z,
      blockId: repeaterBaseBlockId,
    });

    placements.push({
      x: x + offset,
      y: y + 1,
      z,
      blockId: isRepeaterPosition
        ? "minecraft:repeater"
        : repeaterBaseBlockId,
      properties: isRepeaterPosition
        ? {
            delay: "1",
            facing: "west",
            locked: "false",
            powered: "false",
          }
        : undefined,
    });
  }
}

function buildPercussionTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
): BlockPlacement[] {
  const placements: BlockPlacement[] = [];
  const laneEndXList: number[] = [];

  const effectiveBlocksPerQuarterNote =
    currentExportSettings.blocksPerQuarterNote * 2;

  for (const note of track.notes) {
    const mapping = settings.percussionMappings.find(
      (candidate) => candidate.midi === note.midi,
    );

    if (!mapping || !mapping.enabled) {
      continue;
    }

    const x = Math.round(
      (note.ticks / ppq) * effectiveBlocksPerQuarterNote,
    );

    const noteLengthBlocks = Math.max(
      1,
      Math.round(
        (note.durationTicks / ppq) * effectiveBlocksPerQuarterNote,
      ),
    );

    const z = allocateLane(laneEndXList, x, noteLengthBlocks);

    addNoteLayoutPlacements({
      placements,
      x,
      y: trackYOffset,
      z,
      noteLengthBlocks,
      baseBlockId: mapping.blockId,
      noteBlockPitch: clampInteger(mapping.note, 0, 24),
      repeaterBaseBlockId: currentExportSettings.repeaterBaseBlockId,
    });
  }

  return placements;
}

function allocateLane(
  laneEndXList: number[],
  startX: number,
  length: number,
): number {
  const endX = startX + length - 1;

  for (let lane = 0; lane < laneEndXList.length; lane++) {
    if (startX > laneEndXList[lane]) {
      laneEndXList[lane] = endX;
      return lane;
    }
  }

  laneEndXList.push(endX);
  return laneEndXList.length - 1;
}

function getInstrumentBlockForCorrection(
  correction: PitchCorrection,
  settings: TrackSettings,
): string {
  if (correction === "high") {
    return settings.highOverflowBlockId;
  }

  if (correction === "low") {
    return settings.lowOverflowBlockId;
  }

  return settings.normalBlockId;
}

function correctNoteBlockPitch(midi: number, baseMidi: number): CorrectedPitch {
  const rawPitch = midi - baseMidi + 12;

  if (rawPitch >= 0 && rawPitch <= 24) {
    return {
      pitch: rawPitch,
      correction: "none",
      rawPitch,
    };
  }

  if (rawPitch > 24) {
    let pitch = rawPitch;

    while (pitch > 24) {
      pitch -= 24;
    }

    return {
      pitch,
      correction: "high",
      rawPitch,
    };
  }

  let pitch = rawPitch;

  while (pitch < 0) {
    pitch += 24;
  }

  return {
    pitch,
    correction: "low",
    rawPitch,
  };
}

function getPitchStats(
  track: TrackData,
  settings: TrackSettings,
): Record<PitchCorrection, number> {
  const stats: Record<PitchCorrection, number> = {
    none: 0,
    high: 0,
    low: 0,
  };

  for (const note of track.notes) {
    const corrected = correctNoteBlockPitch(note.midi, settings.baseMidi);
    stats[corrected.correction]++;
  }

  return stats;
}

function formatTrackNotesPreview(
  track: TrackData,
  settings: TrackSettings,
  limit: number,
): string {
  if (track.notes.length === 0) {
    return "No notes found in this track.";
  }

  const preview = track.notes.slice(0, limit).map((note) => {
    const corrected = correctNoteBlockPitch(note.midi, settings.baseMidi);

    return [
      `name=${note.name}`,
      `midi=${note.midi}`,
      `rawPitch=${corrected.rawPitch}`,
      `noteBlockPitch=${corrected.pitch}`,
      `correction=${corrected.correction}`,
      `ticks=${note.ticks}`,
      `time=${note.time.toFixed(3)}s`,
      `duration=${note.duration.toFixed(3)}s`,
      `velocity=${note.velocity.toFixed(2)}`,
    ].join("  ");
  });

  const remaining = track.notes.length - preview.length;

  if (remaining > 0) {
    preview.push("");
    preview.push(`...and ${remaining} more notes`);
  }

  return preview.join("\n");
}

function createDefaultTrackSettings(
  tracks: TrackData[],
): Map<number, TrackSettings> {
  const map = new Map<number, TrackSettings>();

  for (const track of tracks) {
    map.set(track.trackIndex, {
      trackIndex: track.trackIndex,
      visible: track.notes.length > 0,
      exportEnabled: track.notes.length > 0 && !track.isPercussion,
      baseMidi: DEFAULT_BASE_MIDI,
      normalBlockId: DEFAULT_NORMAL_BLOCK,
      highOverflowBlockId: DEFAULT_HIGH_OVERFLOW_BLOCK,
      lowOverflowBlockId: DEFAULT_LOW_OVERFLOW_BLOCK,
      percussionMappings: createDefaultPercussionMappings(track),
    });
  }

  return map;
}

function createDefaultPercussionMappings(
  track: TrackData,
): PercussionMapping[] {
  if (!track.isPercussion) {
    return [];
  }

  const midiValues = Array.from(
    new Set(track.notes.map((note) => note.midi)),
  ).sort((a, b) => a - b);

  return midiValues.map((midi) => ({
    midi,
    enabled: true,
    blockId: DEFAULT_PERCUSSION_BLOCK,
    note: DEFAULT_PERCUSSION_NOTE,
  }));
}

function getTrackSettings(trackIndex: number): TrackSettings {
  const settings = trackSettingsMap.get(trackIndex);

  if (!settings) {
    throw new Error(`Track settings not found: ${trackIndex}`);
  }

  return settings;
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

function midiToNoteName(midi: number): string {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `${name}${octave}`;
}

function getTrackColor(trackIndex: number): string {
  return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
}

function sanitizeRegionName(trackName: string, trackIndex: number): string {
  const safeName = trackName
    .trim()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^a-zA-Z0-9_.-]/g, "");

  return safeName || `Track_${trackIndex}`;
}

function clearLoadedMidi(): void {
  loadedTracks = [];
  trackSettingsMap.clear();
  selectedTrackIndex = null;

  fileInfo.textContent = "No file selected.";
  midiSummary.textContent = "No MIDI data loaded.";
  trackList.textContent = "No tracks loaded.";
  pianoRoll.className = "piano-roll empty";
  pianoRoll.textContent = "No MIDI data loaded.";
  selectedTrackSettings.textContent = "No track selected.";
  placementPreview.textContent = "No placement data.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

downloadLitematicButton.addEventListener("click", () => {
  const exportTracks = loadedTracks.filter((track) => {
    return getTrackSettings(track.trackIndex).exportEnabled;
  });

  if (exportTracks.length === 0) {
    alert("No export tracks selected.");
    return;
  }

  const regions = exportTracks.map((track, exportIndex) => {
    const settings = getTrackSettings(track.trackIndex);
    const trackYOffset = -3 * exportIndex;

    const placements = buildTrackPlacements(
      track,
      settings,
      exportSettings,
      currentPpq,
      trackYOffset,
    );

    return {
      name: sanitizeRegionName(track.trackName, track.trackIndex),
      placements,
    };
  });

  const bytes = writeLitematicV7({
    name: "noteblock_export",
    author: "Noteblock Litematic Generator",
    description: "Generated from MIDI",
    minecraftDataVersion: 4671,
    regions,
  });

  downloadBytes(bytes, "noteblock_export.litematic", "application/octet-stream");
});

function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
): void {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function countNotesByMidi(track: TrackData): Map<number, number> {
  const counts = new Map<number, number>();

  for (const note of track.notes) {
    counts.set(note.midi, (counts.get(note.midi) ?? 0) + 1);
  }

  return counts;
}

function getPercussionName(midi: number): string {
  return GM_PERCUSSION_NAMES[midi] ?? `Percussion ${midi}`;
}

function getPercussionMapping(
  settings: TrackSettings,
  midi: number,
): PercussionMapping {
  const mapping = settings.percussionMappings.find(
    (candidate) => candidate.midi === midi,
  );

  if (!mapping) {
    throw new Error(`Percussion mapping not found: MIDI ${midi}`);
  }

  return mapping;
}

function formatPercussionNotesPreview(
  track: TrackData,
  settings: TrackSettings,
  limit: number,
): string {
  if (track.notes.length === 0) {
    return "No percussion notes found in this track.";
  }

  const preview = track.notes.slice(0, limit).map((note) => {
    const mapping = settings.percussionMappings.find(
      (candidate) => candidate.midi === note.midi,
    );

    return [
      `name=${getPercussionName(note.midi)}`,
      `midi=${note.midi}`,
      `mappedBlock=${mapping?.blockId ?? "unmapped"}`,
      `mappedNote=${mapping?.note ?? "unmapped"}`,
      `enabled=${mapping?.enabled ?? false}`,
      `ticks=${note.ticks}`,
      `time=${note.time.toFixed(3)}s`,
      `duration=${note.duration.toFixed(3)}s`,
      `velocity=${note.velocity.toFixed(2)}`,
    ].join("  ");
  });

  const remaining = track.notes.length - preview.length;

  if (remaining > 0) {
    preview.push("");
    preview.push(`...and ${remaining} more notes`);
  }

  return preview.join("\n");
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function applyPercussionPreset(
  mappings: PercussionMapping[],
  presetId: PercussionPresetId,
): PercussionMapping[] {
  const preset: PercussionPreset = PERCUSSION_PRESETS[presetId];

  return mappings.map((mapping) => {
    const presetEntry = preset.mappings[mapping.midi];

    if (!presetEntry) {
      return {
        ...mapping,
        blockId: DEFAULT_PERCUSSION_BLOCK,
        note: DEFAULT_PERCUSSION_NOTE,
        enabled: true,
      };
    }

    return {
      ...mapping,
      blockId: presetEntry.blockId,
      note: clampInteger(presetEntry.note, 0, 24),
      enabled: presetEntry.enabled ?? true,
    };
  });
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

function parsePercussionPresetId(value: string): PercussionPresetId {
  if (value in PERCUSSION_PRESETS) {
    return value as PercussionPresetId;
  }

  throw new Error(`Unknown percussion preset: ${value}`);
}