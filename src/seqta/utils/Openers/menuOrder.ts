import type { SettingsState } from "@/types/storage";

/** Reorder `#menu > ul` children to match a saved `menuorder` key list. */
export function ChangeMenuItemPositions(menuorder: SettingsState["menuorder"]) {
  const menuRoot = document.querySelector("#menu")?.firstChild;
  if (!menuRoot) return;

  const menuList = menuRoot.childNodes;
  const listorder: number[] = [];

  for (let i = 0; i < menuList.length; i++) {
    const menu = menuList[i] as HTMLElement;
    listorder.push(menuorder.indexOf(menu.dataset.key));
  }

  const newArr: ChildNode[] = [];
  for (let i = 0; i < listorder.length; i++) {
    const index = listorder[i];
    if (index >= 0) {
      newArr[index] = menuList[i];
    }
  }

  for (let i = 0; i < newArr.length; i++) {
    const element = newArr[i];
    if (element) {
      const elem = element as HTMLElement;
      elem.setAttribute("data-checked", "true");
      menuRoot.appendChild(element);
    }
  }
}
