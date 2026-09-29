import browser from "webextension-polyfill";
import type { Theme } from "@/interface/types/Theme";
import { getCommunityInstalledThemeIds } from "@/interface/utils/themeListFilters";
import { themeUpdates } from "@/interface/hooks/ThemeUpdates";
import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
import { cloudAuth } from "@/seqta/utils/CloudAuth";
import {
  deleteCustomTheme,
  fetchCommunityThemes,
  fetchMyCustomThemeDetail,
  fetchMyCustomThemes,
  replaceCustomThemeFiles,
  updateCustomThemeMetadata,
} from "@/seqta/utils/customThemes/client";
import {
  buildUploadPartsFromZipFile,
  mergeUploadPayload,
} from "@/seqta/utils/customThemes/buildThemeUploadFormData";
import { formatCustomThemeApiError } from "@/seqta/utils/customThemes/apiErrors";
import type { CustomThemeFile, CustomThemeOwner } from "@/seqta/utils/customThemes/types";
import {
  consumeOpenCommunityThemeSubmit,
  consumePendingCommunitySubmitThemeId,
  OPEN_COMMUNITY_SUBMIT_EVENT,
} from "@/seqta/utils/openCommunityThemeSubmit";
export type CommunityThemesTab = "browse" | "mine";

export class CommunityThemesState {
  innerTab = $state<CommunityThemesTab>("browse");
  cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);

  browseThemes = $state<Theme[]>([]);
  browseLoading = $state(true);
  browseError = $state<string | null>(null);

  myThemes = $state<CustomThemeOwner[]>([]);
  myLoading = $state(false);
  myError = $state<string | null>(null);
  statusFilter = $state<"" | "pending" | "approved" | "rejected">("");

  displayTheme = $state<Theme | null>(null);
  currentThemes = $state<string[]>([]);
  selectedThemeId = $state("");
  installedThemeColors = $state<Record<string, string>>({});

  showSignInOverlay = $state(false);

  detailTheme = $state<CustomThemeOwner | null>(null);
  detailFiles = $state<CustomThemeFile[]>([]);
  detailLoading = $state(false);
  detailError = $state<string | null>(null);
  editName = $state("");
  editDescription = $state("");
  editNotes = $state("");
  detailBusy = $state(false);
  replaceZipFile = $state<File | null>(null);
  showDeleteConfirm = $state(false);

  private readonly themeManager = ThemeManager.getInstance();

  constructor(private readonly getSearchTerm: () => string) {}

  async refreshInstalledThemes() {
    const themes = await this.themeManager.getAvailableThemes();
    this.currentThemes = getCommunityInstalledThemeIds(themes);
    this.selectedThemeId = this.themeManager.getSelectedThemeId() || "";
    this.installedThemeColors = Object.fromEntries(
      themes
        .filter((t) => t != null && t.installedFromCommunity === true)
        .map((t) => [t.id, t.defaultColour]),
    );
  }

  async loadBrowseThemes() {
    this.browseLoading = true;
    this.browseError = null;
    try {
      const q = this.getSearchTerm().trim();
      const res = await fetchCommunityThemes({
        sort: "popular",
        limit: 50,
        search: q.length > 0 ? q : undefined,
      });
      this.browseThemes = res.themes as Theme[];
    } catch (err) {
      this.browseError = err instanceof Error ? err.message : "Could not load community themes";
    } finally {
      this.browseLoading = false;
    }
  }

  async loadMyThemes() {
    if (!this.cloudLoggedIn) return;
    this.myLoading = true;
    this.myError = null;
    try {
      const res = await fetchMyCustomThemes({
        limit: 50,
        status: this.statusFilter || undefined,
      });
      this.myThemes = res.themes;
    } catch (err) {
      this.myError = err instanceof Error ? err.message : "Could not load your themes";
    } finally {
      this.myLoading = false;
    }
  }

  async openDetail(theme: CustomThemeOwner) {
    this.detailTheme = theme;
    this.detailFiles = [];
    this.detailError = null;
    this.editName = theme.name;
    this.editDescription = theme.description ?? "";
    this.editNotes = theme.submission_notes ?? "";
    this.replaceZipFile = null;
    this.showDeleteConfirm = false;
    this.detailLoading = true;
    try {
      const res = await fetchMyCustomThemeDetail(theme.id);
      this.detailTheme = res.theme;
      this.detailFiles = res.files;
      this.editName = res.theme.name;
      this.editDescription = res.theme.description ?? "";
      this.editNotes = res.theme.submission_notes ?? "";
    } catch (err) {
      this.detailError = err instanceof Error ? err.message : "Could not load theme details";
    } finally {
      this.detailLoading = false;
    }
  }

  closeDetail() {
    this.detailTheme = null;
    this.detailFiles = [];
    this.detailError = null;
    this.showDeleteConfirm = false;
  }

  async installCommunityTheme(themeId: string, meta: Theme) {
    const row = this.browseThemes.find((x) => x.id === themeId) ?? meta;
    const installedId = await this.themeManager.downloadCommunityTheme({
      id: themeId,
      theme_json_url: row.theme_json_url,
      updated_at: row.updated_at,
    });
    await this.themeManager.setTheme(installedId);
    themeUpdates.triggerUpdate();
    await this.refreshInstalledThemes();
    void browser.runtime.sendMessage({ type: "cloudSettingsRequestDebouncedUpload" }).catch(() => {});
  }

  async removeInstalledTheme(themeId: string) {
    await this.themeManager.deleteTheme(themeId);
    themeUpdates.triggerUpdate();
    await this.refreshInstalledThemes();
  }

  async applyInstalledTheme(themeId: string) {
    await this.themeManager.setTheme(themeId);
    this.selectedThemeId = themeId;
    themeUpdates.triggerUpdate();
    void browser.runtime.sendMessage({ type: "cloudSettingsRequestDebouncedUpload" }).catch(() => {});
  }

  async saveMetadata() {
    if (!this.detailTheme) return;
    this.detailBusy = true;
    this.detailError = null;
    try {
      const updated = await updateCustomThemeMetadata(this.detailTheme.id, {
        name: this.editName.trim() || undefined,
        description: this.editDescription.trim() || undefined,
        submission_notes: this.editNotes.trim() || undefined,
      });
      this.detailTheme = updated;
      await this.loadMyThemes();
    } catch (err) {
      this.detailError = formatCustomThemeApiError(err);
    } finally {
      this.detailBusy = false;
    }
  }

  async runReplaceFiles() {
    if (!this.detailTheme || !this.replaceZipFile) return;
    this.detailBusy = true;
    this.detailError = null;
    try {
      const payload = mergeUploadPayload(await buildUploadPartsFromZipFile(this.replaceZipFile));
      const res = await replaceCustomThemeFiles(this.detailTheme.id, payload);
      this.detailTheme = res.theme;
      this.replaceZipFile = null;
      await this.loadMyThemes();
    } catch (err) {
      this.detailError = formatCustomThemeApiError(err);
    } finally {
      this.detailBusy = false;
    }
  }

  async runDelete() {
    if (!this.detailTheme) return;
    this.detailBusy = true;
    this.detailError = null;
    try {
      await deleteCustomTheme(this.detailTheme.id);
      this.closeDetail();
      await this.loadMyThemes();
    } catch (err) {
      this.detailError = formatCustomThemeApiError(err);
    } finally {
      this.detailBusy = false;
      this.showDeleteConfirm = false;
    }
  }

  bindReactiveLoads() {
    $effect(() => {
      const unsub = cloudAuth.subscribe((s) => {
        this.cloudLoggedIn = s.isLoggedIn;
      });
      return unsub;
    });

    $effect(() => {
      if (this.innerTab === "browse") void this.loadBrowseThemes();
    });

    $effect(() => {
      this.getSearchTerm();
      if (this.innerTab === "browse") void this.loadBrowseThemes();
    });

    $effect(() => {
      if (this.innerTab === "mine" && this.cloudLoggedIn) void this.loadMyThemes();
    });

    $effect(() => {
      this.statusFilter;
      if (this.innerTab === "mine" && this.cloudLoggedIn) void this.loadMyThemes();
    });
  }

  mount() {
    const onThemesUpdated = () => void this.refreshInstalledThemes();
    themeUpdates.addListener(onThemesUpdated);
    void this.refreshInstalledThemes();

    const openPageBuilderForSubmit = () => {
      const themeId = consumePendingCommunitySubmitThemeId() ?? undefined;
      void import("@/seqta/utils/launchPageThemeBuilder").then(({ launchPageThemeBuilder }) =>
        launchPageThemeBuilder(themeId),
      );
    };

    if (consumeOpenCommunityThemeSubmit()) {
      openPageBuilderForSubmit();
    }

    const onOpenCommunitySubmit = () => {
      if (consumeOpenCommunityThemeSubmit()) openPageBuilderForSubmit();
    };
    window.addEventListener(OPEN_COMMUNITY_SUBMIT_EVENT, onOpenCommunitySubmit);

    return () => {
      themeUpdates.removeListener(onThemesUpdated);
      window.removeEventListener(OPEN_COMMUNITY_SUBMIT_EVENT, onOpenCommunitySubmit);
    };
  }
}

export function createCommunityThemesState(getSearchTerm: () => string) {
  return new CommunityThemesState(getSearchTerm);
}
