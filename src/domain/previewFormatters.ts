import { correctNoteBlockPitch } from "./pitch";
import { getPercussionName } from "./percussion";
import type { TrackData, TrackSettings } from "../types";

export function formatTrackNotesPreview(
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

export function formatPercussionNotesPreview(
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
