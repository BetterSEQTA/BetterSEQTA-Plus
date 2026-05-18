import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements.ts";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import {
  ensurePdfjsWorker,
  getPdfjsPageContextUrls,
} from "@/lib/pdfjsExtension.ts";
import * as pdfjs from "pdfjs-dist";

ensurePdfjsWorker();

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

function createWeightLabel(
  assessmentItem: Element,
  weighting: string | undefined,
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

  const displayText =
    weighting && weighting !== "processing" && weighting !== "N/A"
      ? `${Number(weighting) % 1 === 0 ? Number(weighting) : weighting}%`
      : "N/A";

  const existingLabel = statsContainer.querySelector(
    ".betterseqta-weight-label",
  ) as HTMLElement | null;

  if (existingLabel) {
    const textNodes = Array.from(existingLabel.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    if (textNodes.length) textNodes[0].textContent = displayText;
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

  const textNodes = Array.from(weightLabel.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  );
  if (textNodes.length) {
    textNodes[0].textContent = displayText;
  } else {
    weightLabel.appendChild(document.createTextNode(displayText));
  }

  statsContainer.appendChild(weightLabel);
}

export const isFirefox =
  navigator.userAgent.toLowerCase().indexOf("firefox") > -1 &&
  !navigator.userAgent.toLowerCase().includes("seamonkey") &&
  !navigator.userAgent.toLowerCase().includes("waterfox");

async function fetchPDFAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const isBlobUrl = url.startsWith("blob:");

  if (isBlobUrl || isFirefox) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const requestId = `pdf-fetch-${Date.now()}-${Math.random()}`;
      const escapedUrl = url.replace(/'/g, "\\'");

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
    if (isFirefox) {
      const { lib: pdfLibUrl, worker: pdfWorkerUrl } =
        getPdfjsPageContextUrls();
      const escJsSingleQuoted = (s: string) =>
        s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const pdfLibInj = escJsSingleQuoted(pdfLibUrl);
      const pdfWorkerInj = escJsSingleQuoted(pdfWorkerUrl);

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const requestId = `pdf-extract-${Date.now()}-${Math.random()}`;

        const escapedUrl = url
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"');

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
      [assessmentID]: match ? match[1] : "N/A",
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
  let count = 0;

  for (const assessmentItem of assessmentItems) {
    const titleEl = assessmentItem.querySelector(
      `[class*='AssessmentItem__title___']`,
    );
    if (!titleEl) continue;

    const title = titleEl.textContent?.trim();
    if (!title) continue;

    const assessmentID = api.storage.assessments?.[title];
    const autoWeighting = assessmentID
      ? api.storage.weightings?.[assessmentID]
      : undefined;
    const override = assessmentID
      ? api.storage.weightingOverrides?.[assessmentID]
      : undefined;
    const weighting = override ?? autoWeighting;

    createWeightLabel(assessmentItem, weighting);

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

function buildWeightingsTabContent(api: any, sheet: HTMLElement) {
  const titleEl = document.querySelector(
    "[class*='AssessmentItem__AssessmentItem___'][class*='selected___'] [class*='AssessmentItem__title___']",
  );
  const title = titleEl?.textContent?.trim();
  const assessmentID = title ? api.storage.assessments?.[title] : undefined;

  const rawWeight = assessmentID
    ? api.storage.weightings?.[assessmentID]
    : undefined;

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
        <label for="betterseqta-weight-override" style="font-size:13px;opacity:0.7;flex-shrink:0">Override %</label>
        <input
          id="betterseqta-weight-override"
          type="number"
          min="0"
          step="5"
          placeholder="${autoWeight ?? ""}"
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

  if (!assessmentID) return;

  const input = sheet.querySelector(
    "#betterseqta-weight-override",
  ) as HTMLInputElement;
  const statusEl = sheet.querySelector(
    ".betterseqta-save-status",
  ) as HTMLElement;

  const save = () => {
    const raw = input.value.trim();
    if (raw === "") {
      const { [assessmentID]: _, ...rest } = api.storage.weightingOverrides;
      api.storage.weightingOverrides = rest;
    } else {
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) {
        input.style.borderColor = "rgba(255,80,80,0.6)";
        statusEl.textContent = "Invalid. Must be 0 or greater";
        statusEl.style.color = "rgba(255,80,80,0.8)";
        return;
      }
      input.style.borderColor = "rgba(128,128,128,0.3)";
      api.storage.weightingOverrides = {
        ...api.storage.weightingOverrides,
        [assessmentID]: String(val),
      };
    }
    statusEl.textContent = "Saved";
    statusEl.style.color = "";
    setTimeout(() => (statusEl.textContent = ""), 2000);
    document.dispatchEvent(new CustomEvent("betterseqta:overrideChanged"));
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

  let populated = false;
  newTab.addEventListener("click", () => {
    if (!populated) {
      buildWeightingsTabContent(api, newSheet);
      populated = true;
    }
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
      const goingRight = i > currentIndex;

      allTabs.forEach((t) => {
        t.className = "";
        t.setAttribute("aria-selected", "false");
      });

      allSheets[currentIndex].className = [
        cls["TabSet__tabsheet___"],
        cls["TabSet__hidden___"],
        goingRight
          ? cls["TabSet__disappearToLeft___"]
          : cls["TabSet__disappearToRight___"],
      ].join(" ");

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
