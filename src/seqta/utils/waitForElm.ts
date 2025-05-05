import { eventManager } from "@/seqta/utils/listeners/EventManager";
import { delay } from "@/seqta/utils/delay";

export async function waitForElm(
  selector: string,
  usePolling: boolean = false,
  interval: number = 100,
  maxIterations?: number,
): Promise<Element> {
  if (usePolling) {
    return new Promise((resolve, reject) => {
      let iterations = 0;
      if (maxIterations) {
        iterations = 0;
      }
      const checkForElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else {
          if (maxIterations) {
            iterations++;
            if (iterations >= maxIterations) {
              reject(new Error("Element not found"));
            }
          }
          setTimeout(checkForElement, interval);
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkForElement);
      } else {
        checkForElement();
      }
    });
  } else {
    return new Promise((resolve) => {
      const registerObserver = () => {
        const { unregister } = eventManager.register(
          `${selector}`,
          {
            customCheck: (element) => element.matches(selector),
          },
          async (element) => {
            resolve(element);
            await delay(1);
            unregister(); // Remove the listener once the element is found
          },
        );
        return unregister;
      };

      let unregister = null;

      if (document.readyState === "loading") {
        // DOM is still loading, wait for it to be ready
        document.addEventListener("DOMContentLoaded", () => {
          unregister = registerObserver();
        });
      } else {
        unregister = registerObserver();
      }

      const querySelector = () => document.querySelector(selector);
      const element = querySelector();

      if (element) {
        if (unregister) unregister();
        resolve(element);
        return;
      }
    });
  }
}
