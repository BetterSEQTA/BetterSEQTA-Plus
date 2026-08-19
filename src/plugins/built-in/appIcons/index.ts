import type { Plugin } from "@/plugins/core/types";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import appstoredark from "@/resources/icons/dlappstore-dark.svg";
import appstorelight from "@/resources/icons/dlappstore-light.svg";
import gplayicon from "@/resources/icons/googleplay.svg";
import styles from "./styles.css?inline";

const APPSTORE =
  'a[href="https://itunes.apple.com/au/app/seqta-learn/id1143069793"]>img';
const GOOGLEPLAY =
  'a[href="https://play.google.com/store/apps/details?id=com.seqta.android.learn"]>img';

const APPSTORE_DARK = resolveExtensionAssetUrl(appstoredark);
const APPSTORE_LIGHT = resolveExtensionAssetUrl(appstorelight);
const GOOGLEPLAY_ICON = resolveExtensionAssetUrl(gplayicon);

const appIconPlugin: Plugin<{}, {}> = {
  id: "app-icons",
  name: "App Icons",
  description:
    "Fixes unthemed App Store and Google Play icons on the SEQTA settings download page.",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  styles,

  run: async (api) => {
    let domObserver: MutationObserver | null = null;

    const updateIcons = () => {
      const appstore = document.querySelector<HTMLImageElement>(APPSTORE);
      const googleplay = document.querySelector<HTMLImageElement>(GOOGLEPLAY);
      const dark = document.documentElement.classList.contains("dark");

      if (appstore) {
        appstore.src = dark ? APPSTORE_DARK : APPSTORE_LIGHT;
      }

      if (googleplay) {
        googleplay.src = GOOGLEPLAY_ICON;
        googleplay.classList.add("bsplus-googleplay-badge");
      }
    };

    const watchDom = () => {
      domObserver?.disconnect();
      domObserver = new MutationObserver(updateIcons);
      domObserver.observe(document.body, { childList: true, subtree: true });
    };

    const stopDomWatch = () => {
      domObserver?.disconnect();
      domObserver = null;
    };

    const onSettingsPage = (page: string) => {
      if (page === "settings") {
        updateIcons();
        watchDom();
      } else {
        stopDomWatch();
      }
    };

    const pageChange = api.seqta.onPageChange(onSettingsPage);

    const themeObserver = new MutationObserver(updateIcons);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    onSettingsPage(api.seqta.getCurrentPage());

    return () => {
      pageChange.unregister();
      stopDomWatch();
      themeObserver.disconnect();
    };
  },
};

export default appIconPlugin;
