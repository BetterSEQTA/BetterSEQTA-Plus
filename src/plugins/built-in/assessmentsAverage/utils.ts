import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements.ts";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import {
  ensurePdfjsWorker,
  getPdfjsPageContextUrls,
} from "@/lib/pdfjsExtension.ts";
import * as pdfjs from "pdfjs-dist";
import {
  escapeJsForInlineScript,
  escapeJsSingleQuotedString,
  extractWeightFromPdfText,
  isBetterseqtaWasmReady,
  isFirefoxUserAgent,
  parseGradeToPercent,
} from "@/wasm/init";

ensurePdfjsWorker();

function escJsSingleQuoted(s: string): string {
  if (isBetterseqtaWasmReady()) {
    try {
      return escapeJsSingleQuotedString(s);
    } catch {
      /* fall through */
    }
  }
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escJsInlineUrl(s: string): string {
  if (isBetterseqtaWasmReady()) {
    try {
      return escapeJsForInlineScript(s);
    } catch {
      /* fall through */
    }
  }
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function detectFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (isBetterseqtaWasmReady()) {
    try {
      return isFirefoxUserAgent(ua);
    } catch {
      /* fall through */
    }
  }
  const u = ua.toLowerCase();
  return (
    u.indexOf("firefox") > -1 &&
    !u.includes("seamonkey") &&
    !u.includes("waterfox")
  );
}

export async function initStorage(api: any) {
  await api.storage.loaded;

  if (!api.storage.weightings) {
    api.storage.weightings = {};
  }
  if (!api.storage.assessments) {
    api.storage.assessments = {};
  }
}

export function clearStuck(api: any) {
  let hasStuckProcessing = false;
  for (const key in api.storage.weightings) {
    if (api.storage.weightings[key] === "processing") {
      delete api.storage.weightings[key];
      hasStuckProcessing = true;
    }
  }
  if (hasStuckProcessing) {
    api.storage.weightings = { ...api.storage.weightings };
  }
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

function parseGradeTs(text: string): number {
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

function parseGrade(text: string): number {
  if (isBetterseqtaWasmReady()) {
    try {
      return parseGradeToPercent(text);
    } catch {
      /* fall through */
    }
  }
  return parseGradeTs(text);
}

function createWeightLabel(
  assessmentItem: Element,
  weighting: string | undefined,
) {
  const statsContainer = assessmentItem.querySelector(
    `[class*='AssessmentItem__stats___']`,
  ) as HTMLElement;

  if (
    !statsContainer ||
    statsContainer.querySelector(".betterseqta-weight-label")
  )
    return;

  const label = statsContainer.querySelector(
    `[class*='Label__Label___']`,
  ) as HTMLElement;

  if (!label) return;

  const weightLabel = label.cloneNode(true) as HTMLElement;
  weightLabel.classList.add("betterseqta-weight-label");

  const innerTextDiv = weightLabel.querySelector(
    `[class*='Label__innerText___']`,
  );
  if (innerTextDiv) innerTextDiv.textContent = "Weight";

  const textNodes = Array.from(weightLabel.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  );

  if (textNodes.length) {
    textNodes[0].textContent =
      weighting && weighting !== "processing"
        ? `${Number(weighting) % 1 === 0 ? Number(weighting) : weighting}%`
        : "N/A";
  }

  // Stack weight under Max/native stats — absolute right:0 overlapped the max column (#414).
  statsContainer.style.display = "flex";
  statsContainer.style.flexDirection = "column";
  statsContainer.style.alignItems = "flex-end";
  statsContainer.style.gap = "2px";
  statsContainer.style.justifyContent = "center";

  weightLabel.style.position = "relative";
  weightLabel.style.inset = "unset";
  weightLabel.style.transform = "none";

  statsContainer.appendChild(weightLabel);
}

async function fetchPDFAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const isBlobUrl = url.startsWith("blob:");

  if (isBlobUrl || detectFirefox()) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const requestId = `pdf-fetch-${Date.now()}-${Math.random()}`;
      const escapedUrl = escJsSingleQuoted(url);

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
              }, '*');
            })
            .catch(error => {
              window.postMessage({
                type: '${requestId}',
                success: false,
                error: error.message || String(error)
              }, '*');
            });
        })();
      `;

      const messageHandler = (event: MessageEvent) => {
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
    if (detectFirefox()) {
      const { lib: pdfLibUrl, worker: pdfWorkerUrl } = getPdfjsPageContextUrls();
      const pdfLibInj = escJsSingleQuoted(pdfLibUrl);
      const pdfWorkerInj = escJsSingleQuoted(pdfWorkerUrl);

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const requestId = `pdf-extract-${Date.now()}-${Math.random()}`;

        const escapedUrl = escJsInlineUrl(url);

        script.textContent = `
          (function() {
            const requestId = '${requestId}';
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
                }, '*');
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
                    }, '*');
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
                        }, '*');
                      })
                      .catch(error => {
                        window.postMessage({
                          type: requestId,
                          success: false,
                          error: 'PDF parsing error: ' + (error.message || String(error))
                        }, '*');
                      });
                  } catch (error) {
                    window.postMessage({
                      type: requestId,
                      success: false,
                      error: 'ArrayBuffer error: ' + (error.message || String(error))
                    }, '*');
                  }
                };
                
                xhr.onerror = function() {
                  window.postMessage({
                    type: requestId,
                    success: false,
                    error: 'Network error fetching PDF'
                  }, '*');
                };
                
                xhr.ontimeout = function() {
                  window.postMessage({
                    type: requestId,
                    success: false,
                    error: 'Timeout fetching PDF'
                  }, '*');
                };
                
                xhr.timeout = 30000;
                xhr.send();
              } catch (error) {
                window.postMessage({
                  type: requestId,
                  success: false,
                  error: 'Setup error: ' + (error.message || String(error))
                }, '*');
              }
            }
          })();
        `;

        const messageHandler = (event: MessageEvent) => {
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
  const assessmentID = mark.id;
  const metaclassID = mark.metaclassID;
  const userInfo = await getUserInfo();
  const userID = userInfo.id;
  const title = mark.title;

  if (
    api.storage.weightings[assessmentID] != undefined &&
    api.storage.weightings[assessmentID] !== "processing"
  ) {
    return;
  }

  api.storage.weightings = {
    ...api.storage.weightings,
    [assessmentID]: "processing",
  };

  api.storage.assessments = {
    ...api.storage.assessments,
    [title.trim()]: assessmentID,
  };

  try {
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

    const pdfUrl = `${location.origin}/seqta/student/report/get?file=${filename}`;

    if (pdfUrl.startsWith("blob:")) {
      throw new Error(`Cannot fetch blob URL from extension: ${pdfUrl}`);
    }

    let text: string;
    try {
      text = await extractPDFText(pdfUrl);
    } catch (error: any) {
      if (
        detectFirefox() &&
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

    let weight: string | undefined;
    if (isBetterseqtaWasmReady()) {
      try {
        weight = extractWeightFromPdfText(text);
      } catch {
        weight = undefined;
      }
    }
    if (weight === undefined) {
      const match = text.match(/weight:\s*(\d+\.?\d*)/i);
      weight = match ? match[1] : undefined;
    }

    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: weight ?? "N/A",
    };
  } catch (error: any) {
    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: "N/A",
    };
  }
}

export async function parseAssessments(api: any) {
  const state = await ReactFiber.find(
    "[class*='AssessmentList__items___']",
  ).getState();

  const marks = state["marks"];
  if (!marks) return;

  await Promise.all(marks.map((mark: any) => handleWeightings(mark, api)));
}

export async function processAssessments(api: any, assessmentItems: Element[]) {
  let weightedTotal = 0;
  let totalWeight = 0;
  let hasInaccurateWeighting = false;
  let count = 0;

  for (const assessmentItem of assessmentItems) {
    const gradeElement = assessmentItem.querySelector(
      `[class*='Thermoscore__text___']`,
    );

    if (!gradeElement) continue;

    const grade = parseGrade(gradeElement.textContent || "");
    if (grade <= 0) continue;

    const titleEl = assessmentItem.querySelector(
      `[class*='AssessmentItem__title___']`,
    );
    if (!titleEl) continue;

    const title = titleEl.textContent?.trim();
    if (!title) continue;

    const assessmentID = api.storage.assessments?.[title];
    const weighting = assessmentID
      ? api.storage.weightings?.[assessmentID]
      : undefined;

    createWeightLabel(assessmentItem, weighting);

    if (
      weighting === null ||
      weighting === undefined ||
      weighting === "N/A" ||
      weighting === "processing"
    ) {
      hasInaccurateWeighting = true;
      weightedTotal += grade;
      totalWeight += 1;
    } else {
      const weight = parseFloat(weighting);

      if (!isNaN(weight) && weight >= 0) {
        weightedTotal += grade * weight;
        totalWeight += weight;
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
    count,
  };
}
