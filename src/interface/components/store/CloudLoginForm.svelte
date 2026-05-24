<script lang="ts">
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  let {
    introText,
    onSuccess,
    compact = false,
  } = $props<{
    introText?: string;
    onSuccess?: () => void;
    /** Smaller padding/text for overlays (e.g. SignInToFavoriteModal) */
    compact?: boolean;
  }>();

  let username = $state("");
  let password = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);

  const inputClass = $derived(
    compact
      ? "w-full px-4 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200"
      : "w-full px-4 py-3 text-base rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200",
  );

  const btnClass = $derived(
    compact
      ? "w-full px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors duration-200"
      : "w-full px-4 py-3 text-base font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors duration-200",
  );

  const linkClass = $derived(
    compact
      ? "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
      : "inline-flex items-center justify-center gap-2 px-4 py-3 text-base font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200",
  );

  async function handleLogin() {
    if (loading) return;
    error = null;
    if (!username.trim() || !password) {
      error = "Please enter username and password";
      return;
    }
    loading = true;
    try {
      const result = await cloudAuth.login(username.trim(), password);
      if (result.success) {
        password = "";
        onSuccess?.();
      } else {
        error = result.error ?? "Login failed";
      }
    } finally {
      loading = false;
    }
  }
</script>

{#if introText}
  <p
    class="mb-4 text-zinc-600 dark:text-zinc-400 {compact ? 'text-sm' : 'text-base'}"
  >
    {introText}
  </p>
{/if}
<form
  class="flex flex-col gap-3"
  autocomplete="off"
  onsubmit={(e) => {
    e.preventDefault();
    handleLogin();
  }}
>
  <input
    type="text"
    name="betterseqta-cloud-username"
    autocomplete="off"
    placeholder="Email or username"
    bind:value={username}
    disabled={loading}
    readonly
    onfocus={(e) => e.currentTarget.removeAttribute("readonly")}
    class={inputClass}
  />
  <input
    type="password"
    name="betterseqta-cloud-password"
    autocomplete="new-password"
    placeholder="Password"
    bind:value={password}
    disabled={loading}
    readonly
    onfocus={(e) => e.currentTarget.removeAttribute("readonly")}
    class={inputClass}
  />
  {#if error}
    <p class="text-red-600 dark:text-red-400 {compact ? 'text-sm' : 'text-base'}">{error}</p>
  {/if}
  <button type="submit" disabled={loading} class={btnClass}>
    {loading ? "Signing in..." : "Sign in"}
  </button>
  <a
    href="https://accounts.betterseqta.org/register"
    target="_blank"
    rel="noopener noreferrer"
    class={linkClass}
  >
    Create account
  </a>
</form>
