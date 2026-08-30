<script lang="ts">
  import { onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import {
    ArrowDownTray,
    ArrowUpTray,
    CheckCircle,
    CursorArrowRays,
    Icon,
    Key,
    Trash,
    XMark,
  } from "svelte-hero-icons";
  import ModCreatorIcon from "./ModCreatorIcon.svelte";
  import GeneratingView from "./GeneratingView.svelte";
  import LoadingSkinFrame from "./LoadingSkinFrame.svelte";
  import LoadingSpinnerMini from "./LoadingSpinnerMini.svelte";
  import CreatorTabNav from "./CreatorTabNav.svelte";
  import logoLight from "@/resources/icons/betterseqta-light-icon.png";
  import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
  import { buildSelectedElementContext } from "./pageContext";
  import { createStoredRecipe } from "./recipeSchema";
  import { createStableSelector, startElementSelection } from "./selection";
  import { createCreatorServices } from "./services";
  import { aiModLog } from "./logger";
  import { AI_MOD_MODEL_OPTIONS } from "./models";
  import type {
    AdvancedScriptSupport,
    CreatorServices,
    GeneratedModDraft,
    SelectedElementContext,
    StoredModRecipe,
  } from "./types";

  let { services = createCreatorServices() }: { services?: CreatorServices } =
    $props();

  let isOpen = $state(false);
  let activeTab = $state<"create" | "mods" | "settings">("create");
  let keyConfigured = $state(false);
  let apiKey = $state("");
  let selectedElement = $state<HTMLElement | null>(null);
  let rootSelector = $state("");
  let request = $state("");
  let userContext = $state("");
  let payload = $state<SelectedElementContext | null>(null);
  let draft = $state<GeneratedModDraft | null>(null);
  let mods = $state<StoredModRecipe[]>([]);
  let loading = $state(false);
  let error = $state("");
  let notice = $state("");
  let showPayload = $state(false);
  let showImport = $state(false);
  let importJson = $state("");
  let exportedJson = $state("");
  let generationPhase = $state<"form" | "generating" | "result">("form");
  let streamedOutput = $state("");
  let streamChunks = $state<string[]>([]);
  let generationStatus = $state("");
  let tokenUsage = $state("");
  let generationError = $state("");
  let acceptAdvancedRisk = $state(false);
  let selectedModelId = $state(AI_MOD_MODEL_OPTIONS[0]?.id ?? "");
  let advancedScriptSupport = $state<AdvancedScriptSupport>({ supported: true });
  let stopSelection: (() => void) | null = null;

  const creatorTabs = [
    { id: "create" as const, label: "Create" },
    { id: "mods" as const, label: "My mods" },
    { id: "settings" as const, label: "Settings" },
  ];

  const selectedModel = $derived(
    AI_MOD_MODEL_OPTIONS.find((option) => option.id === selectedModelId) ??
      AI_MOD_MODEL_OPTIONS[0],
  );

  const bubbleLogoUrl = $derived(resolveExtensionAssetUrl(logoLight));

  const advancedBlocked = $derived(
    Boolean(draft?.advancedScript) && !advancedScriptSupport.supported,
  );

  async function refreshAdvancedScriptSupport() {
    try {
      advancedScriptSupport = await services.getAdvancedScriptSupport();
    } catch (cause) {
      advancedScriptSupport = {
        supported: false,
        reason: cause instanceof Error ? cause.message : "Support check failed",
        instructions:
          "Open chrome://extensions, open BetterSEQTA+ Details, and enable Allow User Scripts.",
      };
    }
  }

  async function openExtensionSettings() {
    try {
      await services.openExtensionSettings();
      setNotice("Open BetterSEQTA+ details and enable Allow User Scripts");
    } catch (cause) {
      setError(cause);
    }
  }

  const selectedSummary = $derived(
    selectedElement
      ? `${selectedElement.tagName.toLowerCase()}${selectedElement.id ? `#${selectedElement.id}` : ""}`
      : "",
  );

  onMount(() => {
    void refreshState();
    return () => stopSelection?.();
  });

  async function refreshState() {
    try {
      const [status, modelSettings, storedMods] = await Promise.all([
        services.getKeyStatus(),
        services.getModelSettings(),
        services.loadMods(),
        refreshAdvancedScriptSupport(),
      ]);
      keyConfigured = status.configured;
      selectedModelId = modelSettings.modelId;
      mods = storedMods;
    } catch (cause) {
      setError(cause);
    }
  }

  function setError(cause: unknown) {
    error = cause instanceof Error ? cause.message : "Something went wrong";
    notice = "";
    aiModLog.error("ui", error, {
      streamedOutput,
      payload,
      draft,
      cause,
    });
  }

  function setNotice(message: string) {
    notice = message;
    error = "";
  }

  async function saveKey() {
    loading = true;
    try {
      await services.saveKey(apiKey);
      apiKey = "";
      keyConfigured = true;
      setNotice("API key saved locally");
    } catch (cause) {
      setError(cause);
    } finally {
      loading = false;
    }
  }

  async function clearKey() {
    loading = true;
    try {
      await services.clearKey();
      keyConfigured = false;
      setNotice("API key removed");
    } catch (cause) {
      setError(cause);
    } finally {
      loading = false;
    }
  }

  async function saveModelSelection() {
    loading = true;
    try {
      await services.saveModel(selectedModelId);
      setNotice(`Model set to ${selectedModel.label}`);
      aiModLog.info("ui", "Saved model selection", selectedModelId);
    } catch (cause) {
      setError(cause);
    } finally {
      loading = false;
    }
  }

  function selectArea() {
    isOpen = false;
    stopSelection?.();
    stopSelection = startElementSelection({
      ignoredRoot: document.querySelector(
        "[data-bsplus-ai-mod-creator-host]",
      ),
      onSelect(element) {
        stopSelection = null;
        try {
          selectedElement = element;
          rootSelector = createStableSelector(element);
          payload = null;
          draft = null;
          generationPhase = "form";
          resetGenerationState();
          isOpen = true;
          setNotice("Page area selected");
        } catch (cause) {
          isOpen = true;
          setError(cause);
        }
      },
      onCancel() {
        stopSelection = null;
        isOpen = true;
        setNotice("Selection cancelled");
      },
    });
  }

  function resetGenerationState() {
    streamedOutput = "";
    streamChunks = [];
    generationStatus = "";
    tokenUsage = "";
    generationError = "";
  }

  function goBackToForm() {
    generationPhase = "form";
    resetGenerationState();
    loading = false;
    error = "";
  }

  function goBackFromResult() {
    generationPhase = "form";
    draft = null;
    acceptAdvancedRisk = false;
    resetGenerationState();
  }

  function reviewPayload() {
    if (!selectedElement) {
      setError(new Error("Select a page area first"));
      return;
    }
    if (!request.trim()) {
      setError(new Error("Describe the change first"));
      return;
    }
    payload = buildSelectedElementContext(selectedElement, {
      route: currentRoute(),
      rootSelector,
      request,
      userContext,
    });
    showPayload = true;
    draft = null;
    generationPhase = "form";
    resetGenerationState();
    error = "";
  }

  async function generate() {
    if (!payload) return;
    loading = true;
    resetGenerationState();
    acceptAdvancedRisk = false;
    showPayload = false;
    generationPhase = "generating";
    generationStatus = "Starting generation…";
    aiModLog.info("ui", "Starting mod generation", payload);
    try {
      draft = await services.generate(payload, (progress) => {
        if (progress.type === "status" && progress.text) {
          generationStatus = progress.text;
        } else if (progress.type === "content" && progress.text) {
          streamedOutput += progress.text;
          streamChunks = [...streamChunks, progress.text];
          generationStatus = "Streaming recipe…";
        } else if (progress.type === "usage") {
          tokenUsage = `${progress.promptTokens ?? 0} input · ${progress.completionTokens ?? 0} output tokens`;
        }
      });
      generationStatus = "Recipe complete";
      generationPhase = "result";
      aiModLog.info("ui", "Mod generation succeeded", draft);
      setNotice("Safe mod recipe generated");
    } catch (cause) {
      generationError =
        cause instanceof Error ? cause.message : "Something went wrong";
      aiModLog.error("ui", "Mod generation failed", {
        streamedOutput,
        cause,
      });
    } finally {
      loading = false;
    }
  }

  async function saveAndEnable() {
    if (!draft || !payload) return;
    loading = true;
    try {
      const recipe = createStoredRecipe(draft, {
        rootSelector: payload.rootSelector,
        route: payload.route,
      });
      const enabledRecipe = {
        ...recipe,
        enabled: true,
        updatedAt: Date.now(),
      };
      mods = await services.saveMod(enabledRecipe);
      if (enabledRecipe.advancedScript) {
        try {
          await services.executeAdvancedScript(enabledRecipe);
        } catch (cause) {
          mods = await services.setModEnabled(enabledRecipe.id, false);
          throw new Error(
            `Mod was saved disabled because its advanced script could not start:\n${
              cause instanceof Error ? cause.message : "browser rejected it"
            }`,
          );
        }
      }
      draft = null;
      payload = null;
      selectedElement = null;
      rootSelector = "";
      request = "";
      userContext = "";
      generationPhase = "form";
      resetGenerationState();
      acceptAdvancedRisk = false;
      activeTab = "mods";
      setNotice("Mod saved and enabled");
    } catch (cause) {
      setError(cause);
    } finally {
      loading = false;
    }
  }

  async function toggleMod(id: string, enabled: boolean) {
    try {
      mods = await services.setModEnabled(id, enabled);
      const mod = mods.find((item) => item.id === id);
      if (mod?.advancedScript) {
        if (enabled) {
          try {
            await services.executeAdvancedScript(mod);
          } catch (cause) {
            mods = await services.setModEnabled(id, false);
            throw cause;
          }
        } else {
          await services.stopAdvancedScript(id);
        }
      }
      setNotice(enabled ? "Mod enabled" : "Mod disabled");
    } catch (cause) {
      setError(cause);
    }
  }

  async function deleteMod(id: string) {
    try {
      const existing = mods.find((item) => item.id === id);
      if (existing?.advancedScript && existing.enabled) {
        await services.stopAdvancedScript(id);
      }
      mods = await services.deleteMod(id);
      setNotice("Mod deleted");
    } catch (cause) {
      setError(cause);
    }
  }

  async function importMods() {
    loading = true;
    try {
      mods = await services.importMods(importJson);
      importJson = "";
      showImport = false;
      setNotice("Mods imported");
    } catch (cause) {
      setError(cause);
    } finally {
      loading = false;
    }
  }

  async function exportMods() {
    try {
      exportedJson = await services.exportMods();
      setNotice("Export ready");
    } catch (cause) {
      setError(cause);
    }
  }

  function currentRoute() {
    const path = window.location.hash.split("?page=/")[1] ?? "";
    return path.split(/[/?#]/)[0];
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !isOpen || showImport || showPayload) return;
    if (generationPhase === "generating") {
      if (generationError) goBackToForm();
      return;
    }
    if (generationPhase === "result") {
      goBackFromResult();
      return;
    }
    isOpen = false;
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="creator-shell">
  {#if isOpen}
    <div
      class="panel-backdrop"
      role="presentation"
      aria-hidden="true"
      transition:fade={{ duration: 200 }}
    ></div>
    <div
      class="panel"
      role="dialog"
      aria-label="AI Mod Creator"
      aria-modal="false"
      tabindex="-1"
      transition:scale={{ duration: 280, start: 0.84, opacity: 0, easing: cubicOut }}
    >
      <LoadingSkinFrame>
      <header class="panel-header">
        <div class="flex min-w-0 items-center gap-3">
          {#if generationPhase === "generating"}
            <LoadingSpinnerMini />
          {:else}
            <span class="header-icon">
              <ModCreatorIcon size={20} />
            </span>
          {/if}
          <div class="min-w-0">
            <h2 class="truncate text-lg font-semibold leading-normal">AI Mod Creator</h2>
            <p class="subtitle truncate text-sm leading-normal">
              {selectedModel.label}{selectedModel.tier === "free" ? " · free" : ""} · local preview
            </p>
          </div>
        </div>
        <button
          class="icon-button accent-ring"
          aria-label="Close AI Mod Creator"
          onclick={() => (isOpen = false)}
        >
          <Icon src={XMark} class="icon-sm" />
        </button>
      </header>

      <CreatorTabNav
        tabs={creatorTabs}
        bind:activeTab
        disabled={generationPhase === "generating"}
      />

      <div class="panel-body">
        {#if error && !(activeTab === "create" && generationPhase !== "form")}
          <div class="alert alert-error" role="alert" transition:fade={{ duration: 150 }}>
            {error}
          </div>
        {:else if notice && !(activeTab === "create" && generationPhase === "result")}
          <div class="alert alert-success" role="status" transition:fade={{ duration: 150 }}>
            <Icon src={CheckCircle} class="icon-sm" />
            {notice}
          </div>
        {/if}

        {#if activeTab === "create"}
          {#if generationPhase === "generating"}
            <div class="tab-content">
              <GeneratingView
                status={generationStatus}
                tokenUsage={tokenUsage}
                streamChunks={streamChunks}
                error={generationError}
                onBack={goBackToForm}
              />
            </div>
          {:else if generationPhase === "result" && draft}
            <div class="tab-content">
            {#if notice}
              <div class="alert alert-success" role="status" transition:fade={{ duration: 150 }}>
                <Icon src={CheckCircle} class="icon-sm" />
                {notice}
              </div>
            {/if}

            <div class="card">
                <h3 class="text-base font-semibold">{draft.name}</h3>
                <p class="hint mt-1 text-sm leading-relaxed">{draft.description}</p>
                <div data-testid="generated-operations" class="mt-3 space-y-2">
                  {#if draft.operations.length === 0}
                    <p class="hint text-sm">
                      No declarative operations — this mod uses advanced JavaScript only.
                    </p>
                  {/if}
                  {#each draft.operations as operation, index (index)}
                    <div class="operation-item rounded-lg p-2 text-sm">
                      {index + 1}. {operation.type} · {operation.selector}
                    </div>
                  {/each}
                </div>
                {#if draft.advancedScript}
                  <div class="card-warning mt-3 rounded-lg p-3">
                    <p class="text-sm font-semibold">Advanced JavaScript</p>
                    <p class="mt-1 text-sm leading-relaxed">
                      Runs in an isolated User Script world (requires Allow User Scripts in extension settings). Network access is blocked, but it can still change content inside your selected area.
                    </p>
                    {#if advancedBlocked}
                      <p class="mt-2 text-sm font-semibold">
                        Enable User Scripts before saving this mod.
                      </p>
                    {/if}
                    <pre class="code-block mt-3 max-h-48">{draft.advancedScript}</pre>
                    <label class="mt-3 flex cursor-pointer items-start gap-2 text-sm font-medium">
                      <input type="checkbox" bind:checked={acceptAdvancedRisk} />
                      I reviewed this script and understand it can modify the page.
                    </label>
                  </div>
                {/if}
                <div class="mt-4 grid grid-cols-2 gap-2">
                  <button class="secondary-button accent-ring w-full" type="button" onclick={goBackFromResult}>
                    Edit request
                  </button>
                  <button
                    class="primary-button accent-ring w-full"
                    onclick={saveAndEnable}
                    disabled={loading || advancedBlocked || (Boolean(draft.advancedScript) && !acceptAdvancedRisk)}
                  >
                    Save and enable mod
                  </button>
                </div>
              </div>
              </div>
            {:else}
            <div class="tab-content">
            {#if !keyConfigured}
              <div class="card card-muted">
                <p class="text-sm leading-relaxed">
                  Add your OpenRouter API key in
                  <button
                    type="button"
                    class="link-button accent-ring"
                    onclick={() => (activeTab = "settings")}
                  >Settings</button>
                  before generating mods.
                </p>
              </div>
            {/if}

            {#if !advancedScriptSupport.supported}
              <div class="card card-warning">
                <p class="text-sm font-semibold">
                  Advanced JavaScript requires User Scripts
                </p>
                <p class="mt-1 text-sm leading-relaxed">
                  {advancedScriptSupport.reason}
                </p>
                {#if advancedScriptSupport.instructions}
                  <pre class="code-block mt-3">{advancedScriptSupport.instructions}</pre>
                {/if}
                <div class="mt-3 flex flex-col gap-2">
                  <button
                    class="secondary-button accent-ring w-full"
                    type="button"
                    onclick={openExtensionSettings}
                  >
                    Open extension settings
                  </button>
                  <button
                    class="secondary-button accent-ring w-full"
                    type="button"
                    onclick={() => void refreshAdvancedScriptSupport()}
                  >
                    Re-check support
                  </button>
                </div>
              </div>
            {/if}

            <div class="card">
              <button class="secondary-button accent-ring w-full" onclick={selectArea}>
                <Icon src={CursorArrowRays} class="icon-sm" />
                Select page area
              </button>
              {#if selectedElement}
                <p data-testid="selected-element-summary" class="selection-summary mt-3 truncate text-sm">
                  Selected: {selectedSummary}
                </p>
              {/if}
            </div>

            <div class="field-group">
              <label class="field-label" for="ai-mod-request">Describe the change</label>
              <textarea
                id="ai-mod-request"
                class="field accent-ring min-h-24 resize-y"
                maxlength="2000"
                placeholder="Make this card more compact and highlight its due date…"
                bind:value={request}
              ></textarea>
            </div>

            <div class="field-group">
              <label class="field-label" for="ai-mod-context">Page context</label>
              <textarea
                id="ai-mod-context"
                class="field accent-ring min-h-20 resize-y"
                maxlength="4000"
                placeholder="Explain what this area does and what should stay unchanged."
                bind:value={userContext}
              ></textarea>
            </div>

            <p class="hint text-sm leading-relaxed">
              Only the selected, redacted subtree and the text above are sent to OpenRouter.
            </p>

            <button
              class="primary-button accent-ring w-full"
              onclick={reviewPayload}
              disabled={!keyConfigured || !selectedElement || !request.trim() || loading}
            >Review data and generate</button>
            </div>
            {/if}
          {:else if activeTab === "mods"}
            <div class="tab-content">
            <div class="grid grid-cols-2 gap-2">
              <button class="secondary-button accent-ring" onclick={() => (showImport = true)}>
                <Icon src={ArrowUpTray} class="icon-sm" />
                Import mods
              </button>
              <button class="secondary-button accent-ring" onclick={exportMods}>
                <Icon src={ArrowDownTray} class="icon-sm" />
                Export mods
              </button>
            </div>

            {#if exportedJson}
              <textarea
                data-testid="exported-json"
                class="field accent-ring min-h-28 font-mono text-sm"
                readonly
                aria-label="Exported mod JSON"
                value={exportedJson}
              ></textarea>
            {/if}

            {#if mods.length === 0}
              <div class="card card-muted text-center text-sm">
                No local mods yet.
              </div>
            {:else}
              {#each mods as mod (mod.id)}
                <article class="card mod-card">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="truncate text-base font-semibold">{mod.name}</h3>
                      <p class="hint mt-1 text-sm leading-relaxed">{mod.description}</p>
                      <p class="hint mt-2 truncate font-mono text-sm">{mod.route || "all pages"}</p>
                    </div>
                    <button class="danger-button accent-ring" aria-label={`Delete ${mod.name}`} onclick={() => deleteMod(mod.id)}>
                      <Icon src={Trash} class="icon-sm" />
                    </button>
                  </div>
                  <label class="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                    Enabled
                    <input
                      type="checkbox"
                      aria-label={`Enable ${mod.name}`}
                      checked={mod.enabled}
                      onchange={(event) =>
                        toggleMod(mod.id, event.currentTarget.checked)}
                    />
                  </label>
                </article>
              {/each}
            {/if}
            </div>
          {:else}
            <div class="tab-content">
            <div class="card">
              <div class="mb-3 flex items-center gap-2">
                <Icon src={Key} class="icon-sm" />
                <h3 class="text-base font-semibold">OpenRouter key</h3>
              </div>
              {#if keyConfigured}
                <div class="flex items-center justify-between gap-3">
                  <span class="status-ok text-sm">Configured locally</span>
                  <button class="secondary-button accent-ring" onclick={clearKey} disabled={loading}>Remove</button>
                </div>
              {:else}
                <label class="field-label" for="ai-mod-key">OpenRouter API key</label>
                <input
                  id="ai-mod-key"
                  class="field accent-ring"
                  type="password"
                  autocomplete="off"
                  placeholder="sk-or-v1-…"
                  bind:value={apiKey}
                />
                <button
                  class="primary-button accent-ring mt-3 w-full"
                  onclick={saveKey}
                  disabled={loading || apiKey.trim().length < 16}
                >Save key</button>
              {/if}
            </div>

            <div class="card">
              <label class="field-label" for="ai-mod-model">OpenRouter model</label>
              <select
                id="ai-mod-model"
                class="field accent-ring"
                bind:value={selectedModelId}
                onchange={saveModelSelection}
                disabled={loading}
              >
                {#each AI_MOD_MODEL_OPTIONS as option (option.id)}
                  <option value={option.id}>
                    {option.label}{option.tier === "free" ? " · free" : " · paid"}
                  </option>
                {/each}
              </select>
              <p class="hint mt-2 text-sm leading-relaxed">
                {selectedModel.description}
              </p>
              {#if selectedModel.tier === "free"}
                <p class="status-warning mt-2 text-sm leading-relaxed">
                  Free models can hit provider rate limits quickly. If you see a 429 error, wait 1–2 minutes or switch model.
                </p>
              {/if}
            </div>
            </div>
          {/if}
      </div>
      </LoadingSkinFrame>
    </div>
  {/if}

  <button
    data-testid="ai-mod-bubble"
    class="accent-bg accent-ring bubble text-white"
    class:bubble-open={isOpen}
    aria-label={isOpen ? "Close AI Mod Creator" : "Open AI Mod Creator"}
    aria-expanded={isOpen}
    onclick={() => (isOpen = !isOpen)}
  >
    <span class="bubble-icon" class:bubble-icon-open={isOpen}>
      {#if isOpen}
        <Icon src={XMark} class="icon-sm" />
      {:else}
        <img class="bubble-logo" src={bubbleLogoUrl} alt="" />
      {/if}
    </span>
  </button>
</div>

{#if showPayload && payload}
  <div class="modal-backdrop" role="presentation" transition:fade={{ duration: 200 }}>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Review selected data" tabindex="-1" transition:scale={{ duration: 200, start: 0.98 }}>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold">Review selected data</h2>
        <button class="icon-button accent-ring" aria-label="Close data review" onclick={() => (showPayload = false)}>
          <Icon src={XMark} class="icon-sm" />
        </button>
      </div>
      <p class="hint mt-2 text-sm leading-relaxed">
        This exact redacted payload will be sent to OpenRouter.
      </p>
      <pre data-testid="payload-preview" class="code-block mt-3 max-h-64">{JSON.stringify(payload, null, 2)}</pre>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button class="secondary-button accent-ring" onclick={() => (showPayload = false)}>Go back</button>
        <button class="primary-button accent-ring" onclick={generate} disabled={loading}>
          Send selected data
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showImport}
  <div class="modal-backdrop" role="presentation" transition:fade={{ duration: 200 }}>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Import mods" tabindex="-1" transition:scale={{ duration: 200, start: 0.98 }}>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold">Import mods</h2>
        <button class="icon-button accent-ring" aria-label="Close import" onclick={() => (showImport = false)}>
          <Icon src={XMark} class="icon-sm" />
        </button>
      </div>
      <label class="field-label mt-4" for="ai-mod-import">Import mod JSON</label>
      <textarea id="ai-mod-import" class="field accent-ring min-h-48 font-mono text-sm" bind:value={importJson}></textarea>
      <button class="primary-button accent-ring mt-4 w-full" onclick={importMods} disabled={loading || !importJson.trim()}>
        Validate and import
      </button>
    </div>
  </div>
{/if}

<style>
  :host {
    --panel-border: rgba(255, 255, 255, 0.1);
    --card-bg: rgba(255, 255, 255, 0.05);
    --field-bg: rgba(255, 255, 255, 0.06);
    --text-muted: rgba(244, 244, 245, 0.62);
    --code-bg: rgba(0, 0, 0, 0.32);
    color: #f4f4f5;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(button),
  :global(input),
  :global(textarea),
  :global(select) {
    font: inherit;
    color: inherit;
  }

  :global(svg.icon-sm) {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .creator-shell {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 2147483647;
    color: inherit;
  }

  .panel-backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: rgb(0 0 0 / 0.45);
    backdrop-filter: blur(4px);
    pointer-events: none;
  }

  .panel {
    position: absolute;
    right: 0;
    bottom: 64px;
    z-index: 1;
    width: min(380px, calc(100vw - 32px));
    max-height: min(680px, calc(100vh - 112px));
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    background: transparent;
    box-shadow: 0 20px 50px rgb(0 0 0 / 0.4);
    transform-origin: bottom right;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(
      180deg,
      rgb(255 255 255 / 0.04) 0%,
      transparent 100%
    );
  }

  .header-icon {
    display: flex;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: white;
    background: var(--better-main, #8b5cf6);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
  }

  .subtitle,
  .hint {
    color: var(--text-muted);
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bubble {
    position: relative;
    z-index: 2;
    display: flex;
    width: 52px;
    height: 52px;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    border: 2px solid rgb(255 255 255 / 0.18);
    border-radius: 9999px;
    box-shadow: 0 12px 28px rgb(0 0 0 / 0.32);
    transform: scale(1);
    transition:
      transform 280ms cubic-bezier(0.34, 1.35, 0.64, 1),
      box-shadow 200ms ease,
      border-color 200ms ease;
  }

  .bubble-open {
    transform: scale(0.88);
    border-color: rgb(255 255 255 / 0.32);
    box-shadow: 0 14px 32px rgb(0 0 0 / 0.36);
  }

  .bubble:hover {
    transform: scale(1.05);
  }

  .bubble-open:hover {
    transform: scale(0.94);
  }

  .bubble:active {
    transform: scale(0.95);
  }

  .bubble-open:active {
    transform: scale(0.82);
  }

  .bubble-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 240ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .bubble-icon-open {
    transform: rotate(90deg);
  }

  .bubble-logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
    border-radius: 6px;
  }

  .accent-bg {
    background-color: var(--better-main, #8b5cf6);
  }

  .accent-ring:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px var(--better-main, #8b5cf6),
      0 0 0 4px rgb(1 1 1 / 0.85);
  }

  .panel-body {
    max-height: min(570px, calc(100vh - 220px));
    overflow-y: auto;
    padding: 12px 16px 16px;
    scroll-behavior: smooth;
  }

  .panel-body::-webkit-scrollbar {
    width: 6px;
  }

  .panel-body::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background: rgb(255 255 255 / 0.14);
  }

  .card {
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    background: var(--card-bg);
    transition:
      transform 200ms ease,
      border-color 200ms ease;
  }

  .card-muted {
    opacity: 0.92;
  }

  .card-warning {
    border-color: rgb(245 158 11 / 0.45);
    background: rgb(245 158 11 / 0.08);
  }

  .mod-card:hover {
    transform: translateY(-1px);
  }

  .alert {
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    backdrop-filter: blur(6px);
  }

  .alert-error {
    border: 1px solid rgb(248 113 113 / 0.45);
    background: rgb(127 29 29 / 0.35);
    color: rgb(254 202 202);
  }

  .alert-success {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgb(52 211 153 / 0.35);
    background: rgb(6 78 59 / 0.35);
    color: rgb(167 243 208);
  }

  .status-ok {
    color: rgb(167 243 208);
  }

  .status-warning {
    color: rgb(253 230 138);
  }

  .selection-summary {
    color: var(--text-muted);
  }

  .operation-item {
    background: var(--code-bg);
    border: 1px solid rgb(255 255 255 / 0.06);
    animation: item-reveal 220ms ease both;
  }

  @keyframes item-reveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .code-block {
    overflow: auto;
    padding: 12px;
    border: 1px solid rgb(255 255 255 / 0.06);
    border-radius: 10px;
    background: var(--code-bg);
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    color: #e4e4e7;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.5;
    color: rgb(244 244 245 / 0.82);
  }

  .field {
    width: 100%;
    padding: 10px 12px;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: var(--field-bg);
    transition:
      border-color 220ms ease,
      box-shadow 220ms ease,
      background-color 220ms ease;
  }

  .field::placeholder {
    color: rgb(244 244 245 / 0.38);
  }

  .field:focus {
    border-color: var(--better-main, #8b5cf6);
    background: rgb(255 255 255 / 0.08);
    box-shadow: 0 0 0 3px rgb(139 92 246 / 0.18);
  }

  .primary-button,
  .secondary-button,
  .danger-button,
  .icon-button,
  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    transition:
      transform 200ms ease,
      background-color 200ms ease,
      border-color 200ms ease;
  }

  .primary-button {
    color: white;
    border: 1px solid transparent;
    background: var(--better-main, #8b5cf6);
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
  }

  .secondary-button {
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgb(255 255 255 / 0.05);
  }

  .link-button {
    display: inline;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--better-main, #8b5cf6);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .danger-button,
  .icon-button {
    padding: 8px;
    color: inherit;
    border: 1px solid transparent;
    background: transparent;
  }

  .icon-button {
    border-radius: 10px;
    color: rgb(244 244 245 / 0.82);
  }

  .icon-button:hover {
    background: rgb(255 255 255 / 0.06);
  }

  .danger-button {
    color: rgb(252 165 165);
  }

  .primary-button:hover,
  .secondary-button:hover,
  .danger-button:hover,
  .icon-button:hover {
    transform: scale(1.03);
  }

  .primary-button:active,
  .secondary-button:active,
  .danger-button:active,
  .icon-button:active {
    transform: scale(0.97);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    transform: none;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: inherit;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(4px);
  }

  .modal-card {
    width: min(560px, 100%);
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    background: linear-gradient(180deg, #010101 0%, #080808 100%);
    box-shadow: 0 20px 50px rgb(0 0 0 / 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    .bubble {
      transition:
        box-shadow 200ms ease,
        border-color 200ms ease;
    }

    .bubble,
    .bubble-open,
    .bubble:hover,
    .bubble-open:hover,
    .bubble:active,
    .bubble-open:active {
      transform: none;
    }
  }

  @media (max-width: 480px) {
    .creator-shell {
      right: 16px;
      bottom: 16px;
    }

    .panel {
      bottom: 60px;
    }
  }
</style>
