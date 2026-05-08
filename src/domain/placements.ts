import { correctNoteBlockPitch } from "./pitch";
import type { BlockPlacement } from "../litematic/writeLitematicV7";
import type { ExportSettings, PitchCorrection, TrackData, TrackSettings } from "../types";
import { clampInteger } from "../utils/format";

export function buildTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
  tickOffset = 0,
): BlockPlacement[] {
  if (track.isPercussion) {
    return buildPercussionTrackPlacements(
      track,
      settings,
      currentExportSettings,
      ppq,
      trackYOffset,
      tickOffset,
    );
  }

  return buildNormalTrackPlacements(
    track,
    settings,
    currentExportSettings,
    ppq,
    trackYOffset,
    tickOffset,
  );
}

function buildNormalTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
  tickOffset: number,
): BlockPlacement[] {
  const placements: BlockPlacement[] = [];
  const laneEndXList: number[] = [];
  const effectiveBlocksPerQuarterNote =
    currentExportSettings.blocksPerQuarterNote * 2;

  for (const note of track.notes) {
    const adjustedTicks = note.ticks - tickOffset;
    const adjustedEndTicks = adjustedTicks + note.durationTicks;

    if (adjustedEndTicks <= 0) {
      continue;
    }

    const x = Math.round(
      (Math.max(0, adjustedTicks) / ppq) * effectiveBlocksPerQuarterNote,
    );
    const noteLengthBlocks = Math.max(
      1,
      Math.round(
        ((adjustedEndTicks - Math.max(0, adjustedTicks)) / ppq) *
          effectiveBlocksPerQuarterNote,
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

function buildPercussionTrackPlacements(
  track: TrackData,
  settings: TrackSettings,
  currentExportSettings: ExportSettings,
  ppq: number,
  trackYOffset: number,
  tickOffset: number,
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

    const adjustedTicks = note.ticks - tickOffset;
    const adjustedEndTicks = adjustedTicks + note.durationTicks;

    if (adjustedEndTicks <= 0) {
      continue;
    }

    const x = Math.round(
      (Math.max(0, adjustedTicks) / ppq) * effectiveBlocksPerQuarterNote,
    );
    const noteLengthBlocks = Math.max(
      1,
      Math.round(
        ((adjustedEndTicks - Math.max(0, adjustedTicks)) / ppq) *
          effectiveBlocksPerQuarterNote,
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
