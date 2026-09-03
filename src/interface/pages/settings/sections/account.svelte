<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import ConnectMobileApp from "@/interface/components/ConnectMobileApp.svelte";
  import CloudSettingsSync from "@/interface/components/CloudSettingsSync.svelte";
  import CloudHeader from "@/interface/components/store/CloudHeader.svelte";
  import SettingRow from "../SettingRow.svelte";
  import PluginSettingsBlocks from "../PluginSettingsBlocks.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import { matchesSearch, type SettingsSectionSharedProps } from "../shared";

  let {
    showDisclaimer,
    showCloudPanel,
    searchQuery = "",
  }: SettingsSectionSharedProps = $props();

  let cloudState = $state(cloudAuth.state);
  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudState = s;
    });
    return unsub;
  });

  const founderBadgeSetting = {
    title: "Titlebar founder badge",
    description: "Show your Cloud founder badge in the SEQTA titlebar",
  } as const;

  const showCloudCardHeader = $derived(
    matchesSearch(searchQuery, "BetterSEQTA Cloud", "Account & sync"),
  );

  const showFounderBadgeSetting = $derived(
    matchesSearch(
      searchQuery,
      founderBadgeSetting.title,
      founderBadgeSetting.description,
      "founder badge",
      "titlebar",
      "founder",
    ),
  );

  const showCloudAccountCard = $derived(showCloudCardHeader || showFounderBadgeSetting);
</script>

<SettingRow
  title="Connect Mobile App"
  description="Link your SEQTA session to DesQTA — the modern desktop and mobile app for SEQTA Learn"
  id={0}
  Component={ConnectMobileApp}
  {searchQuery}
  props={{}}
/>

{#if showCloudAccountCard}
  <div class="border-none">
    <div
      class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40"
    >
      {#if showCloudCardHeader}
        <div class="flex justify-between items-center px-5 py-4">
          <div class="pr-4">
            <h2 class="text-xl font-bold">BetterSEQTA Cloud</h2>
            <p class="text-base text-zinc-600 dark:text-zinc-300">Account & sync</p>
          </div>
          <div>
            <CloudHeader alwaysShowUserName onClick={showCloudPanel} />
          </div>
        </div>
      {/if}
      {#if cloudState.isLoggedIn}
        <div class="px-3 pb-3" class:pt-3={!showCloudCardHeader}>
          {#if showCloudCardHeader}
            <CloudSettingsSync
              showDisclaimer={(onConfirm, onCancel) =>
                showDisclaimer(
                  onConfirm,
                  onCancel,
                  "Restore from cloud?",
                  "This will replace your local settings with the cloud backup. Continue?",
                )}
            />
          {/if}
          {#if showFounderBadgeSetting}
            <SettingRow
              title={founderBadgeSetting.title}
              description={founderBadgeSetting.description}
              id={17}
              Component={Switch}
              {searchQuery}
              props={{
                state: $settingsState.showTitlebarFounderBadge !== false,
                onChange: (isOn: boolean) => (settingsState.showTitlebarFounderBadge = isOn),
              }}
            />
          {/if}
        </div>
      {:else if showFounderBadgeSetting}
        <div class="px-5 pb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to Cloud first.
        </div>
      {/if}
    </div>
  </div>
{/if}

<PluginSettingsBlocks section="account" {showDisclaimer} {searchQuery} />
