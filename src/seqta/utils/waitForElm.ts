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
