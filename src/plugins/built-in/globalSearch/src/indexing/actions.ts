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
    if (item.metadata.isMessageBased) {
      window.location.hash = `#?page=/messages`;

      await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

      // Select the specific direct message
      ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
        selected: new Set([item.metadata.messageId]),
      });
    } else {
      window.location.hash = `#?page=/assessments&id=${item.metadata.assessmentId}`;
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
