import localforage from "localforage";
import type { CustomTheme, LoadedCustomTheme } from "@/types/CustomThemes";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import debounce from "@/seqta/utils/debounce";

type ThemeContent = {
  id: string;
  name: string;
  coverImage?: string; // base64, optional
  description: string;
  defaultColour?: string;
  CanChangeColour?: boolean;
  CustomCSS?: string;
  hideThemeName?: boolean;
  forceDark?: boolean;
  images: { id: string; variableName: string; data: string }[]; // data: base64
};

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: CustomTheme | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private previewStyleElement: HTMLStyleElement | null = null;
  private previousImageVariableNames: string[] = [];
  private originalPreviewColor: string | null = null;
  private originalPreviewTheme: boolean | null = null;
  private imageUrlCache: Map<string, string> = new Map();
  private lastTransitionPoint: { x: number; y: number } = { x: 0, y: 0 };

  private constructor() {
    console.debug("[ThemeManager] Initializing...");
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Get the currently active theme
   */
  public getCurrentTheme(): CustomTheme | null {
    return this.currentTheme;
  }

  /**
   * Get a theme by ID from storage
   */
  public async getTheme(themeId: string): Promise<CustomTheme | null> {
    console.debug("[ThemeManager] Getting theme:", themeId);
    try {
      const theme = (await localforage.getItem(themeId)) as CustomTheme;
      return theme;
    } catch (error) {
      console.error("[ThemeManager] Error getting theme:", error);
      return null;
    }
  }

  /**
   * Get the ID of the currently selected theme
   */
  public getSelectedThemeId(): string {
    return settingsState.selectedTheme;
  }

  /**
   * Update the last transition point based on a click or event
   */
  public setTransitionPoint(x: number, y: number): void {
    this.lastTransitionPoint = { x, y };
  }

  /**
   * Apply a view transition animation
   */
  private async applyViewTransition(callback: () => void): Promise<void> {
    if (
      !document.startViewTransition || 
      !settingsState.animations || 
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Just run the callback without animation if transitions not supported
      callback();
      return;
    }
    
    // Use last known transition point or fallback to center
    const x = this.lastTransitionPoint.x || window.innerWidth / 2;
    const y = this.lastTransitionPoint.y || window.innerHeight / 2;
    const right = window.innerWidth - x;
    const bottom = window.innerHeight - y;
    
    const maxRadius = Math.hypot(
      Math.max(x, right),
      Math.max(y, bottom),
    );
    
    await document.startViewTransition(() => {
      callback();
    }).ready;
    
    try {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 400,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    } catch (error) {
      console.error("[ThemeManager] View Transition animation error:", error);
    }
  }

  /**
   * Disable the current theme without deleting it
   */
  public async disableTheme(): Promise<void> {
    console.debug("[ThemeManager] Disabling current theme");
    try {
      if (!this.currentTheme) {
        console.debug("[ThemeManager] No theme to disable");
        return;
      }

      await this.removeTheme(this.currentTheme);
      this.currentTheme = null;
      settingsState.selectedTheme = "";
      console.debug("[ThemeManager] Theme disabled successfully");
    } catch (error) {
      console.error("[ThemeManager] Error disabling theme:", error);
    }
  }

  /**
   * Initialize the theme system and restore previous state
   */
  public async initialize(): Promise<void> {
    console.debug("[ThemeManager] Starting initialization");
    try {
      // Check if theme creator was open during reload
      const themeCreatorOpen = localStorage.getItem("themeCreatorOpen");
      if (themeCreatorOpen === "true") {
        console.debug(
          "[ThemeManager] Theme creator was open, clearing preview state",
        );
        this.clearPreview();
        // Clean up the flag
        localStorage.removeItem("themeCreatorOpen");
      }

      if (settingsState.selectedTheme) {
        console.debug(
          "[ThemeManager] Found selected theme, restoring:",
          settingsState.selectedTheme,
        );
        await this.setTheme(settingsState.selectedTheme, false);
      }
    } catch (error) {
      console.error("[ThemeManager] Error during initialization:", error);
    }
  }

  /**
   * Clean up theme system resources
   */
  public async cleanup(): Promise<void> {
    console.debug("[ThemeManager] Cleaning up resources");
    try {
      if (this.currentTheme) {
        await this.removeTheme(this.currentTheme, false);
      }
    } catch (error) {
      console.error("[ThemeManager] Error during cleanup:", error);
    }
  }

  /**
   * Set and apply a theme by ID
   */
  public async setTheme(themeId: string, applyViewTransition: boolean = true): Promise<void> {
    console.debug("[ThemeManager] Setting theme:", themeId);
    try {
      const theme = (await localforage.getItem(themeId)) as CustomTheme;
      if (!theme) {
        console.error("[ThemeManager] Theme not found:", themeId);
        return;
      }

      // Store original settings before applying new theme
      if (!settingsState.selectedTheme) {
        console.debug("[ThemeManager] Storing original settings");
        settingsState.originalSelectedColor = settingsState.selectedColor;

        if (theme.forceDark) {
          settingsState.originalDarkMode = settingsState.DarkMode;
        }
      }

      // Use view transition for the theme change
      if (applyViewTransition) {
        await this.applyViewTransition(async () => {
          // Remove current theme if exists
          if (this.currentTheme) {
            console.debug("[ThemeManager] Removing current theme");
            await this.removeThemeWithoutTransition(this.currentTheme);
          }

          // Apply new theme
          await this.applyTheme(theme);
          this.currentTheme = theme;
          settingsState.selectedTheme = themeId;
        });
      } else {
        // Remove current theme if exists
        if (this.currentTheme) {
          console.debug("[ThemeManager] Removing current theme");
          await this.removeThemeWithoutTransition(this.currentTheme);
        }

        // Apply new theme
        await this.applyTheme(theme);
        this.currentTheme = theme;
        settingsState.selectedTheme = themeId;
      }
    } catch (error) {
      console.error("[ThemeManager] Error setting theme:", error);
    }
  }

  /**
   * Apply theme components (CSS, images, settings)
   */
  private async applyTheme(theme: CustomTheme): Promise<void> {
    console.debug("[ThemeManager] Applying theme:", theme.name);
    try {
      // Apply custom CSS
      if (theme.CustomCSS) {
        console.debug("[ThemeManager] Applying custom CSS");
        this.applyCustomCSS(theme.CustomCSS);
      }

      // Apply custom images
      if (theme.CustomImages) {
        console.debug("[ThemeManager] Applying custom images");
        theme.CustomImages.forEach((image) => {
          const imageUrl = URL.createObjectURL(image.blob);
          document.documentElement.style.setProperty(
            "--" + image.variableName,
            `url(${imageUrl})`,
          );
        });
      }

      // Apply theme settings
      if (theme.forceDark !== undefined) {
        console.debug("[ThemeManager] Setting dark mode:", theme.forceDark);
        settingsState.DarkMode = theme.forceDark;
      }

      // Use the stored selected color if available, otherwise use the default
      if (theme.selectedColor) {
        console.debug(
          "[ThemeManager] Restoring saved color:",
          theme.selectedColor,
        );
        settingsState.selectedColor = theme.selectedColor;
      } else if (theme.defaultColour) {
        console.debug(
          "[ThemeManager] Using default color:",
          theme.defaultColour,
        );
        settingsState.selectedColor = theme.defaultColour;
      }
    } catch (error) {
      console.error("[ThemeManager] Error applying theme:", error);
    }
  }

  /**
   * Remove theme and restore original settings with view transition
   */
  private async removeTheme(
    theme: CustomTheme,
    clearSelectedTheme: boolean = true,
  ): Promise<void> {
    console.debug("[ThemeManager] Removing theme with transition:", theme.name);
    try {
      await this.applyViewTransition(async () => {
        await this.removeThemeWithoutTransition(theme, clearSelectedTheme);
      });
    } catch (error) {
      console.error("[ThemeManager] Error removing theme with transition:", error);
    }
  }
  
  /**
   * Remove theme without applying view transition animation
   */
  private async removeThemeWithoutTransition(
    theme: CustomTheme,
    clearSelectedTheme: boolean = true,
  ): Promise<void> {
    console.debug("[ThemeManager] Removing theme:", theme.name);
    try {
      // Remove custom CSS
      if (this.styleElement) {
        console.debug("[ThemeManager] Removing custom CSS");
        this.styleElement.remove();
        this.styleElement = null;
      }

      // Remove custom images
      if (theme.CustomImages) {
        console.debug("[ThemeManager] Removing custom images");
        theme.CustomImages.forEach((image) => {
          const value = document.documentElement.style.getPropertyValue(
            "--" + image.variableName,
          );
          if (value) {
            URL.revokeObjectURL(value.slice(4, -1)); // Remove url() wrapper
          }
          document.documentElement.style.removeProperty(
            "--" + image.variableName,
          );
        });
      }

      if (this.currentTheme) {
        // Store the current color with the theme before removing it
        await localforage.setItem(this.currentTheme.id, {
          ...this.currentTheme,
          selectedColor: settingsState.selectedColor,
        });
      }

      // Restore original settings
      if (settingsState.originalSelectedColor) {
        console.debug(
          "[ThemeManager] Restoring original color:",
          settingsState.originalSelectedColor,
        );
        settingsState.selectedColor = settingsState.originalSelectedColor;
      }

      if (settingsState.originalDarkMode !== undefined) {
        console.debug(
          "[ThemeManager] Restoring original dark mode:",
          settingsState.originalDarkMode,
        );
        settingsState.DarkMode = settingsState.originalDarkMode;
        delete settingsState.originalDarkMode;
      }

      this.currentTheme = null;
      if (clearSelectedTheme) {
        settingsState.selectedTheme = "";
      }
    } catch (error) {
      console.error("[ThemeManager] Error removing theme:", error);
    }
  }

  /**
   * Apply custom CSS to the document
   */
  private applyCustomCSS(css: string): void {
    console.debug("[ThemeManager] Applying custom CSS");
    try {
      if (!this.styleElement) {
        this.styleElement = document.createElement("style");
        this.styleElement.id = "custom-theme";
        document.head.appendChild(this.styleElement);
      }
      this.styleElement.textContent = css;
    } catch (error) {
      console.error("[ThemeManager] Error applying custom CSS:", error);
    }
  }

  /**
   * Get list of available themes
   */
  public async getAvailableThemes(): Promise<CustomTheme[]> {
    console.debug("[ThemeManager] Getting available themes");
    try {
      const themeIds = (await localforage.getItem("customThemes")) as
        | string[]
        | null;
      if (!themeIds) {
        return [];
      }

      const themes = await Promise.all(
        themeIds.map(async (id) => {
          return (await localforage.getItem(id)) as CustomTheme;
        }),
      );

      return themes.filter((theme) => theme !== null);
    } catch (error) {
      console.error("[ThemeManager] Error getting available themes:", error);
      return [];
    }
  }

  /**
   * Save or update a theme
   */
  public async saveTheme(theme: LoadedCustomTheme): Promise<void> {
    console.debug("[ThemeManager] Saving theme:", theme.name);
    try {
      await localforage.setItem(theme.id, theme);
      const themeIds = (await localforage.getItem("customThemes")) as
        | string[]
        | null;

      if (themeIds) {
        if (!themeIds.includes(theme.id)) {
          themeIds.push(theme.id);
          await localforage.setItem("customThemes", themeIds);
        }
      } else {
        await localforage.setItem("customThemes", [theme.id]);
      }
    } catch (error) {
      console.error("[ThemeManager] Error saving theme:", error);
    }
  }

  /**
   * Delete a theme
   */
  public async deleteTheme(themeId: string): Promise<void> {
    console.debug("[ThemeManager] Deleting theme:", themeId);
    try {
      const theme = (await localforage.getItem(themeId)) as CustomTheme;
      if (theme) {
        if (this.currentTheme?.id === themeId) {
          await this.removeTheme(theme);
        }
        await localforage.removeItem(themeId);

        const themeIds = (await localforage.getItem("customThemes")) as
          | string[]
          | null;
        if (themeIds) {
          const updatedThemeIds = themeIds.filter((id) => id !== themeId);
          await localforage.setItem("customThemes", updatedThemeIds);
        }
      }
    } catch (error) {
      console.error("[ThemeManager] Error deleting theme:", error);
    }
  }

  /**
   * Download and install a theme from the store
   */
  public async downloadTheme(themeContent: {
    id: string;
    name: string;
    description: string;
    coverImage: string;
  }): Promise<void> {
    console.debug("[ThemeManager] Downloading theme:", themeContent.name);
    try {
      if (!themeContent.id) return;

      const response = await fetch(
        `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes/${themeContent.id}/theme.json`,
      );
      const themeData = (await response.json()) as ThemeContent;

      await this.installTheme(themeData);
    } catch (error) {
      console.error("[ThemeManager] Error downloading theme:", error);
    }
  }

  /**
   * Install a theme from theme data
   */
  public async installTheme(themeData: ThemeContent): Promise<void> {
    console.debug("[ThemeManager] Installing theme:", themeData.name);
    try {
      // Validate required fields
      if (!themeData.id || !themeData.name) {
        throw new Error("Theme is missing required fields (id or name)");
      }

      // Handle cover image (optional)
      let coverImageBlob = null;
      if (themeData.coverImage) {
        try {
          const strippedCoverImage = this.stripBase64Prefix(
            themeData.coverImage,
          );
          coverImageBlob = this.base64ToBlob(strippedCoverImage);
        } catch (e) {
          console.warn("[ThemeManager] Failed to process cover image:", e);
          // Continue without cover image
        }
      }

      // Handle images (optional)
      const images =
        themeData.images
          ?.map((image) => {
            try {
              if (!image.id || !image.variableName || !image.data) {
                console.warn("[ThemeManager] Skipping invalid image:", image);
                return null;
              }
              return {
                ...image,
                blob: this.base64ToBlob(this.stripBase64Prefix(image.data)),
              };
            } catch (e) {
              console.warn("[ThemeManager] Failed to process image:", e);
              return null;
            }
          })
          .filter((img) => img !== null) ?? [];

      // Create theme with defaults for optional fields
      const theme: LoadedCustomTheme = {
        id: themeData.id,
        name: themeData.name,
        description: themeData.description || "",
        webURL: themeData.id,
        coverImage: coverImageBlob,
        CustomImages: images,
        CustomCSS: themeData.CustomCSS || "",
        defaultColour: themeData.defaultColour || "rgba(0, 123, 255, 1)",
        CanChangeColour: themeData.CanChangeColour ?? true,
        allowBackgrounds: true,
        isEditable: false,
        hideThemeName: themeData.hideThemeName ?? false,
        forceDark: themeData.forceDark,
      };

      await this.saveTheme(theme);
    } catch (error) {
      console.error("[ThemeManager] Error installing theme:", error);
      throw error; // Re-throw to handle in UI
    }
  }

  /**
   * Share a theme by exporting it
   */
  public async shareTheme(themeId: string): Promise<void> {
    console.debug("[ThemeManager] Sharing theme:", themeId);
    try {
      const theme = (await localforage.getItem(themeId)) as LoadedCustomTheme;
      if (!theme) {
        console.error("[ThemeManager] Theme not found");
        return;
      }

      // Extract only the fields we want to share
      const {
        CustomImages = [],
        coverImage,
        webURL,
        isEditable,
        selectedColor,
        allowBackgrounds,
        ...themeBasics
      } = theme;

      // Convert images to base64
      const finalImages = await Promise.all(
        CustomImages.map(async (image) => ({
          id: image.id,
          variableName: image.variableName,
          data: await this.blobToBase64(image.blob),
        })),
      );

      // Convert cover image to base64
      const coverImageBase64 = coverImage
        ? await this.blobToBase64(coverImage)
        : null;

      // Create shareable theme data with only necessary fields
      const shareableTheme = {
        ...themeBasics,
        images: finalImages,
        coverImage: coverImageBase64,
      };

      // Save theme file
      this.saveThemeFile(shareableTheme, theme.name || "Unnamed_Theme");
    } catch (error) {
      console.error("[ThemeManager] Error sharing theme:", error);
    }
  }

  /**
   * Preview a theme without applying it
   */
  public async previewTheme(theme: LoadedCustomTheme): Promise<void> {
    console.debug("[ThemeManager] Previewing theme:", theme.name);
    try {
      const { CustomCSS, CustomImages, defaultColour, forceDark } = theme;

      // Store original settings only if this is a new theme
      if (!theme.webURL) {
        if (this.originalPreviewColor === null) {
          this.originalPreviewColor = settingsState.selectedColor;
          localStorage.setItem(
            "originalPreviewColor",
            settingsState.selectedColor,
          );
        }
        if (this.originalPreviewTheme === null) {
          this.originalPreviewTheme = settingsState.DarkMode;
        }
      }

      // Apply custom CSS
      if (CustomCSS) {
        this.applyPreviewCSS(CustomCSS);
      }

      // Apply custom images
      const newImageVariableNames = CustomImages.map(
        (image) => image.variableName,
      );

      // Remove old preview images
      this.previousImageVariableNames.forEach((variableName) => {
        if (!newImageVariableNames.includes(variableName)) {
          this.removeImageFromDocument(variableName);
        }
      });

      // Apply new images
      CustomImages.forEach((image) => {
        const imageUrl = URL.createObjectURL(image.blob);
        document.documentElement.style.setProperty(
          `--${image.variableName}`,
          `url(${imageUrl})`,
        );
      });

      // Update previousImageVariableNames
      this.previousImageVariableNames = newImageVariableNames;

      // Apply theme settings
      if (forceDark !== undefined) {
        settingsState.DarkMode = forceDark;
      }

      if (defaultColour) {
        settingsState.selectedColor = defaultColour;
      }
    } catch (error) {
      console.error("[ThemeManager] Error previewing theme:", error);
    }
  }

  /**
   * Update the preview of a theme in real-time (for theme creator)
   */
  public async updatePreview(theme: Partial<LoadedCustomTheme>): Promise<void> {
    console.debug("[ThemeManager] Updating theme preview");
    try {
      // Only store original settings if this is a new theme (not editing)
      // We can tell it's a new theme if it has no webURL (which is set when a theme is saved/loaded)
      if (!theme.webURL) {
        if (this.originalPreviewColor === null) {
          this.originalPreviewColor = settingsState.selectedColor;
        }
        if (this.originalPreviewTheme === null) {
          this.originalPreviewTheme = settingsState.DarkMode;
        }
      }

      // Apply CSS if changed
      if (theme.CustomCSS !== undefined) {
        this.applyPreviewCSS(theme.CustomCSS);
      }

      // Handle images if present
      if (theme.CustomImages) {
        const newImageVariableNames = theme.CustomImages.map(
          (image) => image.variableName,
        );

        // Remove old preview images that are no longer present
        this.previousImageVariableNames.forEach((variableName) => {
          if (!newImageVariableNames.includes(variableName)) {
            this.removeImageFromDocument(variableName);
            // Clean up cached URL
            this.imageUrlCache.delete(variableName);
          }
        });

        // Apply or update images
        theme.CustomImages.forEach((image) => {
          const existingUrl = this.imageUrlCache.get(image.variableName);
          if (!existingUrl) {
            // Only create new URL if one doesn't exist
            const imageUrl = URL.createObjectURL(image.blob);
            this.imageUrlCache.set(image.variableName, imageUrl);
            document.documentElement.style.setProperty(
              `--${image.variableName}`,
              `url(${imageUrl})`,
            );
          } else {
            // Reuse existing URL
            document.documentElement.style.setProperty(
              `--${image.variableName}`,
              `url(${existingUrl})`,
            );
          }
        });

        this.previousImageVariableNames = newImageVariableNames;
      }

      // Always apply dark mode setting
      if (theme.forceDark !== undefined) {
        settingsState.DarkMode = theme.forceDark;
      }

      // Only apply color if this is a new theme
      if (!theme.webURL && theme.defaultColour) {
        settingsState.selectedColor = theme.defaultColour;
      }
    } catch (error) {
      console.error("[ThemeManager] Error updating theme preview:", error);
    }
  }

  /**
   * Update the preview of a theme (debounced)
   * @param theme - The theme to update the preview of
   */
  public updatePreviewDebounced = debounce(
    (theme: Partial<LoadedCustomTheme>): void => {
      this.updatePreview(theme);
    },
    2,
  );

  /**
   * Clear theme preview
   */
  public clearPreview(): void {
    console.debug("[ThemeManager] Clearing theme preview");
    try {
      // Remove preview images and revoke URLs
      this.previousImageVariableNames.forEach((variableName) => {
        this.removeImageFromDocument(variableName);
      });
      // Clear all cached URLs
      this.imageUrlCache.forEach((url) => URL.revokeObjectURL(url));
      this.imageUrlCache.clear();
      this.previousImageVariableNames = [];

      // Remove preview CSS
      if (this.previewStyleElement) {
        this.previewStyleElement.remove();
        this.previewStyleElement = null;
      }

      // Restore original settings
      const storedColor = localStorage.getItem("originalPreviewColor");

      if (storedColor) {
        settingsState.selectedColor = storedColor;
        localStorage.removeItem("originalPreviewColor");
      } else if (this.originalPreviewColor !== null) {
        console.debug(
          "[ThemeManager] Restoring color from memory:",
          this.originalPreviewColor,
        );
        settingsState.selectedColor = this.originalPreviewColor;
        console.debug(
          "[ThemeManager] Color after restore:",
          settingsState.selectedColor,
        );
      } else {
        console.debug("[ThemeManager] No color to restore found");
      }
      this.originalPreviewColor = null;

      if (this.originalPreviewTheme !== null) {
        console.debug(
          "[ThemeManager] Restoring dark mode:",
          this.originalPreviewTheme,
        );
        settingsState.DarkMode = this.originalPreviewTheme;
        this.originalPreviewTheme = null;
      }
    } catch (error) {
      console.error("[ThemeManager] Error clearing preview:", error);
    }
  }

  // Utility methods
  private stripBase64Prefix(base64String: string): string {
    if (!base64String) return "";

    const prefixRegex = /^data:[^;]+;base64,/;
    try {
      return prefixRegex.test(base64String)
        ? base64String.replace(prefixRegex, "")
        : base64String;
    } catch (err) {
      console.error("[ThemeManager] Error stripping base64 prefix:", err);
      return "";
    }
  }

  private base64ToBlob(base64: string): Blob {
    try {
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ab], { type: "image/png" });
    } catch (err) {
      console.error("[ThemeManager] Error converting base64 to blob:", err);
      return new Blob();
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private saveThemeFile(data: object, fileName: string): void {
    try {
      const fileData = JSON.stringify(data, null, 2);
      const blob = new Blob([fileData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[ThemeManager] Error saving theme file:", err);
    }
  }

  private removeImageFromDocument(variableName: string): void {
    try {
      const value = document.documentElement.style.getPropertyValue(
        "--" + variableName,
      );
      if (value) {
        const url = this.imageUrlCache.get(variableName);
        if (url) {
          URL.revokeObjectURL(url);
          this.imageUrlCache.delete(variableName);
        }
      }
      document.documentElement.style.removeProperty("--" + variableName);
    } catch (err) {
      console.error("[ThemeManager] Error removing image from document:", err);
    }
  }

  private applyPreviewCSS(css: string): void {
    console.debug("[ThemeManager] Applying preview CSS");
    try {
      if (!this.previewStyleElement) {
        this.previewStyleElement = document.createElement("style");
        this.previewStyleElement.id = "custom-theme-preview";
        document.head.appendChild(this.previewStyleElement);
      }
      this.previewStyleElement.textContent = css;
    } catch (error) {
      console.error("[ThemeManager] Error applying preview CSS:", error);
    }
  }
}
