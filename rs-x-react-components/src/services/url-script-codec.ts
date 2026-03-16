const GZIP_PREFIX = 'gz:';
const PLAIN_PREFIX = 'plain:';

const textDecoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const supportsGzipStreams = (): boolean => {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
};

const gzipString = async (value: string): Promise<string> => {
  const compressedStream = new Blob([value])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(compressedStream).arrayBuffer();
  return toBase64Url(new Uint8Array(buffer));
};

const gunzipString = async (encoded: string): Promise<string> => {
  const bytes = fromBase64Url(encoded);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([arrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return textDecoder.decode(buffer);
};

export const encodeScriptForUrl = async (script: string): Promise<string> => {
  if (!script) {
    return '';
  }

  if (supportsGzipStreams()) {
    try {
      const zipped = await gzipString(script);
      return `${GZIP_PREFIX}${zipped}`;
    } catch {
      // fall through to plain fallback
    }
  }

  return `${PLAIN_PREFIX}${encodeURIComponent(script)}`;
};

export const decodeScriptFromUrl = async (value: string): Promise<string> => {
  if (!value) {
    return '';
  }

  if (value.startsWith(GZIP_PREFIX)) {
    try {
      const payload = value.slice(GZIP_PREFIX.length);
      return await gunzipString(payload);
    } catch {
      return '';
    }
  }

  if (value.startsWith(PLAIN_PREFIX)) {
    return decodeURIComponent(value.slice(PLAIN_PREFIX.length));
  }

  // Backward compatibility with older uncompressed URLs.
  return value;
};

export const decodeScriptParamSyncFallback = (paramValue: string): string => {
  try {
    if (paramValue.startsWith(PLAIN_PREFIX)) {
      return decodeURIComponent(paramValue.slice(PLAIN_PREFIX.length));
    }
    return paramValue;
  } catch {
    return '';
  }
};
