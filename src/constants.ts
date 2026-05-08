import type { ExportSettings, PercussionPreset } from "./types";

export const DEFAULT_BASE_MIDI = 66; // F#4

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  litematicVersion: 7,
  blocksPerQuarterNote: 8,
  repeaterBaseBlockId: "minecraft:white_concrete",
};

export const DEFAULT_NORMAL_BLOCK = "minecraft:air";
export const DEFAULT_HIGH_OVERFLOW_BLOCK = "minecraft:diamond_block";
export const DEFAULT_LOW_OVERFLOW_BLOCK = "minecraft:diamond_ore";

export const TRACK_COLORS = [
  "#7dd3fc",
  "#86efac",
  "#fde047",
  "#f0abfc",
  "#93c5fd",
  "#fdba74",
  "#c4b5fd",
  "#fca5a5",
  "#67e8f9",
  "#bef264",
  "#f9a8d4",
  "#a7f3d0",
];

export const DEFAULT_PERCUSSION_BLOCK = "minecraft:stone";
export const DEFAULT_PERCUSSION_NOTE = 0;

export const GM_PERCUSSION_NAMES: Record<number, string> = {
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  80: "Mute Triangle",
  81: "Open Triangle",
};

export const PERCUSSION_PRESETS = {
  genericMinecraft: {
    label: "Generic Minecraft Percussion",
    mappings: {
      35: { blockId: "minecraft:stone", note: 0 },  // Acoustic Bass Drum
      36: { blockId: "minecraft:stone", note: 0 },  // Bass Drum 1
      37: { blockId: "minecraft:glass", note: 4 },  // Side Stick
      38: { blockId: "minecraft:sand", note: 4 },  // Acoustic Snare
      39: { blockId: "minecraft:glass", note: 8 },  // Hand Clap
      40: { blockId: "minecraft:sand", note: 8 },  // Electric Snare
      41: { blockId: "minecraft:stone", note: 8 },  // Low Floor Tom
      43: { blockId: "minecraft:stone", note: 16 },  // High Floor Tom
      45: { blockId: "minecraft:stone", note: 10 },  // Low Tom
      47: { blockId: "minecraft:stone", note: 12 },  // Low-Mid Tom
      48: { blockId: "minecraft:stone", note: 14 },  // Hi-Mid Tom
      50: { blockId: "minecraft:stone", note: 18 },  // High Tom
      42: { blockId: "minecraft:sand", note: 14 },  // Closed Hi-Hat
      44: { blockId: "minecraft:sand", note: 16 },  // Pedal Hi-Hat
      46: { blockId: "minecraft:sand", note: 12 },  // Open Hi-Hat
      49: { blockId: "minecraft:sand", note: 18 },  // Crash Cymbal 1
      51: { blockId: "minecraft:sand", note: 16 },  // Ride Cymbal 1
      52: { blockId: "minecraft:sand", note: 20 },  // Chinese Cymbal
      53: { blockId: "minecraft:sand", note: 22 },  // Ride Bell
      55: { blockId: "minecraft:sand", note: 21 },  // Splash Cymbal
      57: { blockId: "minecraft:sand", note: 19 },  // Crash Cymbal 2
      59: { blockId: "minecraft:sand", note: 17 },  // Ride Cymbal 2
      54: { blockId: "minecraft:stone", note: 22 },  // Tambourine
      56: { blockId: "minecraft:soul_sand", note: 12 },  // Cowbell
      58: { blockId: "minecraft:iron_block", note: 12 },  // Vibraslap
      76: { blockId: "minecraft:glass", note: 16 },  // Hi Wood Block
      77: { blockId: "minecraft:glass", note: 12 },  // Low Wood Block
      80: { blockId: "minecraft:gold_block", note: 12 },  // Mute Triangle
      81: { blockId: "minecraft:gold_block", note: 22 },  // Open Triangle
    },
  },
} satisfies Record<string, PercussionPreset>;

export type PercussionPresetId = keyof typeof PERCUSSION_PRESETS;
