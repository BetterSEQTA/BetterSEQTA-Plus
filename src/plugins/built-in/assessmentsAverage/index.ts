import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";
import { type Plugin } from "@/plugins/core/types";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForElm } from "@/seqta/utils/waitForElm";
import ReactFiber from "@/seqta/utils/ReactFiber.ts";
import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements.ts";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.mjs";

// Storage
interface weightingsStorage {
  weightings: Record<string, string>;
}

const settings = defineSettings({
  lettergrade: booleanSetting({
    default: false,
    title: "Letter Grades",
    description: "Display the average as a letter instead of a percentage",
  }),
});

class AssessmentsAveragePluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.lettergrade)
  lettergrade!: boolean;
}

const instance = new AssessmentsAveragePluginClass();

const assessmentsAveragePlugin: Plugin<typeof settings, weightingsStorage> = {
  id: "assessments-average",
  name: "Assessment Averages",
  description: "Adds an average grade to the Assessments page",
  version: "1.0.0",
  disableToggle: true,
  settings: instance.settings,

  run: async (api) => {
    await api.storage.loaded;

    if (!api.storage.weightings) {
      api.storage.weightings = {};
    }

    // Clear any stuck "processing" states so they can retry
    let hasStuckProcessing = false;
    for (const key in api.storage.weightings) {
      if (api.storage.weightings[key] === "processing") {
        delete api.storage.weightings[key];
        hasStuckProcessing = true;
      }
    }
    if (hasStuckProcessing) {
      // Force update storage
      api.storage.weightings = { ...api.storage.weightings };
    }

    // Expose globally for easy access in console: window.BetterSEQTAWeightings
    (window as any).BetterSEQTAWeightings = api.storage.weightings;
    
    // Keep it updated when weightings change
    api.storage.onChange('weightings', (newWeightings) => {
      (window as any).BetterSEQTAWeightings = newWeightings;
    });

    api.seqta.onMount(".assessmentsWrapper", async () => {
      await waitForElm(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentItem__AssessmentItem___']",
        true,
        10,
        1000,
      );

      await parseAssessments(api);

      // Helper function to find actual class names by their base pattern
      const getClassByPattern = (
        element: Element | Document,
        basePattern: string,
      ): string => {
        // Find all classes on the element
        const classes = Array.from(element.querySelectorAll("*"))
          .flatMap((el) => Array.from(el.classList))
          .filter((className) => className.startsWith(basePattern));

        return classes.length ? classes[0] : "";
      };

      // Find actual class names from the DOM
      const sampleAssessmentItem = document.querySelector(
        "[class*='AssessmentItem__AssessmentItem___']",
      );
      if (!sampleAssessmentItem) return;

      // Extract all necessary class patterns from a sample assessment item
      const assessmentItemClass =
        Array.from(sampleAssessmentItem.classList).find((c) =>
          c.startsWith("AssessmentItem__AssessmentItem___"),
        ) || "";

      const metaContainerClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__metaContainer___",
      );
      const metaClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__meta___",
      );
      const simpleResultClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__simpleResult___",
      );
      const titleClass = getClassByPattern(
        sampleAssessmentItem,
        "AssessmentItem__title___",
      );

      // Get Thermoscore classes
      const thermoscoreElement = document.querySelector(
        "[class*='Thermoscore__Thermoscore___']",
      );
      if (!thermoscoreElement) return;

      const thermoscoreClass =
        Array.from(thermoscoreElement.classList).find((c) =>
          c.startsWith("Thermoscore__Thermoscore___"),
        ) || "";
      const fillClass = getClassByPattern(
        thermoscoreElement,
        "Thermoscore__fill___",
      );
      const textClass = getClassByPattern(
        thermoscoreElement,
        "Thermoscore__text___",
      );

      // Find assessment list
      const assessmentsList = document.querySelector(
        "#main > .assessmentsWrapper .assessments [class*='AssessmentList__items___']",
      );
      if (!assessmentsList) return;

      // Get marks from React state to match with DOM elements
      const state = await ReactFiber.find(
        "[class*='AssessmentList__items___']",
      ).getState();
      const marks = state["marks"];
      if (!marks || !marks.length) return;

      // Parse and average grades
      const letterToNumber: Record<string, number> = {
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

      // Get all assessment items (excluding the average we might have added)
      const assessmentItems = Array.from(
        assessmentsList.querySelectorAll(`[class*='AssessmentItem__AssessmentItem___']`),
      ).filter(
        (item) =>
          !item.querySelector(`[class*='AssessmentItem__title___']`)?.textContent?.includes("Subject Average"),
      );

      // Match marks to assessment items and calculate weighted average
      let weightedTotal = 0;
      let totalWeight = 0;
      let hasInaccurateWeighting = false;
      let count = 0;

      for (let i = 0; i < marks.length && i < assessmentItems.length; i++) {
        const mark = marks[i];
        const assessmentItem = assessmentItems[i];
        const gradeElement = assessmentItem.querySelector(
          `[class*='Thermoscore__text___']`,
        );

        if (!gradeElement) continue;

        const grade = parseGrade(gradeElement.textContent || "");
        if (grade <= 0) continue;

        const assessmentID = String(mark.id);
        const weighting = api.storage.weightings[assessmentID];

        // Check if weighting is unavailable or still processing
        if (!weighting || weighting === "N/A" || weighting === "processing") {
          hasInaccurateWeighting = true;
          // Fall back to equal weighting if unavailable
          weightedTotal += grade;
          totalWeight += 1;
        } else {
          const weight = parseFloat(weighting);
          if (!isNaN(weight) && weight > 0) {
            weightedTotal += grade * weight;
            totalWeight += weight;
          } else {
            // Invalid weight, use equal weighting
            weightedTotal += grade;
            totalWeight += 1;
            hasInaccurateWeighting = true;
          }
        }
        count++;
      }

      if (!count || totalWeight === 0) return;

      const avg = weightedTotal / totalWeight;
      const rounded = Math.ceil(avg / 5) * 5;
      const numberToLetter = Object.entries(letterToNumber).reduce(
        (acc, [k, v]) => {
          acc[v] = k;
          return acc;
        },
        {} as Record<number, string>,
      );

      const letterAvg = numberToLetter[rounded] ?? "N/A";
      const display = api.settings.lettergrade
        ? letterAvg
        : `${avg.toFixed(2)}%`;

      // Prevent duplicate
      const existing = assessmentsList.querySelector(
        `[class*='AssessmentItem__title___']`,
      );
      if (existing?.textContent === "Subject Average") return;

      // Build warning message if needed
      let warningHTML = "";
      if (hasInaccurateWeighting) {
        warningHTML = /* html */ `
          <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.6); opacity: 0.8; line-height: 1.3;">
            ⚠ Some weightings unavailable
          </div>
        `;
      }

      // Use the dynamic class names in the HTML template
      const averageElement = stringToHTML(/* html */ `
        <div class="${assessmentItemClass}">
          <div class="${metaContainerClass}">
            <div class="${metaClass}">
              <div class="${simpleResultClass}">
                <div class="${titleClass}">Subject Average</div>
                ${warningHTML}
              </div>
            </div>
          </div>
          <div class="${thermoscoreClass}">
            <div class="${fillClass}" style="width: ${avg.toFixed(2)}%">
              <div class="${textClass}" title="${hasInaccurateWeighting ? display + ' (some weightings unavailable)' : display}">${display}</div>
            </div>
          </div>
        </div>
      `).firstChild;

      assessmentsList.insertBefore(averageElement!, assessmentsList.firstChild);
    });
  },
};

// Detect Firefox (has stricter CSP for blob URLs)
// Use userAgent instead of deprecated InstallTrigger
const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1 &&
                  !navigator.userAgent.toLowerCase().includes('seamonkey') &&
                  !navigator.userAgent.toLowerCase().includes('waterfox');

async function fetchPDFAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  // Detect if URL is a blob URL
  const isBlobUrl = url.startsWith('blob:');
  
  // For Firefox, ALWAYS use page context to avoid any CSP issues
  // For blob URLs in any browser, use page context
  if (isBlobUrl || isFirefox) {
    return new Promise((resolve, reject) => {
      // Inject script into page context to fetch (bypasses Firefox CSP restrictions)
      const script = document.createElement('script');
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
          window.removeEventListener('message', messageHandler);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          
          if (event.data.success) {
            // Convert back to ArrayBuffer
            const uint8Array = new Uint8Array(event.data.data);
            resolve(uint8Array.buffer);
          } else {
            reject(new Error(event.data.error || 'Failed to fetch PDF'));
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      (document.head || document.documentElement).appendChild(script);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error('Timeout fetching PDF'));
      }, 30000);
    });
  } else {
    // Regular URL - fetch normally, but check if response URL becomes blob
    try {
      const response = await fetch(url, {
        credentials: 'include',
        redirect: 'follow',
      });
      
      // Check if response URL is a blob URL (server might redirect to blob)
      if (response.url && response.url.startsWith('blob:')) {
        // Re-fetch using page context
        return await fetchPDFAsArrayBuffer(response.url);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      return await response.arrayBuffer();
    } catch (error: any) {
      // If error mentions blob or security, try using page context
      if (error?.message?.includes('blob') || error?.message?.includes('Security') || error?.message?.includes('CSP')) {
        // Force use page context
        return await fetchPDFAsArrayBuffer(url);
      }
      throw error;
    }
  }
}

async function extractPDFText(url: string): Promise<string> {
  // For Firefox, do everything in page context to avoid blob URL CSP issues
  if (isFirefox) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const requestId = `pdf-extract-${Date.now()}-${Math.random()}`;
      
      // Escape URL for use in script (handle both single and double quotes)
      const escapedUrl = url.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
      
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
            pdfjsScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.mjs';
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
          window.removeEventListener('message', messageHandler);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          
          if (event.data.success) {
            resolve(event.data.text);
          } else {
            reject(new Error(event.data.error || 'Failed to extract PDF text'));
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      (document.head || document.documentElement).appendChild(script);
      
      // Timeout after 60 seconds (PDF parsing can take time)
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error('Timeout extracting PDF text'));
      }, 60000);
    });
  } else {
    // Chrome - use extension context
    try {
      const arrayBuffer = await fetchPDFAsArrayBuffer(url);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF response is empty');
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
      throw error;
    }
  }
}

async function handleWeightings(mark: any, api: any) {
  const assessmentID = mark.id;
  const metaclassID = mark.metaclassID;
  const userInfo = await getUserInfo();
  const userID = userInfo.id;
  
  // Skip if already processed (not "processing")
  if (api.storage.weightings[assessmentID] != undefined && api.storage.weightings[assessmentID] !== "processing") {
    return;
  }

  // Set to processing
  api.storage.weightings = {
    ...api.storage.weightings,
    [assessmentID]: "processing",
  };

  try {
    const filename =
      "BetterSEQTA-" + String(Math.floor(Math.random() * 1e15)).padStart(15, "0");

    const printResponse = await fetch(`${location.origin}/seqta/student/print/assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: 'include',
      body: JSON.stringify({
        fileName: filename,
        id: assessmentID,
        metaclass: metaclassID,
        student: userID,
      }),
    });

    if (!printResponse.ok) {
      throw new Error(`Failed to generate PDF: ${printResponse.status} ${printResponse.statusText}`);
    }

    // Wait a bit for the PDF to be generated
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfUrl = `${location.origin}/seqta/student/report/get?file=${filename}`;
    
    // Check if URL is a blob URL (which extensions can't access)
    if (pdfUrl.startsWith('blob:')) {
      throw new Error(`Cannot fetch blob URL from extension: ${pdfUrl}`);
    }
    
    let text: string;
    try {
      // For Firefox, extractPDFText already handles everything in page context
      // For Chrome, it uses extension context
      text = await extractPDFText(pdfUrl);
    } catch (error: any) {
      // Handle CSP errors or other fetch issues
      // Suppress Firefox blob URL CSP errors (they're warnings, not fatal)
      if (isFirefox && (error?.message?.includes('blob') || error?.message?.includes('Security') || error?.message?.includes('CSP'))) {
        // Try one more time with a longer delay in case PDF wasn't ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          text = await extractPDFText(pdfUrl);
        } catch (retryError: any) {
          throw new Error(`PDF extraction failed after retry: ${retryError.message}`);
        }
      } else {
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
    }

    // Use regex to find the line "Assessment weight: X"
    const match = text.match(/Assessment weight:\s*(\d+\.?\d*)/i);
    const weight = match ? match[1] : "N/A";

    // Save it to storage
    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: weight,
    };
  } catch (error: any) {
    // Catch any error and set to N/A instead of leaving as "processing"
    api.storage.weightings = {
      ...api.storage.weightings,
      [assessmentID]: "N/A",
    };
  }
}

async function parseAssessments(api: any) {
  const state = await ReactFiber.find(
    "[class*='AssessmentList__items___']",
  ).getState();

  const marks = state["marks"];
  if (!marks) return;

  for (const mark of marks) {
    await handleWeightings(mark, api);
  }
}

export default assessmentsAveragePlugin;
