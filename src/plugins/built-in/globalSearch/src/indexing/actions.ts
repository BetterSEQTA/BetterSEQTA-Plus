import type { IndexItem } from "./types"; // Import the IndexItem type from the local "types" module

// Define the structure of metadata for a message item
interface MessageMetadata {
  messageId: number;           // Unique ID of the message
  author: string;              // Name of the message author
  senderId: number;            // Unique ID of the sender
  senderType: string;          // Type/category of the sender
  timestamp: string;           // Timestamp of when the message was sent
  hasAttachments: boolean;     // Indicates if the message has attachments
  attachmentCount: number;     // Number of attachments in the message
  read: boolean;               // Indicates if the message has been read
}

// Define the structure of metadata for an assessment item
interface AssessmentMetadata {
  assessmentId?: number;       // Optional unique ID of the assessment
  messageId?: number;          // Optional message ID if assessment is message-based
  subject?: string;            // Optional subject of the assessment
  term?: string;               // Optional academic term
  programmeId?: number;        // Optional ID of the academic programme
  metaclassId?: number;        // Optional ID of the metaclass
  timestamp: string;           // Timestamp related to the assessment
  isMessageBased?: boolean;    // Indicates if the assessment is linked to a message
  author?: string;             // Optional author of the assessment
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
