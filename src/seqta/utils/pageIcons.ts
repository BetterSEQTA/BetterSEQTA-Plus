import { icon } from "@/lib/icon";
import {
  AppWindow,
  BookOpen,
  Calendar,
  ChartLine,
  ClipboardList,
  FileChartColumn,
  FolderOpen,
  GraduationCap,
  Hand,
  House,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  Settings,
  Target,
} from "lucide-static";

const PAGE_ICONS: Record<string, string> = {
  analytics: ChartLine,
  assessments: ClipboardList,
  courses: BookOpen,
  dashboard: LayoutDashboard,
  documents: FolderOpen,
  forums: MessagesSquare,
  goals: Target,
  home: House,
  messages: MessageSquare,
  myed: GraduationCap,
  news: Newspaper,
  notices: Megaphone,
  portals: AppWindow,
  reports: FileChartColumn,
  settings: Settings,
  timetable: Calendar,
  welcome: Hand,
};

export function pageIcon(key: string): string | undefined {
  const svg = PAGE_ICONS[key];
  return svg && icon(svg);
}
