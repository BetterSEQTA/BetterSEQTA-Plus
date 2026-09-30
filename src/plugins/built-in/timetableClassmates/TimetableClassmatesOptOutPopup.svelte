<script lang="ts">
  import { revokeOptIn } from "./syncOrchestrator";

  interface Props {
    onConfirmed: () => void | Promise<void>;
    onCancel: () => void;
    onComplete: () => void;
  }

  let { onConfirmed, onCancel, onComplete }: Props = $props();

  let agreeUnderstand = $state(false);
  let busy = $state(false);
  let error = $state("");

  const canSubmit = $derived(agreeUnderstand && !busy);

  async function confirmOptOut() {
    if (!canSubmit) return;
    error = "";
    busy = true;
    try {
      const res = await revokeOptIn();
      if (!res.ok) {
        error = res.error ?? "Opt-out failed.";
        return;
      }
      await onConfirmed();
      onComplete();
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="bsplus-tc-popup">
  <div class="bsplus-tc-card bsplus-tc-warning">
    <p>
      You will leave the school phonebook and your encrypted share will be removed from the relay.
      Classmates will stop seeing you on their timetables after they sync.
    </p>
  </div>

  <ul class="bsplus-tc-bullets">
    <li>Your local classmate roster cache on this device is cleared for your account.</li>
    <li>Classmates may still have roster data from before you opted out until their next sync.</li>
    <li>You can opt in again later — sharing and sync will start fresh from that point.</li>
  </ul>

  <div class="bsplus-tc-checks">
    <label>
      <input type="checkbox" bind:checked={agreeUnderstand} disabled={busy} />
      <span>I understand and want to stop classmate sharing for this SEQTA site.</span>
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
      Keep sharing
    </button>
    <button
      type="button"
      class="bsplus-cal-btn bsplus-cal-btn--danger"
      disabled={!canSubmit}
      onclick={() => void confirmOptOut()}
    >
      {busy ? "Opting out…" : "Stop sharing"}
    </button>
  </div>
</div>
