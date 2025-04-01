import Fuse, { type FuseResult } from 'fuse.js';
import { getStaticCommands, type StaticCommandItem } from './commands';
import { getAllDynamicItems, type DynamicContentItem } from './dynamicSearch';
import type { CombinedResult } from './types';

export function prepareDynamicItems(items: DynamicContentItem[]): DynamicContentItem[] {
  return items.map(item => {
    const preparedItem = { ...item };
    
    // @ts-ignore
    preparedItem.allContent = [
      item.text,
      item.content,
      item.category,
      item.keywords?.join(' ') || '',
      ...Object.values(item.metadata || {})
        .filter(value => typeof value === 'string')
    ].filter(Boolean).join(' ');
    
    return preparedItem;
  });
}

export function createSearchIndexes() {
  const commands = getStaticCommands();
  const dynamicItems = prepareDynamicItems(getAllDynamicItems());
  
  const commandOptions = {
    keys: ['text', 'category', 'keywords'],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
    ignoreLocation: true,
    useExtendedSearch: true
  };
  
  const dynamicOptions = {
    keys: [
      'text', 
      'content', 
      'category', 
      'keywords',
      'allContent'
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
    ignoreLocation: true,
    useExtendedSearch: true
  };
  
  return {
    commandsFuse: new Fuse(commands, commandOptions) as Fuse<StaticCommandItem>,
    dynamicContentFuse: new Fuse(dynamicItems, dynamicOptions) as Fuse<DynamicContentItem>,
    commands,
    dynamicItems
  };
}

export function searchCommands(
  commandsFuse: Fuse<StaticCommandItem>,
  query: string, 
  commandIdToItemMap: Map<string, StaticCommandItem>,
  limit = 10
): CombinedResult[] {
  if (!commandsFuse) return [];
  
  if (!query.trim()) {
    return Array.from(commandIdToItemMap.values())
      .map(item => ({
        id: item.id,
        type: 'command' as const,
        score: 100 + (item.priority ?? 0),
        item
      }));
  }

  const searchResults = commandsFuse.search(query, { limit });
  
  return searchResults.map((result: FuseResult<StaticCommandItem>) => {
    const item = result.item;
    const fuseScore = 15 * (1 - (result.score || 0.5));
    const score = fuseScore + (item.priority ?? 0);
    
    return {
      id: item.id,
      type: 'command' as const,
      score,
      item,
      matches: result.matches
    };
  });
}

export function searchDynamicItems(
  dynamicContentFuse: Fuse<DynamicContentItem>,
  query: string, 
  dynamicIdToItemMap: Map<string, DynamicContentItem>,
  limit = 10
): CombinedResult[] {
  if (!dynamicContentFuse) return [];
  
  if (!query.trim()) {
    return Array.from(dynamicIdToItemMap.values())
      .sort((a, b) => b.dateAdded - a.dateAdded)
      .slice(0, limit)
      .map(item => ({
        id: item.id,
        type: 'dynamic' as const,
        score: 80,
        item
      }));
  }

  const now = Date.now();
  const searchResults = dynamicContentFuse.search(query, { limit });
  
  return searchResults.map((result: FuseResult<DynamicContentItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5));
    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
    const recencyBoost = 1 / (ageInDays + 1);
    const score = fuseScore + recencyBoost + (item.priority ?? 0);
    
    return {
      id: item.id,
      type: 'dynamic' as const,
      score,
      item,
      matches: result.matches
    };
  });
}

export function performSearch(
  query: string, 
  commandsFuse: Fuse<StaticCommandItem>,
  dynamicContentFuse: Fuse<DynamicContentItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  dynamicIdToItemMap: Map<string, DynamicContentItem>
): CombinedResult[] {
  const commandResults = searchCommands(commandsFuse, query, commandIdToItemMap);
  const dynamicResults = searchDynamicItems(dynamicContentFuse, query, dynamicIdToItemMap);

  const results = [...commandResults, ...dynamicResults];
  results.sort((a, b) => b.score - a.score);
  
  return results;
} 