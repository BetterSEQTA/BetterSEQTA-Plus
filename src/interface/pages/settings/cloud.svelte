<script lang="ts">
  import { onMount } from "svelte";
  import Button from "../../components/Button.svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";

  let username = $state("");
  let password = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let cloudState = $state(cloudAuth.state);

  onMount(() => {
    const unsubscribe = cloudAuth.subscribe((state) => {
      cloudState = state;
    });
    return unsubscribe;
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
      } else {
        error = result.error ?? "Login failed";
      }
    } finally {
      loading = false;
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

<div class="flex flex-col gap-4 p-1">
  <div class="overflow-hidden rounded-xl border border-zinc-200/50 dark:border-zinc-700/40 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-800/40 shadow-sm">
    <!-- Header with icon -->
    <div class="flex items-center gap-3 px-4 pt-4 pb-2">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-200/80 dark:bg-zinc-700/60">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-zinc-600 dark:text-zinc-300">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 0012.75 15h-10.5z" />
        </svg>
      </div>
      <div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-white">BetterSEQTA Cloud</h2>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">Sync favorites across devices</p>
      </div>
    </div>

    <div class="px-4 pb-4">
      {#if cloudState.isLoggedIn}
        <!-- Logged in state -->
        <div class="flex flex-col gap-4 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/50 p-4">
          <div class="flex items-center gap-3">
            {#if cloudState.user?.pfpUrl}
              <img
                src={cloudState.user.pfpUrl}
                alt=""
                class="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-600"
              />
            {:else}
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold text-sm">
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
          <Button onClick={handleLogout} text="Sign out" />
        </div>
      {:else}
        <!-- Login form -->
        <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to favorite themes in the store. Your favorites sync across devices when logged in.
        </p>
        <form
          class="flex flex-col gap-3"
          autocomplete="off"
          onsubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div>
            <label for="cloud-username" class="sr-only">Email or username</label>
            <input
              id="cloud-username"
              type="text"
              name="bscloud-login"
              autocomplete="off"
              placeholder="Email or username"
              bind:value={username}
              disabled={loading}
              class="w-full px-3 py-2.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200"
            />
          </div>
          <div>
            <label for="cloud-password" class="sr-only">Password</label>
            <input
              id="cloud-password"
              type="password"
              name="bscloud-password"
              autocomplete="new-password"
              placeholder="Password"
              bind:value={password}
              disabled={loading}
              class="w-full px-3 py-2.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition-colors duration-200"
            />
          </div>
          {#if error}
            <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
          {/if}
          <div class="flex flex-col gap-2">
            <Button
              onClick={handleLogin}
              text={loading ? "Signing in..." : "Sign in"}
            />
            <a
              href="https://accounts.betterseqta.org/register"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent-ring focus:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Create account
            </a>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
