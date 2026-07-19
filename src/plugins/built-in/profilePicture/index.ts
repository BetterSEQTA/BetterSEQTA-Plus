import type { Plugin } from "@/plugins/core/types";
import {
  booleanSetting,
  componentSetting,
  defineSettings,
} from "@/plugins/core/settingsHelpers";
import ProfilePictureSetting from "./ProfilePictureSetting.svelte";
import { waitForElm } from "@/seqta/utils/waitForElm";
import browser from "webextension-polyfill";
import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { resolveCloudPfp, defaultAccountsPfpUrl } from "@/seqta/utils/cloudPfpCache";
import styles from "./styles.css?inline";
import localforage from "localforage";

const settings = defineSettings({
  useCloudPfp: booleanSetting({
    default: false,
    title: "Use BetterSEQTA Cloud profile picture",
    description: "Use your cloud account avatar instead of the uploaded image below",
  }),
  picture: componentSetting({
    title: "Profile Picture",
    description: "Upload or remove your custom profile image",
    component: ProfilePictureSetting,
  }),
});

const profilePicturePlugin: Plugin<typeof settings> = {
  id: "profile-picture",
  name: "Custom Profile Picture",
  description: "Use your own image in place of the profile icon",
  version: "1.2.0",
  settings: settings,
  disableToggle: true,
  defaultEnabled: false,
  styles,

  run: async (api) => {
    await api.storage.loaded;
    let container: Element;
    try {
      container = await waitForElm(".userInfosvgdiv", true, 100, 60);
    } catch {
      return () => {};
    }

    const svg = container.querySelector(".userInfosvg") as HTMLElement | null;
    let img: HTMLImageElement | null = null;
    let currentBlobUrl: string | undefined;

    const store = localforage.createInstance({
      name: "profile-picture-store",
      storeName: "profilePicture",
    });

    async function applyProfileImage() {
      if (img) {
        img.remove();
        img = null;
      }
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = undefined;
      }

      const useCloud = api.settings.useCloudPfp;
      const userId = cloudAuth.state.user?.id;
      const pfpUrl =
        cloudAuth.state.user?.pfpUrl ??
        (userId ? defaultAccountsPfpUrl(userId) : undefined);

      if (useCloud && pfpUrl && userId) {
        const resolved = await resolveCloudPfp(userId, pfpUrl);
        if (resolved) {
          currentBlobUrl = resolved.src;
          img = document.createElement("img");
          img.className = "userInfoImg";
          img.src = resolved.src;
          if (svg) svg.style.display = "none";
          container.appendChild(img);
          return;
        }
      }

      const blob = await store.getItem<Blob>("profile-picture");
      if (blob && blob instanceof Blob) {
        currentBlobUrl = URL.createObjectURL(blob);
        img = document.createElement("img");
        img.className = "userInfoImg";
        img.src = currentBlobUrl;
        if (svg) svg.style.display = "none";
        container.appendChild(img);
      } else {
        if (svg) svg.style.display = "";
      }
    }

    if (api.settings.useCloudPfp && cloudAuth.state.isLoggedIn) {
      const { pullCloudProfilePictureFromServer } = await import(
        "@/seqta/utils/cloudPfpSync"
      );
      await pullCloudProfilePictureFromServer();
    }

    await applyProfileImage();

    const onLocalPictureUpdated = () => {
      void applyProfileImage();
    };
    window.addEventListener("profile-picture-updated", onLocalPictureUpdated);

    const onStorageRevision = (
      changes: Record<string, browser.Storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes.profile_picture_revision) {
        void applyProfileImage();
      }
    };
    browser.storage.onChanged.addListener(onStorageRevision);

    const cloudUnsub = cloudAuth.subscribe(() => {
      void applyProfileImage();
    });

    const useCloudUnreg = api.settings.onChange("useCloudPfp", (enabled: boolean) => {
      void import("@/seqta/utils/cloudPfpSync").then(({ onUseCloudPfpToggled }) =>
        onUseCloudPfpToggled(enabled),
      );
      void applyProfileImage();
    });

    return () => {
      useCloudUnreg.unregister();
      cloudUnsub();
      window.removeEventListener("profile-picture-updated", onLocalPictureUpdated);
      browser.storage.onChanged.removeListener(onStorageRevision);
      if (img) img.remove();
      if (svg) svg.style.display = "";
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  },
};

export default profilePicturePlugin;
