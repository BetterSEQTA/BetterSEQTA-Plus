<script lang="ts">
  import { onMount } from "svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  let username = $state("");
  let password = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
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
        open = false;
      } else {
        error = result.error ?? "Login failed";
      }
    } finally {
      loading = false;
    }
  }

  async function handleLogout() {
    await cloudAuth.logout();
    open = false;
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
    onclick={() => (open = !open)}
    class="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-700/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-600/80 transition-colors duration-200 text-base font-medium text-zinc-900 dark:text-white"
  >
    {#if cloudState.isLoggedIn}
      {#if cloudState.user?.pfpUrl}
        <img
          src={cloudState.user.pfpUrl}
          alt=""
          class="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-600"
        />
      {:else}
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-sm">
          {getInitials()}
        </div>
      {/if}
      <span class="hidden max-w-24 truncate sm:inline text-base">
        {cloudState.user?.displayName || cloudState.user?.username || cloudState.user?.email || "User"}
      </span>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 0012.75 15h-10.5z" />
      </svg>
      <span class="text-base font-medium">Sign in</span>
    {/if}
  </button>

  {#if open}
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
          <p class="mb-4 text-base text-zinc-600 dark:text-zinc-400">
            Sign in to favorite themes. Your favorites sync across devices when logged in.
          </p>
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
              onfocus={(e) => e.currentTarget.removeAttribute('readonly')}
              class="w-full px-4 py-3 text-base rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200"
            />
            <input
              type="password"
              name="betterseqta-cloud-password"
              autocomplete="new-password"
              placeholder="Password"
              bind:value={password}
              disabled={loading}
              readonly
              onfocus={(e) => e.currentTarget.removeAttribute('readonly')}
              class="w-full px-4 py-3 text-base rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200"
            />
            {#if error}
              <p class="text-base text-red-600 dark:text-red-400">{error}</p>
            {/if}
            <button
              type="submit"
              disabled={loading}
              class="w-full px-4 py-3 text-base font-medium rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <a
              href="https://accounts.betterseqta.org/register"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-2 px-4 py-3 text-base font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
            >
              Create account
            </a>
          </form>
        {/if}
      </div>
    </div>
  {/if}
</div>
