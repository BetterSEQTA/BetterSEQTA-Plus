import { validateStoredRecipes } from "./recipeSchema";
import {
  applyModStyleProperty,
  restoreModStyleProperty,
} from "./modStyle";
import type { ModOperation, StoredModRecipe } from "./types";
type Cleanup = () => void;

function targetsFor(
  root: HTMLElement,
  selector: string,
): HTMLElement[] {
  if (selector === ":scope") return [root];
  try {
    return [...root.querySelectorAll<HTMLElement>(selector)];
  } catch {
    return [];
  }
}

function applyOperation(
  root: HTMLElement,
  operation: ModOperation,
  modId: string,
): Cleanup[] {
  const cleanups: Cleanup[] = [];
  for (const element of targetsFor(root, operation.selector)) {
    switch (operation.type) {
      case "setText":
      case "replaceText": {
        const previous = element.textContent;
        if (operation.type === "setText") {
          element.textContent = operation.text;
        } else if (operation.all) {
          element.textContent = (previous ?? "").split(operation.search).join(
            operation.replacement,
          );
        } else {
          element.textContent = (previous ?? "").replace(
            operation.search,
            operation.replacement,
          );
        }
        cleanups.push(() => {
          element.textContent = previous;
        });
        break;
      }
      case "setAttribute": {
        const hadAttribute = element.hasAttribute(operation.name);
        const previous = element.getAttribute(operation.name);
        element.setAttribute(operation.name, operation.value);
        cleanups.push(() => {
          if (hadAttribute && previous !== null) {
            element.setAttribute(operation.name, previous);
          } else {
            element.removeAttribute(operation.name);
          }
        });
        break;
      }
      case "setStyle": {
        const important = operation.important !== false;
        const snapshot = applyModStyleProperty(
          element,
          operation.property,
          operation.value,
          important,
        );
        cleanups.push(() => {
          restoreModStyleProperty(element, operation.property, snapshot);
        });
        break;
      }
      case "addClass":
      case "removeClass": {
        const hadClass = element.classList.contains(operation.className);
        element.classList.toggle(
          operation.className,
          operation.type === "addClass",
        );
        cleanups.push(() => {
          element.classList.toggle(operation.className, hadClass);
        });
        break;
      }
      case "hide":
      case "show": {
        const previous = element.style.getPropertyValue("display");
        const priority = element.style.getPropertyPriority("display");
        if (operation.type === "hide") {
          element.style.setProperty("display", "none", "important");
        } else {
          element.style.removeProperty("display");
        }
        cleanups.push(() => {
          if (previous) {
            element.style.setProperty("display", previous, priority);
          } else {
            element.style.removeProperty("display");
          }
        });
        break;
      }
      case "insertText": {
        if (
          element === root &&
          (operation.position === "before" || operation.position === "after")
        ) {
          break;
        }
        const inserted = document.createElement(operation.tag);
        inserted.textContent = operation.text;
        inserted.dataset.bsplusAiMod = modId;
        if (operation.className) inserted.classList.add(operation.className);
        if (operation.position === "before") {
          element.before(inserted);
        } else if (operation.position === "after") {
          element.after(inserted);
        } else if (operation.position === "prepend") {
          element.prepend(inserted);
        } else {
          element.append(inserted);
        }
        cleanups.push(() => inserted.remove());
        break;
      }
    }
  }
  return cleanups;
}

export function applyModRecipe(
  input: StoredModRecipe,
  documentRef: Document = document,
): Cleanup {
  const [recipe] = validateStoredRecipes([input]);
  let root: HTMLElement | null = null;
  try {
    root = documentRef.querySelector<HTMLElement>(recipe.rootSelector);
  } catch {
    return () => {};
  }
  if (!root) return () => {};

  const cleanups = recipe.operations.flatMap((operation) =>
    applyOperation(root!, operation, recipe.id),
  );
  return () => {
    for (const cleanup of [...cleanups].reverse()) cleanup();
  };
}

export class ModRuntime {
  private recipes: StoredModRecipe[] = [];
  private cleanups: Cleanup[] = [];
  private observer: MutationObserver | null = null;
  private reconcileTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly documentRef: Document = document,
    private readonly getRoute: () => string = () => {
      const route = window.location.hash.split("?page=/")[1] ?? "";
      return route.split(/[/?#]/)[0];
    },
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.observer = new MutationObserver(() => this.scheduleReconcile());
    this.observe();
    window.addEventListener("hashchange", this.handleRouteChange);
    this.reconcile();
  }

  setRecipes(input: StoredModRecipe | StoredModRecipe[]): void {
    this.recipes = validateStoredRecipes(
      Array.isArray(input) ? input : [input],
    );
    if (this.running) this.reconcile();
  }

  stop(): void {
    this.running = false;
    if (this.reconcileTimer) clearTimeout(this.reconcileTimer);
    this.reconcileTimer = null;
    this.observer?.disconnect();
    this.observer = null;
    window.removeEventListener("hashchange", this.handleRouteChange);
    this.clearAppliedMods();
  }

  private readonly handleRouteChange = () => this.scheduleReconcile();

  private observe(): void {
    if (!this.observer || !this.documentRef.body) return;
    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });
  }

  private scheduleReconcile(): void {
    if (!this.running || this.reconcileTimer) return;
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = null;
      this.reconcile();
    }, 40);
  }

  private clearAppliedMods(): void {
    for (const cleanup of [...this.cleanups].reverse()) cleanup();
    this.cleanups = [];
  }

  private reconcile(): void {
    if (!this.running) return;
    this.observer?.disconnect();
    this.clearAppliedMods();
    const route = this.getRoute();
    this.cleanups = this.recipes
      .filter((recipe) => recipe.enabled && recipe.route === route)
      .map((recipe) => applyModRecipe(recipe, this.documentRef));
    this.observe();
  }
}
