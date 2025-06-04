import type { Plugin } from "@/plugins/core/types";
import { defineSettings, componentSetting } from "@/plugins/core/settingsHelpers";
import ProfilePictureSetting from "./ProfilePictureSetting.svelte";
import { waitForElm } from "@/seqta/utils/waitForElm";
import styles from "./styles.css?inline";
import localforage from "localforage";

const settings = defineSettings({
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
  version: "1.1.0",
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

    // Setup localforage instance
    const store = localforage.createInstance({
      name: "profile-picture-store",
      storeName: "profilePicture",
    });

    async function updateImageFromStore() {
      // Remove old image if present
      if (img) {
        img.remove();
        img = null;
      }
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = undefined;
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

    // Initial load
    await updateImageFromStore();

    // Listen for profile picture updates
    const handler = () => { updateImageFromStore(); };
    window.addEventListener('profile-picture-updated', handler);

    return () => {
      window.removeEventListener('profile-picture-updated', handler);
      if (img) img.remove();
      if (svg) svg.style.display = "";
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  },
};

export default profilePicturePlugin;

