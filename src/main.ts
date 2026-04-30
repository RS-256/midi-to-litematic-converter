import { Midi } from "@tonejs/midi";
import "./style.css";

type ParsedNote = {
  trackIndex: number;
  name: string;
  midi: number;
  time: number;
  ticks: number;
  duration: number;
  velocity: number;
};

const app = document.querySelector<HTMLDivElement>("#app");

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
      <h2>MIDI Summary</h2>
      <div id="midi-summary" class="midi-summary">
        No MIDI data loaded.
      </div>
    </section>

    <section class="card">
      <h2>Notes Preview</h2>
      <pre id="notes-output" class="notes-output">No notes loaded.</pre>
    </section>
  </main>
`;

const fileInput = document.querySelector<HTMLInputElement>("#midi-file");
const fileInfo = document.querySelector<HTMLDivElement>("#file-info");
const midiSummary = document.querySelector<HTMLDivElement>("#midi-summary");
const notesOutput = document.querySelector<HTMLPreElement>("#notes-output");

if (!fileInput || !fileInfo || !midiSummary || !notesOutput) {
  throw new Error("Required elements were not found");
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];

  if (!file) {
    fileInfo.textContent = "No file selected.";
    midiSummary.textContent = "No MIDI data loaded.";
    notesOutput.textContent = "No notes loaded.";
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

    const notes: ParsedNote[] = midi.tracks.flatMap((track, trackIndex) =>
      track.notes.map((note) => ({
        trackIndex,
        name: note.name,
        midi: note.midi,
        time: note.time,
        ticks: note.ticks,
        duration: note.duration,
        velocity: note.velocity,
      })),
    );

    notes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

    const tempos = midi.header.tempos;
    const firstTempo = tempos[0];

    midiSummary.innerHTML = `
      <strong>Tracks:</strong> ${midi.tracks.length}<br />
      <strong>PPQ:</strong> ${midi.header.ppq}<br />
      <strong>Tempos:</strong> ${tempos.length}<br />
      <strong>First tempo:</strong> ${
        firstTempo ? `${firstTempo.bpm.toFixed(2)} BPM` : "unknown"
      }<br />
      <strong>Total notes:</strong> ${notes.length}
    `;

    notesOutput.textContent = formatNotesPreview(notes, 100);
  } catch (error) {
    console.error(error);

    midiSummary.textContent = "Failed to parse MIDI file.";
    notesOutput.textContent =
      error instanceof Error ? error.message : String(error);
  }
});

function formatNotesPreview(notes: ParsedNote[], limit: number): string {
  if (notes.length === 0) {
    return "No notes found in this MIDI file.";
  }

  const preview = notes.slice(0, limit).map((note) => {
    return [
      `track=${note.trackIndex}`,
      `name=${note.name}`,
      `midi=${note.midi}`,
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