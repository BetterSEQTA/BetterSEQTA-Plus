interface EventListenerOptions {
  elementType?: string;
  textContent?: string;
  className?: string;
  id?: string;
  customCheck?: (element: Element) => boolean;
  once?: boolean;
  parentElement?: Element;
}

interface EventListener {
  id: string;
  options: EventListenerOptions;
  callback: (element: Element) => void;
  unregister: () => void;
}

class EventManager {
  private static instance: EventManager;
  private listeners: Map<string, EventListener[]> = new Map();
  private mutationObservers: Map<Element, MutationObserver> = new Map();
  private pendingElements: Set<Element> = new Set();
  private throttleTimeout: number = 5; // 5ms throttle
  private throttleTimer: number | undefined;
  private chunkSize: number = 50; // Process 50 elements per chunk

  private constructor() {}

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  public static async initialize(): Promise<EventManager> {
    const instance = EventManager.getInstance();
    await instance.startObserving();
    return instance;
  }

  public register(event: string, options: EventListenerOptions, callback: (element: Element) => void): { unregister: () => void } {
    const id = this.generateUniqueId();
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const unregister = () => this.unregisterById(event, id);
    this.listeners.get(event)!.push({ id, options, callback, unregister });
    
    this.scanExistingElements(options, callback);
    
    this.startObserving(options.parentElement);
    return { unregister };
  }

  private async scanExistingElements(options: EventListenerOptions, callback: (element: Element) => void): Promise<void> {
    const root = options.parentElement || document.documentElement;
    const elements = Array.from(root.getElementsByTagName('*'));
    elements.unshift(root);
    
    for (let i = 0; i < elements.length; i += this.chunkSize) {
      const chunk = elements.slice(i, i + this.chunkSize);
      const filteredChunk = chunk.filter(element => this.matchesOptions(element, options));
      for (const element of filteredChunk) {
        callback(element);
      }
    }
  }

  public unregister(event: string): void {
    if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }

  private unregisterById(event: string, id: string): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event)!;
      this.listeners.set(event, listeners.filter(listener => listener.id !== id));
    }
  }

  private async startObserving(parentElement?: Element): Promise<void> {
    const elementToObserve = parentElement || document.documentElement;
    if (!this.mutationObservers.has(elementToObserve)) {
      const observer = new MutationObserver(this.handleMutations.bind(this));
      observer.observe(elementToObserve, {
        childList: true,
        subtree: true,
      });
      this.mutationObservers.set(elementToObserve, observer);
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.pendingElements.add(node as Element);
          }
        });
      }
    });

    this.throttleCheckElements();
  }

  private throttleCheckElements(): void {
    if (this.throttleTimer) return;

    this.throttleTimer = window.setTimeout(() => {
      this.processPendingElements();
      this.throttleTimer = undefined;
    }, this.throttleTimeout);
  }

  private async processPendingElements(): Promise<void> {
    const elements = Array.from(this.pendingElements);
    this.pendingElements.clear();
    for (let i = 0; i < elements.length; i += this.chunkSize) {
      const chunk = elements.slice(i, i + this.chunkSize);
      await this.processChunk(chunk);
    }
  }

  private async processChunk(chunk: Element[]): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(async () => {
        for (const element of chunk) {
          await this.checkElement(element);
        }
        resolve();
      });
    });
  }

  private async checkElement(element: Element): Promise<void> {
    if (element.classList.contains('code')) console.log('Code Detected!');
    for (const [event, listeners] of this.listeners.entries()) {
      for (const { id, options, callback } of listeners) {
        if (this.matchesOptions(element, options)) {
          await callback(element);
          if (options.once) {
            this.unregisterById(event, id);
          }
        }
      }
    }
  }

  private matchesOptions(element: Element, options: EventListenerOptions): boolean {
    if (options.elementType && element.tagName.toLowerCase() !== options.elementType.toLowerCase()) return false;
    if (options.textContent && element.textContent !== options.textContent) return false;
    if (options.className && !element.classList.contains(options.className)) return false;
    if (options.id && element.id !== options.id) return false;
    if (options.customCheck && !options.customCheck(element)) return false;
    return true;
  }

  private generateUniqueId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const eventManager = EventManager.getInstance();
export const initializeEventManager = async () => await EventManager.initialize();
