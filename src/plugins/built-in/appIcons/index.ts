import type { Plugin } from "../../core/types";
import appstoredark from "@/resources/icons/dlappstore-dark.svg";
import appstorelight from "@/resources/icons/dlappstore-light.svg";
import gplayicon from "@/resources/icons/googleplay.svg";

const appIconPlugin: Plugin<{}, {}> = {
    id: "app-icons",
    name: "App Icons",
    description: "Fixes the unthemed playstore and app store icons in the SEQTA download page in settings.",
    version: "1.0.0",
    settings: {},
    disableToggle: true,

    run: async (api) => {
        const appstoreSelector =
            'a[href="https://itunes.apple.com/au/app/seqta-learn/id1143069793"]>img';
        const googleplaySelector =
            'a[href="https://play.google.com/store/apps/details?id=com.seqta.android.learn"]>img';

        let observer: MutationObserver | null = null;
        let classObserver: MutationObserver | null = null;

        const updateIcons = () => {
            const appstore =
                document.querySelector<HTMLImageElement>(appstoreSelector);
            const googleplay =
                document.querySelector<HTMLImageElement>(googleplaySelector);

            const isDark =
                document.documentElement.classList.contains("dark");

            if (appstore) {
                appstore.src = isDark ? appstoredark : appstorelight;
            }

            if (googleplay && appstore) {
                googleplay.src = gplayicon;
                googleplay.style.width = `130px`;
                googleplay.style.height = `40px`;
                googleplay.style.objectFit = "contain";
                googleplay.style.flexShrink = "0";
                googleplay.style.marginLeft = "8px";
            }
        };

        const ensureObserver = () => {
            observer?.disconnect();

            observer = new MutationObserver(() => {
                updateIcons();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        };

        const onHashChange = () => {
            if (window.location.hash === "#?page=/settings") {
                updateIcons();
                ensureObserver();
            } else {
                observer?.disconnect();
                observer = null;
            }
        };

        window.addEventListener("hashchange", onHashChange);

        classObserver = new MutationObserver(updateIcons);
        classObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        if (window.location.hash === "#?page=/settings") {
            updateIcons();
            ensureObserver();
        }
    },
};

export default appIconPlugin;
