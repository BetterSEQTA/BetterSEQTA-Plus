<script lang="ts">
  import { tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import LoadingSpinnerMini from "./LoadingSpinnerMini.svelte";

  let {
    status = "",
    tokenUsage = "",
    streamChunks = [],
    error = "",
    onBack,
  }: {
    status?: string;
    tokenUsage?: string;
    streamChunks?: string[];
    error?: string;
    onBack: () => void;
  } = $props();

  let streamContainer = $state<HTMLElement | null>(null);

  $effect(() => {
    if (streamChunks.length === 0 || !streamContainer) return;
    void tick().then(() => {
      streamContainer?.scrollTo({
        top: streamContainer.scrollHeight,
        behavior: "smooth",
      });
    });
  });
</script>

<div
  class="generating-view"
  aria-live="polite"
  aria-busy={!error}
>
  {#if error}
    <div
      class="error-card"
      role="alert"
      in:fly={{ y: 10, duration: 420, easing: (t) => 1 + 0.36 * Math.pow(t - 1, 3) + 0.22 * Math.pow(t - 1, 2) }}
    >
      <p class="error-title">Generation failed</p>
      <p class="error-message">{error}</p>
      <button class="secondary-button w-full accent-ring" type="button" onclick={onBack}>
        Go back and try again
      </button>
    </div>
  {:else}
    <div class="generating-header">
      <LoadingSpinnerMini />
      <div class="min-w-0">
        <h3 class="generating-title">Generating mod recipe</h3>
        {#key status}
          <p class="generating-status" in:fade={{ duration: 280 }}>
            {status || "Connecting to model…"}
          </p>
        {/key}
      </div>
    </div>

    <div class="generating-meta">
      <span class="pulse-dot" aria-hidden="true"></span>
      <span class="meta-label">Streaming response</span>
      {#if tokenUsage}
        <span class="token-badge" in:fly={{ y: 6, duration: 280 }}>
          {tokenUsage}
        </span>
      {/if}
    </div>

    <div
      bind:this={streamContainer}
      class="stream-panel"
      data-testid="generation-stream"
    >
      {#if streamChunks.length === 0}
        <div class="stream-placeholder" in:fade={{ duration: 320 }}>
          <span class="skeleton-line"></span>
          <span class="skeleton-line skeleton-line--short"></span>
          <span class="skeleton-line skeleton-line--medium"></span>
        </div>
      {:else}
        <pre class="stream-output">
          {#each streamChunks as chunk, index (index)}
            <span class="stream-chunk" in:fly={{ y: 8, duration: 220, delay: 16 }}>
              {chunk}
            </span>
          {/each}
          <span class="stream-cursor" aria-hidden="true"></span>
        </pre>
      {/if}
    </div>
  {/if}
</div>

<style>
  .generating-view {
    display: flex;
    min-height: 320px;
    flex-direction: column;
    gap: 16px;
  }

  .generating-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .generating-title {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    color: #f4f4f5;
  }

  .generating-status {
    margin-top: 2px;
    font-size: 0.875rem;
    line-height: 1.5;
    color: rgba(244, 244, 245, 0.62);
  }

  .generating-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(244, 244, 245, 0.52);
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: var(--better-main, #8b5cf6);
    animation: pulse-dot 1.4s ease-in-out infinite;
  }

  .token-badge {
    margin-left: auto;
    padding: 4px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: rgba(244, 244, 245, 0.82);
    background: rgba(255, 255, 255, 0.06);
  }

  .stream-panel {
    flex: 1;
    min-height: 220px;
    max-height: 360px;
    overflow: auto;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.03) 0%, transparent 100%),
      rgb(0 0 0 / 0.35);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
    scroll-behavior: smooth;
  }

  .stream-panel::-webkit-scrollbar {
    width: 6px;
  }

  .stream-panel::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background: rgb(255 255 255 / 0.14);
  }

  .stream-placeholder {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skeleton-line {
    display: block;
    height: 10px;
    border-radius: 9999px;
    background: linear-gradient(
      90deg,
      rgb(255 255 255 / 0.06) 0%,
      rgb(255 255 255 / 0.12) 50%,
      rgb(255 255 255 / 0.06) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
  }

  .skeleton-line--short {
    width: 55%;
  }

  .skeleton-line--medium {
    width: 78%;
  }

  .stream-output {
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
    color: #e4e4e7;
  }

  .stream-chunk {
    display: inline;
  }

  .stream-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: var(--better-main, #8b5cf6);
    animation: cursor-blink 1s step-end infinite;
  }

  .error-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    border: 1px solid rgb(248 113 113 / 0.4);
    border-radius: 12px;
    background: rgb(127 29 29 / 0.28);
    backdrop-filter: blur(6px);
  }

  .error-title {
    font-size: 1rem;
    font-weight: 600;
    color: rgb(252 165 165);
  }

  .error-message {
    font-size: 0.875rem;
    line-height: 1.6;
    color: rgb(254 202 202);
  }

  .secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    font-size: 0.775rem;
    font-weight: 600;
    color: inherit;
    background: rgb(255 255 255 / 0.05);
    transition: all 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .secondary-button:hover {
    transform: scale(1.03);
    border-color: rgb(96 165 250 / 0.28);
  }

  .secondary-button:active {
    transform: scale(0.97);
  }

  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.45;
      transform: scale(0.85);
    }
  }

  @keyframes skeleton-shimmer {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  @keyframes cursor-blink {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse-dot,
    .skeleton-line,
    .stream-cursor {
      animation: none;
    }
  }
</style>
