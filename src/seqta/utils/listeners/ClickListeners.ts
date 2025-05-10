import { waitForElm } from "@/seqta/utils/waitForElm"; // Importing utility function to wait for an element to appear in the DOM
import ReactFiber from "../ReactFiber"; // Importing ReactFiber for managing React component state

// Function to handle the notification item click
const handleNotificationClick = async (target: HTMLElement) => {
  // Find the closest notification item to the clicked element
  const notificationItem = target.closest(
    '[class*="notifications__item___"]',
  ) as HTMLElement | null;
  if (!notificationItem) return; // If no notification item found, exit early

  // Check if the notification is of type "message"
  const buttonType = notificationItem.getAttribute("data-type");
  if (buttonType !== "message") return; // If not a message, exit early

  // Get the list of notifications from ReactFiber state
  const notificationList = await ReactFiber.find(
    '[class*="notifications__list___"]',
  ).getState();
  
  // Retrieve the ID of the notification
  const buttonId = notificationItem.getAttribute("data-id");
  if (!buttonId) return; // If no ID, exit early

  // Find the matching notification by its ID
  const matchingNotification =
    notificationList.storeState.notifications.items.find(
      (item: any) => item.notificationID === parseInt(buttonId),
    );

  // Wait for the viewer element to appear in the DOM
  await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

  // Select the specific direct message within the viewer
  ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
    selected: new Set([matchingNotification.message.messageID]),
  });

  // Close the notifications panel by clicking the notification button
  const notificationButton = document.querySelector(
    '[class*="notifications__notifications___"] > button',
  ) as HTMLButtonElement | null;
  notificationButton?.click();
};

// Array of click listeners, with each listener containing a selector and its handler
const clickListeners = [
  {
    selector: '[class*="notifications__item___"]', // Selector for notification items
    handler: handleNotificationClick, // Handler for notification item clicks
  },
];

// Function to register click listeners for the document
const registerClickListeners = () => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Loop through each click listener and check if the target matches the selector
    clickListeners.forEach(({ selector, handler }) => {
      if (target.closest(selector)) {
        handler(target); // If a match is found, invoke the handler
      }
    });
  });
};

// Export the function to register click listeners
export default registerClickListeners;
