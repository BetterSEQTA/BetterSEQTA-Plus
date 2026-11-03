<script lang="ts">
  import AppWindowIcon from "@lucide/svelte/icons/app-window";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import ClipboardListIcon from "@lucide/svelte/icons/clipboard-list";
  import FileChartColumnIcon from "@lucide/svelte/icons/file-chart-column";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import HouseIcon from "@lucide/svelte/icons/house";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import MessageSquareMoreIcon from "@lucide/svelte/icons/message-square-more";
  import MessageSquarePlusIcon from "@lucide/svelte/icons/message-square-plus";
  import MessagesSquareIcon from "@lucide/svelte/icons/messages-square";
  import RouteIcon from "@lucide/svelte/icons/route";
  import SearchIcon from "@lucide/svelte/icons/search";
  import SunIcon from "@lucide/svelte/icons/sun";
  import TargetIcon from "@lucide/svelte/icons/target";
  import type { SearchIconName } from "../core/searchIcons";

  let { name, class: className = "" }: { name: SearchIconName; class?: string } = $props();

  const ICONS = {
    "app-window": AppWindowIcon,
    "book-open": BookOpenIcon,
    calendar: CalendarIcon,
    "clipboard-list": ClipboardListIcon,
    "file-chart-column": FileChartColumnIcon,
    "file-text": FileTextIcon,
    house: HouseIcon,
    inbox: InboxIcon,
    "layout-dashboard": LayoutDashboardIcon,
    megaphone: MegaphoneIcon,
    "message-square": MessageSquareIcon,
    "message-square-more": MessageSquareMoreIcon,
    "message-square-plus": MessageSquarePlusIcon,
    "messages-square": MessagesSquareIcon,
    route: RouteIcon,
    search: SearchIcon,
    sun: SunIcon,
    target: TargetIcon,
  } satisfies Record<SearchIconName, unknown>;

  const Icon = $derived(ICONS[name]);
</script>

<Icon size="1em" class={className} />
