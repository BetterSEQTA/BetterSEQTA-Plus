<script lang="ts">
  import { fade } from "svelte/transition";
  import { animate } from "motion";
  import { onMount } from "svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  let { onClose } = $props<{ onClose: () => void }>();
  let modalElement: HTMLElement;

  onMount(() => {
    return cloudAuth.subscribe((s) => {
      if (s.isLoggedIn) onClose();
    });
  });

  $effect(() => {
    if (modalElement) {
      animate(
        modalElement,
        { scale: [0.9, 1], opacity: [0, 1] },
        { type: "spring", stiffness: 300, damping: 25 },
      );
    }
  });

  async function handleSignIn() {
    await cloudAuth.startLogin();
  }
</script>

<div
  class="flex fixed inset-0 z-[99999] justify-center items-center bg-black/50"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  onkeydown={(e) => {
    if (e.key === "Escape") onClose();
  }}
  role="button"
  tabindex="-1"
  transition:fade={{ duration: 150 }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={modalElement}
    class="p-4 mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl dark:bg-zinc-800 dark:text-white"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <h2 class="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
      Sign in to favorite themes
    </h2>

    <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
      Sign in to the Theme Store to save favorites across devices, or create an account to get started.
    </p>

    <button
      type="button"
      onclick={handleSignIn}
      class="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors duration-200"
    >
      Sign in with BetterSEQTA Cloud
    </button>
    <p class="mt-2 text-xs text-center text-zinc-400 dark:text-zinc-500">
      Opens accounts.betterseqta.org in a new tab
    </p>

    <div class="flex justify-end mt-4">
      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors duration-200"
      >
        Close
      </button>
    </div>
  </div>
</div>
