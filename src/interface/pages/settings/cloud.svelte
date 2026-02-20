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
</script>

<div class="flex flex-col gap-4 p-1">
  <div class="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/40 bg-zinc-50/50 dark:bg-zinc-900/30">
    <h2 class="mb-2 text-lg font-bold">BetterSEQTA Cloud</h2>
    <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
      Sign in to favorite themes in the theme store. Your favorites sync across devices when logged in.
    </p>

    {#if cloudState.isLoggedIn}
      <div class="flex flex-col gap-3">
        <p class="text-sm">
          Signed in as
          <span class="font-medium">
            {cloudState.user?.displayName || cloudState.user?.username || cloudState.user?.email || "User"}
          </span>
        </p>
        <Button onClick={handleLogout} text="Sign out" />
      </div>
    {:else}
      <form
        class="flex flex-col gap-3"
        onsubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <input
          type="text"
          placeholder="Email or username"
          bind:value={username}
          disabled={loading}
          class="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring"
        />
        <input
          type="password"
          placeholder="Password"
          bind:value={password}
          disabled={loading}
          class="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:text-white border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-ring"
        />
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
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent-ring focus:ring-offset-2"
          >
            Create account
          </a>
        </div>
      </form>
    {/if}
  </div>
</div>
