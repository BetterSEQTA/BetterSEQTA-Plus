import type { Plugin } from "@/plugins/core/types";
import { booleanSetting, componentSetting, defineSettings } from "@/plugins/core/settingsHelpers";
import ProfilePictureSetting from "./ProfilePictureSetting.svelte";
import { toMountableComponent } from "@/types/mountableComponent";
import { waitForElm } from "@/seqta/utils/waitForElm";
import browser from "@/lib/browser";
import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { revokePfpUrl } from "@/seqta/utils/cloudPfpCache";
import { loadPicture, REVISION_KEY } from "./picture";
import styles from "./styles.css?inline";

const settings = defineSettings({
  useCloudPfp: booleanSetting({
    default: false,
    title: "Use BetterSEQTA Cloud profile picture",
    description: "Show your cloud account picture instead of the one uploaded here",
  }),
  picture: componentSetting({
    title: "Profile Picture",
    description: "Upload or remove your profile picture",
    component: toMountableComponent(ProfilePictureSetting),
  }),
});

const profilePicturePlugin: Plugin<typeof settings> = {
  id: "profile-picture",
  name: "Custom Profile Picture",
  description: "Use your own image in place of the profile icon",
  version: "2.0.0",
  settings: settings,
  disableToggle: true,
  defaultEnabled: false,
  styles,

  run: async (api) => {
    let container: Element;
    try {
      container = await waitForElm(".userInfosvgdiv", true, 100, 60);
    } catch {
      return () => {};
    }

    const img = document.createElement("img");
    img.className = "userInfoImg";
    img.alt = "";
    let version = 0;

    const render = async () => {
      const current = ++version;
      const { isLoggedIn, user } = cloudAuth.state;
      const cloudUser = api.settings.useCloudPfp && isLoggedIn ? user : null;
      const url = await loadPicture(cloudUser);
      if (current !== version) return revokePfpUrl(url);
      revokePfpUrl(img.src);
      if (url) {
        img.src = url;
        container.append(img);
      } else {
        img.removeAttribute("src");
        img.remove();
      }
    };

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[REVISION_KEY]) void render();
    };
    browser.storage.onChanged.addListener(onStorage);
    const unsubscribe = cloudAuth.subscribe(() => void render());
    const setting = api.settings.onChange("useCloudPfp", () => void render());

    return () => {
      version++;
      setting.unregister();
      unsubscribe();
      browser.storage.onChanged.removeListener(onStorage);
      revokePfpUrl(img.src);
      img.remove();
    };
  },
};

export default profilePicturePlugin;
