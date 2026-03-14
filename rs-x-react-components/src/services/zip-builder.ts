const textEncoder = new TextEncoder();

type ZipEntry = {
  path: string;
  data: Uint8Array;
  crc32: number;
  offset: number;
};

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function setUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function setUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

export function buildZipFromTextFiles(files: Record<string, string>): Blob {
  const entries: ZipEntry[] = [];
  const localParts: Uint8Array[] = [];

  let cursor = 0;

  for (const [path, text] of Object.entries(files)) {
    const filename = textEncoder.encode(path);
    const data = textEncoder.encode(text);
    const dataCrc32 = crc32(data);

    const localHeader = new Uint8Array(30 + filename.length);
    const localView = new DataView(localHeader.buffer);

    setUint32(localView, 0, 0x04034b50);
    setUint16(localView, 4, 20);
    setUint16(localView, 6, 0);
    setUint16(localView, 8, 0); // store
    setUint16(localView, 10, 0);
    setUint16(localView, 12, 0);
    setUint32(localView, 14, dataCrc32);
    setUint32(localView, 18, data.length);
    setUint32(localView, 22, data.length);
    setUint16(localView, 26, filename.length);
    setUint16(localView, 28, 0);
    localHeader.set(filename, 30);

    localParts.push(localHeader, data);
    entries.push({
      path,
      data,
      crc32: dataCrc32,
      offset: cursor,
    });

    cursor += localHeader.length + data.length;
  }

  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (const entry of entries) {
    const filename = textEncoder.encode(entry.path);
    const centralHeader = new Uint8Array(46 + filename.length);
    const centralView = new DataView(centralHeader.buffer);

    setUint32(centralView, 0, 0x02014b50);
    setUint16(centralView, 4, 20);
    setUint16(centralView, 6, 20);
    setUint16(centralView, 8, 0);
    setUint16(centralView, 10, 0);
    setUint16(centralView, 12, 0);
    setUint16(centralView, 14, 0);
    setUint32(centralView, 16, entry.crc32);
    setUint32(centralView, 20, entry.data.length);
    setUint32(centralView, 24, entry.data.length);
    setUint16(centralView, 28, filename.length);
    setUint16(centralView, 30, 0);
    setUint16(centralView, 32, 0);
    setUint16(centralView, 34, 0);
    setUint16(centralView, 36, 0);
    setUint32(centralView, 38, 0);
    setUint32(centralView, 42, entry.offset);
    centralHeader.set(filename, 46);

    centralParts.push(centralHeader);
    centralSize += centralHeader.length;
  }

  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  setUint32(endView, 0, 0x06054b50);
  setUint16(endView, 4, 0);
  setUint16(endView, 6, 0);
  setUint16(endView, 8, entries.length);
  setUint16(endView, 10, entries.length);
  setUint32(endView, 12, centralSize);
  setUint32(endView, 16, cursor);
  setUint16(endView, 20, 0);

  const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  };

  const blobParts: ArrayBuffer[] = [
    ...localParts.map(toArrayBuffer),
    ...centralParts.map(toArrayBuffer),
    toArrayBuffer(endHeader),
  ];

  return new Blob(blobParts, {
    type: 'application/zip',
  });
}
