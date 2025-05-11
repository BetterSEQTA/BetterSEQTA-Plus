import type { IndexItem } from "./types"; // Import the IndexItem type from the local "types" module

// Define the structure of metadata for a message item
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

// Define the structure of metadata for an assessment item
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

// Define a generic action handler type that operates on an IndexItem with associated metadata
type ActionHandler<T = any> = (item: IndexItem & { metadata: T }) => void;

// Map of string keys to corresponding action handlers
export const actionMap: Record<string, ActionHandler<any>> = {
  // Action handler for 'message' items
  message: ((item: IndexItem & { metadata: MessageMetadata }) => {
    // Navigate to the messages page with the specified message ID
    window.location.hash = `#?page=/messages&id=${item.metadata.messageId}`;
  }) as ActionHandler<any>,

  // Action handler for 'assessment' items
  assessment: ((item: IndexItem & { metadata: AssessmentMetadata }) => {
    if (item.metadata.isMessageBased) {
      // If assessment is message-based, navigate to the corresponding message
      window.location.hash = `#?page=/messages&id=${item.metadata.messageId}`;
    } else {
      // Otherwise, navigate to the assessment page using its ID
      window.location.hash = `#?page=/assessments&id=${item.metadata.assessmentId}`;
    }
  }) as ActionHandler<any>,
};
