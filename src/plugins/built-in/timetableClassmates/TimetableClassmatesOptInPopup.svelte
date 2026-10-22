<script lang="ts">
  import { onMount } from "svelte";
  import CloudPfpAvatar from "@/interface/components/CloudPfpAvatar.svelte";
  import { cloudAuth, type CloudUser } from "@/seqta/utils/CloudAuth";
  import { ACCOUNTS_BASE } from "./constants";
  import { markResumeOptInAfterCloudLogin } from "./optInResume";
  import { registerOptIn } from "./syncOrchestrator";

  interface Props {
    onAccepted: () => void | Promise<void>;
    onCancel: () => void;
    onComplete: () => void;
  }

  let { onAccepted, onCancel, onComplete }: Props = $props();

  let agreeShare = $state(false);
  let agreeJoin = $state(false);
  let busy = $state(false);
  let error = $state("");
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);
  let cloudUser = $state<CloudUser | null>(cloudAuth.state.user);

  onMount(() =>
    cloudAuth.subscribe((s) => {
      cloudLoggedIn = s.isLoggedIn;
      cloudUser = s.user;
    }),
  );

  function cloudInitials(user: CloudUser | null | undefined): string {
    if (!user) return "?";
    if (user.displayName) return user.displayName.slice(0, 2).toUpperCase();
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return "?";
  }

  function cloudDisplayName(user: CloudUser | null | undefined): string {
    if (!user) return "Cloud account";
    return user.displayName || user.username || user.email || "Cloud account";
  }

  function cloudSubtitle(user: CloudUser | null | undefined): string | null {
    if (!user) return null;
    if (user.username) return `@${user.username}`;
    if (user.email) return user.email;
    return null;
  }

  const canSubmit = $derived(agreeShare && agreeJoin && cloudLoggedIn && !busy);
  const checksDisabled = $derived(busy || !cloudLoggedIn);

  async function signInWithCloud() {
    busy = true;
    error = "";
    try {
      const res = await cloudAuth.startLogin();
      if (!res.success) {
        error = res.error ?? "Could not open sign-in.";
        return;
      }
      markResumeOptInAfterCloudLogin();
    } finally {
      busy = false;
    }
  }

  async function accept() {
    if (!canSubmit) return;
    error = "";
    busy = true;
    try {
      const reg = await registerOptIn();
      if (!reg.ok) {
        error = reg.error ?? "Could not complete opt-in.";
        return;
      }
      if (reg.error) error = reg.error;
      await onAccepted();
      onComplete();
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="bsplus-tc-popup">
  <section class="bsplus-tc-card bsplus-tc-cloud" aria-labelledby="bsplus-tc-cloud-heading">
    <h2 id="bsplus-tc-cloud-heading">BetterSEQTA Cloud</h2>

    {#if cloudLoggedIn && cloudUser}
      <div class="bsplus-tc-cloud-user" role="status">
        <div class="bsplus-tc-cloud-avatar" aria-hidden="true">
          <span class="bsplus-tc-cloud-avatar-fallback">{cloudInitials(cloudUser)}</span>
          <CloudPfpAvatar user={cloudUser} class="bsplus-tc-cloud-avatar-img" />
        </div>
        <div class="bsplus-tc-cloud-user-meta">
          <span class="bsplus-tc-cloud-user-name">{cloudDisplayName(cloudUser)}</span>
          {#if cloudSubtitle(cloudUser)}
            <span class="bsplus-tc-cloud-user-sub">{cloudSubtitle(cloudUser)}</span>
          {/if}
        </div>
        <span class="bsplus-tc-cloud-check iconFamily" aria-hidden="true">&#xe9db;</span>
      </div>
    {:else}
      <p class="bsplus-tc-cloud-lead">
        Sign in with your free cloud account to join your school's classmate phonebook.
      </p>
      <div class="bsplus-tc-cloud-actions">
        <button
          type="button"
          class="bsplus-cal-btn bsplus-cal-btn--primary bsplus-tc-cloud-signin"
          disabled={busy}
          onclick={() => void signInWithCloud()}
        >
          Sign in with Cloud
        </button>
        <a
          class="bsplus-tc-link"
          href={`${ACCOUNTS_BASE}/register`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Create free account
        </a>
      </div>
    {/if}
  </section>

  <ul class="bsplus-tc-bullets">
    <li>Class codes are encrypted in your browser before they reach the relay.</li>
    <li>Cloud stores a school phonebook (ids + binding), not lesson times or rooms.</li>
    <li>After you opt in, BetterSEQTA+ syncs automatically when your timetable changes.</li>
  </ul>

  <div class="bsplus-tc-checks">
    <label>
      <input type="checkbox" bind:checked={agreeShare} disabled={checksDisabled} />
      <span>
        I understand my class enrollments are shared with opted-in students via the encrypted cloud
        relay and phonebook.
      </span>
    </label>
    <label>
      <input type="checkbox" bind:checked={agreeJoin} disabled={checksDisabled} />
      <span>I agree to participate in timetable classmate sharing on this SEQTA site.</span>
    </label>
  </div>

  {#if error}
    <p class="bsplus-tc-error">{error}</p>
  {/if}

  <div class="bsplus-tc-actions">
    <button
      type="button"
      class="bsplus-cal-btn bsplus-cal-btn--ghost"
      disabled={busy}
      onclick={() => onCancel()}
    >
      Not now
    </button>
    <button
      type="button"
      class="bsplus-cal-btn bsplus-cal-btn--primary"
      disabled={!canSubmit}
      onclick={() => void accept()}
    >
      {busy ? "Enabling & syncing…" : "Enable sharing"}
    </button>
  </div>
</div>
