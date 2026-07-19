/**
 * Asynchronously waits for an element to be present in the DOM.
 *
 * By default uses direct `querySelector` plus a targeted `MutationObserver`
 * on `document.documentElement`. Polling via `setTimeout` is available as a
 * fallback when `usePolling` is true.
 *
 * @param {string} selector The CSS selector for the target element.
 * @param {boolean} [usePolling=false] If true, forces the use of `setTimeout` for polling.
 * @param {number} [interval=100] The polling interval in milliseconds (only applicable if `usePolling` is true).
 * @param {number} [maxIterations] Optional. The maximum number of polling attempts before rejecting (only applicable if `usePolling` is true).
 * @returns {Promise<Element>} A Promise that resolves with the found DOM Element.
 * If `usePolling` is true and `maxIterations` is reached, the Promise rejects with an Error.
 */
export async function waitForElm(
  selector: string,
  usePolling: boolean = false,
  interval: number = 100,
  maxIterations?: number,
): Promise<Element> {
  if (usePolling) {
    return new Promise((resolve, reject) => {
      let iterations = 0;
      const checkForElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else {
          if (maxIterations) {
            iterations++;
            if (iterations >= maxIterations) {
              reject(new Error("Element not found"));
              return;
            }
          }
          setTimeout(checkForElement, interval);
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkForElement, {
          once: true,
        });
      } else {
        checkForElement();
      }
    });
  }

  return new Promise((resolve) => {
    const tryResolve = (): boolean => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return true;
      }
      return false;
    };

    const startObserver = () => {
      if (tryResolve()) return;

      const observer = new MutationObserver(() => {
        if (tryResolve()) {
          observer.disconnect();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startObserver, {
        once: true,
      });
    } else {
      startObserver();
    }
  });
}
