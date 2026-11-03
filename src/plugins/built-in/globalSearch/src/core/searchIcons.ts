export type SearchIconName =
  | "app-window"
  | "book-open"
  | "calendar"
  | "clipboard-list"
  | "file-chart-column"
  | "file-text"
  | "house"
  | "inbox"
  | "layout-dashboard"
  | "megaphone"
  | "message-square"
  | "message-square-more"
  | "message-square-plus"
  | "messages-square"
  | "route"
  | "search"
  | "sun"
  | "target";

const CATEGORY_ICONS: Record<string, SearchIconName> = {
  courses: "book-open",
  notices: "megaphone",
  documents: "file-text",
  folio: "route",
  portals: "app-window",
  reports: "file-chart-column",
  goals: "target",
  passive: "inbox",
};

export function iconForCategory(category: string): SearchIconName {
  return CATEGORY_ICONS[category] ?? "message-square-plus";
}
