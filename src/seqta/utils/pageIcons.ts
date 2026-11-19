import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";

const EXTRA_ICONS: Record<string, string> = {
  home: `<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>`,
  news: `<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20 3H4C2.89 3 2 3.89 2 5V19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V5C22 3.89 21.11 3 20 3M5 7H10V13H5V7M19 17H5V15H19V17M19 13H12V11H19V13M19 9H12V7H19V9Z" /></svg>`,
};

const menuIcons = MenuitemSVGKey as Record<string, string>;

export function pageIcon(key: string): string | undefined {
  return menuIcons[key] ?? EXTRA_ICONS[key];
}
