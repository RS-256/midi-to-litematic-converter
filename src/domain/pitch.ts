import type { CorrectedPitch, PitchCorrection, TrackData, TrackSettings } from "../types";

export function correctNoteBlockPitch(
  midi: number,
  baseMidi: number,
): CorrectedPitch {
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

export function getPitchStats(
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
