import {
  DEFAULT_PERCUSSION_BLOCK,
  DEFAULT_PERCUSSION_NOTE,
  GM_PERCUSSION_NAMES,
  PERCUSSION_PRESETS,
  type PercussionPresetId,
} from "../constants";
import type { PercussionMapping, PercussionPreset, TrackData, TrackSettings } from "../types";
import { clampInteger } from "../utils/format";

export function countNotesByMidi(track: TrackData): Map<number, number> {
  const counts = new Map<number, number>();

  for (const note of track.notes) {
    counts.set(note.midi, (counts.get(note.midi) ?? 0) + 1);
  }

  return counts;
}

export function getPercussionName(midi: number): string {
  return GM_PERCUSSION_NAMES[midi] ?? `Percussion ${midi}`;
}

export function getPercussionMapping(
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

export function applyPercussionPreset(
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

export function parsePercussionPresetId(value: string): PercussionPresetId {
  if (value in PERCUSSION_PRESETS) {
    return value as PercussionPresetId;
  }

  throw new Error(`Unknown percussion preset: ${value}`);
}
