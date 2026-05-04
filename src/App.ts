import { DEFAULT_EXPORT_SETTINGS } from "./constants";
import { buildTrackPlacements } from "./domain/placements";
import {
  applyPercussionPreset,
  getPercussionMapping,
  parsePercussionPresetId,
} from "./domain/percussion";
import {
  createDefaultPercussionMappings,
  createDefaultTrackSettings,
} from "./domain/trackSettings";
import { writeLitematicV7 } from "./litematic/writeLitematicV7";
import { parseMidiFile } from "./midi/parseMidi";
import type { ExportSettings, MidiMeta, TrackData, TrackSettings } from "./types";
import {
  getTrackColor,
  renderAppShell,
  renderNormalTrackSettingsHtml,
  renderPercussionTrackSettingsHtml,
  renderPianoGridHtml,
  renderTrackListHtml,
} from "./ui/templates";
import { downloadBytes, escapeHtml, getElement } from "./utils/dom";
import { clampInteger, formatBytes, sanitizeRegionName } from "./utils/format";

type AppElements = {
  fileInput: HTMLInputElement;
  fileInfo: HTMLDivElement;
  blocksPerQuarterInput: HTMLInputElement;
  repeaterBaseBlockInput: HTMLInputElement;
  midiSummary: HTMLDivElement;
  trackList: HTMLDivElement;
  pianoRoll: HTMLDivElement;
  selectedTrackSettings: HTMLDivElement;
  placementPreview: HTMLPreElement;
  downloadLitematicButton: HTMLButtonElement;
};

export class App {
  private loadedTracks: TrackData[] = [];
  private trackSettingsMap = new Map<number, TrackSettings>();
  private exportSettings: ExportSettings = { ...DEFAULT_EXPORT_SETTINGS };
  private selectedTrackIndex: number | null = null;
  private currentPpq = 480;
  private readonly root: HTMLDivElement;
  private readonly elements: AppElements;

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.root.innerHTML = renderAppShell();
    this.elements = this.getElements();
    this.bindGlobalEvents();
  }

  private getElements(): AppElements {
    return {
      fileInput: getElement<HTMLInputElement>("#midi-file", this.root),
      fileInfo: getElement<HTMLDivElement>("#file-info", this.root),
      blocksPerQuarterInput: getElement<HTMLInputElement>(
        "#blocks-per-quarter-input",
        this.root,
      ),
      repeaterBaseBlockInput: getElement<HTMLInputElement>(
        "#repeater-base-block-input",
        this.root,
      ),
      midiSummary: getElement<HTMLDivElement>("#midi-summary", this.root),
      trackList: getElement<HTMLDivElement>("#track-list", this.root),
      pianoRoll: getElement<HTMLDivElement>("#piano-roll", this.root),
      selectedTrackSettings: getElement<HTMLDivElement>(
        "#selected-track-settings",
        this.root,
      ),
      placementPreview: getElement<HTMLPreElement>(
        "#placement-preview",
        this.root,
      ),
      downloadLitematicButton: getElement<HTMLButtonElement>(
        "#download-litematic-button",
        this.root,
      ),
    };
  }

  private bindGlobalEvents(): void {
    this.elements.fileInput.addEventListener("change", () => {
      void this.loadSelectedMidi();
    });

    this.elements.blocksPerQuarterInput.addEventListener("change", () => {
      const value = Number(this.elements.blocksPerQuarterInput.value);

      if (!Number.isFinite(value) || value <= 0) {
        this.elements.blocksPerQuarterInput.value = String(
          this.exportSettings.blocksPerQuarterNote,
        );
        return;
      }

      this.exportSettings = {
        ...this.exportSettings,
        blocksPerQuarterNote: Math.round(value),
      };

      this.renderAll();
    });

    this.elements.repeaterBaseBlockInput.addEventListener("change", () => {
      const blockId = this.elements.repeaterBaseBlockInput.value.trim();

      if (!blockId) {
        this.elements.repeaterBaseBlockInput.value =
          this.exportSettings.repeaterBaseBlockId;
        return;
      }

      this.exportSettings = {
        ...this.exportSettings,
        repeaterBaseBlockId: blockId,
      };

      this.renderAll();
    });

    this.elements.downloadLitematicButton.addEventListener("click", () => {
      this.downloadLitematic();
    });
  }

  private async loadSelectedMidi(): Promise<void> {
    const file = this.elements.fileInput.files?.[0];

    if (!file) {
      this.clearLoadedMidi();
      return;
    }

    this.elements.fileInfo.innerHTML = `
      <strong>Selected file:</strong><br />
      Name: ${escapeHtml(file.name)}<br />
      Size: ${formatBytes(file.size)}<br />
      Type: ${escapeHtml(file.type || "unknown")}
    `;

    try {
      const parsed = parseMidiFile(await file.arrayBuffer());

      this.currentPpq = parsed.ppq;
      this.loadedTracks = parsed.tracks;
      this.trackSettingsMap = createDefaultTrackSettings(this.loadedTracks);
      this.selectedTrackIndex =
        this.loadedTracks.find((track) => track.notes.length > 0)?.trackIndex ??
        this.loadedTracks[0]?.trackIndex ??
        null;

      this.renderAll(parsed.meta);
    } catch (error) {
      console.error(error);
      this.loadedTracks = [];
      this.trackSettingsMap.clear();
      this.selectedTrackIndex = null;

      this.elements.midiSummary.textContent = "Failed to parse MIDI file.";
      this.elements.trackList.textContent = "No tracks loaded.";
      this.elements.pianoRoll.textContent =
        error instanceof Error ? error.message : String(error);
      this.elements.selectedTrackSettings.textContent = "No track selected.";
      this.elements.placementPreview.textContent = "No placement data.";
    }
  }

  private renderAll(midiMeta: MidiMeta = {}): void {
    this.renderMidiSummary(midiMeta);
    this.renderTrackList();
    this.renderPianoRoll();
    this.renderSelectedTrackSettings();
    this.renderPlacementPreview();
  }

  private renderMidiSummary(midiMeta: MidiMeta = {}): void {
    if (this.loadedTracks.length === 0) {
      this.elements.midiSummary.textContent = "No MIDI data loaded.";
      return;
    }

    const totalNotes = this.loadedTracks.reduce(
      (sum, track) => sum + track.notes.length,
      0,
    );

    const exportTracks = this.loadedTracks.filter((track) => {
      return this.trackSettingsMap.get(track.trackIndex)?.exportEnabled;
    });

    this.elements.midiSummary.innerHTML = `
      <strong>Litematic version:</strong> ${this.exportSettings.litematicVersion}<br />
      <strong>Blocks per quarter note:</strong> ${this.exportSettings.blocksPerQuarterNote}<br />
      <strong>Tracks:</strong> ${this.loadedTracks.length}<br />
      <strong>Export tracks:</strong> ${exportTracks.length}<br />
      <strong>PPQ:</strong> ${this.currentPpq}<br />
      <strong>Tempos:</strong> ${midiMeta.temposCount ?? "loaded"}<br />
      <strong>First tempo:</strong> ${
        midiMeta.firstTempoBpm
          ? `${midiMeta.firstTempoBpm.toFixed(2)} BPM`
          : "unknown / unchanged"
      }<br />
      <strong>Total notes:</strong> ${totalNotes}<br />
      <strong>Repeater base block:</strong> ${escapeHtml(this.exportSettings.repeaterBaseBlockId)}<br />
    `;
  }

  private renderTrackList(): void {
    if (this.loadedTracks.length === 0) {
      this.elements.trackList.textContent = "No tracks loaded.";
      return;
    }

    this.elements.trackList.innerHTML = renderTrackListHtml({
      tracks: this.loadedTracks,
      selectedTrackIndex: this.selectedTrackIndex,
      getSettings: (trackIndex) => this.getTrackSettings(trackIndex),
    });

    this.elements.trackList
      .querySelectorAll<HTMLButtonElement>(".track-select-button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.selectedTrackIndex = Number(button.dataset.trackIndex);
          this.renderAll();
        });
      });

    this.elements.trackList
      .querySelectorAll<HTMLInputElement>(".track-visible-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const trackIndex = Number(checkbox.dataset.trackIndex);
          const settings = this.getTrackSettings(trackIndex);
          settings.visible = checkbox.checked;
          this.renderAll();
        });
      });

    this.elements.trackList
      .querySelectorAll<HTMLInputElement>(".track-export-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const trackIndex = Number(checkbox.dataset.trackIndex);
          const settings = this.getTrackSettings(trackIndex);
          settings.exportEnabled = checkbox.checked;
          this.renderAll();
        });
      });
  }

  private renderPianoRoll(): void {
    const previousScroll =
      this.elements.pianoRoll.querySelector<HTMLDivElement>(".piano-scroll");
    const previousScrollLeft = previousScroll?.scrollLeft ?? 0;
    const previousScrollTop = previousScroll?.scrollTop ?? 0;
    const visibleTracks = this.loadedTracks.filter((track) => {
      return this.getTrackSettings(track.trackIndex).visible;
    });
    const visibleNotes = visibleTracks.flatMap((track) =>
      track.notes.map((note) => ({ track, note })),
    );

    if (visibleNotes.length === 0) {
      this.elements.pianoRoll.className = "piano-roll empty";
      this.elements.pianoRoll.textContent = "No visible notes.";
      return;
    }

    this.elements.pianoRoll.className = "piano-roll";

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
    const maxQuarter = Math.ceil(maxTick / this.currentPpq) + 1;
    const width =
      leftPad +
      maxQuarter * this.exportSettings.blocksPerQuarterNote * pxPerBlock +
      rightPad;
    const height = topPad + (maxMidi - minMidi + 1) * rowHeight + bottomPad;
    const grid = renderPianoGridHtml({
      leftPad,
      topPad,
      rowHeight,
      pxPerBlock,
      minMidi,
      maxMidi,
      maxQuarter,
      height,
      blocksPerQuarterNote: this.exportSettings.blocksPerQuarterNote,
    });
    const notesSvg = visibleNotes
      .map(({ track, note }) => {
        const x =
          leftPad +
          (note.ticks / this.currentPpq) *
            this.exportSettings.blocksPerQuarterNote *
            pxPerBlock;
        const y = topPad + (maxMidi - note.midi) * rowHeight;
        const isSelected = this.selectedTrackIndex === track.trackIndex;
        const opacity =
          this.selectedTrackIndex === null || isSelected ? "0.95" : "0.25";
        const stroke = isSelected ? "#ffffff" : "#27272a";
        const color = getTrackColor(track.trackIndex);
        const noteHeight = Math.max(4, rowHeight - 2);

        if (track.isPercussion) {
          const radius = noteHeight / 2;

          return `
            <circle
              class="piano-note"
              data-track-index="${track.trackIndex}"
              cx="${(x + radius).toFixed(2)}"
              cy="${(y + radius).toFixed(2)}"
              r="${radius.toFixed(2)}"
              fill="${color}"
              opacity="${opacity}"
              stroke="${stroke}"
              stroke-width="${isSelected ? 1.5 : 0.5}"
            />
          `;
        }

        const noteWidth = Math.max(
          4,
          (note.durationTicks / this.currentPpq) *
            this.exportSettings.blocksPerQuarterNote *
            pxPerBlock,
        );

        return `
          <rect
            class="piano-note"
            data-track-index="${track.trackIndex}"
            x="${x.toFixed(2)}"
            y="${y.toFixed(2)}"
            width="${noteWidth.toFixed(2)}"
            height="${noteHeight}"
            rx="2"
            fill="${color}"
            opacity="${opacity}"
            stroke="${stroke}"
            stroke-width="${isSelected ? 1.5 : 0.5}"
          />
        `;
      })
      .join("");

    this.elements.pianoRoll.innerHTML = `
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

    const nextScroll =
      this.elements.pianoRoll.querySelector<HTMLDivElement>(".piano-scroll");

    if (nextScroll) {
      nextScroll.scrollLeft = previousScrollLeft;
      nextScroll.scrollTop = previousScrollTop;
    }

    this.elements.pianoRoll
      .querySelector<SVGSVGElement>("svg")
      ?.addEventListener("click", (event) => {
        const target = event.target as SVGElement;
        const trackIndexValue = target.dataset.trackIndex;

        if (trackIndexValue === undefined) {
          return;
        }

        this.selectedTrackIndex = Number(trackIndexValue);
        this.renderAll();
      });
  }

  private renderSelectedTrackSettings(): void {
    if (this.selectedTrackIndex === null) {
      this.elements.selectedTrackSettings.textContent = "No track selected.";
      return;
    }

    const track = this.loadedTracks.find(
      (candidate) => candidate.trackIndex === this.selectedTrackIndex,
    );

    if (!track) {
      this.elements.selectedTrackSettings.textContent =
        "Selected track was not found.";
      return;
    }

    const settings = this.getTrackSettings(track.trackIndex);
    if (track.isPercussion) {
      this.renderPercussionTrackSettings(track, settings);
      return;
    }

    this.elements.selectedTrackSettings.innerHTML =
      renderNormalTrackSettingsHtml(track, settings);

    this.bindNormalTrackSettings(settings);
  }

  private bindNormalTrackSettings(settings: TrackSettings): void {
    getElement<HTMLSelectElement>(
      "#selected-base-midi",
      this.elements.selectedTrackSettings,
    ).addEventListener("change", (event) => {
      settings.baseMidi = Number((event.target as HTMLSelectElement).value);
      this.renderAll();
    });

    getElement<HTMLInputElement>(
      "#normal-block-input",
      this.elements.selectedTrackSettings,
    ).addEventListener("change", (event) => {
      settings.normalBlockId = (event.target as HTMLInputElement).value.trim();
      this.renderAll();
    });

    getElement<HTMLInputElement>(
      "#high-overflow-block-input",
      this.elements.selectedTrackSettings,
    ).addEventListener("change", (event) => {
      settings.highOverflowBlockId = (
        event.target as HTMLInputElement
      ).value.trim();
      this.renderAll();
    });

    getElement<HTMLInputElement>(
      "#low-overflow-block-input",
      this.elements.selectedTrackSettings,
    ).addEventListener("change", (event) => {
      settings.lowOverflowBlockId = (
        event.target as HTMLInputElement
      ).value.trim();
      this.renderAll();
    });
  }

  private renderPercussionTrackSettings(
    track: TrackData,
    settings: TrackSettings,
  ): void {
    this.elements.selectedTrackSettings.innerHTML =
      renderPercussionTrackSettingsHtml(track, settings);

    this.bindPercussionTrackSettings(track, settings);
  }

  private bindPercussionTrackSettings(
    track: TrackData,
    settings: TrackSettings,
  ): void {
    getElement<HTMLButtonElement>(
      "#apply-percussion-preset-button",
      this.elements.selectedTrackSettings,
    ).addEventListener("click", () => {
      const presetSelect = getElement<HTMLSelectElement>(
        "#percussion-preset-select",
        this.elements.selectedTrackSettings,
      );
      const presetId = parsePercussionPresetId(presetSelect.value);

      settings.percussionMappings = applyPercussionPreset(
        settings.percussionMappings,
        presetId,
      );

      this.renderAll();
    });

    getElement<HTMLButtonElement>(
      "#reset-percussion-mapping-button",
      this.elements.selectedTrackSettings,
    ).addEventListener("click", () => {
      settings.percussionMappings = createDefaultPercussionMappings(track);
      this.renderAll();
    });

    this.elements.selectedTrackSettings
      .querySelectorAll<HTMLInputElement>(".percussion-enabled-input")
      .forEach((input) => {
        input.addEventListener("change", () => {
          const mapping = getPercussionMapping(
            settings,
            Number(input.dataset.midi),
          );
          mapping.enabled = input.checked;
          this.renderPlacementPreview();
        });
      });

    this.elements.selectedTrackSettings
      .querySelectorAll<HTMLInputElement>(".percussion-block-input")
      .forEach((input) => {
        input.addEventListener("change", () => {
          const mapping = getPercussionMapping(
            settings,
            Number(input.dataset.midi),
          );
          const value = input.value.trim();

          if (!value) {
            input.value = mapping.blockId;
            return;
          }

          mapping.blockId = value;
          this.renderPlacementPreview();
        });
      });

    this.elements.selectedTrackSettings
      .querySelectorAll<HTMLInputElement>(".percussion-note-input")
      .forEach((input) => {
        input.addEventListener("change", () => {
          const mapping = getPercussionMapping(
            settings,
            Number(input.dataset.midi),
          );
          const value = clampInteger(Number(input.value), 0, 24);

          mapping.note = value;
          input.value = String(value);
          this.renderPlacementPreview();
        });
      });
  }

  private renderPlacementPreview(): void {
    const exportTracks = this.getExportTracks();

    if (exportTracks.length === 0) {
      this.elements.placementPreview.textContent = "No export tracks selected.";
      return;
    }

    this.elements.placementPreview.textContent = JSON.stringify(
      {
        litematicVersion: this.exportSettings.litematicVersion,
        blocksPerQuarterNote: this.exportSettings.blocksPerQuarterNote,
        subRegions: this.buildExportRegions(),
      },
      null,
      2,
    );
  }

  private downloadLitematic(): void {
    if (this.getExportTracks().length === 0) {
      alert("No export tracks selected.");
      return;
    }

    const bytes = writeLitematicV7({
      name: "noteblock_export",
      author: "Noteblock Litematic Generator",
      description: "Generated from MIDI",
      minecraftDataVersion: 4671,
      regions: this.buildExportRegions(),
    });

    downloadBytes(bytes, "noteblock_export.litematic", "application/octet-stream");
  }

  private buildExportRegions() {
    return this.getExportTracks().map((track, exportIndex) => {
      const settings = this.getTrackSettings(track.trackIndex);
      const trackYOffset = -3 * exportIndex;

      return {
        name: sanitizeRegionName(track.trackName, track.trackIndex),
        placements: buildTrackPlacements(
          track,
          settings,
          this.exportSettings,
          this.currentPpq,
          trackYOffset,
        ),
      };
    });
  }

  private getExportTracks(): TrackData[] {
    return this.loadedTracks.filter((track) => {
      return this.getTrackSettings(track.trackIndex).exportEnabled;
    });
  }

  private getTrackSettings(trackIndex: number): TrackSettings {
    const settings = this.trackSettingsMap.get(trackIndex);

    if (!settings) {
      throw new Error(`Track settings not found: ${trackIndex}`);
    }

    return settings;
  }

  private clearLoadedMidi(): void {
    this.loadedTracks = [];
    this.trackSettingsMap.clear();
    this.selectedTrackIndex = null;

    this.elements.fileInfo.textContent = "No file selected.";
    this.elements.midiSummary.textContent = "No MIDI data loaded.";
    this.elements.trackList.textContent = "No tracks loaded.";
    this.elements.pianoRoll.className = "piano-roll empty";
    this.elements.pianoRoll.textContent = "No MIDI data loaded.";
    this.elements.selectedTrackSettings.textContent = "No track selected.";
    this.elements.placementPreview.textContent = "No placement data.";
  }
}
