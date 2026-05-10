import {
  DEFAULT_EXPORT_SETTINGS,
  MINECRAFT_DATA_VERSION_BY_LITEMATIC_VERSION,
} from "./constants";
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
import { writeLitematic } from "./litematic/writeLitematic";
import { parseMidiFile } from "./midi/parseMidi";
import type {
  ExportSettings,
  MidiMeta,
  MidiTimeSignature,
  TrackData,
  TrackSettings,
} from "./types";
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
  litematicVersionSelect: HTMLSelectElement;
  blocksPerQuarterInput: HTMLInputElement;
  startMeasureOffsetInput: HTMLInputElement;
  repeaterBaseBlockInput: HTMLInputElement;
  pianoRollZoomInput: HTMLInputElement;
  pianoRollZoomValue: HTMLSpanElement;
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
  private currentMidiMeta: MidiMeta = {};
  private isLoadingMidi = false;
  private isUpdatingExportSettings = false;
  private pianoRollZoom = 1;
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
      litematicVersionSelect: getElement<HTMLSelectElement>(
        "#litematic-version-select",
        this.root,
      ),
      blocksPerQuarterInput: getElement<HTMLInputElement>(
        "#blocks-per-quarter-input",
        this.root,
      ),
      startMeasureOffsetInput: getElement<HTMLInputElement>(
        "#start-measure-offset-input",
        this.root,
      ),
      repeaterBaseBlockInput: getElement<HTMLInputElement>(
        "#repeater-base-block-input",
        this.root,
      ),
      pianoRollZoomInput: getElement<HTMLInputElement>(
        "#piano-roll-zoom-input",
        this.root,
      ),
      pianoRollZoomValue: getElement<HTMLSpanElement>(
        "#piano-roll-zoom-value",
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

    this.elements.litematicVersionSelect.addEventListener("change", () => {
      const version = Number(this.elements.litematicVersionSelect.value);

      if (version !== 6 && version !== 7) {
        this.elements.litematicVersionSelect.value = String(
          this.exportSettings.litematicVersion,
        );
        return;
      }

      this.exportSettings = {
        ...this.exportSettings,
        litematicVersion: version,
      };

      void this.renderAfterExportSettingsChange(() => {
        this.renderPlacementPreview();
      });
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

      void this.renderAfterExportSettingsChange(() => {
        this.renderAll();
      });
    });

    this.elements.startMeasureOffsetInput.addEventListener("change", () => {
      const value = Number(this.elements.startMeasureOffsetInput.value);

      if (!Number.isFinite(value) || value < 0) {
        this.elements.startMeasureOffsetInput.value = String(
          this.exportSettings.startMeasureOffset,
        );
        return;
      }

      this.exportSettings = {
        ...this.exportSettings,
        startMeasureOffset: Math.round(value),
      };
      this.elements.startMeasureOffsetInput.value = String(
        this.exportSettings.startMeasureOffset,
      );

      void this.renderAfterExportSettingsChange(() => {
        this.renderAll();
      });
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

      void this.renderAfterExportSettingsChange(() => {
        this.renderAll();
      });
    });

    this.elements.pianoRollZoomInput.addEventListener("input", () => {
      const value = Number(this.elements.pianoRollZoomInput.value);
      this.pianoRollZoom = Math.min(4, Math.max(0.25, value));
      this.elements.pianoRollZoomValue.textContent =
        `${Math.round(this.pianoRollZoom * 100)}%`;
      this.renderPianoRoll();
    });

    this.elements.downloadLitematicButton.addEventListener("click", () => {
      this.downloadLitematic();
    });
  }

  private async renderAfterExportSettingsChange(render: () => void): Promise<void> {
    this.setExportSettingsUpdating(true);
    await this.waitForPaint();

    try {
      render();
    } finally {
      this.setExportSettingsUpdating(false);
    }
  }

  private async loadSelectedMidi(): Promise<void> {
    const file = this.elements.fileInput.files?.[0];

    if (!file) {
      this.clearLoadedMidi();
      return;
    }

    this.setMidiLoading(file);

    await this.waitForPaint();

    try {
      const parsed = parseMidiFile(await file.arrayBuffer());

      this.currentPpq = parsed.ppq;
      this.currentMidiMeta = parsed.meta;
      this.loadedTracks = parsed.tracks;
      this.trackSettingsMap = createDefaultTrackSettings(this.loadedTracks);
      this.selectedTrackIndex =
        this.loadedTracks.find((track) => track.notes.length > 0)?.trackIndex ??
        this.loadedTracks[0]?.trackIndex ??
        null;

      this.renderAll();
      this.renderSelectedFileInfo(file);
    } catch (error) {
      console.error(error);
      this.loadedTracks = [];
      this.currentMidiMeta = {};
      this.trackSettingsMap.clear();
      this.selectedTrackIndex = null;

      this.renderSelectedFileInfo(file, "Failed to parse MIDI file.");
      this.elements.midiSummary.textContent = "Failed to parse MIDI file.";
      this.elements.trackList.textContent = "No tracks loaded.";
      this.elements.pianoRoll.textContent =
        error instanceof Error ? error.message : String(error);
      this.elements.selectedTrackSettings.textContent = "No track selected.";
      this.elements.placementPreview.textContent = "No placement data.";
    } finally {
      this.setMidiLoading(null);
    }
  }

  private setMidiLoading(file: File | null): void {
    this.isLoadingMidi = file !== null;
    this.elements.fileInput.disabled = this.isLoadingMidi;
    this.updateDownloadButtonDisabled();

    if (!file) {
      return;
    }

    this.elements.fileInfo.innerHTML = `
      <div class="loading-status" role="status" aria-live="polite">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>
          <strong>Loading MIDI file...</strong><br />
          Name: ${escapeHtml(file.name)}<br />
          Size: ${formatBytes(file.size)}<br />
          Type: ${escapeHtml(file.type || "unknown")}
        </span>
      </div>
    `;
    this.elements.midiSummary.innerHTML = this.renderLoadingMessage();
    this.elements.trackList.innerHTML = this.renderLoadingMessage();
    this.elements.pianoRoll.className = "piano-roll empty";
    this.elements.pianoRoll.innerHTML = this.renderLoadingMessage();
    this.elements.selectedTrackSettings.innerHTML = this.renderLoadingMessage();
    this.elements.placementPreview.textContent = "Loading MIDI file...";
  }

  private waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }

  private renderLoadingMessage(): string {
    return `
      <div class="loading-status" role="status" aria-live="polite">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>Loading MIDI file...</span>
      </div>
    `;
  }

  private setExportSettingsUpdating(isUpdating: boolean): void {
    this.isUpdatingExportSettings = isUpdating;
    this.updateDownloadButtonDisabled();
  }

  private updateDownloadButtonDisabled(): void {
    this.elements.downloadLitematicButton.disabled =
      this.isLoadingMidi || this.isUpdatingExportSettings;
  }

  private renderSelectedFileInfo(file: File, status?: string): void {
    const statusMarkup = status
      ? `<strong>${escapeHtml(status)}</strong><br />`
      : `<strong>Selected file:</strong><br />`;

    this.elements.fileInfo.innerHTML = `
      ${statusMarkup}
      Name: ${escapeHtml(file.name)}<br />
      Size: ${formatBytes(file.size)}<br />
      Type: ${escapeHtml(file.type || "unknown")}
    `;
  }

  private renderAll(): void {
    this.renderMidiSummary();
    this.renderTrackList();
    this.renderPianoRoll();
    this.renderSelectedTrackSettings();
    this.renderPlacementPreview();
  }

  private renderMidiSummary(): void {
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
    const timeSignatures = this.getTimeSignatures();
    const firstTimeSignature = timeSignatures[0];

    this.elements.midiSummary.innerHTML = `
      <strong>Tracks:</strong> ${this.loadedTracks.length}<br />
      <strong>Export tracks:</strong> ${exportTracks.length}<br />
      <strong>PPQ:</strong> ${this.currentPpq}<br />
      <strong>Tempos:</strong> ${this.currentMidiMeta.temposCount ?? "loaded"}<br />
      <strong>First tempo:</strong> ${
        this.currentMidiMeta.firstTempoBpm
          ? `${this.currentMidiMeta.firstTempoBpm.toFixed(2)} BPM`
          : "unknown / unchanged"
      }<br />
      <strong>Time signatures:</strong> ${
        this.currentMidiMeta.timeSignatures?.length
          ? this.currentMidiMeta.timeSignatures.length
          : "default 4/4"
      }<br />
      <strong>First time signature:</strong> ${firstTimeSignature.numerator}/${firstTimeSignature.denominator}<br />
      <strong>Total notes:</strong> ${totalNotes}<br />
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
          this.selectTrack(Number(button.dataset.trackIndex));
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
    const skippedTicks = this.getStartOffsetTicks();
    const pianoRollTickOffset = skippedTicks;
    const visibleNotes = visibleTracks.flatMap((track) =>
      track.notes
        .filter((note) => {
          return note.ticks + note.durationTicks > skippedTicks;
        })
        .map((note) => ({ track, note })),
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
    const pxPerBlock = 8 * this.pianoRollZoom;
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
    const visibleMaxTick = Math.max(0, maxTick - pianoRollTickOffset);
    const maxQuarter = Math.ceil(visibleMaxTick / this.currentPpq) + 1;
    const gridEndTicks = maxQuarter * this.currentPpq;
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
      height,
      verticalLines: this.getPianoRollVerticalLines(
        pianoRollTickOffset,
        gridEndTicks,
      ),
      blocksPerQuarterNote: this.exportSettings.blocksPerQuarterNote,
    });
    const notesSvg = visibleNotes
      .map(({ track, note }) => {
        const adjustedTicks = note.ticks - pianoRollTickOffset;
        const adjustedEndTicks = adjustedTicks + note.durationTicks;
        const visibleStartTicks = Math.max(0, adjustedTicks);
        const visibleDurationTicks = adjustedEndTicks - visibleStartTicks;
        const x =
          leftPad +
          (visibleStartTicks / this.currentPpq) *
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
              stroke-width="${isSelected ? 0.75 : 0.5}"
            />
          `;
        }

        const noteWidth = Math.max(
          4,
          (visibleDurationTicks / this.currentPpq) *
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
            stroke-width="${isSelected ? 0.75 : 0.5}"
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

        this.selectTrack(Number(trackIndexValue));
      });
  }

  private selectTrack(trackIndex: number): void {
    if (this.selectedTrackIndex === trackIndex) {
      return;
    }

    const previousTrackIndex = this.selectedTrackIndex;
    this.selectedTrackIndex = trackIndex;

    this.updateTrackSelectionStyles(previousTrackIndex, trackIndex);
    this.updatePianoRollSelectionStyles(previousTrackIndex, trackIndex);
    this.renderSelectedTrackSettings();
  }

  private updateTrackSelectionStyles(
    previousTrackIndex: number | null,
    selectedTrackIndex: number | null,
  ): void {
    const affectedTrackIndexes = [previousTrackIndex, selectedTrackIndex];

    for (const trackIndex of affectedTrackIndexes) {
      if (trackIndex === null) {
        continue;
      }

      const row = this.elements.trackList.querySelector<HTMLDivElement>(
        `.track-row[data-track-index="${trackIndex}"]`,
      );

      row?.classList.toggle("selected", trackIndex === selectedTrackIndex);
    }
  }

  private updatePianoRollSelectionStyles(
    previousTrackIndex: number | null,
    selectedTrackIndex: number | null,
  ): void {
    const updateNotes = (trackIndex: number): void => {
      const isSelected = selectedTrackIndex === trackIndex;

      this.elements.pianoRoll
        .querySelectorAll<SVGElement>(
          `.piano-note[data-track-index="${trackIndex}"]`,
        )
        .forEach((noteElement) => {
          noteElement.setAttribute("opacity", isSelected ? "0.95" : "0.25");
          noteElement.setAttribute("stroke", isSelected ? "#ffffff" : "#27272a");
          noteElement.setAttribute("stroke-width", isSelected ? "0.75" : "0.5");
        });
    };

    if (previousTrackIndex === null || selectedTrackIndex === null) {
      this.elements.pianoRoll
        .querySelectorAll<SVGElement>(".piano-note")
        .forEach((noteElement) => {
          const trackIndexValue = noteElement.dataset.trackIndex;

          if (trackIndexValue === undefined) {
            return;
          }

          const trackIndex = Number(trackIndexValue);
          const isSelected = selectedTrackIndex === trackIndex;
          const opacity =
            selectedTrackIndex === null || isSelected ? "0.95" : "0.25";

          noteElement.setAttribute("opacity", opacity);
          noteElement.setAttribute("stroke", isSelected ? "#ffffff" : "#27272a");
          noteElement.setAttribute("stroke-width", isSelected ? "0.75" : "0.5");
        });
      return;
    }

    updateNotes(previousTrackIndex);
    updateNotes(selectedTrackIndex);
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

    const bytes = writeLitematic({
      name: "noteblock_export",
      author: "Noteblock Litematic Generator",
      description: "Generated from MIDI",
      litematicVersion: this.exportSettings.litematicVersion,
      minecraftDataVersion:
        MINECRAFT_DATA_VERSION_BY_LITEMATIC_VERSION[
          this.exportSettings.litematicVersion
        ],
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
          this.getStartOffsetTicks(),
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

  private getStartOffsetTicks(): number {
    return this.getMeasureStartTick(this.exportSettings.startMeasureOffset);
  }

  private getMeasureStartTick(measureIndex: number): number {
    if (measureIndex <= 0) {
      return 0;
    }

    const measureLines = this.getMeasureLineTicks(Number.POSITIVE_INFINITY);
    return measureLines[measureIndex] ?? measureIndex * this.currentPpq * 4;
  }

  private getPianoRollVerticalLines(
    tickOffset: number,
    visibleEndTicks: number,
  ): { ticks: number; ppq: number; isMeasure: boolean }[] {
    const sourceEndTick = tickOffset + visibleEndTicks;
    const measureTicks = new Set(this.getMeasureLineTicks(sourceEndTick));
    const beatTicks = this.getBeatLineTicks(sourceEndTick);
    const allTicks = new Set([...measureTicks, ...beatTicks]);

    return [...allTicks]
      .filter((tick) => tick >= tickOffset && tick <= sourceEndTick)
      .sort((a, b) => a - b)
      .map((tick) => ({
        ticks: tick - tickOffset,
        ppq: this.currentPpq,
        isMeasure: measureTicks.has(tick),
      }));
  }

  private getMeasureLineTicks(endTick: number): number[] {
    return this.getMeterLineTicks(endTick, "measure");
  }

  private getBeatLineTicks(endTick: number): number[] {
    return this.getMeterLineTicks(endTick, "beat");
  }

  private getMeterLineTicks(
    endTick: number,
    lineType: "measure" | "beat",
  ): number[] {
    const timeSignatures = this.getTimeSignatures();
    const lines: number[] = [];
    const finiteEndTick = Number.isFinite(endTick)
      ? endTick
      : this.getMaxTrackEndTick() + this.currentPpq * 16;

    for (let index = 0; index < timeSignatures.length; index++) {
      const signature = timeSignatures[index];
      const nextSignature = timeSignatures[index + 1];
      const segmentEndTick = Math.min(
        nextSignature?.ticks ?? finiteEndTick,
        finiteEndTick,
      );
      const stepTicks =
        lineType === "measure"
          ? this.getMeasureLengthTicks(signature)
          : this.getBeatLengthTicks(signature);

      if (stepTicks <= 0) {
        continue;
      }

      for (
        let tick = signature.ticks;
        tick <= segmentEndTick;
        tick += stepTicks
      ) {
        lines.push(Math.round(tick));
      }
    }

    return [...new Set(lines)].sort((a, b) => a - b);
  }

  private getMeasureLengthTicks(timeSignature: MidiTimeSignature): number {
    return Math.round(
      this.currentPpq *
        timeSignature.numerator *
        (4 / timeSignature.denominator),
    );
  }

  private getBeatLengthTicks(timeSignature: MidiTimeSignature): number {
    return Math.round(this.currentPpq * (4 / timeSignature.denominator));
  }

  private getTimeSignatures(): MidiTimeSignature[] {
    const timeSignatures = (this.currentMidiMeta.timeSignatures ?? [])
      .filter((timeSignature) => {
        return (
          timeSignature.numerator > 0 &&
          timeSignature.denominator > 0 &&
          Number.isFinite(timeSignature.ticks)
        );
      })
      .sort((a, b) => a.ticks - b.ticks);

    if (timeSignatures.length === 0 || timeSignatures[0].ticks > 0) {
      return [
        {
          ticks: 0,
          numerator: 4,
          denominator: 4,
        },
        ...timeSignatures,
      ];
    }

    return timeSignatures;
  }

  private getMaxTrackEndTick(): number {
    return Math.max(
      0,
      ...this.loadedTracks.flatMap((track) =>
        track.notes.map((note) => note.ticks + note.durationTicks),
      ),
    );
  }

  private clearLoadedMidi(): void {
    this.loadedTracks = [];
    this.currentMidiMeta = {};
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
