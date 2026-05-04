import { decodeBase64, isBetterseqtaWasmReady } from "@/wasm/init";

const base64ToBlobTs = (base64: string, contentType: string = ""): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const base64ToBlob = (base64: string, contentType: string = ""): Blob => {
  const trimmed = base64.trim();
  if (isBetterseqtaWasmReady()) {
    const bytes = decodeBase64(trimmed);
    if (bytes.byteLength > 0 || trimmed.length === 0) {
      return new Blob([bytes], { type: contentType });
    }
  }
  return base64ToBlobTs(trimmed, contentType);
};

export default base64ToBlob;
