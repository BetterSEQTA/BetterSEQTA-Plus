import type { FuseResultMatch, MatchIndices } from './types';

export function highlightMatch(
  text: string, 
  term: string, 
  matches?: readonly FuseResultMatch[]
): string {
  if (!term.trim() || !matches || matches.length === 0) return text;
  
  try {
    // Find matches for the text field or allContent that contains the text
    const fieldMatches = matches.find(match => 
      match.key === 'text' || 
      (match.key === 'allContent' && match.value?.includes(text))
    );
    
    if (!fieldMatches || !fieldMatches.indices || fieldMatches.indices.length === 0) {
      return text;
    }
    
    // Create a map of character positions to mark which ones need highlighting
    const highlightMap = new Array(text.length).fill(false);
    
    fieldMatches.indices.forEach((indices: MatchIndices) => {
      const start = indices[0];
      const end = indices[1];
      
      if (fieldMatches.key === 'allContent') {
        // Find where our text appears in the allContent
        const allContent = fieldMatches.value;
        const textPos = allContent?.indexOf(text) ?? -1;
        
        // Only highlight if the match overlaps with our text
        if (textPos >= 0) {
          // Adjust start and end to be relative to our text field
          const relStart = start - textPos;
          const relEnd = end - textPos;
          
          // Only highlight if the match actually overlaps with our text field
          if (relEnd >= 0 && relStart < text.length) {
            // Mark the overlapping characters
            for (let i = Math.max(0, relStart); i <= Math.min(text.length - 1, relEnd); i++) {
              highlightMap[i] = true;
            }
          }
        }
      } else {
        // Regular text field match - ensure indices are within bounds
        if (start >= 0 && end < text.length) {
          for (let i = start; i <= end; i++) {
            highlightMap[i] = true;
          }
        }
      }
    });
    
    let result = '';
    let inHighlight = false;
    
    for (let i = 0; i < text.length; i++) {
      if (highlightMap[i] && !inHighlight) {
        result += '<span class="highlight">';
        inHighlight = true;
      } else if (!highlightMap[i] && inHighlight) {
        result += '</span>';
        inHighlight = false;
      }
      
      result += text.charAt(i);
    }
    
    if (inHighlight) {
      result += '</span>';
    }
    
    return result;
  } catch (e) {
    console.error('Error highlighting match:', e);
    return text;
  }
}

// Function to extract and highlight content snippet using Fuse matches
export function highlightSnippet(
  content: string, 
  term: string, 
  matches?: readonly FuseResultMatch[]
): string {
  if (!content || !term.trim() || !matches || matches.length === 0) return content;
  
  try {
    // Find matches for content field or allContent that contains the content
    const contentMatches = matches.find(match => 
      match.key === 'content' || 
      (match.key === 'allContent' && match.value?.includes(content))
    );
    
    if (!contentMatches || !contentMatches.indices || contentMatches.indices.length === 0) {
      // No content matches, return plain content
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }
    
    // Find the match indices
    let allIndices: MatchIndices[] = contentMatches.indices as MatchIndices[];
    
    // If matching against allContent, adjust indices to be relative to content
    if (contentMatches.key === 'allContent') {
      const allContent = contentMatches.value;
      const contentPos = allContent?.indexOf(content) ?? -1;
      
      if (contentPos >= 0) {
        // Adjust indices to be relative to the content field
        allIndices = allIndices
          .map(indices => [indices[0] - contentPos, indices[1] - contentPos] as MatchIndices)
          .filter(indices => indices[1] >= 0 && indices[0] < content.length);
      }
    }
    
    if (allIndices.length === 0) {
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }
    
    // Find a good center point for our snippet (average of first match)
    const firstMatch = allIndices[0];
    const matchCenter = Math.floor((firstMatch[0] + firstMatch[1]) / 2);
    
    // Extract a window around the match
    const windowSize = 100;
    const start = Math.max(0, matchCenter - windowSize / 2);
    const end = Math.min(content.length, matchCenter + windowSize / 2);
    
    // Create the basic snippet
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet += '...';
    
    // Create a highlighting map for the snippet
    const snippetLength = snippet.length;
    const highlightMap = new Array(snippetLength).fill(false);
    
    // Calculate offset for the highlighting
    const startOffset = start > 0 ? start - 3 : start; // Account for '...' if present
    
    // Mark each matched character in the snippet
    allIndices.forEach((indices: MatchIndices) => {
      const matchStart = indices[0];
      const matchEnd = indices[1];
      
      // Skip matches outside our snippet window
      if (matchEnd < start || matchStart > end) return;
      
      // Adjust match indices to be relative to snippet
      const snippetMatchStart = Math.max(0, matchStart - startOffset);
      const snippetMatchEnd = Math.min(snippetLength - 1, matchEnd - startOffset);
      
      // Mark characters for highlighting
      for (let i = snippetMatchStart; i <= snippetMatchEnd; i++) {
        if (i >= 0 && i < snippetLength) {
          highlightMap[i] = true;
        }
      }
    });
    
    // Build the highlighted snippet
    let result = '';
    let inHighlight = false;
    
    for (let i = 0; i < snippetLength; i++) {
      // If highlighting state changes, add appropriate tags
      if (highlightMap[i] && !inHighlight) {
        result += '<span class="highlight">';
        inHighlight = true;
      } else if (!highlightMap[i] && inHighlight) {
        result += '</span>';
        inHighlight = false;
      }
      
      // Add the current character
      result += snippet.charAt(i);
    }
    
    // Close highlight tag if we're still in one at the end
    if (inHighlight) {
      result += '</span>';
    }
    
    return result;
  } catch (e) {
    console.error('Error highlighting snippet:', e);
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }
} 