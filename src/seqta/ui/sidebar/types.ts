export type SidebarItem = {
  key: string;
  path: string | null;
  id: string | null;
  label: string;
  /** Outer HTML of the label's leading SVG (if any). */
  iconHtml: string;
  hasChildren: boolean;
  colour: string | null;
  itemColour: string | null;
  betterseqta: boolean;
  children: SidebarItem[];
};

export type SidebarDrillFrame = {
  key: string;
  label: string;
  items: SidebarItem[];
};
