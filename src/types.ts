export type RawNote = {
  name: string;
  midi: number;
  time: number;
  ticks: number;
  duration: number;
  durationTicks: number;
  velocity: number;
};

export type TrackData = {
  trackIndex: number;
  trackName: string;
  isPercussion: boolean;
  notes: RawNote[];
};

export type LitematicVersion = 6 | 7;

export type ExportSettings = {
  litematicVersion: LitematicVersion;
  blocksPerQuarterNote: number;
  startMeasureOffset: number;
  repeaterBaseBlockId: string;
};

export type PercussionMapping = {
  midi: number;
  enabled: boolean;
  blockId: string;
  note: number;
};

export type PercussionPresetEntry = {
  blockId: string;
  note: number;
  enabled?: boolean;
};

export type PercussionPreset = {
  label: string;
  mappings: Record<number, PercussionPresetEntry>;
};

export type TrackSettings = {
  trackIndex: number;
  visible: boolean;
  exportEnabled: boolean;
  baseMidi: number;
  normalBlockId: string;
  highOverflowBlockId: string;
  lowOverflowBlockId: string;
  percussionMappings: PercussionMapping[];
};

export type PitchCorrection = "none" | "high" | "low";

export type CorrectedPitch = {
  pitch: number;
  correction: PitchCorrection;
  rawPitch: number;
};

export type MidiMeta = {
  temposCount?: number;
  firstTempoBpm?: number;
  timeSignatures?: MidiTimeSignature[];
};

export type MidiTimeSignature = {
  ticks: number;
  numerator: number;
  denominator: number;
};
