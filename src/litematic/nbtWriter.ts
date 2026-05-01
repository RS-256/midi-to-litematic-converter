export type NbtTag =
  | { type: "byte"; value: number }
  | { type: "int"; value: number }
  | { type: "long"; value: bigint }
  | { type: "string"; value: string }
  | { type: "compound"; value: Record<string, NbtTag> }
  | { type: "list"; elementType: NbtTagId; value: NbtTag[] }
  | { type: "longArray"; value: bigint[] };

export const NbtTagId = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const;

export type NbtTagId = (typeof NbtTagId)[keyof typeof NbtTagId];

export function writeNamedRootCompound(
  name: string,
  value: Record<string, NbtTag>,
): Uint8Array {
  const writer = new BinaryWriter();

  writer.writeByte(NbtTagId.Compound);
  writer.writeString(name);
  writeCompoundPayload(writer, value);

  return writer.toUint8Array();
}

function getTagId(tag: NbtTag): NbtTagId {
  switch (tag.type) {
    case "byte":
      return NbtTagId.Byte;
    case "int":
      return NbtTagId.Int;
    case "long":
      return NbtTagId.Long;
    case "string":
      return NbtTagId.String;
    case "compound":
      return NbtTagId.Compound;
    case "list":
      return NbtTagId.List;
    case "longArray":
      return NbtTagId.LongArray;
  }
}

function writeNamedTag(writer: BinaryWriter, name: string, tag: NbtTag): void {
  writer.writeByte(getTagId(tag));
  writer.writeString(name);
  writePayload(writer, tag);
}

function writePayload(writer: BinaryWriter, tag: NbtTag): void {
  switch (tag.type) {
    case "byte":
      writer.writeByte(tag.value);
      break;

    case "int":
      writer.writeInt(tag.value);
      break;

    case "long":
      writer.writeLong(tag.value);
      break;

    case "string":
      writer.writeString(tag.value);
      break;

    case "compound":
      writeCompoundPayload(writer, tag.value);
      break;

    case "list":
      writer.writeByte(tag.elementType);
      writer.writeInt(tag.value.length);

      for (const item of tag.value) {
        writePayload(writer, item);
      }

      break;

    case "longArray":
      writer.writeInt(tag.value.length);

      for (const value of tag.value) {
        writer.writeLong(value);
      }

      break;
  }
}

function writeCompoundPayload(
  writer: BinaryWriter,
  value: Record<string, NbtTag>,
): void {
  for (const [name, tag] of Object.entries(value)) {
    writeNamedTag(writer, name, tag);
  }

  writer.writeByte(NbtTagId.End);
}

class BinaryWriter {
  private bytes: number[] = [];

  writeByte(value: number): void {
    this.bytes.push(value & 0xff);
  }

  writeInt(value: number): void {
    this.bytes.push((value >> 24) & 0xff);
    this.bytes.push((value >> 16) & 0xff);
    this.bytes.push((value >> 8) & 0xff);
    this.bytes.push(value & 0xff);
  }

  writeLong(value: bigint): void {
    let unsigned = value;

    if (unsigned < 0) {
      unsigned += 1n << 64n;
    }

    for (let shift = 56n; shift >= 0n; shift -= 8n) {
      this.bytes.push(Number((unsigned >> shift) & 0xffn));
    }
  }

  writeString(value: string): void {
    const encoded = new TextEncoder().encode(value);

    if (encoded.length > 65535) {
      throw new Error("NBT string is too long");
    }

    this.bytes.push((encoded.length >> 8) & 0xff);
    this.bytes.push(encoded.length & 0xff);
    this.bytes.push(...encoded);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}