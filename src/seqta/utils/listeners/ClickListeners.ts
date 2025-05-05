import { waitForElm } from "@/seqta/utils/waitForElm";
import ReactFiber from "../ReactFiber";

const handleNotificationClick = async (target: HTMLElement) => {
  const notificationItem = target.closest(
    '[class*="notifications__item___"]',
  ) as HTMLElement | null;
  if (!notificationItem) return;

  const buttonType = notificationItem.getAttribute("data-type");
  if (buttonType !== "message") return;

  const notificationList = await ReactFiber.find(
    '[class*="notifications__list___"]',
  ).getState();
  const buttonId = notificationItem.getAttribute("data-id");
  if (!buttonId) return;

  const matchingNotification =
    notificationList.storeState.notifications.items.find(
      (item: any) => item.notificationID === parseInt(buttonId),
    );

  await waitForElm('[class*="Viewer__Viewer___"] > div', true, 20);

  // Select the specific direct message
  ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
    selected: new Set([matchingNotification.message.messageID]),
  });

  // Close the notifications panel
  const notificationButton = document.querySelector(
    '[class*="notifications__notifications___"] > button',
  ) as HTMLButtonElement | null;
  notificationButton?.click();
};

const clickListeners = [
  {
    selector: '[class*="notifications__item___"]',
    handler: handleNotificationClick,
  },
];

const registerClickListeners = () => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    clickListeners.forEach(({ selector, handler }) => {
      if (target.closest(selector)) {
        handler(target);
      }
    });
  });
};

export default registerClickListeners;
