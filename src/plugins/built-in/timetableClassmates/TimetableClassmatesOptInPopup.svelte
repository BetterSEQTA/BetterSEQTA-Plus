<script lang="ts">
  import { onMount } from "svelte";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import { ACCOUNTS_BASE } from "./constants";
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
  let cloudName = $state(
    cloudAuth.state.user?.displayName ?? cloudAuth.state.user?.username ?? "",
  );

  onMount(() =>
    cloudAuth.subscribe((s) => {
      cloudLoggedIn = s.isLoggedIn;
      cloudName = s.user?.displayName ?? s.user?.username ?? "";
    }),
  );

  const canSubmit = $derived(agreeShare && agreeJoin && cloudLoggedIn && !busy);
  const checksDisabled = $derived(busy || !cloudLoggedIn);

  async function signInWithCloud() {
    busy = true;
    error = "";
    try {
      const res = await cloudAuth.startLogin();
      if (!res.success) error = res.error ?? "Could not open sign-in.";
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
    {#if cloudLoggedIn}
      <p class="bsplus-tc-cloud-ok">
        Signed in{cloudName ? ` as ${cloudName}` : ""}. We link this account to your SEQTA student id
        on this site.
      </p>
    {:else}
      <p class="bsplus-tc-muted">Sign in with a free cloud account to join your school phonebook.</p>
      <div class="bsplus-tc-cloud-actions">
        <button
          type="button"
          class="bsplus-cal-btn bsplus-cal-btn--primary"
          disabled={busy}
          onclick={() => void signInWithCloud()}
        >
          Sign in
        </button>
        <a
          class="bsplus-tc-link"
          href={`${ACCOUNTS_BASE}/register`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Create account
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
