import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements.ts";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.mjs";

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
  // Find all classes on the element
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

export function parseGrade(text: string): number {
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

export function createWeightLabel(assessmentItem: Element, weighting: string | undefined) {
  const statsContainer = assessmentItem.querySelector(
    `[class*='AssessmentItem__stats___']`,
  ) as HTMLElement;

  if (statsContainer) {
    // Only add label if it hasn't been added before
    if (!statsContainer.querySelector(".betterseqta-weight-label")) {
      const label = statsContainer.querySelector(
        `[class*='Label__Label___']`,
      ) as HTMLElement;

      if (label) {
        // Clone average score node
        const weightLabel = label.cloneNode(true) as HTMLElement;

        // Mark as added to prevent duplicates
        weightLabel.classList.add("betterseqta-weight-label");

        const innerTextDiv = weightLabel.querySelector(
          `[class*='Label__innerText___']`,
        );

        // Repurpose for showing weight
        if (innerTextDiv) innerTextDiv.textContent = "Weight";

        const textNodes = Array.from(weightLabel.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE,
        );

        // Set weight value, discarding useless decimals (.0)
        if (textNodes.length) {
          textNodes[0].textContent =
            weighting && weighting !== "processing"
              ? `${Number(weighting) % 1 === 0 ? Number(weighting) : weighting}%`
              : "N/A";
        }

        // Set position opposite to the average score node
        statsContainer.style.position = "relative";
        weightLabel.style.position = "absolute";
        weightLabel.style.right = "0";
        weightLabel.style.top = "50%";
        weightLabel.style.transform = "translateY(-50%)";

        statsContainer.appendChild(weightLabel);
      }
    }
  }
}

// Detect Firefox (has stricter CSP for blob URLs)
// Use userAgent instead of deprecated InstallTrigger
export const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1 &&
  !navigator.userAgent.toLowerCase().includes('seamonkey') &&
  !navigator.userAgent.toLowerCase().includes('waterfox');

async function fetchPDFAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  // Detect if URL is a blob URL
  const isBlobUrl = url.startsWith("blob:");

  // For Firefox, ALWAYS use page context to avoid any CSP issues
  // For blob URLs in any browser, use page context
  if (isBlobUrl || isFirefox) {
    return new Promise((resolve, reject) => {
      // Inject script into page context to fetch (bypasses Firefox CSP restrictions)
      const script = document.createElement("script");
      const requestId = `pdf-fetch-${Date.now()}-${Math.random()}`;

      // Escape URL for use in script
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
            // Convert back to ArrayBuffer
            const uint8Array = new Uint8Array(event.data.data);
            resolve(uint8Array.buffer);
          } else {
            reject(new Error(event.data.error || "Failed to fetch PDF"));
          }
        }
      };

      window.addEventListener("message", messageHandler);
      (document.head || document.documentElement).appendChild(script);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error("Timeout fetching PDF"));
      }, 30000);
    });
  } else {
    // Regular URL - fetch normally, but check if response URL becomes blob
    try {
      const response = await fetch(url, {
        credentials: "include",
        redirect: "follow",
      });

      // Check if response URL is a blob URL (server might redirect to blob)
      if (response.url && response.url.startsWith("blob:")) {
        // Re-fetch using page context
        return await fetchPDFAsArrayBuffer(response.url);
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch PDF: ${response.status} ${response.statusText}`,
        );
      }

      return await response.arrayBuffer();
    } catch (error: any) {
      // If error mentions blob or security, try using page context
      if (
        error?.message?.includes("blob") ||
        error?.message?.includes("Security") ||
        error?.message?.includes("CSP")
      ) {
        // Force use page context
        return await fetchPDFAsArrayBuffer(url);
      }
      throw error;
    }
  }
}

export async function extractPDFText(url: string): Promise<string> {
  // For Firefox, do everything in page context to avoid blob URL CSP issues
  if (isFirefox) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const requestId = `pdf-extract-${Date.now()}-${Math.random()}`;

      // Escape URL for use in script (handle both single and double quotes)
      const escapedUrl = url
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');

      script.textContent = `
        (function() {
          const requestId = '${requestId}';
          const url = '${escapedUrl}';
          
          // Check if pdfjs is already loaded
          if (window.pdfjsLib) {
            extractPDF();
          } else {
            // Load pdfjs in page context
            const pdfjsScript = document.createElement('script');
            pdfjsScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.min.js';
            pdfjsScript.type = 'text/javascript';
            
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
              // Disable worker for Firefox to avoid blob URL CSP issues
              // Set to empty string to disable worker completely
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
              
              // Use XMLHttpRequest instead of fetch for better blob URL handling
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
                    // Explicitly disable worker
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
            reject(new Error(event.data.error || "Failed to extract PDF text"));
          }
        }
      };

      window.addEventListener("message", messageHandler);
      (document.head || document.documentElement).appendChild(script);

      // Timeout after 60 seconds (PDF parsing can take time)
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error("Timeout extracting PDF text"));
      }, 60000);
    });
  } else {
    // Chrome - use extension context
    try {
      const arrayBuffer = await fetchPDFAsArrayBuffer(url);

      if (arrayBuffer.byteLength === 0) {
        throw new Error("PDF response is empty");
      }

      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;

      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      return text;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

async function handleWeightings(mark: any, api: any) {
  const assessmentID = mark.id;
  const metaclassID = mark.metaclassID;
  const userInfo = await getUserInfo();
  const userID = userInfo.id;
  const title = mark.title;

  // Skip if already processed (not "processing")
  if (
    api.storage.weightings[assessmentID] != undefined &&
    api.storage.weightings[assessmentID] !== "processing"
  ) {
    return;
  }

  // Set to processing
  api.storage.weightings = {
    ...api.storage.weightings,
    [assessmentID]: "processing",
  };

  // Correlate assessment title with its ID
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

    // Wait a bit for the PDF to be generated
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfUrl = `${location.origin}/seqta/student/report/get?file=${filename}`;

    // Check if URL is a blob URL (which extensions can't access)
    if (pdfUrl.startsWith("blob:")) {
      throw new Error(`Cannot fetch blob URL from extension: ${pdfUrl}`);
    }

    let text: string;
    try {
      // For Firefox, extractPDFText already handles everything in page context
      // For Chrome, it uses extension context
      text = await extractPDFText(pdfUrl);
    } catch (error: any) {
      if (
        isFirefox &&
        (error?.message?.includes("blob") ||
          error?.message?.includes("Security") ||
          error?.message?.includes("CSP"))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          text = await extractPDFText(pdfUrl);
        } catch (retryError: any) {
          throw new Error(
            `PDF extraction failed after retry: ${retryError.message}`,
          );
        }
      } else {
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
    }

    // Match weighting from extracted text
    const match = text.match(/weight:\s*(\d+\.?\d*)/i);
    const weight = match ? match[1] : "N/A";

    // Store and correlate weight with assessment ID
    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: weight,
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

  // Dispatch for all assessments asynchronously
  await Promise.all(marks.map((mark: any) => handleWeightings(mark, api)));
}
