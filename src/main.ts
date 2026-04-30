import "./style.css";

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
  </main>
`;

const fileInput = document.querySelector<HTMLInputElement>("#midi-file");
const fileInfo = document.querySelector<HTMLDivElement>("#file-info");

if (!fileInput || !fileInfo) {
  throw new Error("Required elements were not found");
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  if (!file) {
    fileInfo.textContent = "No file selected.";
    return;
  }

  fileInfo.innerHTML = `
    <strong>Selected file:</strong><br />
    Name: ${file.name}<br />
    Size: ${formatBytes(file.size)}<br />
    Type: ${file.type || "unknown"}
  `;
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}