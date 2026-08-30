export const AI_MOD_SCHEMA_VERSION = 1 as const;

export type SafeStyleProperty =
  | "align-items"
  | "align-self"
  | "aspect-ratio"
  | "background"
  | "background-color"
  | "border"
  | "border-color"
  | "border-radius"
  | "border-style"
  | "border-width"
  | "bottom"
  | "box-shadow"
  | "color"
  | "cursor"
  | "display"
  | "flex"
  | "flex-direction"
  | "flex-grow"
  | "flex-shrink"
  | "flex-wrap"
  | "font-size"
  | "font-weight"
  | "gap"
  | "grid-template-columns"
  | "height"
  | "justify-content"
  | "left"
  | "letter-spacing"
  | "line-height"
  | "margin"
  | "margin-bottom"
  | "margin-left"
  | "margin-right"
  | "margin-top"
  | "max-height"
  | "max-width"
  | "min-height"
  | "min-width"
  | "object-fit"
  | "opacity"
  | "order"
  | "overflow"
  | "overflow-x"
  | "overflow-y"
  | "padding"
  | "padding-bottom"
  | "padding-left"
  | "padding-right"
  | "padding-top"
  | "position"
  | "right"
  | "text-align"
  | "text-decoration"
  | "top"
  | "vertical-align"
  | "white-space"
  | "width"
  | "z-index";

export type SafeAttributeName =
  | "aria-label"
  | "aria-description"
  | "aria-hidden"
  | "placeholder"
  | "role"
  | "title";

interface OperationBase {
  selector: string;
}

export interface SetTextOperation extends OperationBase {
  type: "setText";
  text: string;
}

export interface ReplaceTextOperation extends OperationBase {
  type: "replaceText";
  search: string;
  replacement: string;
  all?: boolean;
}

export interface SetAttributeOperation extends OperationBase {
  type: "setAttribute";
  name: SafeAttributeName;
  value: string;
}

export interface SetStyleOperation extends OperationBase {
  type: "setStyle";
  property: SafeStyleProperty;
  value: string;
  /** When true (default), beats BetterSEQTA stylesheet rules including !important. */
  important?: boolean;
}

export interface AddClassOperation extends OperationBase {
  type: "addClass";
  className: string;
}

export interface RemoveClassOperation extends OperationBase {
  type: "removeClass";
  className: string;
}

export interface HideOperation extends OperationBase {
  type: "hide";
}

export interface ShowOperation extends OperationBase {
  type: "show";
}

export interface InsertTextOperation extends OperationBase {
  type: "insertText";
  position: "before" | "after" | "prepend" | "append";
  tag: "div" | "span" | "p" | "button" | "label";
  text: string;
  className?: string;
}

export type ModOperation =
  | SetTextOperation
  | ReplaceTextOperation
  | SetAttributeOperation
  | SetStyleOperation
  | AddClassOperation
  | RemoveClassOperation
  | HideOperation
  | ShowOperation
  | InsertTextOperation;

export interface GeneratedModDraft {
  name: string;
  description: string;
  operations: ModOperation[];
  advancedScript?: string;
}

export interface StoredModRecipe extends GeneratedModDraft {
  schemaVersion: typeof AI_MOD_SCHEMA_VERSION;
  id: string;
  enabled: boolean;
  route: string;
  rootSelector: string;
  createdAt: number;
  updatedAt: number;
}

export interface DomElementSummary {
  selector: string;
  tag: string;
  classes: string[];
  directText?: string;
  parentSelector: string | null;
  siblingIndex: number;
  siblingCount: number;
  layout: Record<string, string>;
  rowCount?: number;
  columnCount?: number;
  itemCount?: number;
}

export interface ParentChainSummary {
  tag: string;
  classes: string[];
  layout: Record<string, string>;
}

export interface StructuralHints {
  hasTable: boolean;
  hasList: boolean;
  rowCount?: number;
  columnCount?: number;
  itemCount?: number;
  primaryClasses: string[];
}

export interface SelectedElementContext {
  route: string;
  rootSelector: string;
  request: string;
  userContext: string;
  selectedHtml: string;
  domCatalog: DomElementSummary[];
  ancestorHtml?: string;
  parentChain?: ParentChainSummary[];
  structuralHints?: StructuralHints;
  tagName: string;
  dimensions: {
    width: number;
    height: number;
  };
  computedStyle: Record<string, string>;
}

export interface KeyStatus {
  configured: boolean;
}

export interface ModelSettings {
  modelId: string;
}

export interface AdvancedScriptSupport {
  supported: boolean;
  reason?: string;
  instructions?: string;
}

export interface GenerationProgress {
  type: "status" | "content" | "usage";
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface CreatorServices {
  getKeyStatus: () => Promise<KeyStatus>;
  getModelSettings: () => Promise<ModelSettings>;
  saveModel: (modelId: string) => Promise<void>;
  getAdvancedScriptSupport: () => Promise<AdvancedScriptSupport>;
  openExtensionSettings: () => Promise<void>;
  saveKey: (apiKey: string) => Promise<void>;
  clearKey: () => Promise<void>;
  generate: (
    context: SelectedElementContext,
    onProgress?: (progress: GenerationProgress) => void,
  ) => Promise<GeneratedModDraft>;
  loadMods: () => Promise<StoredModRecipe[]>;
  saveMod: (recipe: StoredModRecipe) => Promise<StoredModRecipe[]>;
  setModEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<StoredModRecipe[]>;
  deleteMod: (id: string) => Promise<StoredModRecipe[]>;
  importMods: (json: string) => Promise<StoredModRecipe[]>;
  exportMods: () => Promise<string>;
  executeAdvancedScript: (recipe: StoredModRecipe) => Promise<void>;
  stopAdvancedScript: (id: string) => Promise<void>;
}
