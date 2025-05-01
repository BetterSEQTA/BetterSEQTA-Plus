import type { IndexItem } from "./types";

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
  message: ((item: IndexItem & { metadata: MessageMetadata }) => {
    window.location.hash = `#?page=/messages&id=${item.metadata.messageId}`;
  }) as ActionHandler<any>,

  assessment: ((item: IndexItem & { metadata: AssessmentMetadata }) => {
    if (item.metadata.isMessageBased) {
      window.location.hash = `#?page=/messages&id=${item.metadata.messageId}`;
    } else {
      window.location.hash = `#?page=/assessments&id=${item.metadata.assessmentId}`;
    }
  }) as ActionHandler<any>,
};
