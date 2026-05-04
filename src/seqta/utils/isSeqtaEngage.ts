import { isBetterseqtaWasmReady, titleIsSeqtaEngage } from "@/wasm/init";

/** SEQTA Engage (React) uses a different shell from classic SEQTA Learn. */
export function isSeqtaEngageExperience(): boolean {
  if (typeof document === "undefined") return false;
  if (isBetterseqtaWasmReady()) {
    try {
      return titleIsSeqtaEngage(document.title);
    } catch {
      /* fall through */
    }
  }
  return document.title.includes("SEQTA Engage");
}
