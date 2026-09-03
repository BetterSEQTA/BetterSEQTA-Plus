<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import Button from "@/interface/components/Button.svelte";
  import SettingRow from "../SettingRow.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { showPrivacyNotification } from "@/seqta/utils/Openers/OpenPrivacyNotification";
  import { showThemeOfTheMonthPopupNow } from "@/seqta/utils/Openers/OpenThemeOfTheMonthPopup";
  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { getSnapshotForUpload } from "@/seqta/utils/cloudSettingsSync";
  import { getStoredOverride, setApiBase } from "@/seqta/utils/DevApiBase";
  import { matchesSearch, type SettingsSectionSharedProps } from "../shared";

  let { searchQuery = "" }: SettingsSectionSharedProps = $props();

  let devApiBaseInput = $state<string>(getStoredOverride() ?? "");
  let devApiBaseActive = $state<string | null>(getStoredOverride());

  function applyDevApiBase() {
    const trimmed = devApiBaseInput.trim();
    if (trimmed === "") {
      setApiBase(null);
      devApiBaseActive = null;
      return;
    }
    if (!/^https?:\/\//.test(trimmed)) {
      alert("Please enter a full URL starting with http:// or https://");
      return;
    }
    setApiBase(trimmed);
    devApiBaseActive = trimmed.replace(/\/$/, "");
  }

  function clearDevApiBase() {
    devApiBaseInput = "";
    setApiBase(null);
    devApiBaseActive = null;
  }

  async function exportCloudSettingsJsonToFile() {
    const payload = await getSnapshotForUpload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `betterseqta-plus-settings-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<SettingRow
  title="BetterSEQTA+"
  description="Enables BetterSEQTA+ features"
  id={12}
  Component={Switch}
  {searchQuery}
  props={{
    state: $settingsState.onoff,
    onChange: (isOn: boolean) => (settingsState.onoff = isOn),
  }}
/>

{#if $settingsState.devMode && matchesSearch(
  searchQuery,
  "Developer Mode",
  "Verbose logging",
  "Delay loading screen",
  "Sensitive Hider",
  "Mock Notices",
  "Show Privacy Notification",
  "Show Theme of the Month",
  "Export cloud settings JSON",
  "API Base URL",
  "GitHub latest version override",
)}
  <div
    class="flex-col p-1 my-1 bg-gradient-to-br from-white rounded-xl border shadow-sm to-zinc-100 border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40"
  >
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Developer Mode</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Enables developer mode, allowing you to test new features and changes.
        </p>
      </div>
      <div>
        <Switch
          state={$settingsState.devMode}
          onChange={(isOn: boolean) => (settingsState.devMode = isOn)}
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Verbose logging</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Show diagnostic console output (indexer, theme manager, timetable colour patch, etc.)
        </p>
      </div>
      <div>
        <Switch
          state={$settingsState.verboseLogging ?? false}
          onChange={(isOn: boolean) => (settingsState.verboseLogging = isOn)}
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Delay loading screen</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Keep the loading overlay visible for 5 extra seconds so you can preview canvas variants.
        </p>
      </div>
      <div>
        <Switch
          state={$settingsState.devDelayLoadingScreen ?? false}
          onChange={(isOn: boolean) => (settingsState.devDelayLoadingScreen = isOn)}
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Sensitive Hider</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Replace sensitive content with mock data
        </p>
      </div>
      <div>
        <Switch
          state={$settingsState.hideSensitiveContent ?? false}
          onChange={(isOn: boolean) => (settingsState.hideSensitiveContent = isOn)}
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Mock Notices</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Use fake notice data on homepage instead of real data
        </p>
      </div>
      <div>
        <Switch
          state={$settingsState.mockNotices ?? false}
          onChange={(isOn: boolean) => (settingsState.mockNotices = isOn)}
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Show Privacy Notification</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Show the privacy notification popup on next page load
        </p>
      </div>
      <div>
        <Button
          onClick={async () => {
            settingsState.privacyStatementShown = false;
            settingsState.privacyStatementLastUpdated = undefined;
            closeExtensionPopup();
            await new Promise((resolve) => setTimeout(resolve, 100));
            await showPrivacyNotification();
          }}
          text="Show Now"
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Show Theme of the Month</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Fetch and show the current month's popup now (ignores dismissed state)
        </p>
      </div>
      <div>
        <Button
          onClick={async () => {
            closeExtensionPopup();
            await new Promise((resolve) => setTimeout(resolve, 100));
            await showThemeOfTheMonthPopupNow();
          }}
          text="Show Now"
        />
      </div>
    </div>
    <div class="flex justify-between items-center px-5 py-4">
      <div class="pr-4">
        <h2 class="text-xl font-bold">Export cloud settings JSON</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Download the same payload as cloud sync (OAuth tokens stripped). For debugging and server
          testing.
        </p>
      </div>
      <div>
        <Button onClick={exportCloudSettingsJsonToFile} text="Export to file" />
      </div>
    </div>
    <div class="flex flex-col gap-2 px-4 py-3">
      <div class="flex justify-between items-start gap-3">
        <div class="pr-4">
          <h2 class="text-xl font-bold">API Base URL (session only)</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Override the content API host for this browser session. Cleared on restart. Affects
            themes, theme of the month, and other server-driven content.
          </p>
          {#if devApiBaseActive}
            <p class="text-xs mt-1 text-amber-600 dark:text-amber-400">
              Override active: <span class="font-mono">{devApiBaseActive}</span>
            </p>
          {/if}
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <input
          type="text"
          placeholder="https://betterseqta.org"
          bind:value={devApiBaseInput}
          class="flex-1 px-2 py-1 text-xs rounded border bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
        <Button onClick={applyDevApiBase} text="Apply" />
        {#if devApiBaseActive}
          <Button onClick={clearDevApiBase} text="Clear" />
        {/if}
      </div>
    </div>
    <div class="flex flex-col gap-2 px-4 py-3">
      <div>
        <h2 class="text-xl font-bold">GitHub latest version override</h2>
        <p class="text-base text-zinc-600 dark:text-zinc-300">
          Pretend a newer GitHub release exists to test the update badge. Only applies when dev mode
          is on.
        </p>
      </div>
      <input
        type="text"
        placeholder="e.g. 9.9.9"
        value={$settingsState.devGhReleaseVersionOverride ?? ""}
        oninput={(e) => {
          settingsState.devGhReleaseVersionOverride = e.currentTarget.value;
        }}
        class="px-2 py-1 text-xs rounded border bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
      />
    </div>
  </div>
{/if}
