<script lang="ts">
  import { onMount } from "svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  let { alwaysShowUserName = false, onClick = undefined } = $props<{
    alwaysShowUserName?: boolean;
    onClick?: () => void;
  }>();

  let cloudState = $state(cloudAuth.state);
  let open = $state(false);
  let dropdownEl: HTMLElement;

  onMount(() => {
    const unsubscribe = cloudAuth.subscribe((state) => {
      cloudState = state;
    });
    return unsubscribe;
  });

  function handleClickOutside(e: MouseEvent) {
    if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      const timer = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });

  async function handleLogout() {
    await cloudAuth.logout();
    open = false;
  }

  async function handleSignIn() {
    await cloudAuth.startLogin();
    open = false;
  }

  function handleButtonClick() {
    if (onClick) {
      onClick();
    } else {
      open = !open;
    }
  }

  function getInitials(): string {
    const u = cloudState.user;
    if (!u) return "?";
    if (u.displayName) return u.displayName.slice(0, 2).toUpperCase();
    if (u.username) return u.username.slice(0, 2).toUpperCase();
    if (u.email) return u.email.slice(0, 2).toUpperCase();
    return "?";
  }
</script>

<div class="relative flex items-center" bind:this={dropdownEl}>
  <button
    type="button"
    onclick={handleButtonClick}
    class="flex items-center gap-2 px-3 py-1.5 text-[0.75rem] rounded-lg shadow-2xl border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white transition-colors duration-200"
  >
    {#if cloudState.isLoggedIn}
      {#if cloudState.user?.pfpUrl}
        <img
          src={cloudState.user.pfpUrl}
          alt=""
          class="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-600"
        />
      {:else}
        <div class="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-[0.6rem]">
          {getInitials()}
        </div>
      {/if}
      <span
        class={alwaysShowUserName
          ? "inline max-w-[10rem] truncate text-[0.75rem]"
          : "hidden max-w-24 truncate sm:inline text-[0.75rem]"}
      >
        {cloudState.user?.displayName || cloudState.user?.username || cloudState.user?.email || "User"}
      </span>
    {:else}
      <span class="text-sm font-IconFamily" aria-hidden="true">{'\ued53'}</span>
      <span class="text-[0.75rem]">Sign in</span>
    {/if}
  </button>

  {#if !onClick && open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-xl z-[100] overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="p-4 border-b border-zinc-200 dark:border-zinc-600">
        <h3 class="text-xl font-bold text-zinc-900 dark:text-white">BetterSEQTA Cloud</h3>
        <p class="text-base text-zinc-500 dark:text-zinc-400">Sync favorites across devices</p>
      </div>
      <div class="p-4">
        {#if cloudState.isLoggedIn}
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              {#if cloudState.user?.pfpUrl}
                <img
                  src={cloudState.user.pfpUrl}
                  alt=""
                  class="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-600"
                />
              {:else}
                <div class="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-base">
                  {getInitials()}
                </div>
              {/if}
              <div class="min-w-0 flex-1">
                <p class="text-base font-medium text-zinc-900 dark:text-white truncate">
                  {cloudState.user?.displayName || cloudState.user?.username || cloudState.user?.email || "User"}
                </p>
                {#if cloudState.user?.email && cloudState.user?.email !== (cloudState.user?.displayName || cloudState.user?.username)}
                  <p class="text-base text-zinc-500 dark:text-zinc-400 truncate">{cloudState.user.email}</p>
                {/if}
              </div>
            </div>
            <button
              type="button"
              onclick={handleLogout}
              class="w-full px-4 py-3 text-base font-medium rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
        {:else}
          <div class="flex flex-col gap-3">
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to sync favorites across devices.
            </p>
            <button
              type="button"
              onclick={handleSignIn}
              class="w-full px-4 py-3 text-base font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors duration-200"
            >
              Sign in with BetterSEQTA Cloud
            </button>
            <p class="text-xs text-center text-zinc-400 dark:text-zinc-500">
              Opens accounts.betterseqta.org in a new tab
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
