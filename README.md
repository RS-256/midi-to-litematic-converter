# midi-to-litematic-converter

A browser app that converts MIDI files into `.litematic` files containing Minecraft note block layouts.

## Features

- Displays MIDI track lists, note counts, PPQ, and tempo information
- Previews note positions in a piano roll
- Toggles visibility and export status per track
- Configures the base MIDI note, normal-range block, high-overflow block, and low-overflow block for melodic tracks
- Detects percussion tracks as General MIDI percussion
- Edits block IDs, note values, and enabled states for each percussion MIDI note
- Applies the `Generic Minecraft Percussion` preset as the default percussion mapping
- Downloads Litematic v7 `.litematic` files

## Requirements

- Node.js
- npm

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

After the Vite dev server starts, open the displayed URL in your browser.

## Usage

1. Choose a `.mid` or `.midi` file from `Select MIDI file`.
2. Adjust `Blocks per quarter note` and `Repeater base block` if needed.
3. In the track list, choose which tracks to show and which tracks to export.
4. For melodic tracks, configure the base note and overflow correction blocks.
5. For percussion tracks, adjust the block ID and note value for each MIDI percussion note.
6. Press `Download .litematic` to save the file.

## Conversion Notes

- Melodic tracks are corrected into Minecraft note block `note` values from 0 to 24.
- Out-of-range notes use the configured high-overflow or low-overflow block.
- Percussion tracks use per-MIDI-note mappings to choose the block under the note block and the `note` value.
- Repeater rows are added according to note duration.
- Each exported track is written as a separate Litematic sub-region.

## Tech Stack

- TypeScript
- Vite
- `@tonejs/midi`
- `pako`
