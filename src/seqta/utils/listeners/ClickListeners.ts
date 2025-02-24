import { waitForElm } from "@/SEQTA";
import ReactFiber from "../ReactFiber";

const handleNotificationClick = async (target: HTMLElement) => {
  const notificationItem = target.closest('.notifications__item___2ErJN') as HTMLElement | null;
  if (!notificationItem) return;

  const buttonType = notificationItem.getAttribute('data-type');
  if (buttonType !== 'message') return;

  const notificationList = await ReactFiber.find('.notifications__list___rp2L2').getState();
  const buttonId = notificationItem.getAttribute('data-id');
  if (!buttonId) return;

  const matchingNotification = notificationList.storeState.notifications.items.find(
    (item: any) => item.notificationID === parseInt(buttonId)
  );

  await waitForElm('.Viewer__Viewer___32BH-', true, 20);

  // Select the specific direct message
  ReactFiber.find('.Viewer__Viewer___32BH-').setState({ selected: new Set([matchingNotification.message.messageID]) });

  // Close the notifications panel
  const notificationButton = document.querySelector('.notifications__notifications___3mmLY > button') as HTMLButtonElement | null;
  notificationButton?.click();
};

const clickListeners = [
  {
    selector: '.notifications__item___2ErJN',
    handler: handleNotificationClick,
  },
];

const registerClickListeners = () => {  
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    clickListeners.forEach(({ selector, handler }) => {
      if (target.closest(selector)) {
        handler(target);
      }
    });
  });
};

export default registerClickListeners;
