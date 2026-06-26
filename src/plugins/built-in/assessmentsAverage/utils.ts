import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements.ts";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { getEngageAssessmentStudentId } from "@/seqta/utils/engageAssessmentStudent";
import {
  getEngageAssessmentReportUrl,
  requestEngageAssessmentPdf,
} from "./engage.ts";
import {
  ensurePdfjsWorker,
  getPdfjsPageContextUrls,
} from "@/lib/pdfjsExtension.ts";
import * as pdfjs from "pdfjs-dist";

ensurePdfjsWorker();

export const WEIGHTING_SCHEMA_VERSION = 1;

export interface WeightingEntry {
  weight: string;
  fingerprint: string;
  pluginVersion: number;
  refreshing?: boolean;
}

export type WeightingsMap = Record<string, WeightingEntry>;

/** Primary storage key for weightings / overrides. */
export function assessmentIdKey(mark: { id: string | number }): string {
  return String(mark.id);
}

/** Composite lookup key when the same title appears in multiple metaclasses. */
export function assessmentTitleLookupKey(mark: {
  metaclassID?: string | number;
  title?: string;
}): string | null {
  const title = mark.title?.trim();
  if (!title) return null;
  const metaclassID = mark.metaclassID;
  if (metaclassID != null && metaclassID !== "") {
    return `${metaclassID}:${title}`;
  }
  return title;
}

function registerAssessmentLookup(api: any, mark: any) {
  const assessmentID = assessmentIdKey(mark);
  const next: Record<string, string> = {
    ...api.storage.assessments,
    [assessmentID]: assessmentID,
  };
  const compositeKey = assessmentTitleLookupKey(mark);
  if (compositeKey) next[compositeKey] = assessmentID;
  api.storage.assessments = next;
}

type MarkLike = {
  id: string | number;
  title?: string;
  metaclassID?: string | number;
};

function collectMarksFromFiberState(state: Record<string, unknown>): MarkLike[] {
  return [
    ...(Array.isArray(state.marks) ? state.marks : []),
    ...(Array.isArray(state.upcoming) ? state.upcoming : []),
    ...(Array.isArray(state.pending) ? state.pending : []),
  ] as MarkLike[];
}

async function resolveAssessmentId(
  api: any,
  title: string,
  marks?: MarkLike[],
): Promise<string | undefined> {
  const assessments = (api.storage.assessments ?? {}) as Record<string, string>;
  let resolvedMarks = marks;

  if (!resolvedMarks) {
    try {
      const state = await ReactFiber.find(
        "[class*='AssessmentList__items___']",
      ).getState();
      resolvedMarks = collectMarksFromFiberState(state);
    } catch {
      resolvedMarks = [];
    }
  }

  const matching = resolvedMarks.filter((mark) => mark.title?.trim() === title);
  if (matching.length === 1) {
    return assessmentIdKey(matching[0]);
  }

  for (const mark of matching) {
    const compositeKey = assessmentTitleLookupKey(mark);
    if (compositeKey && assessments[compositeKey]) {
      return assessments[compositeKey];
    }
  }

  if (assessments[title]) return assessments[title];

  const suffix = `:${title}`;
  for (const [key, id] of Object.entries(assessments)) {
    if (key.endsWith(suffix)) return id;
  }

  return undefined;
}

export function computeFingerprint(mark: any): string {
  const score =
    mark?.results?.percentage ?? mark?.results?.score ?? null;
  return JSON.stringify([
    mark?.status ?? "",
    Boolean(mark?.graded),
    mark?.availability ?? "",
    score,
    mark?.due ?? "",
    mark?.title ?? "",
  ]);
}

function migrateWeightings(api: any) {
  const w = api.storage.weightings ?? {};
  let dirty = false;
  const out: WeightingsMap = {};
  for (const [id, v] of Object.entries(w)) {
    if (typeof v === "string") {
      out[id] = { weight: v, fingerprint: "", pluginVersion: 0 };
      dirty = true;
    } else if (v && typeof v === "object") {
      const entry = v as Partial<WeightingEntry>;
      if (
        typeof entry.weight === "string" &&
        typeof entry.fingerprint === "string" &&
        typeof entry.pluginVersion === "number"
      ) {
        out[id] = entry as WeightingEntry;
      } else {
        out[id] = {
          weight: String(entry.weight ?? "N/A"),
          fingerprint: "",
          pluginVersion: 0,
        };
        dirty = true;
      }
    }
  }
  if (dirty) api.storage.weightings = out;
}

export async function initStorage(api: any) {
  await api.storage.loaded;

  if (!api.storage.weightings) {
    api.storage.weightings = {};
  }
  if (!api.storage.assessments) {
    api.storage.assessments = {};
  }
  if (!api.storage.weightingOverrides) {
    api.storage.weightingOverrides = {};
  }

  migrateWeightings(api);
}

export function clearStuck(api: any) {
  const map = (api.storage.weightings ?? {}) as WeightingsMap;
  let dirty = false;
  const out: WeightingsMap = {};
  for (const [key, entry] of Object.entries(map)) {
    if (!entry || typeof entry !== "object") {
      dirty = true;
      continue;
    }
    if (entry.weight === "processing") {
      // Stuck mid-fetch from a previous session: drop it so the next
      // page load can re-run handleWeightings from scratch.
      dirty = true;
      continue;
    }
    if (entry.refreshing) {
      const { refreshing: _ignored, ...rest } = entry;
      out[key] = rest;
      dirty = true;
      continue;
    }
    out[key] = entry;
  }
  if (dirty) api.storage.weightings = out;
}

// Helper function to find actual class names by their base pattern
export const getClassByPattern = (
  element: Element | Document,
  basePattern: string,
): string => {
  const classes = Array.from(element.querySelectorAll("*"))
    .flatMap((el) => Array.from(el.classList))
    .filter((className) => className.startsWith(basePattern));

  return classes.length ? classes[0] : "";
};

export const letterToNumber: Record<string, number> = {
  "A+": 100,
  A: 95,
  "A-": 90,
  "B+": 85,
  B: 80,
  "B-": 75,
  "C+": 70,
  C: 65,
  "C-": 60,
  "D+": 55,
  D: 50,
  "D-": 45,
  "E+": 40,
  E: 35,
  "E-": 30,
  F: 0,
};

function parseGrade(text: string): number {
  const str = text.trim().toUpperCase();
  if (str.includes("/")) {
    const [raw, max] = str.split("/").map((n) => parseFloat(n));
    return (raw / max) * 100;
  }
  if (str.includes("%")) {
    return parseFloat(str.replace("%", "")) || 0;
  }
  return letterToNumber[str] ?? 0;
}

function formatWeightDisplay(weighting: string): string {
  return `${Number(weighting) % 1 === 0 ? Number(weighting) : weighting}%`;
}

function saveWeightingOverride(
  api: any,
  assessmentID: string,
  raw: string,
): { ok: boolean; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    const { [assessmentID]: _, ...rest } = api.storage.weightingOverrides;
    api.storage.weightingOverrides = rest;
    document.dispatchEvent(new CustomEvent("betterseqta:overrideChanged"));
    return { ok: true };
  }

  const val = parseFloat(trimmed);
  if (isNaN(val) || val < 0) {
    return { ok: false, error: "Invalid. Must be 0 or greater" };
  }

  api.storage.weightingOverrides = {
    ...api.storage.weightingOverrides,
    [assessmentID]: String(val),
  };
  document.dispatchEvent(new CustomEvent("betterseqta:overrideChanged"));
  return { ok: true };
}

function attachWeightInputListeners(
  input: HTMLInputElement,
  api: any,
  assessmentID: string,
) {
  const save = () => {
    const result = saveWeightingOverride(api, assessmentID, input.value);
    input.style.borderColor = result.ok
      ? "rgba(128,128,128,0.35)"
      : "rgba(255,80,80,0.6)";
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
}

function updateWeightLabelContent(
  weightLabel: HTMLElement,
  weighting: string | undefined,
  assessmentID: string | undefined,
  api: any,
  refreshing = false,
) {
  const existingInput = weightLabel.querySelector(
    ".betterseqta-weight-input",
  ) as HTMLInputElement | null;
  if (existingInput && document.activeElement === existingInput) return;

  weightLabel.querySelector(".betterseqta-weight-value")?.remove();
  weightLabel.querySelector(".betterseqta-weight-input")?.remove();
  Array.from(weightLabel.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
    .forEach((node) => node.remove());

  weightLabel.title = "";

  if (weighting === "processing") {
    const span = document.createElement("span");
    span.className = "betterseqta-weight-value";
    span.textContent = "...";
    span.style.opacity = "0.5";
    weightLabel.appendChild(span);
    return;
  }

  if (weighting === "N/A" && assessmentID) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "5";
    input.className = "betterseqta-weight-input";
    input.placeholder = "Set %";
    input.setAttribute("aria-label", "Assessment weighting percentage");
    input.style.cssText =
      "width:52px;padding:1px 4px;border-radius:4px;border:1px solid rgba(128,128,128,0.35);background:rgba(128,128,128,0.08);color:inherit;font-size:inherit;outline:none;";
    attachWeightInputListeners(input, api, assessmentID);
    weightLabel.appendChild(input);
    weightLabel.title = "Enter assessment weighting %";
    return;
  }

  const span = document.createElement("span");
  span.className = "betterseqta-weight-value";
  const baseText =
    weighting && weighting !== "N/A"
      ? formatWeightDisplay(weighting)
      : "N/A";
  span.textContent = refreshing ? `${baseText} ↻` : baseText;
  if (refreshing) {
    span.style.opacity = "0.7";
    weightLabel.title = "Re-checking weighting…";
  }
  weightLabel.appendChild(span);
}

function createWeightLabel(
  assessmentItem: Element,
  weighting: string | undefined,
  api: any,
  refreshing = false,
  assessmentID?: string,
) {
  let statsContainer = assessmentItem.querySelector(
    `[class*='AssessmentItem__stats___'],  .betterseqta-stats-container`,
  ) as HTMLElement | null;

  if (!statsContainer) {
    const statsClass = getClassByPattern(document, "AssessmentItem__stats___");
    statsContainer = document.createElement("div");
    statsContainer.className = statsClass;
    statsContainer.classList.add("betterseqta-stats-container");
    const thermoscore = assessmentItem.querySelector(`[class*='Thermoscore__Thermoscore___']`);
    if (thermoscore) {
      thermoscore.insertAdjacentElement("afterend", statsContainer);
    } else {
      assessmentItem.appendChild(statsContainer);
    }
  }

  const hasNativeLabel = !!statsContainer.querySelector(
    `[class*='Label__Label___']:not(.betterseqta-weight-label)`,
  );
  statsContainer.style.justifyContent = hasNativeLabel
    ? "space-between"
    : "flex-end";

  const resolvedAssessmentId =
    assessmentID ?? assessmentItem.dataset.betterseqtaAssessmentId;

  const existingLabel = statsContainer.querySelector(
    ".betterseqta-weight-label",
  ) as HTMLElement | null;

  if (existingLabel) {
    updateWeightLabelContent(
      existingLabel,
      weighting,
      resolvedAssessmentId,
      api,
      refreshing,
    );
    return;
  }

  statsContainer.style.display = "flex";
  statsContainer.style.alignItems = "center";
  statsContainer.style.width = "100%";

  // Try to clone an existing label from the stats container first,
  // fall back to building from scratch if none exists
  const existingNativeLabel = statsContainer.querySelector(
    `[class*='Label__Label___']`,
  ) as HTMLElement | null;

  const weightLabel = existingNativeLabel
    ? (existingNativeLabel.cloneNode(true) as HTMLElement)
    : (() => {
      const labelClass = getClassByPattern(document, "Label__Label___");
      const innerTextClass = getClassByPattern(document, "Label__innerText___");
      const el = document.createElement("label");
      el.className = labelClass;
      el.innerHTML = `<div class="${innerTextClass}">Weight</div>`;
      return el;
    })();

  weightLabel.classList.add("betterseqta-weight-label");
  weightLabel.style.flex = "none";
  weightLabel.style.width = "fit-content";

  const innerTextDiv = weightLabel.querySelector(`[class*='Label__innerText___']`);
  if (innerTextDiv) innerTextDiv.textContent = "Weight";

  updateWeightLabelContent(
    weightLabel,
    weighting,
    resolvedAssessmentId,
    api,
    refreshing,
  );
  statsContainer.appendChild(weightLabel);
}

export const isFirefox =
  navigator.userAgent.toLowerCase().indexOf("firefox") > -1 &&
  !navigator.userAgent.toLowerCase().includes("seamonkey") &&
  !navigator.userAgent.toLowerCase().includes("waterfox");

function trustedPageOrigin(): string {
  return window.location.origin;
}

function escJsSingleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function fetchPDFAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const isBlobUrl = url.startsWith("blob:");
  const pageOrigin = trustedPageOrigin();

  if (isBlobUrl || isFirefox) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const requestId = `pdf-fetch-${Date.now()}-${Math.random()}`;
      const escapedUrl = escJsSingleQuoted(url);
      const escapedOrigin = escJsSingleQuoted(pageOrigin);

      script.textContent = `
        (function() {
          fetch('${escapedUrl}')
            .then(response => {
              if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
              }
              return response.arrayBuffer();
            })
            .then(arrayBuffer => {
              window.postMessage({
                type: '${requestId}',
                success: true,
                data: Array.from(new Uint8Array(arrayBuffer))
              }, '${escapedOrigin}');
            })
            .catch(error => {
              window.postMessage({
                type: '${requestId}',
                success: false,
                error: error.message || String(error)
              }, '${escapedOrigin}');
            });
        })();
      `;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== pageOrigin || event.source !== window) return;
        if (event.data?.type === requestId) {
          window.removeEventListener("message", messageHandler);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }

          if (event.data.success) {
            resolve(new Uint8Array(event.data.data).buffer);
          } else {
            reject(new Error(event.data.error || "Failed to fetch PDF"));
          }
        }
      };

      window.addEventListener("message", messageHandler);
      (document.head || document.documentElement).appendChild(script);

      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error("Timeout fetching PDF"));
      }, 30000);
    });
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      redirect: "follow",
    });

    if (response.url && response.url.startsWith("blob:")) {
      return await fetchPDFAsArrayBuffer(response.url);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch PDF: ${response.status} ${response.statusText}`,
      );
    }

    return await response.arrayBuffer();
  } catch (error: any) {
    if (
      error?.message?.includes("blob") ||
      error?.message?.includes("Security") ||
      error?.message?.includes("CSP")
    ) {
      return await fetchPDFAsArrayBuffer(url);
    }
    throw error;
  }
}

export async function extractPDFText(url: string): Promise<string> {
  try {
    if (isFirefox) {
      const { lib: pdfLibUrl, worker: pdfWorkerUrl } =
        getPdfjsPageContextUrls();
      const pdfLibInj = escJsSingleQuoted(pdfLibUrl);
      const pdfWorkerInj = escJsSingleQuoted(pdfWorkerUrl);

      const pageOrigin = trustedPageOrigin();
      const escapedOrigin = escJsSingleQuoted(pageOrigin);

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const requestId = `pdf-extract-${Date.now()}-${Math.random()}`;

        const escapedUrl = escJsSingleQuoted(url);

        script.textContent = `
          (function() {
            const requestId = '${requestId}';
            const pageOrigin = '${escapedOrigin}';
            const url = '${escapedUrl}';
            const pdfLibSrc = '${pdfLibInj}';
            const pdfWorkerSrc = '${pdfWorkerInj}';
            
            if (window.pdfjsLib) {
              extractPDF();
            } else {
              const pdfjsScript = document.createElement('script');
              pdfjsScript.src = pdfLibSrc;
              pdfjsScript.type = 'module';
              
              pdfjsScript.onload = function() {
                extractPDF();
              };
              pdfjsScript.onerror = function() {
                window.postMessage({
                  type: requestId,
                  success: false,
                  error: 'Failed to load pdfjs library'
                }, pageOrigin);
              };
              
              document.head.appendChild(pdfjsScript);
            }
            
            function extractPDF() {
              try {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
                
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.withCredentials = true;
                
                xhr.onload = function() {
                  if (xhr.status !== 200) {
                    window.postMessage({
                      type: requestId,
                      success: false,
                      error: 'HTTP ' + xhr.status + ': ' + xhr.statusText
                    }, pageOrigin);
                    return;
                  }
                  
                  try {
                    const arrayBuffer = xhr.response;
                    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                      throw new Error('PDF response is empty');
                    }
                    
                    window.pdfjsLib.getDocument({ 
                      data: arrayBuffer,
                      useSystemFonts: true,
                      verbosity: 0,
                      useWorkerFetch: false,
                      isEvalSupported: false
                    }).promise
                      .then(pdf => {
                        const pagePromises = [];
                        for (let i = 1; i <= pdf.numPages; i++) {
                          pagePromises.push(
                            pdf.getPage(i).then(page => {
                              return page.getTextContent().then(content => {
                                return content.items.map(item => item.str).join(' ');
                              });
                            })
                          );
                        }
                        return Promise.all(pagePromises);
                      })
                      .then(pages => {
                        const text = pages.join('\\n');
                        window.postMessage({
                          type: requestId,
                          success: true,
                          text: text
                        }, pageOrigin);
                      })
                      .catch(error => {
                        window.postMessage({
                          type: requestId,
                          success: false,
                          error: 'PDF parsing error: ' + (error.message || String(error))
                        }, pageOrigin);
                      });
                  } catch (error) {
                    window.postMessage({
                      type: requestId,
                      success: false,
                      error: 'ArrayBuffer error: ' + (error.message || String(error))
                    }, pageOrigin);
                  }
                };
                
                xhr.onerror = function() {
                  window.postMessage({
                    type: requestId,
                    success: false,
                    error: 'Network error fetching PDF'
                  }, pageOrigin);
                };
                
                xhr.ontimeout = function() {
                  window.postMessage({
                    type: requestId,
                    success: false,
                    error: 'Timeout fetching PDF'
                  }, pageOrigin);
                };
                
                xhr.timeout = 30000;
                xhr.send();
              } catch (error) {
                window.postMessage({
                  type: requestId,
                  success: false,
                  error: 'Setup error: ' + (error.message || String(error))
                }, pageOrigin);
              }
            }
          })();
        `;

        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== pageOrigin || event.source !== window) return;
          if (event.data?.type === requestId) {
            window.removeEventListener("message", messageHandler);
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }

            if (event.data.success) {
              resolve(event.data.text);
            } else {
              reject(
                new Error(event.data.error || "Failed to extract PDF text"),
              );
            }
          }
        };

        window.addEventListener("message", messageHandler);
        (document.head || document.documentElement).appendChild(script);

        setTimeout(() => {
          window.removeEventListener("message", messageHandler);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          reject(new Error("Timeout extracting PDF text"));
        }, 60000);
      });
    }

    const arrayBuffer = await fetchPDFAsArrayBuffer(url);

    if (arrayBuffer.byteLength === 0) {
      throw new Error("PDF response is empty");
    }

    const pdf = await pdfjs.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    return text;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to extract PDF text:", error);
    throw error;
  }
}

async function handleWeightings(mark: any, api: any) {
  const assessmentID = assessmentIdKey(mark);
  const metaclassID = mark.metaclassID;

  const fingerprint = computeFingerprint(mark);
  const existing = api.storage.weightings[assessmentID] as
    | WeightingEntry
    | undefined;

  const isFresh =
    existing &&
    existing.weight !== "processing" &&
    existing.fingerprint === fingerprint &&
    existing.pluginVersion === WEIGHTING_SCHEMA_VERSION;

  if (isFresh) return;

  // If we have a previous usable value, keep showing it while we refetch
  // by marking the entry as refreshing instead of wiping it. We claim the
  // new fingerprint + version on the placeholder so a second parseAssessments
  // pass (e.g. a fast re-mount of the wrapper) doesn't kick off a duplicate
  // refetch for the same id while this one is still in flight.
  const placeholder: WeightingEntry =
    existing && existing.weight !== "processing"
      ? {
          ...existing,
          fingerprint,
          pluginVersion: WEIGHTING_SCHEMA_VERSION,
          refreshing: true,
        }
      : {
          weight: "processing",
          fingerprint,
          pluginVersion: WEIGHTING_SCHEMA_VERSION,
        };

  api.storage.weightings = {
    ...api.storage.weightings,
    [assessmentID]: placeholder,
  };

  registerAssessmentLookup(api, mark);

  // Surface the refreshing indicator on the affected row immediately,
  // without waiting for the PDF fetch to finish.
  document.dispatchEvent(new CustomEvent("betterseqta:weightingsChanged"));

  try {
    let pdfUrl: string;

    if (isSeqtaEngageExperience()) {
      const studentID = getEngageAssessmentStudentId();
      if (!studentID) {
        throw new Error("Could not resolve Engage student ID from URL or storage");
      }

      const reportFile = await requestEngageAssessmentPdf({
        assessmentID,
        metaclassID,
        studentID,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      pdfUrl = getEngageAssessmentReportUrl(reportFile);
    } else {
      const userInfo = await getUserInfo();
      const userID = userInfo.id;

      const filename =
        "BetterSEQTA-" +
        String(Math.floor(Math.random() * 1e15)).padStart(15, "0");

      const printResponse = await fetch(
        `${location.origin}/seqta/student/print/assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          credentials: "include",
          body: JSON.stringify({
            fileName: filename,
            id: assessmentID,
            metaclass: metaclassID,
            student: userID,
          }),
        },
      );

      if (!printResponse.ok) {
        throw new Error(
          `Failed to generate PDF: ${printResponse.status} ${printResponse.statusText}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      pdfUrl = `${location.origin}/seqta/student/report/get?file=${filename}`;
    }

    if (pdfUrl.startsWith("blob:")) {
      throw new Error(`Cannot fetch blob URL from extension: ${pdfUrl}`);
    }

    let text: string;
    try {
      text = await extractPDFText(pdfUrl);
    } catch (error: any) {
      if (
        isFirefox &&
        (error?.message?.includes("blob") ||
          error?.message?.includes("Security") ||
          error?.message?.includes("CSP"))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        text = await extractPDFText(pdfUrl);
      } else {
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
    }

    const match = text.match(/weight:\s*(\d+\.?\d*)/i);

    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: {
        weight: match ? match[1] : "N/A",
        fingerprint,
        pluginVersion: WEIGHTING_SCHEMA_VERSION,
      },
    };
  } catch (error: any) {
    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: {
        weight: "N/A",
        fingerprint,
        pluginVersion: WEIGHTING_SCHEMA_VERSION,
      },
    };
  }

  document.dispatchEvent(new CustomEvent("betterseqta:weightingsChanged"));
}

export async function parseAssessments(api: any) {
  const state = await ReactFiber.find(
    "[class*='AssessmentList__items___']",
  ).getState();

  const marks = [
    ...(state["marks"] ?? []),
    ...(state["upcoming"] ?? []),
    ...(state["pending"] ?? []),
  ];
  if (!marks) return;

  await Promise.all(marks.map((mark: any) => handleWeightings(mark, api)));
}

export async function processAssessments(api: any, assessmentItems: Element[]) {
  let weightedTotal = 0;
  let totalWeight = 0;
  let hasInaccurateWeighting = false;
  let hasRefreshingWeighting = false;
  let count = 0;

  let fiberMarks: MarkLike[] = [];
  try {
    const state = await ReactFiber.find(
      "[class*='AssessmentList__items___']",
    ).getState();
    fiberMarks = collectMarksFromFiberState(state);
  } catch {
    fiberMarks = [];
  }

  for (const assessmentItem of assessmentItems) {
    const titleEl = assessmentItem.querySelector(
      `[class*='AssessmentItem__title___']`,
    );
    if (!titleEl) continue;

    const title = titleEl.textContent?.trim();
    if (!title) continue;

    const assessmentID = await resolveAssessmentId(api, title, fiberMarks);
    if (assessmentID) {
      (assessmentItem as HTMLElement).dataset.betterseqtaAssessmentId =
        assessmentID;
    }
    const entry = assessmentID
      ? (api.storage.weightings?.[assessmentID] as WeightingEntry | undefined)
      : undefined;
    const autoWeighting = entry?.weight;
    const override = assessmentID
      ? api.storage.weightingOverrides?.[assessmentID]
      : undefined;
    const weighting = override ?? autoWeighting;
    const refreshing = !override && Boolean(entry?.refreshing);

    createWeightLabel(assessmentItem, weighting, api, refreshing, assessmentID);

    const gradeElement = assessmentItem.querySelector(
      `[class*='Thermoscore__text___']`,
    );
    if (!gradeElement) continue;
    const grade = parseGrade(gradeElement.textContent || "");
    if (grade <= 0) continue;

    if (
      weighting === null ||
      weighting === undefined ||
      weighting === "N/A" ||
      weighting === "processing"
    ) {
      hasInaccurateWeighting = true;
      continue
    } else {
      const weight = parseFloat(weighting);

      if (!isNaN(weight) && weight >= 0) {
        weightedTotal += grade * weight;
        totalWeight += weight;
        if (refreshing) hasRefreshingWeighting = true;
      } else {
        weightedTotal += grade;
        totalWeight += 1;
        hasInaccurateWeighting = true;
      }
    }
    count++;
  }

  return {
    weightedTotal,
    totalWeight,
    hasInaccurateWeighting,
    hasRefreshingWeighting,
    count,
  };
}

function resolveTabSetClasses(): Record<string, string> {
  const patterns = [
    "TabSet__tabsheet___",
    "TabSet__hidden___",
    "TabSet__selected___",
    "TabSet__disappearToLeft___",
    "TabSet__disappearToRight___",
    "TabSet__appearFromRight___",
    "TabSet__appearFromLeft___",
  ];

  const resolved: Record<string, string> = {};

  // First pass: scan live DOM elements (fast, covers currently-applied classes)
  const allClasses = Array.from(
    document.querySelectorAll('[class*="TabSet__"]'),
  ).flatMap((el) => Array.from(el.classList));

  for (const pattern of patterns) {
    const found = allClasses.find((c) => c.startsWith(pattern));
    if (found) resolved[pattern] = found;
  }

  // Second pass: scan stylesheets for any classes not yet in the DOM
  // (e.g. animation classes that haven't been applied yet)
  const missing = patterns.filter((p) => !resolved[p]);
  if (missing.length > 0) {
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        if (missing.every((p) => resolved[p])) break;
        try {
          for (const rule of Array.from(sheet.cssRules ?? [])) {
            if (!(rule instanceof CSSStyleRule)) continue;
            const selectorClasses =
              rule.selectorText.match(/\.([\w-]+)/g) ?? [];
            for (const pattern of missing) {
              if (!resolved[pattern]) {
                const match = selectorClasses.find((c) =>
                  c.slice(1).startsWith(pattern),
                );
                if (match) resolved[pattern] = match.slice(1);
              }
            }
          }
        } catch {
          // Cross-origin stylesheet
        }
      }
    } catch {}
  }

  // Fallback: use the base pattern as-is so the function doesn't crash,
  // though styles won't apply if the hash is truly unknown.
  for (const pattern of patterns) {
    if (!resolved[pattern]) resolved[pattern] = pattern;
  }

  return resolved;
}

interface WeightingTabContext {
  assessmentID?: string;
  autoWeight?: number;
  override?: number | string;
  weightingUnavailable: boolean;
  statusNote: string;
}

async function resolveWeightingTabContext(api: any): Promise<WeightingTabContext> {
  const selectedItem = document.querySelector(
    "[class*='AssessmentItem__AssessmentItem___'][class*='selected___']",
  ) as HTMLElement | null;
  const titleEl = selectedItem?.querySelector(
    "[class*='AssessmentItem__title___']",
  );
  const title = titleEl?.textContent?.trim();
  const assessmentID =
    selectedItem?.dataset.betterseqtaAssessmentId ??
    (title ? await resolveAssessmentId(api, title) : undefined);

  const entry = assessmentID
    ? (api.storage.weightings?.[assessmentID] as WeightingEntry | undefined)
    : undefined;
  const rawWeight = entry?.weight;
  const weightingUnavailable = rawWeight === "N/A";
  const autoWeight =
    rawWeight && rawWeight !== "processing" && rawWeight !== "N/A"
      ? rawWeight
      : undefined;
  const override = assessmentID
    ? api.storage.weightingOverrides?.[assessmentID]
    : undefined;

  const statusNote = !assessmentID
    ? ""
    : rawWeight === "processing"
      ? "Weighting is still being detected."
      : weightingUnavailable
        ? "No weighting was found in the marksheet. Set one manually."
        : "Overrides the auto-detected value.";

  return {
    assessmentID,
    autoWeight,
    override,
    weightingUnavailable,
    statusNote,
  };
}

function renderWeightingTabHtml(
  sheet: HTMLElement,
  context: WeightingTabContext,
) {
  const { assessmentID, autoWeight, override, weightingUnavailable, statusNote } =
    context;

  sheet.innerHTML = `
    <style>
      #betterseqta-weight-override::placeholder {
        opacity: 0.4;
      }
    </style>
    <div style="padding:16px;max-width:360px">
      <h2 style="margin:0 0 4px;font-size:15px;font-weight:600">Weighting Override</h2>
      <p style="margin:0 0 16px;font-size:12px;opacity:0.6">
        Set the weighting for this assessment.
        ${statusNote}
      </p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <label style="font-size:13px;opacity:0.7;flex-shrink:0">Auto-detected</label>
        <span style="font-size:13px;opacity:${autoWeight != null ? "1" : "0.4"}">${autoWeight != null ? `${autoWeight}%` : "none"}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <label for="betterseqta-weight-override" style="font-size:13px;opacity:0.7;flex-shrink:0">${weightingUnavailable ? "Weight %" : "Override %"}</label>
        <input
          id="betterseqta-weight-override"
          type="number"
          min="0"
          step="5"
          placeholder="${weightingUnavailable ? "Enter weight" : autoWeight ?? ""}"
          value="${override ?? ""}"
          ${!assessmentID ? "disabled" : ""}
          style="
            width:90px;
            padding:5px 8px;
            border-radius:6px;
            border:1px solid rgba(128,128,128,0.3);
            background:rgba(128,128,128,0.08);
            color:inherit;
            font-size:13px;
            outline:none;
          "
        />
      </div>
      <div style="margin-top:10px;min-height:18px">
        <span class="betterseqta-save-status" style="font-size:12px;opacity:0.5"></span>
      </div>
      ${!assessmentID ? `<p style="font-size:12px;color:rgba(255,80,80,0.8);margin-top:8px">Assessment not yet indexed — try refreshing.</p>` : ""}
    </div>
  `;
}

function attachWeightingInputHandlers(
  sheet: HTMLElement,
  api: any,
  assessmentID: string,
) {
  const input = sheet.querySelector(
    "#betterseqta-weight-override",
  ) as HTMLInputElement;
  const statusEl = sheet.querySelector(
    ".betterseqta-save-status",
  ) as HTMLElement;

  const save = () => {
    const raw = input.value.trim();
    const result = saveWeightingOverride(api, assessmentID, raw);
    if (!result.ok) {
      if (raw !== "") {
        input.style.borderColor = "rgba(255,80,80,0.6)";
        statusEl.textContent = result.error ?? "Invalid. Must be 0 or greater";
        statusEl.style.color = "rgba(255,80,80,0.8)";
      }
      return;
    }

    input.style.borderColor = "rgba(128,128,128,0.3)";
    statusEl.textContent = "Saved";
    statusEl.style.color = "";
    setTimeout(() => (statusEl.textContent = ""), 2000);
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
      save();
    }
  });
  input.addEventListener("input", () => {
    input.style.borderColor = "rgba(128,128,128,0.3)";
    if (statusEl.textContent === "Invalid. Must be 0 or greater.")
      statusEl.textContent = "";
  });
}

async function buildWeightingsTabContent(api: any, sheet: HTMLElement) {
  const context = await resolveWeightingTabContext(api);
  renderWeightingTabHtml(sheet, context);
  if (!context.assessmentID) return;
  attachWeightingInputHandlers(sheet, api, context.assessmentID);
}

export function injectWeightingsTab(api: any) {
  const tabList = document.querySelector(
    '[class*="TabSet__tabs___"]',
  ) as HTMLElement;
  const container = document.querySelector(
    '[class*="TabSet__tabContainer___"]',
  ) as HTMLElement;
  if (!tabList || !container) return;
  if (tabList.querySelector(".betterseqta-weightings-tab")) return;

  const cls = resolveTabSetClasses();

  const prefix = (tabList.querySelector("li") as HTMLElement).id.replace(
    /-tab-\d+$/,
    "",
  );
  const newIndex = tabList.querySelectorAll("li").length;

  const newTab = document.createElement("li");
  newTab.id = `${prefix}-tab-${newIndex}`;
  newTab.className = "";
  newTab.setAttribute("aria-selected", "false");
  newTab.setAttribute("aria-controls", `${prefix}-tabsheet-${newIndex}`);
  newTab.classList.add("betterseqta-weightings-tab");
  newTab.textContent = "Weightings";
  tabList.appendChild(newTab);

  const newSheet = document.createElement("div");
  newSheet.id = `${prefix}-tabsheet-${newIndex}`;
  newSheet.setAttribute("aria-labelledby", `${prefix}-tab-${newIndex}`);
  newSheet.className = [
    cls["TabSet__tabsheet___"],
    cls["TabSet__hidden___"],
    cls["TabSet__disappearToRight___"],
  ].join(" ");
  container.appendChild(newSheet);

  newTab.addEventListener("click", () => {
    void buildWeightingsTabContent(api, newSheet);
  });

  const allTabs = Array.from(tabList.querySelectorAll("li"));
  const allSheets = Array.from(
    container.querySelectorAll('[class*="tabsheet"]'),
  );

  allTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      const currentIndex = allTabs.findIndex((t) =>
        t.className.includes("TabSet__selected___"),
      );
      if (i === currentIndex) return;
      const goingRight = currentIndex < 0 ? true : i > currentIndex;

      allTabs.forEach((t) => {
        t.className = "";
        t.setAttribute("aria-selected", "false");
      });

      if (currentIndex >= 0) {
        allSheets[currentIndex].className = [
          cls["TabSet__tabsheet___"],
          cls["TabSet__hidden___"],
          goingRight
            ? cls["TabSet__disappearToLeft___"]
            : cls["TabSet__disappearToRight___"],
        ].join(" ");
      }

      allSheets[i].className = [
        cls["TabSet__tabsheet___"],
        cls["TabSet__selected___"],
        goingRight
          ? cls["TabSet__appearFromRight___"]
          : cls["TabSet__appearFromLeft___"],
      ].join(" ");

      tab.className = cls["TabSet__selected___"];
      tab.setAttribute("aria-selected", "true");
    });
  });
}
