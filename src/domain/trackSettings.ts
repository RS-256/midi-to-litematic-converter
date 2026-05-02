import {
  DEFAULT_BASE_MIDI,
  DEFAULT_HIGH_OVERFLOW_BLOCK,
  DEFAULT_LOW_OVERFLOW_BLOCK,
  DEFAULT_NORMAL_BLOCK,
  DEFAULT_PERCUSSION_BLOCK,
  DEFAULT_PERCUSSION_NOTE,
} from "../constants";
import type { PercussionMapping, TrackData, TrackSettings } from "../types";

export function createDefaultTrackSettings(
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

export function createDefaultPercussionMappings(
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
