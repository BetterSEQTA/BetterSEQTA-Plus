import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import { defineSettings } from "@/plugins/core/settingsHelpers";
import { waitForElm } from "@/seqta/utils/waitForElm";
import renderSvelte from "@/interface/main";
import BetterEditor from "./BetterEditor.svelte";
import { unmount } from "svelte";

const settings = defineSettings({});

class CustomMessageEditorPlugin extends BasePlugin<typeof settings> {}

const settingsInstance = new CustomMessageEditorPlugin();

const customMessageEditorPlugin: Plugin<typeof settings> = {
  id: "custom-message-editor",
  name: "Custom Message Editor",
  description: "Enhanced message editor with better editing capabilities",
  version: "1.0.0",
  settings: settingsInstance.settings,
  defaultEnabled: true,

  run: async (api) => {
    let currentShadowContainer: HTMLElement | null = null;
    let currentSvelteApp: any = null;
    let currentEditorId: string | null = null;
    let lastCKEditorContent: string = "";

    const cleanup = (resetEditorId = true) => {
      if (currentSvelteApp) {
        unmount(currentSvelteApp);
        currentSvelteApp = null;
      }
      if (currentShadowContainer) {
        currentShadowContainer.remove();
        currentShadowContainer = null;
      }
      if (resetEditorId) {
        currentEditorId = null;
      }
    };

    const handleEditorChange = (value: string) => {
      if (currentEditorId) {
        window.postMessage(
          {
            type: "ckeditorSetData",
            editorId: currentEditorId,
            content: value,
          },
          "*",
        );
      }
    };

    const getCKEditorContent = () => {
      if (currentEditorId) {
        window.postMessage(
          {
            type: "ckeditorGetData",
            editorId: currentEditorId,
          },
          "*",
        );
      }
    };

    const messageListener = (event: MessageEvent) => {
      if (event.data.type === "ckeditorGetDataResponse") {
        lastCKEditorContent = event.data.data;
        console.log("Retrieved CKEditor content:", lastCKEditorContent);
      }
    };

    window.addEventListener("message", messageListener);

    const injectBetterEditorButton = async (composer: Element) => {
      try {
        const pillbox = await waitForElm(
          ".coneqtMessage.composer .footer .pillbox",
          true,
          100,
          50,
        );

        if (!pillbox) {
          console.error("Could not find pillbox element");
          return;
        }

        if (pillbox.querySelector(".better-editor-btn")) {
          return;
        }

        const betterEditorBtn = document.createElement("button");
        betterEditorBtn.type = "button";
        betterEditorBtn.className = "notLast editorMode better-editor-btn";
        betterEditorBtn.textContent = "Better Editor";
        betterEditorBtn.setAttribute("data-key", "better");

        const htmlEditorBtn = pillbox.querySelector(
          'button[data-key="html"]',
        ) as HTMLButtonElement;
        if (!htmlEditorBtn) {
          console.error("Could not find HTML editor button");
          return;
        }

        pillbox.insertBefore(betterEditorBtn, htmlEditorBtn);

        betterEditorBtn.addEventListener("click", async () => {
          const simpleEditorBtn = pillbox.querySelector(
            'button[data-key="content"]',
          ) as HTMLButtonElement;
          if (simpleEditorBtn) {
            simpleEditorBtn.click();
          }

          pillbox.querySelectorAll(".editorMode").forEach((btn) => {
            btn.classList.remove("depressed");
          });
          if (simpleEditorBtn) {
            simpleEditorBtn.classList.add("depressed");
          }

          const wrapper = composer.querySelector(
            ".prime .body .formattedText .wrapper",
          );
          const ckeElement = wrapper?.querySelector(".cke");

          if (!wrapper || !ckeElement) {
            console.error("Could not find wrapper or CKE elements");
            return;
          }

          if (ckeElement.id) {
            const ckeMatch = ckeElement.id.match(/^cke_(.+)$/);
            if (ckeMatch) {
              currentEditorId = ckeMatch[1];
              console.log("Found CKEditor ID:", currentEditorId);
            }
          }

          let initialContent = "";
          
          if (currentEditorId) {
            window.postMessage(
              {
                type: "ckeditorGetData",
                editorId: currentEditorId,
              },
              "*",
            );

            initialContent = await new Promise<string>((resolve) => {
              const timeout = setTimeout(() => resolve(""), 1000);

              const responseListener = (event: MessageEvent) => {
                if (event.data.type === "ckeditorGetDataResponse") {
                  clearTimeout(timeout);
                  window.removeEventListener("message", responseListener);
                  resolve(event.data.data || "");
                }
              };

              window.addEventListener("message", responseListener);
            });
          }

          (ckeElement as HTMLElement).style.display = "none";

          cleanup(false);

          const shadowContainer = document.createElement("div");
          shadowContainer.className = "better-editor-container";
          shadowContainer.style.cssText =
            "width: 100%; height: 100%; min-height: 200px; overflow-y: scroll; background: var(--background-primary); border-radius: 16px; padding: 4px;";

          const shadowRoot = shadowContainer.attachShadow({ mode: "open" });

          currentSvelteApp = renderSvelte(BetterEditor, shadowRoot, {
            initialContent,
            onchange: handleEditorChange,
          });

          wrapper.appendChild(shadowContainer);
          currentShadowContainer = shadowContainer;

          pillbox.querySelectorAll(".editorMode").forEach((btn) => {
            btn.classList.remove("depressed");
          });
          betterEditorBtn.classList.add("depressed");
        });

        pillbox
          .querySelectorAll(".editorMode:not(.better-editor-btn)")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              getCKEditorContent();

              cleanup(false);

              const wrapper = composer.querySelector(
                ".prime .body .formattedText .wrapper",
              );
              const ckeElement = wrapper?.querySelector(".cke");
              if (ckeElement) {
                (ckeElement as HTMLElement).style.display = "";
              }
            });
          });
      } catch (error) {
        console.error("Error injecting Better Editor button:", error);
      }
    };

    const { unregister } = api.seqta.onMount(".uiSlidePane", (slidePane) => {
      console.log("Found slide pane, checking for message composer");
      const messageComposer = slidePane.querySelector(
        ".coneqtMessage.composer",
      );
      if (messageComposer) {
        console.log("Found message composer, injecting Better Editor button");
        injectBetterEditorButton(messageComposer);
      }
    });

    return () => {
      cleanup();
      unregister();
      window.removeEventListener("message", messageListener);
    };
  },
};

export default customMessageEditorPlugin;
