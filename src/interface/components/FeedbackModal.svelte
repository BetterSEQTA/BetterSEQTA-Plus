<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { onMount, tick } from "svelte";
  import Switch from "./Switch.svelte";
  import {
    FEEDBACK_CATEGORIES,
    FEEDBACK_MESSAGE_MAX,
    FEEDBACK_MESSAGE_MIN,
    type FeedbackCategory,
  } from "@/seqta/utils/feedback/constants";
  import {
    FeedbackApiError,
    addPendingFeedbackId,
    categoryLabel,
    fetchFeedbackStatusItem,
    fetchFeedbackStatusList,
    formatStatus,
    getInstanceHostname,
    hasReply,
    removePendingFeedbackIds,
    submitFeedback,
    validateFeedbackForm,
    type FeedbackStatusItem,
  } from "@/seqta/utils/feedback/client";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import Spinner from "./Spinner.svelte";

  let { onClose, initialFeedbackId = null } = $props<{
    onClose: () => void;
    initialFeedbackId?: string | null;
  }>();

  let tab = $state<"send" | "status">(
    typeof initialFeedbackId === "string" && initialFeedbackId ? "status" : "send",
  );
  let category = $state<FeedbackCategory>("bug");
  let subject = $state("");
  let message = $state("");
  let includeContact = $state(false);
  let contactName = $state("");
  let contactEmail = $state("");
  let includeInstance = $state(false);
  let submitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successId = $state<string | null>(null);
  let statusLoading = $state(false);
  let statusError = $state<string | null>(null);
  let statusItems = $state<FeedbackStatusItem[]>([]);
  let selectedItem = $state<FeedbackStatusItem | null>(null);

  const instanceHostname = getInstanceHostname();
  const isDark = $derived(!!$settingsState.DarkMode);
  const busy = $derived(submitting || statusLoading);
  const fieldStyle = $derived(
    isDark
      ? "background-color:#18181b;color:#fafafa;border-color:#52525b;color-scheme:dark"
      : "background-color:#fff;color:#18181b;border-color:#e4e4e7;color-scheme:light",
  );
  const field =
    "feedback-field w-full px-3 py-2.5 text-[18px] rounded-lg border focus:outline-none focus:ring-2 focus:ring-zinc-400";
  const btn =
    "px-4 py-2 text-[18px] font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50";
  const btnMuted = $derived(
    `${btn} ${isDark ? "bg-zinc-700 text-zinc-200" : "bg-zinc-200 text-zinc-700"}`,
  );
  const btnPrimary = $derived(
    `${btn} ${isDark ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-white"}`,
  );
  const panelKey = $derived(
    tab === "send"
      ? successId
        ? "send-success"
        : "send-form"
      : selectedItem
        ? `status-${selectedItem.id}`
        : "status-list",
  );

  let panelBodyEl = $state<HTMLDivElement | null>(null);
  let panelHeightPx = $state<number | null>(null);

  const panelHeightEase = "cubic-bezier(0.22, 1, 0.36, 1)";
  const panelHeightMotion = $derived(
    $settingsState.animations && panelHeightPx !== null
      ? `height 280ms ${panelHeightEase}`
      : "none",
  );

  function measurePanelHeight() {
    if (!panelBodyEl) return;
    panelHeightPx = panelBodyEl.scrollHeight;
  }

  function panelMeasure(node: HTMLDivElement) {
    panelBodyEl = node;

    const update = () => {
      panelHeightPx = node.scrollHeight;
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(node);

    return {
      destroy() {
        ro.disconnect();
        if (panelBodyEl === node) panelBodyEl = null;
      },
    };
  }

  $effect(() => {
    panelKey;
    includeContact;
    errorMessage;
    statusLoading;
    statusItems.length;
    selectedItem;
    void tick().then(() => measurePanelHeight());
  });

  function isStatusDetailKey(key: string): boolean {
    return key.startsWith("status-") && key !== "status-list";
  }

  function errText(e: unknown): string {
    if (e instanceof FeedbackApiError) return e.message;
    return e instanceof Error ? e.message : "Something went wrong.";
  }

  async function loadStatusList() {
    statusLoading = true;
    statusError = null;
    selectedItem = null;
    try {
      statusItems = await fetchFeedbackStatusList(10);
    } catch (e) {
      statusItems = [];
      statusError = errText(e);
    } finally {
      statusLoading = false;
    }
  }

  async function openStatusItem(id: string) {
    statusLoading = true;
    statusError = null;
    try {
      selectedItem = await fetchFeedbackStatusItem(id);
      tab = "status";
      successId = null;
      if (selectedItem && hasReply(selectedItem)) {
        void removePendingFeedbackIds([selectedItem.id]);
      }
    } catch (e) {
      statusError = errText(e);
    } finally {
      statusLoading = false;
    }
  }

  function selectTab(next: "send" | "status") {
    tab = next;
    errorMessage = null;
    statusError = null;
    successId = null;
    selectedItem = null;
    if (next === "status") void loadStatusList();
  }

  onMount(() => {
    void tick().then(() => measurePanelHeight());
    if (typeof initialFeedbackId === "string" && initialFeedbackId) {
      void openStatusItem(initialFeedbackId);
    }
  });

  async function handleSubmit() {
    const form = {
      category,
      subject,
      message,
      includeContact,
      contactName,
      contactEmail,
      includeInstance,
    };
    errorMessage = validateFeedbackForm(form);
    if (errorMessage) return;

    submitting = true;
    try {
      const result = await submitFeedback(form);
      successId = result.id;
      void addPendingFeedbackId(result.id);
    } catch (e) {
      errorMessage = errText(e);
    } finally {
      submitting = false;
    }
  }

  function tabClass(active: boolean): string {
    if (active) {
      return isDark
        ? "bg-zinc-700 text-white font-semibold shadow-sm"
        : "bg-white text-zinc-900 font-semibold shadow-sm";
    }
    return isDark
      ? "bg-transparent text-zinc-400 hover:text-zinc-200"
      : "bg-transparent text-zinc-500 hover:text-zinc-800";
  }
</script>

<div
  class="flex fixed inset-0 z-[99999] justify-center items-center bg-black/50 backdrop-blur-sm {isDark
    ? 'dark'
    : ''}"
  onclick={(e) => {
    if (e.target === e.currentTarget && !busy) onClose();
  }}
  onkeydown={(e) => {
    if (e.key === "Escape" && !busy) onClose();
  }}
  role="button"
  tabindex="-1"
  transition:fade={{ duration: $settingsState.animations ? 200 : 0 }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="feedback-dialog p-5 mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border text-[18px] {isDark
      ? 'bg-zinc-800 text-white border-zinc-700'
      : 'bg-white text-zinc-900 border-zinc-200'}"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="feedback-modal-title"
    tabindex="-1"
    in:scale={{
      duration: $settingsState.animations ? 280 : 0,
      start: 0.92,
      opacity: 0,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    }}
  >
    <div
      class="flex gap-1 p-1 mb-4 rounded-full {isDark ? 'bg-zinc-900' : 'bg-zinc-100'}"
      role="tablist"
      aria-label="Feedback views"
    >
      <button type="button" role="tab" aria-selected={tab === "send"} onclick={() => selectTab("send")} class="flex-1 px-3 py-2.5 rounded-full transition-all duration-200 {tabClass(tab === 'send')}">
        Send
      </button>
      <button type="button" role="tab" aria-selected={tab === "status"} onclick={() => selectTab("status")} class="flex-1 px-3 py-2.5 rounded-full transition-all duration-200 {tabClass(tab === 'status')}">
        My feedback
      </button>
    </div>

    <div
      class="feedback-panel"
      style:height={panelHeightPx === null ? "auto" : `${panelHeightPx}px`}
      style:transition={panelHeightMotion}
    >
      <div class="feedback-panel__body" use:panelMeasure>
    {#if panelKey === "send-success" && successId}
        <h2 id="feedback-modal-title" class="mb-3 text-xl font-bold">Thanks for the feedback</h2>
        <p class="mb-2 text-zinc-600 dark:text-zinc-300">Reference ID:</p>
        <p class="mb-4 px-3 py-2 font-mono text-base rounded-lg {isDark ? 'bg-zinc-900' : 'bg-zinc-100'} break-all">{successId}</p>
        <div class="flex gap-3 justify-end">
          <button type="button" class={btnMuted} onclick={() => successId && openStatusItem(successId)}>Check status</button>
          <button type="button" class={btnPrimary} onclick={onClose}>Done</button>
        </div>
      {:else if panelKey === "send-form"}
        <h2 id="feedback-modal-title" class="mb-1 text-xl font-bold">Send feedback</h2>
        <p class="mb-4 text-zinc-600 dark:text-zinc-400">Anonymous by default. Contact and school details are optional.</p>

        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1.5 font-medium">
            Category
            <select id="feedback-category" bind:value={category} class={field} style={fieldStyle}>
              {#each FEEDBACK_CATEGORIES as value (value)}
                <option {value} style={fieldStyle}>{categoryLabel(value)}</option>
              {/each}
            </select>
          </label>

          <label class="flex flex-col gap-1.5 font-medium">
            Subject <span class="font-normal text-zinc-500">(optional)</span>
            <input type="text" maxlength={120} bind:value={subject} placeholder="Short summary" class={field} style={fieldStyle} />
          </label>

          <label class="flex flex-col gap-1.5 font-medium">
            Message
            <textarea rows={5} maxlength={FEEDBACK_MESSAGE_MAX} bind:value={message} placeholder="What happened, or what would you like to see?" class="{field} resize-y min-h-[120px]" style={fieldStyle}></textarea>
            <span class="text-base font-normal text-zinc-500">{message.trim().length}/{FEEDBACK_MESSAGE_MAX} (min {FEEDBACK_MESSAGE_MIN})</span>
          </label>

          <div class="flex justify-between items-center gap-3">
            <div>
              <p class="font-medium">Include contact details</p>
              <p class="text-base text-zinc-500">Name and email so we can reply</p>
            </div>
            <Switch state={includeContact} onChange={(v) => (includeContact = v)} />
          </div>
          {#if includeContact}
            <input type="text" maxlength={80} bind:value={contactName} placeholder="Name" class={field} style={fieldStyle} />
            <input type="email" maxlength={254} bind:value={contactEmail} placeholder="Email" class={field} style={fieldStyle} />
          {/if}

          <div class="flex justify-between items-center gap-3">
            <div>
              <p class="font-medium">Include SEQTA instance</p>
              <p class="text-base text-zinc-500">
                {#if instanceHostname}
                  Hostname only: <span class="font-mono">{instanceHostname}</span>
                {:else}
                  Open SEQTA first to detect hostname
                {/if}
              </p>
            </div>
            <Switch
              state={includeInstance && !!instanceHostname}
              onChange={(v) => {
                if (instanceHostname) includeInstance = v;
              }}
            />
          </div>

          {#if errorMessage}
            <p class="text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>
          {/if}

          <p class="text-base text-zinc-500">
            Sent to betterseqta.org.
            <a href="https://betterseqta.org/privacy" target="_blank" rel="noopener noreferrer" class="underline">Privacy</a>
          </p>

          <div class="flex gap-3 justify-end">
            <button type="button" class={btnMuted} onclick={onClose} disabled={submitting}>Cancel</button>
            <button type="button" class={btnPrimary} onclick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>
    {:else if isStatusDetailKey(panelKey) && selectedItem}
      <div class="flex items-start justify-between gap-3 mb-3">
        <h2 id="feedback-modal-title" class="text-xl font-bold">Feedback status</h2>
        <button type="button" class="{btnMuted} !text-base !px-3 !py-1.5" onclick={() => { selectedItem = null; void loadStatusList(); }}>Back</button>
      </div>
      <p class="mb-1 font-medium">{selectedItem.subject || "Untitled"} · {formatStatus(selectedItem.status)}</p>
      <p class="mb-4 font-mono text-base text-zinc-500 break-all">{selectedItem.id}</p>
      {#if hasReply(selectedItem)}
        <div class="p-3 mb-4 rounded-lg border {isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}">
          <p class="mb-1 text-base font-semibold uppercase tracking-wide text-zinc-500">Response</p>
          <p class="whitespace-pre-wrap">{selectedItem.response}</p>
        </div>
      {:else}
        <p class="mb-4 text-zinc-500">No response yet.</p>
      {/if}
      {#if statusError}<p class="mb-3 text-red-600 dark:text-red-400" role="alert">{statusError}</p>{/if}
      <div class="flex gap-3 justify-end">
        <button type="button" class={btnMuted} onclick={() => openStatusItem(selectedItem!.id)} disabled={statusLoading}>
          {statusLoading ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" class={btnPrimary} onclick={onClose}>Close</button>
      </div>
    {:else}
      <div class="flex items-start justify-between gap-3 mb-3">
        <h2 id="feedback-modal-title" class="text-xl font-bold">My feedback</h2>
        <button type="button" class="{btnMuted} !text-base !px-3 !py-1.5" onclick={() => void loadStatusList()} disabled={statusLoading}>
          {statusLoading ? "…" : "Refresh"}
        </button>
      </div>
      {#if statusError}<p class="mb-3 text-red-600 dark:text-red-400" role="alert">{statusError}</p>{/if}
      {#if statusLoading && !statusItems.length}
        <div class="feedback-loading" aria-busy="true" aria-live="polite">
          <Spinner size="md" />
          <p class="text-zinc-500">Checking your feedback…</p>
          <div class="feedback-loading__skeleton" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      {:else if !statusItems.length}
        <p class="mb-4 text-zinc-500">No feedback yet.</p>
        <button type="button" class={btnPrimary} onclick={() => selectTab("send")}>Send feedback</button>
      {:else}
        <ul class="flex flex-col gap-2 mb-4">
          {#each statusItems as item (item.id)}
            <li>
              <button
                type="button"
                onclick={() => openStatusItem(item.id)}
                class="w-full p-3 text-left rounded-lg border transition-all duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-zinc-400 {isDark
                  ? 'border-zinc-700 bg-zinc-900/40'
                  : 'border-zinc-200 bg-white'}"
              >
                <p class="text-base text-zinc-500 mb-0.5">
                  {formatStatus(item.status)}{#if hasReply(item)} · Reply{/if} · {categoryLabel(item.category)}
                </p>
                <p class="font-medium truncate">{item.subject || "Untitled"}</p>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="flex justify-end">
        <button type="button" class={btnMuted} onclick={onClose}>Close</button>
      </div>
    {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .feedback-dialog {
    display: flex;
    flex-direction: column;
  }

  .feedback-panel {
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .feedback-panel__body {
    width: 100%;
  }

  .feedback-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 14rem;
    padding: 1rem 0 1.5rem;
  }

  .feedback-loading__skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.5rem;
  }

  .feedback-loading__skeleton span {
    display: block;
    height: 3.5rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, currentColor 8%, transparent);
    animation: feedback-skeleton-pulse 1.2s ease-in-out infinite;
  }

  .feedback-loading__skeleton span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .feedback-loading__skeleton span:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes feedback-skeleton-pulse {
    0%,
    100% {
      opacity: 0.45;
    }
    50% {
      opacity: 0.9;
    }
  }

  :global(.feedback-field),
  :global(.feedback-field option) {
    -webkit-text-fill-color: currentColor !important;
    caret-color: currentColor !important;
  }
  :global(.feedback-field::placeholder) {
    -webkit-text-fill-color: #a1a1aa !important;
    color: #a1a1aa !important;
    opacity: 1;
  }
</style>
