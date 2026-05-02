import { Midi } from "@tonejs/midi";
import type { MidiMeta, RawNote, TrackData } from "../types";

export type ParsedMidi = {
  ppq: number;
  tracks: TrackData[];
  meta: MidiMeta;
};

export function parseMidiFile(arrayBuffer: ArrayBuffer): ParsedMidi {
  const midi = new Midi(arrayBuffer);
  const tempos = midi.header.tempos;
  const firstTempo = tempos[0];

  return {
    ppq: midi.header.ppq,
    tracks: midi.tracks.map((track, trackIndex) => {
      const notes: RawNote[] = track.notes
        .map((note) => ({
          name: note.name,
          midi: note.midi,
          time: note.time,
          ticks: note.ticks,
          duration: note.duration,
          durationTicks: note.durationTicks,
          velocity: note.velocity,
        }))
        .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

      return {
        trackIndex,
        trackName: track.name || `Track ${trackIndex}`,
        isPercussion: Boolean(track.instrument?.percussion),
        notes,
      };
    }),
    meta: {
      temposCount: tempos.length,
      firstTempoBpm: firstTempo?.bpm,
    },
  };
}
