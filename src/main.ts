import { Midi } from "@tonejs/midi";
import "./style.css";

type RawNote = {
  name: string;
  midi: number;
  time: number;
  ticks: number;
  duration: number;
  velocity: number;
};

type TrackData = {
  trackIndex: number;
  trackName: string;
  notes: RawNote[];
};

const DEFAULT_BASE_MIDI = 66; // F#4. noteBlockPitch 12 の基準音

type LitematicVersion = 5 | 6 | 7;

const DEFAULT_LITEMATIC_VERSION: LitematicVersion = 7;

let selectedLitematicVersion: LitematicVersion = DEFAULT_LITEMATIC_VERSION;

let loadedTracks: TrackData[] = [];
const trackBaseMidiMap = new Map<number, number>();

const app = getElement<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app element was not found");
}

app.innerHTML = `
  <main class="container">
    <h1>Noteblock Litematic Generator</h1>

    <p class="description">
      Convert MIDI files into Minecraft note block litematic data.
    </p>

    <section class="card">
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

    <section class="card">
      <h2>Export Settings</h2>

      <div class="settings-grid">
        <label>
          Litematic version:
          <select id="litematic-version-select" class="setting-select">
            <option value="7" selected>Version 7 - MC 1.20.5+ / latest</option>
            <option value="6">Version 6 - older modern versions</option>
            <option value="5">Version 5 - legacy compatibility</option>
          </select>
        </label>

        <p class="setting-help">
          This setting will be used when generating .litematic files.
          Track settings remain independent from the file format version.
        </p>
      </div>
    </section>

    <section class="card">
      <h2>MIDI Summary</h2>
      <div id="midi-summary" class="midi-summary">
        No MIDI data loaded.
      </div>
    </section>

    <section class="card">
      <h2>Tracks</h2>
      <div id="tracks-output" class="tracks-output">
        No tracks loaded.
      </div>
    </section>
  </main>
`;

const fileInput = getElement<HTMLInputElement>("#midi-file");
const fileInfo = getElement<HTMLDivElement>("#file-info");
const litematicVersionSelect = getElement<HTMLSelectElement>(
  "#litematic-version-select",
);
const midiSummary = getElement<HTMLDivElement>("#midi-summary");
const tracksOutput = getElement<HTMLDivElement>("#tracks-output");

litematicVersionSelect.addEventListener("change", () => {
  selectedLitematicVersion = parseLitematicVersion(
    litematicVersionSelect.value,
  );
});

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

    loadedTracks = midi.tracks.map((track, trackIndex) => {
      const notes: RawNote[] = track.notes
        .map((note) => ({
          name: note.name,
          midi: note.midi,
          time: note.time,
          ticks: note.ticks,
          duration: note.duration,
          velocity: note.velocity,
        }))
        .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

      return {
        trackIndex,
        trackName: track.name || `Track ${trackIndex}`,
        notes,
      };
    });

    trackBaseMidiMap.clear();

    for (const track of loadedTracks) {
      trackBaseMidiMap.set(track.trackIndex, DEFAULT_BASE_MIDI);
    }

    const totalNotes = loadedTracks.reduce(
      (sum, track) => sum + track.notes.length,
      0,
    );

    const tempos = midi.header.tempos;
    const firstTempo = tempos[0];

    midiSummary.innerHTML = `
      <strong>Litematic version:</strong> ${selectedLitematicVersion}<br />
      <strong>Tracks:</strong> ${loadedTracks.length}<br />
      <strong>PPQ:</strong> ${midi.header.ppq}<br />
      <strong>Tempos:</strong> ${tempos.length}<br />
      <strong>First tempo:</strong> ${
        firstTempo ? `${firstTempo.bpm.toFixed(2)} BPM` : "unknown"
      }<br />
      <strong>Total notes:</strong> ${totalNotes}
    `;

    renderTracks();
  } catch (error) {
    console.error(error);

    loadedTracks = [];
    trackBaseMidiMap.clear();

    midiSummary.textContent = "Failed to parse MIDI file.";
    tracksOutput.textContent =
      error instanceof Error ? error.message : String(error);
  }
});

function clearLoadedMidi(): void {
  loadedTracks = [];
  trackBaseMidiMap.clear();

  fileInfo.textContent = "No file selected.";
  midiSummary.textContent = "No MIDI data loaded.";
  tracksOutput.textContent = "No tracks loaded.";
}

function renderTracks(): void {
  if (loadedTracks.length === 0) {
    tracksOutput.textContent = "No tracks loaded.";
    return;
  }

  tracksOutput.innerHTML = loadedTracks.map(renderTrack).join("");

  const baseNoteSelects =
    tracksOutput.querySelectorAll<HTMLSelectElement>(".base-note-select");

  for (const select of baseNoteSelects) {
    select.addEventListener("change", () => {
      const trackIndex = Number(select.dataset.trackIndex);
      const baseMidi = Number(select.value);

      trackBaseMidiMap.set(trackIndex, baseMidi);
      renderTracks();
    });
  }
}

function renderTrack(track: TrackData): string {
  const baseMidi = trackBaseMidiMap.get(track.trackIndex) ?? DEFAULT_BASE_MIDI;

  const playableNotes = track.notes.filter((note) => {
    return midiToNoteBlockPitch(note.midi, baseMidi) !== null;
  });

  const outOfRangeNotes = track.notes.length - playableNotes.length;

  return `
    <details class="track-card">
      <summary>
        ${escapeHtml(track.trackName)}
        <span class="track-meta">
          ${track.notes.length} notes / ${playableNotes.length} playable
        </span>
      </summary>

      <div class="track-settings">
        <label>
          noteBlockPitch 12 base note:
          <select
            class="base-note-select"
            data-track-index="${track.trackIndex}"
          >
            ${renderBaseNoteOptions(baseMidi)}
          </select>
        </label>

        <div class="track-stats">
          <strong>Track index:</strong> ${track.trackIndex}<br />
          <strong>Total notes:</strong> ${track.notes.length}<br />
          <strong>Playable notes:</strong> ${playableNotes.length}<br />
          <strong>Out-of-range notes:</strong> ${outOfRangeNotes}
        </div>
      </div>

      <pre class="notes-output">${escapeHtml(
        formatTrackNotesPreview(track.notes, baseMidi, 100),
      )}</pre>
    </details>
  `;
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

function formatTrackNotesPreview(
  notes: RawNote[],
  baseMidi: number,
  limit: number,
): string {
  if (notes.length === 0) {
    return "No notes found in this track.";
  }

  const preview = notes.slice(0, limit).map((note) => {
    const noteBlockPitch = midiToNoteBlockPitch(note.midi, baseMidi);

    return [
      `name=${note.name}`,
      `midi=${note.midi}`,
      `noteBlockPitch=${formatNoteBlockPitch(noteBlockPitch)}`,
      `ticks=${note.ticks}`,
      `time=${note.time.toFixed(3)}s`,
      `duration=${note.duration.toFixed(3)}s`,
      `velocity=${note.velocity.toFixed(2)}`,
    ].join("  ");
  });

  const remaining = notes.length - preview.length;

  if (remaining > 0) {
    preview.push("");
    preview.push(`...and ${remaining} more notes`);
  }

  return preview.join("\n");
}

function midiToNoteBlockPitch(midi: number, baseMidi: number): number | null {
  const pitch = midi - baseMidi + 12;

  if (pitch < 0 || pitch > 24) {
    return null;
  }

  return pitch;
}

function formatNoteBlockPitch(pitch: number | null): string {
  return pitch === null ? "out-of-range" : String(pitch);
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

function parseLitematicVersion(value: string): LitematicVersion {
  const version = Number(value);

  if (version === 5 || version === 6 || version === 7) {
    return version;
  }

  throw new Error(`Unsupported litematic version: ${value}`);
}