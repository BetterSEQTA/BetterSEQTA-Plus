export interface DynamicContentItem {
  id: string; 
  text: string;
  category: string;
  icon: string;
  action: () => void;
  keywords?: string[];
  contentType: 'message' | 'course' | 'assessment' | 'other';
  content: string;
  dateAdded: number;
  metadata?: Record<string, any>;
  priority?: number; 
}

let dynamicItems: DynamicContentItem[] = [];

/**
 * Loads a new set of dynamic items.
 */
export const loadDynamicItems = (items: DynamicContentItem[]) => {
  dynamicItems = [...items];
  console.log(`Loaded ${items.length} dynamic items.`);
};

/**
 * Returns all currently loaded dynamic items.
 */
export const getAllDynamicItems = (): DynamicContentItem[] => {
  return [...dynamicItems];
};