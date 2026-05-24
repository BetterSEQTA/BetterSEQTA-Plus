<script lang="ts">
  import { onMount } from "svelte";
  import { animate } from "motion";
  import { delay } from "@/seqta/utils/delay.ts";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  const { hidePanel } = $props<{
    hidePanel: () => void;
  }>();

  let cloudState = $state(cloudAuth.state);
  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);
  let loginError = $state<string | null>(null);

  onMount(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudState = s;
    });

    if (background && content) {
      animate(
        background,
        { opacity: [0, 1] },
        { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      );
      animate(
        content,
        { scale: [0.4, 1], opacity: [0, 1] },
        { type: "spring", stiffness: 400, damping: 30 }
      );
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      unsub();
      document.removeEventListener("keydown", handleEscapeKey);
    };
  });

  async function closePanel() {
    if (!background || !content) return;
    animate(
      content,
      { scale: [1, 0.4], opacity: [1, 0] },
      { type: "spring", stiffness: 400, damping: 30 }
    );
    animate(
      background,
      { opacity: [1, 0] },
      { ease: [0.4, 0, 0.2, 1] }
    );
    await delay(400);
    hidePanel();
  }

  function handleBackgroundClick(event: MouseEvent) {
    if (event.target === background) closePanel();
  }

  async function handleSignIn() {
    loginError = null;
    const result = await cloudAuth.startLogin();
    if (result.success) {
      closePanel();
    } else {
      loginError = result.error ?? "Failed to open login page";
    }
  }

  async function handleLogout() {
    await cloudAuth.logout();
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={background}
  class="flex absolute top-0 left-0 z-50 justify-center items-center w-full h-full cursor-pointer bg-black/50"
  onclick={handleBackgroundClick}
  onkeydown={(e) => { if (e.key === "Enter") handleBackgroundClick; }}
>
  <div
    bind:this={content}
    class="p-5 w-[320px] bg-white rounded-xl border shadow-lg cursor-auto dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
  >
    <h3 class="text-lg font-bold text-zinc-900 dark:text-white">BetterSEQTA Cloud</h3>
    <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Account & sync</p>

    <div class="mt-4">
      {#if cloudState.isLoggedIn}
        <div class="flex flex-col gap-4">
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
              <p class="text-sm font-medium text-zinc-900 dark:text-white truncate">
                {cloudState.user?.displayName || cloudState.user?.username || cloudState.user?.email || "User"}
              </p>
              {#if cloudState.user?.email && cloudState.user?.email !== (cloudState.user?.displayName || cloudState.user?.username)}
                <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">{cloudState.user.email}</p>
              {/if}
            </div>
          </div>
          <button
            type="button"
            onclick={handleLogout}
            class="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors duration-200"
          >
            Sign out
          </button>
        </div>
      {:else}
        <div class="flex flex-col gap-3">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to sync settings across devices, use your cloud profile picture, and more.
          </p>
          <button
            type="button"
            onclick={handleSignIn}
            class="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors duration-200"
          >
            Sign in with BetterSEQTA Cloud
          </button>
          {#if loginError}
            <p class="text-xs text-red-600 dark:text-red-400">{loginError}</p>
          {/if}
          <p class="text-xs text-center text-zinc-400 dark:text-zinc-500">
            Opens accounts.betterseqta.org in a new tab
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
