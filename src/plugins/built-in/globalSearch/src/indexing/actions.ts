import { waitForElm } from "@/seqta/utils/waitForElm";
import type { IndexItem } from "./types";
import ReactFiber from "@/seqta/utils/ReactFiber";
import { delay } from "@/seqta/utils/delay";

interface MessageMetadata {
  messageId: number;
  author: string;
  senderId: number;
  senderType: string;
  timestamp: string;
  hasAttachments: boolean;
  attachmentCount: number;
  read: boolean;
}

interface AssessmentMetadata {
  assessmentId?: number;
  messageId?: number;
  subject?: string;
  term?: string;
  programmeId?: number;
  metaclassId?: number;
  timestamp: string;
  isMessageBased?: boolean;
  author?: string;
}

type ActionHandler<T = any> = (item: IndexItem & { metadata: T }) => void;

export const actionMap: Record<string, ActionHandler<any>> = {
  message: (async (item: IndexItem & { metadata: MessageMetadata }) => {
    window.location.hash = `#?page=/messages`;

    await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

    // Select the specific direct message
    ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
      selected: new Set([item.metadata.messageId]),
    });
    
    // send a network request to mark as read
    fetch('/seqta/student/save/message', {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        items: [item.metadata.messageId],
        mode: 'x-read',
        read: true,
      }),
    });

    await delay(10);

    const button = document.querySelector('[class*="MessageList__selected___"]');
    if (button) {
      (button as HTMLElement).click();
    }
  }) as ActionHandler<any>,

  assessment: (async (item: IndexItem & { metadata: AssessmentMetadata }) => {
    // Deep clone the entire item to avoid Firefox XrayWrapper issues
    // Firefox XrayWrapper prevents direct access to nested properties
    let itemClone: IndexItem & { metadata: AssessmentMetadata };
    let metadata: AssessmentMetadata;
    
    try {
      // First try to clone the entire item
      itemClone = JSON.parse(JSON.stringify(item));
      metadata = itemClone.metadata || {};
    } catch (e) {
      console.warn("[Assessment Action] Failed to clone item, trying to clone metadata separately:", e);
      try {
        // If full clone fails, try cloning just metadata
        metadata = JSON.parse(JSON.stringify(item.metadata || {}));
        itemClone = { ...item, metadata };
      } catch (e2) {
        console.warn("[Assessment Action] Failed to clone metadata, using direct access:", e2);
        itemClone = item;
        metadata = item.metadata || {} as AssessmentMetadata;
      }
    }
    
    // Try to extract metadata values using multiple methods to handle XrayWrapper
    const getMetadataValue = (key: string, altKey?: string): any => {
      try {
        // Try direct access first
        const value = metadata[key];
        if (value !== undefined && value !== null) {
          return value;
        }
        if (altKey) {
          const altValue = metadata[altKey];
          if (altValue !== undefined && altValue !== null) {
            return altValue;
          }
        }
        // Try accessing via Object.keys iteration (works around XrayWrapper)
        try {
          const keys = Object.keys(metadata);
          for (const k of keys) {
            if (k === key || k === altKey) {
              const val = metadata[k];
              if (val !== undefined && val !== null) {
                return val;
              }
            }
          }
        } catch (e) {
          // Object.keys might fail on XrayWrapper, that's okay
        }
        return undefined;
      } catch (e) {
        console.warn(`[Assessment Action] Failed to access metadata.${key}:`, e);
        return undefined;
      }
    };
    
    if (getMetadataValue('isMessageBased')) {
      window.location.hash = `#?page=/messages`;

      await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

      // Select the specific direct message
      ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
        selected: new Set([getMetadataValue('messageId')]),
      });
    } else {
      // Extract values - check both camelCase and PascalCase, and try multiple access methods
      let programmeId = getMetadataValue('programmeId', 'programmeID');
      let metaclassId = getMetadataValue('metaclassId', 'metaclassID');
      let assessmentId = getMetadataValue('assessmentId', 'assessmentID');
      
      // Fallback: try to extract assessmentId from item ID if metadata is missing
      if ((assessmentId === undefined || assessmentId === null) && itemClone.id && itemClone.id.startsWith('assignment-')) {
        const extractedId = itemClone.id.replace('assignment-', '');
        assessmentId = Number(extractedId) || extractedId;
        console.log("[Assessment Action] Extracted assessmentId from item ID:", assessmentId);
      }
      
      // Convert to numbers, but preserve 0 as valid
      if (programmeId !== undefined && programmeId !== null && programmeId !== '') {
        const num = Number(programmeId);
        programmeId = isNaN(num) ? programmeId : num;
      }
      if (metaclassId !== undefined && metaclassId !== null && metaclassId !== '') {
        const num = Number(metaclassId);
        metaclassId = isNaN(num) ? metaclassId : num;
      }
      if (assessmentId !== undefined && assessmentId !== null && assessmentId !== '') {
        const num = Number(assessmentId);
        assessmentId = isNaN(num) ? assessmentId : num;
      }
      
      // Check if values exist (including 0, which is a valid ID)
      // Use typeof check to properly handle 0
      const hasProgrammeId = programmeId !== undefined && programmeId !== null && programmeId !== '' && typeof programmeId === 'number';
      const hasMetaclassId = metaclassId !== undefined && metaclassId !== null && metaclassId !== '' && typeof metaclassId === 'number';
      const hasAssessmentId = assessmentId !== undefined && assessmentId !== null && assessmentId !== '' && typeof assessmentId === 'number';
      
      console.log("[Assessment Action] Extracted values:", {
        programmeId,
        metaclassId,
        assessmentId,
        hasProgrammeId,
        hasMetaclassId,
        hasAssessmentId,
        programmeIdType: typeof programmeId,
        metaclassIdType: typeof metaclassId,
        assessmentIdType: typeof assessmentId,
      });
      
      if (hasProgrammeId && hasMetaclassId && hasAssessmentId) {
        const url = `#?page=/assessments/${programmeId}:${metaclassId}&item=${assessmentId}`;
        console.log("[Assessment Action] ✅ Navigating to:", url);
        window.location.hash = url;
      } else {
        // Fallback: try to navigate to assessments page if metadata is incomplete
        console.error("[Assessment Action] ❌ Missing required metadata:", {
          programmeId,
          metaclassId,
          assessmentId,
          hasProgrammeId,
          hasMetaclassId,
          hasAssessmentId,
          metadataKeys: Object.keys(metadata),
          metadataString: JSON.stringify(metadata),
          itemId: itemClone.id,
        });
        // If we at least have an assessmentId, try to navigate to the general assessments page
        if (hasAssessmentId) {
          console.info("[Assessment Action] Attempting to navigate to assessments page with item filter");
          window.location.hash = `#?page=/assessments/upcoming&item=${assessmentId}`;
        } else {
          console.warn("[Assessment Action] No valid assessment ID, redirecting to upcoming");
          window.location.hash = `#?page=/assessments/upcoming`;
        }
      }
    }
  }) as ActionHandler<any>,

  subjectassessment: ((item: IndexItem) => {
    window.location.href = `/#?page=/assessments/${item.metadata.programme}:${item.metadata.subjectId}`;
  }) as ActionHandler<any>,

  subjectcourse: ((item: IndexItem) => {
    window.location.href = `/#?page=/courses/${item.metadata.programme}:${item.metadata.subjectId}`;
  }) as ActionHandler<any>,

  forum: ((item: IndexItem) => {
    window.location.href = `/#?page=/forums/${item.metadata.forumId}`;
  }) as ActionHandler<any>,
};
