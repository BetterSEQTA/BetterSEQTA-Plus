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
    console.debug("[Assessment Action] Navigating to assessment:", item.id, item.metadata);
    
    if (item.metadata?.isMessageBased) {
      window.location.hash = `#?page=/messages`;

      await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

      // Select the specific direct message
      ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
        selected: new Set([item.metadata.messageId]),
      });
    } else {
      // Use the correct URL format: /assessments/{programmeId}:{metaclassId}&item={assessmentId}
      // Convert to numbers to handle string/number inconsistencies
      let programmeId = item.metadata?.programmeId;
      let metaclassId = item.metadata?.metaclassId;
      let assessmentId = item.metadata?.assessmentId;
      
      // Fallback: try to extract assessmentId from item ID if metadata is missing
      if (!assessmentId && item.id && item.id.startsWith('assignment-')) {
        const extractedId = item.id.replace('assignment-', '');
        assessmentId = Number(extractedId) || extractedId;
        console.debug("[Assessment Action] Extracted assessmentId from item ID:", assessmentId);
      }
      
      // Convert to numbers for consistency
      programmeId = Number(programmeId) || programmeId;
      metaclassId = Number(metaclassId) || metaclassId;
      assessmentId = Number(assessmentId) || assessmentId;
      
      // Check if values exist (including 0, which is a valid ID)
      const hasProgrammeId = programmeId !== undefined && programmeId !== null && programmeId !== '';
      const hasMetaclassId = metaclassId !== undefined && metaclassId !== null && metaclassId !== '';
      const hasAssessmentId = assessmentId !== undefined && assessmentId !== null && assessmentId !== '';
      
      if (hasProgrammeId && hasMetaclassId && hasAssessmentId) {
        const url = `#?page=/assessments/${programmeId}:${metaclassId}&item=${assessmentId}`;
        console.debug("[Assessment Action] Navigating to:", url, {
          programmeId,
          metaclassId,
          assessmentId,
          rawMetadata: item.metadata,
        });
        window.location.hash = url;
      } else {
        // Fallback: try to navigate to assessments page if metadata is incomplete
        console.warn("[Assessment Action] Missing required metadata:", {
          programmeId,
          metaclassId,
          assessmentId,
          hasProgrammeId,
          hasMetaclassId,
          hasAssessmentId,
          fullMetadata: item.metadata,
          itemId: item.id,
          itemKeys: Object.keys(item),
        });
        // If we at least have an assessmentId, try to navigate to the general assessments page
        // The user can then find it manually
        if (hasAssessmentId) {
          console.info("[Assessment Action] Attempting to navigate to assessments page with item filter");
          window.location.hash = `#?page=/assessments/upcoming&item=${assessmentId}`;
        } else {
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
