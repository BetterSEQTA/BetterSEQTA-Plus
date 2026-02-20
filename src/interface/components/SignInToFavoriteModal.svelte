<script lang="ts">
  import { fade } from "svelte/transition";
  import { animate } from "motion";
  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";

  let { onClose } = $props<{ onClose: () => void }>();
  let modalElement: HTMLElement;

  $effect(() => {
    if (modalElement) {
      animate(modalElement, { scale: [0.9, 1], opacity: [0, 1] }, { type: "spring", stiffness: 300, damping: 25 });
    }
  });

  function handleSignIn() {
    onClose();
    if (document.getElementById("ExtensionPopup")) {
      closeExtensionPopup();
    } else {
      window.close();
    }
  }
</script>

<div
  class="flex fixed inset-0 z-[10000] justify-center items-center bg-black/50"
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
    class="p-4 mx-4 w-full max-w-md bg-white rounded-2xl shadow-2xl dark:bg-zinc-800 dark:text-white"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <h2 class="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
      Sign in to favorite themes
    </h2>

    <p class="mb-6 text-zinc-600 dark:text-zinc-400">
      Go to Settings → BetterSEQTA Cloud to sign in, or create an account to get started.
    </p>

    <div class="flex flex-wrap gap-2 justify-end">
      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors duration-200"
      >
        OK
      </button>
      <a
        href="https://accounts.betterseqta.org/register"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
      >
        Create account
      </a>
      <button
        type="button"
        onclick={handleSignIn}
        class="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors duration-200"
      >
        Sign in
      </button>
    </div>
  </div>
</div>
