/**
 * wasm-bindgen bundle (`wasm-pack --target web`): call {@link initBetterseqtaWasm}
 * before using exports that touch the module instance.
 */
import wasmInit, {
  childTextHasSeqtaCopyright,
  colorCssThresholdDistance,
  convertTo12HourFormat as convertTo12HourFormatWasm,
  decodeBase64,
  encodeBase64,
  encodeDataUrl,
  escapeJsForInlineScript,
  escapeJsSingleQuotedString,
  extensionWasmVersion,
  extractWeightFromPdfText,
  formatTimetableTimeLabel,
  formatTimetableTimeRange,
  isFirefoxUserAgent,
  locationHashIncludesTimetablePage,
  normalizeSeqtaSubjectHexColour,
  parseEngageRoutePage,
  parseGradeToPercent,
  parseSeqtaCoursesAssessmentsPageJson,
  stripDataUrlBase64Payload,
  titleIsSeqtaEngage,
  titleIsSeqtaLearnOrEngage,
} from "@/wasm/pkg/betterseqta_wasm.js";

let wasmReady = false;
let wasmInflight: Promise<void> | null = null;

export async function initBetterseqtaWasm(): Promise<void> {
  if (wasmReady) return;
  if (!wasmInflight) {
    wasmInflight = wasmInit().then(() => {
      wasmReady = true;
    });
  }
  await wasmInflight;
}

export function isBetterseqtaWasmReady(): boolean {
  return wasmReady;
}

export {
  childTextHasSeqtaCopyright,
  colorCssThresholdDistance,
  convertTo12HourFormatWasm,
  decodeBase64,
  encodeBase64,
  encodeDataUrl,
  escapeJsForInlineScript,
  escapeJsSingleQuotedString,
  extensionWasmVersion,
  extractWeightFromPdfText,
  formatTimetableTimeLabel,
  formatTimetableTimeRange,
  isFirefoxUserAgent,
  locationHashIncludesTimetablePage,
  normalizeSeqtaSubjectHexColour,
  parseEngageRoutePage,
  parseGradeToPercent,
  parseSeqtaCoursesAssessmentsPageJson,
  stripDataUrlBase64Payload,
  titleIsSeqtaEngage,
  titleIsSeqtaLearnOrEngage,
};
