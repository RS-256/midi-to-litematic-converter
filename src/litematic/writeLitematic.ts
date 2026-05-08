import { gzip } from "pako";
import type { LitematicVersion } from "../types";
import {
  NbtTagId,
  writeNamedRootCompound,
  type NbtTag,
} from "./nbtWriter";

export type BlockPlacement = {
  x: number;
  y: number;
  z: number;
  blockId: string;
  properties?: Record<string, string>;
};

export type LitematicRegionInput = {
  name: string;
  placements: BlockPlacement[];
};

export type LitematicInput = {
  name: string;
  author: string;
  description: string;
  litematicVersion: LitematicVersion;
  minecraftDataVersion: number;
  regions: LitematicRegionInput[];
};

type NormalizedRegion = {
  name: string;
  position: Vec3;
  size: Vec3;
  palette: BlockState[];
  blockStates: bigint[];
  totalBlocks: number;
  volume: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type BlockState = {
  name: string;
  properties?: Record<string, string>;
};

export function writeLitematic(input: LitematicInput): Uint8Array {
  const normalizedRegions = input.regions.map(normalizeRegion);

  const now = BigInt(Date.now());
  const totalBlocks = normalizedRegions.reduce(
    (sum, region) => sum + region.totalBlocks,
    0,
  );
  const totalVolume = normalizedRegions.reduce(
    (sum, region) => sum + region.volume,
    0,
  );

  const enclosingSize = getEnclosingSize(normalizedRegions);

  const root: Record<string, NbtTag> = {
    Regions: {
      type: "compound",
      value: Object.fromEntries(
        normalizedRegions.map((region) => [
          region.name,
          regionToNbt(region),
        ]),
      ),
    },
    SubVersion: {
      type: "int",
      value: 1,
    },
    Metadata: {
      type: "compound",
      value: {
        Description: {
          type: "string",
          value: input.description,
        },
        TimeModified: {
          type: "long",
          value: now,
        },
        TimeCreated: {
          type: "long",
          value: now,
        },
        TotalVolume: {
          type: "int",
          value: totalVolume,
        },
        Name: {
          type: "string",
          value: input.name,
        },
        Author: {
          type: "string",
          value: input.author,
        },
        TotalBlocks: {
          type: "int",
          value: totalBlocks,
        },
        EnclosingSize: {
          type: "compound",
          value: vec3ToNbt(enclosingSize),
        },
        RegionCount: {
          type: "int",
          value: normalizedRegions.length,
        },
      },
    },
    Version: {
      type: "int",
      value: input.litematicVersion,
    },
    MinecraftDataVersion: {
      type: "int",
      value: input.minecraftDataVersion,
    },
  };

  const nbtBytes = writeNamedRootCompound("", root);
  return gzip(nbtBytes);
}

function normalizeRegion(region: LitematicRegionInput): NormalizedRegion {
  if (region.placements.length === 0) {
    throw new Error(`Region has no blocks: ${region.name}`);
  }

  const minX = Math.min(...region.placements.map((placement) => placement.x));
  const minY = Math.min(...region.placements.map((placement) => placement.y));
  const minZ = Math.min(...region.placements.map((placement) => placement.z));
  const maxX = Math.max(...region.placements.map((placement) => placement.x));
  const maxY = Math.max(...region.placements.map((placement) => placement.y));
  const maxZ = Math.max(...region.placements.map((placement) => placement.z));

  const position = {
    x: minX,
    y: minY,
    z: minZ,
  };

  const size = {
    x: maxX - minX + 1,
    y: maxY - minY + 1,
    z: maxZ - minZ + 1,
  };

  const volume = size.x * size.y * size.z;

  const air: BlockState = {
    name: "minecraft:air",
  };

  const palette: BlockState[] = [air];
  const paletteIndexByKey = new Map<string, number>();
  paletteIndexByKey.set(blockStateKey(air), 0);

  const indices = new Array<number>(volume).fill(0);

  for (const placement of region.placements) {
    const state: BlockState = {
      name: placement.blockId,
      properties: placement.properties,
    };

    const key = blockStateKey(state);
    let paletteIndex = paletteIndexByKey.get(key);

    if (paletteIndex === undefined) {
      paletteIndex = palette.length;
      palette.push(state);
      paletteIndexByKey.set(key, paletteIndex);
    }

    const localX = placement.x - minX;
    const localY = placement.y - minY;
    const localZ = placement.z - minZ;
    const index = getBlockIndex(localX, localY, localZ, size);

    indices[index] = paletteIndex;
  }

  return {
    name: region.name,
    position,
    size,
    palette,
    blockStates: packBlockStates(indices, palette.length),
    totalBlocks: region.placements.length,
    volume,
  };
}

function getBlockIndex(x: number, y: number, z: number, size: Vec3): number {
  return (y * size.z + z) * size.x + x;
}

function packBlockStates(indices: number[], paletteSize: number): bigint[] {
  const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(paletteSize)));
  const totalBits = indices.length * bitsPerBlock;
  const longCount = Math.ceil(totalBits / 64);
  const longs = new Array<bigint>(longCount).fill(0n);
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;

  indices.forEach((paletteIndex, blockIndex) => {
    const value = BigInt(paletteIndex) & mask;
    const bitIndex = blockIndex * bitsPerBlock;
    const longIndex = Math.floor(bitIndex / 64);
    const bitOffset = bitIndex % 64;

    longs[longIndex] |= value << BigInt(bitOffset);

    const overflowBits = bitOffset + bitsPerBlock - 64;

    if (overflowBits > 0) {
      longs[longIndex + 1] |= value >> BigInt(bitsPerBlock - overflowBits);
    }
  });

  return longs;
}

function regionToNbt(region: NormalizedRegion): NbtTag {
  return {
    type: "compound",
    value: {
      Size: {
        type: "compound",
        value: vec3ToNbt(region.size),
      },
      Entities: emptyList(),
      BlockStatePalette: {
        type: "list",
        elementType: NbtTagId.Compound,
        value: region.palette.map(blockStateToNbt),
      },
      BlockStates: {
        type: "longArray",
        value: region.blockStates,
      },
      Position: {
        type: "compound",
        value: vec3ToNbt(region.position),
      },
      PendingFluidTicks: emptyList(),
      TileEntities: emptyList(),
      PendingBlockTicks: emptyList(),
    },
  };
}

function blockStateToNbt(state: BlockState): NbtTag {
  const value: Record<string, NbtTag> = {
    Name: {
      type: "string",
      value: state.name,
    },
  };

  if (state.properties && Object.keys(state.properties).length > 0) {
    value.Properties = {
      type: "compound",
      value: Object.fromEntries(
        Object.entries(state.properties)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, propertyValue]) => [
            key,
            {
              type: "string",
              value: propertyValue,
            } satisfies NbtTag,
          ]),
      ),
    };
  }

  return {
    type: "compound",
    value,
  };
}

function vec3ToNbt(vec: Vec3): Record<string, NbtTag> {
  return {
    x: {
      type: "int",
      value: vec.x,
    },
    y: {
      type: "int",
      value: vec.y,
    },
    z: {
      type: "int",
      value: vec.z,
    },
  };
}

function emptyList(): NbtTag {
  return {
    type: "list",
    elementType: NbtTagId.End,
    value: [],
  };
}

function blockStateKey(state: BlockState): string {
  const properties = state.properties
    ? Object.entries(state.properties)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join(",")
    : "";

  return `${state.name}[${properties}]`;
}

function getEnclosingSize(regions: NormalizedRegion[]): Vec3 {
  if (regions.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const minX = Math.min(...regions.map((region) => region.position.x));
  const minY = Math.min(...regions.map((region) => region.position.y));
  const minZ = Math.min(...regions.map((region) => region.position.z));

  const maxX = Math.max(
    ...regions.map((region) => region.position.x + region.size.x - 1),
  );
  const maxY = Math.max(
    ...regions.map((region) => region.position.y + region.size.y - 1),
  );
  const maxZ = Math.max(
    ...regions.map((region) => region.position.z + region.size.z - 1),
  );

  return {
    x: maxX - minX + 1,
    y: maxY - minY + 1,
    z: maxZ - minZ + 1,
  };
}
