import {
  decodeBase64,
  isBetterseqtaWasmReady,
  stripDataUrlBase64Payload,
} from "@/wasm/init";

export function base64toblobURL(base64: string) {
  if (isBetterseqtaWasmReady()) {
    try {
      const payload = stripDataUrlBase64Payload(base64);
      const bytes = decodeBase64(payload.trim());
      if (bytes.byteLength > 0) {
        const blob = new Blob([bytes], { type: "image/png" });
        return URL.createObjectURL(blob);
      }
    } catch {
      /* fall through */
    }
  }

  const base64Index = base64.indexOf(",") + 1;
  const imageBase64 = base64.substring(base64Index);

  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/png" });

  return URL.createObjectURL(blob);
}
