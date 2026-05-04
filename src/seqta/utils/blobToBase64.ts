import { encodeDataUrl, isBetterseqtaWasmReady } from "@/wasm/init";

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const blobToBase64 = (blob: Blob) => {
  return (async () => {
    if (isBetterseqtaWasmReady()) {
      try {
        const buf = await blob.arrayBuffer();
        return encodeDataUrl(
          blob.type || "application/octet-stream",
          new Uint8Array(buf),
        );
      } catch {
        /* fall through */
      }
    }
    return readAsDataUrl(blob);
  })();
};
