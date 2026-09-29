<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { fade } from 'svelte/transition';

  import {
    type LoadedCustomTheme,
    shouldForceThemeAppearance,
  } from '@/types/CustomThemes'

  import { settingsState } from '@/seqta/utils/listeners/SettingsState'

  import Divider from '@/interface/components/themeCreator/divider.svelte'
  import Switch from '@/interface/components/Switch.svelte'
  import Button from '@/interface/components/Button.svelte'
  import Slider from '@/interface/components/Slider.svelte'
  import ColourPicker from '../components/ColourPicker.svelte'
  import CodeEditor from '../components/CodeEditor.svelte'

  import {
    handleImageUpload,
    handleRemoveImage,
    handleImageVariableChange,
  } from '../utils/themeImageHandlers';
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'
  import { themeUpdates } from '../hooks/ThemeUpdates'
  import { CloseThemeCreator } from '@/plugins/built-in/themes/ThemeCreator'
  import { submitLocalThemeToCommunity } from '@/seqta/utils/customThemes/submitLocalTheme'
  import { formatCustomThemeApiError } from '@/seqta/utils/customThemes/apiErrors'
  import { cloudAuth } from '@/seqta/utils/CloudAuth'
  import LucideMoon from '@/interface/components/icons/LucideMoon.svelte'
  import LucideSun from '@/interface/components/icons/LucideSun.svelte'
  import SidebarAppearance from '@/interface/components/SidebarAppearance.svelte'
  import { FONT_PRESETS, DEFAULT_FONT_ID } from '@/seqta/ui/fonts/presets'
  import { applySelectedFont, ensureFontPickerFontsLoaded } from '@/seqta/ui/fonts/Manager'
  import {
    applySidebarSettings,
    defaultThemeCreatorMeta,
    mergeThemeWithCreatorMeta,
    snapshotSidebarSettings,
    type ThemeCreatorSidebarMeta,
  } from '@/interface/utils/themeCreatorMeta'
  import { ensureThemeCoverImage } from '@/interface/utils/themePlaceholderCover'
  import ThemeBlobImage from '@/interface/components/themes/ThemeBlobImage.svelte'
  import type { ThemeCreatorMeta } from '@/types/CustomThemes'

  const { themeID } = $props<{ themeID: string }>()
  const themeManager = ThemeManager.getInstance();

  let theme = $state<LoadedCustomTheme>({
    id: crypto.randomUUID(),
    name: '',
    description: '',
    defaultColour: 'blue',
    CanChangeColour: true,
    allowBackgrounds: true,
    CustomCSS: '',
    CustomImages: [],
    coverImage: null,
    isEditable: true,
    hideThemeName: false,
    forceTheme: undefined,
    forceDark: undefined,
    adaptiveCssVariables: [],
  })
  let closedAccordions = $state<string[]>([])
  let themeLoaded = $state(false);
  let codeEditorFullscreen = $state(false);
  let communityBusy = $state(false);
  let communityError = $state<string | null>(null);
  let cloudLoggedIn = $state(cloudAuth.state.isLoggedIn);
  let panelDark = $state(Boolean(settingsState.DarkMode));
  let creatorMeta = $state<ThemeCreatorMeta>(defaultThemeCreatorMeta());
  let originalSidebar = $state<ThemeCreatorSidebarMeta | null>(null);
  let originalFontId = $state<string | null>(null);
  /** When true, generated font/background CSS is merged for live preview and save. */
  let composeVisuals = $state(false);

  const previewTheme = $derived.by(() => {
    if (!themeLoaded) return null;
    if (composeVisuals || theme.creatorMeta || creatorMeta.pageBackgroundImageId) {
      return mergeThemeWithCreatorMeta(theme, creatorMeta);
    }
    return { ...theme, creatorMeta };
  });

  function touchVisuals() {
    if (!composeVisuals && !theme.creatorMeta && !creatorMeta.userCustomCss.trim()) {
      creatorMeta = { ...creatorMeta, userCustomCss: theme.CustomCSS };
    }
    composeVisuals = true;
  }

  function imageUsage(imageId: string): 'decorative' | 'page-background' | 'cover' {
    if (creatorMeta.pageBackgroundImageId === imageId) return 'page-background';
    const image = theme.CustomImages.find((item) => item.id === imageId);
    if (image && theme.coverImage === image.blob) return 'cover';
    return 'decorative';
  }

  function setImageUsage(imageId: string, usage: 'decorative' | 'page-background' | 'cover') {
    const image = theme.CustomImages.find((item) => item.id === imageId);
    if (!image) return;

    let nextMeta = { ...creatorMeta };
    let coverImage = theme.coverImage;

    if (usage === 'page-background') {
      nextMeta = { ...nextMeta, pageBackgroundImageId: imageId };
    } else if (nextMeta.pageBackgroundImageId === imageId) {
      nextMeta = { ...nextMeta, pageBackgroundImageId: null };
    }

    if (usage === 'cover') {
      coverImage = image.blob;
    } else if (coverImage === image.blob) {
      coverImage = null;
    }

    creatorMeta = nextMeta;
    theme = { ...theme, coverImage };
    touchVisuals();
  }

  function onFontIdChange(fontId: string) {
    creatorMeta = { ...creatorMeta, fontId };
    applySelectedFont(fontId);
    touchVisuals();
  }

  function patchCreatorMeta(patch: Partial<ThemeCreatorMeta>) {
    creatorMeta = { ...creatorMeta, ...patch };
    touchVisuals();
  }

  function toggleCodeEditorFullscreen(e: MouseEvent) {
    e.preventDefault();
    codeEditorFullscreen = !codeEditorFullscreen;
  }

  function toggleAccordion(title: string, e: MouseEvent | KeyboardEvent) {
    // if the target is the fullscreen button return
    if (e.target instanceof HTMLButtonElement && e.target.classList.contains('fullscreen-toggle')) {
      return;
    }

    if (closedAccordions.includes(title)) {
      closedAccordions = closedAccordions.filter(t => t !== title);
    } else {
      closedAccordions = [...closedAccordions, title];
    }
  }

  async function prepareThemeClone() {
    const themeClone = JSON.parse(JSON.stringify(theme)) as LoadedCustomTheme;

    themeClone.CustomImages = theme.CustomImages.map((image) => ({
      ...image,
      blob: image.blob,
    }));
    themeClone.coverImage = theme.coverImage;
    themeClone.userEdited = true;

    if (shouldForceThemeAppearance(themeClone)) {
      themeClone.forceTheme = true;
    } else {
      themeClone.forceTheme = false;
      themeClone.forceDark = undefined;
    }

    const merged = mergeThemeWithCreatorMeta(themeClone, {
      ...creatorMeta,
      sidebar: snapshotSidebarSettings(),
    });
    return await ensureThemeCoverImage(merged);
  }

  onMount(async () => {
    const unsubCloud = cloudAuth.subscribe((s) => {
      cloudLoggedIn = s.isLoggedIn;
    });
    const unsubSettings = settingsState.subscribe((s) => {
      panelDark = s.DarkMode;
    });

    void ensureFontPickerFontsLoaded();
    originalSidebar = snapshotSidebarSettings();
    originalFontId = settingsState.selectedFont ?? DEFAULT_FONT_ID;

    if (themeID) {
      const tempTheme = await themeManager.getTheme(themeID);
      if (!tempTheme) return;

      theme = {
        ...tempTheme,
        adaptiveCssVariables: tempTheme.adaptiveCssVariables ?? [],
        forceTheme:
          tempTheme.forceTheme ??
          (tempTheme.forceDark !== undefined ? true : undefined),
      };
    }

    if (theme.creatorMeta) {
      creatorMeta = { ...defaultThemeCreatorMeta(), ...theme.creatorMeta };
      applySidebarSettings(theme.creatorMeta.sidebar);
      composeVisuals = true;
    } else {
      creatorMeta = defaultThemeCreatorMeta({
        userCustomCss: theme.CustomCSS,
        fontId: settingsState.selectedFont ?? DEFAULT_FONT_ID,
      });
    }

    applySelectedFont(creatorMeta.fontId);
    themeLoaded = true;
    themeUpdates.triggerUpdate();

    return () => {
      unsubCloud();
      unsubSettings();
      if (originalSidebar) applySidebarSettings(originalSidebar);
      if (originalFontId) applySelectedFont(originalFontId);
    };
  });

  async function onImageUpload(event: Event) {
    const updated = await handleImageUpload(event, theme);
    if (updated === theme) return;
    theme = updated as LoadedCustomTheme;
    if (!creatorMeta.pageBackgroundImageId && theme.CustomImages.length === 1) {
      creatorMeta = { ...creatorMeta, pageBackgroundImageId: theme.CustomImages[0].id };
    }
    touchVisuals();
  }

  function onRemoveImage(imageId: string) {
    if (creatorMeta.pageBackgroundImageId === imageId) {
      creatorMeta = { ...creatorMeta, pageBackgroundImageId: null };
    }
    theme = handleRemoveImage(imageId, theme);
    touchVisuals();
  }

  function onImageVariableChange(imageId: string, variableName: string) {
    theme = handleImageVariableChange(imageId, variableName, theme);
    touchVisuals();
  }

  async function submitTheme() {
    const themeClone = await prepareThemeClone();

    await themeManager.saveTheme(themeClone);
    await themeManager.setTheme(themeClone.id);
    themeUpdates.triggerUpdate();
    await CloseThemeCreator({ restoreTheme: false });
  }

  async function submitThemeToCommunity() {
    communityError = null;
    if (!cloudLoggedIn) {
      communityError = "Sign in with BetterSEQTA Cloud to submit themes.";
      return;
    }
    if (!theme.name.trim()) {
      communityError = "Add a theme name before submitting.";
      return;
    }

    communityBusy = true;
    try {
      const themeClone = await prepareThemeClone();
      await themeManager.saveTheme(themeClone);
      await themeManager.setTheme(themeClone.id);
      await submitLocalThemeToCommunity(themeClone, theme.description?.trim() || undefined);
      themeUpdates.triggerUpdate();
      await CloseThemeCreator({ restoreTheme: false });
    } catch (err) {
      communityError = formatCustomThemeApiError(err);
    } finally {
      communityBusy = false;
    }
  }

  $effect(() => {
    const snapshot = previewTheme;
    if (!snapshot) return;
    void themeManager.updatePreviewDebounced(snapshot);
  });

  type SettingType = 'switch' | 'button' | 'slider' | 'colourPicker' | 'select' | 'codeEditor' | 'imageUpload' | 'conditional' | 'lightDarkToggle';

  type SwitchProps = { state: boolean; onChange: (value: boolean) => void };
  type ButtonProps = { onClick: () => void; text: string };
  type SliderProps = { state: number; onChange: (value: number) => void; min?: number; max?: number };
  type ColourPickerProps = { color: string; onChange: (color: string) => void };
  type SelectProps = { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void };
  type CodeEditorProps = { value: string; onChange: (value: string) => void };
  type LightDarkToggleProps = { state: boolean; onChange: (value: boolean) => void };

  type ConditionalProps = {
    condition: boolean;
    children: SettingItem;
  };

  type ComponentProps = SwitchProps | ButtonProps | SliderProps | ColourPickerProps | SelectProps | CodeEditorProps | LightDarkToggleProps | ConditionalProps;

  type SettingItem = {
    type: SettingType;
    title: string;
    description: string;
    direction?: 'horizontal' | 'vertical';
    props: ComponentProps;
  };
</script>

{#snippet settingItem(item: SettingItem)}
  {#if item.type === 'conditional'}
    {#if (item.props as ConditionalProps).condition }
      <div transition:slide={{ duration: 300 }}>
        {@render settingItem((item.props as ConditionalProps).children)}
      </div>
    {/if}
  {:else}
    <div class="flex justify-between {item.direction === 'vertical' ? 'flex-col items-start' : 'items-center'} py-3">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        onclick={(e) => { item.direction === 'vertical' && toggleAccordion(item.title, e) }}
        onkeydown={(e) => { e.key === 'Enter' && item.direction === 'vertical' && toggleAccordion(item.title, e) }}
        class="flex justify-between pr-4 {item.direction === 'vertical' ? 'cursor-pointer w-full select-none' : ''}">

        <div>
          <h2 class="text-sm font-bold">{item.title}</h2>
          <p class="text-xs">{item.description}</p>
        </div>

        {#if item.direction === 'vertical'}
          <div class="flex justify-center items-center h-full text-xl font-light text-zinc-500 dark:text-zinc-300">
            {#if item.type === 'codeEditor'}
              <!-- Fullscreen toggle button -->
              <button onclick={toggleCodeEditorFullscreen} class="px-2 mr-2 text-lg font-IconFamily fullscreen-toggle">
                {'\uebdb'}
              </button>
            {/if}
            
            <span class='font-IconFamily transition-transform duration-300 {closedAccordions.includes(item.title) ? 'rotate-180' : ''}'>{'\ue9e6'}</span>
          </div>
        {/if}
      </div>

      {#if !closedAccordions.includes(item.title)}
        <div class="{item.direction === 'vertical' ? 'w-full mt-2' : ''}" transition:slide={{ duration: 300 }}>
          {#if item.type === 'switch'}
            <Switch {...(item.props as SwitchProps)} />
          {:else if item.type === 'button'}
            <Button {...(item.props as ButtonProps)} />
          {:else if item.type === 'slider'}
            <Slider {...(item.props as SliderProps)} />
          {:else if item.type === 'colourPicker'}
            {#key themeLoaded}
              <ColourPicker savePresets={false} standalone={true} {...(item.props)} />
            {/key}
          {:else if item.type === 'codeEditor'}
            {#if !codeEditorFullscreen}
              {#key themeLoaded}
                <!-- Only render inline if not fullscreen -->
                <CodeEditor className="h-[400px]" {...(item.props as CodeEditorProps)} />
              {/key}
            {/if}
          {:else if item.type === 'imageUpload'}
            {#each theme.CustomImages as image (image.id)}
              <div class="mb-4 space-y-2 rounded-lg bg-white px-2 py-2 shadow-lg dark:bg-zinc-700">
                <div class="flex h-16 items-center gap-2">
                  <div class="h-full">
                    <ThemeBlobImage source={image.blob} alt={image.variableName} class="object-contain h-full rounded" />
                  </div>
                  <input
                    type="text"
                    value={image.variableName}
                    oninput={(e) => onImageVariableChange(image.id, e.currentTarget.value)}
                    placeholder="CSS variable name"
                    class="grow flex-3 rounded-lg border-0 bg-zinc-200 p-2 transition dark:bg-zinc-600/50 dark:placeholder-zinc-300 focus:bg-zinc-300/50 dark:focus:bg-zinc-600"
                  />
                  <button onclick={() => onRemoveImage(image.id)} class="p-2 transition dark:text-white" type="button">
                    <span class='text-xl font-IconFamily'>{'\ued8c'}</span>
                  </button>
                </div>
                <label class="block text-xs text-zinc-600 dark:text-zinc-300">
                  Use as
                  <select
                    class="mt-1 w-full rounded-lg border-0 bg-zinc-200 px-2 py-1.5 text-sm dark:bg-zinc-600"
                    value={imageUsage(image.id)}
                    onchange={(e) =>
                      setImageUsage(image.id, e.currentTarget.value as 'decorative' | 'page-background' | 'cover')}
                  >
                    <option value="decorative">Decorative (CSS variable only)</option>
                    <option value="page-background">SEQTA page background</option>
                    <option value="cover">Theme store cover image</option>
                  </select>
                </label>
              </div>
            {/each}
      
            <div class="flex overflow-hidden relative gap-1 justify-center place-items-center w-full h-8 rounded-lg transition bg-zinc-200 dark:bg-zinc-700">
              <span class='font-IconFamily'>{'\uec60'}</span>
              <span class='dark:text-white'>Add image</span>
              <input type="file" accept='image/*' onchange={onImageUpload} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          {:else if item.type === 'lightDarkToggle'}
            <button
              class="overflow-hidden relative flex justify-center items-center px-4 py-1 text-xl font-medium rounded-lg transition bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              onclick={() => (item.props as LightDarkToggleProps).onChange(!(item.props as LightDarkToggleProps).state)}
            >
              {#key (item.props as LightDarkToggleProps).state}
                <span
                  class="absolute flex items-center justify-center"
                  in:fade={{ duration: 150 }}
                  out:fade={{ duration: 150 }}
                >
                  {#if (item.props as LightDarkToggleProps).state}
                    <LucideMoon class="w-5 h-5" />
                  {:else}
                    <LucideSun class="w-5 h-5" />
                  {/if}
                </span>
              {/key}
              <span class="opacity-0 inline-flex"><LucideMoon class="w-5 h-5" /></span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<div class:dark={panelDark} class="h-full min-h-0 overflow-y-scroll no-scrollbar">
  {#if codeEditorFullscreen}
    <div class="absolute inset-0 bg-white z-[10000] dark:bg-zinc-900 dark:text-white">
      <div class="sticky top-0 px-2 h-screen">
        <div class="flex justify-between items-center my-4">
          <h2 class="text-xl font-bold">Custom CSS</h2>
          <button onclick={toggleCodeEditorFullscreen} class="pr-14 text-xl font-IconFamily">{'\uec06'}</button>
        </div>
        <CodeEditor
          className="editorHeight"
          value={creatorMeta.userCustomCss}
          onChange={(value: string) => patchCreatorMeta({ userCustomCss: value })}
        />
      </div>
    </div>
  {/if}
  <div class="relative flex min-h-full w-full flex-col bg-zinc-100 p-2 text-zinc-900 dark:bg-zinc-800 dark:text-white">

    <div class="mb-2 flex items-start justify-between gap-2">
      <h1 class="text-xl font-semibold">Theme Creator</h1>
      <button
        type="button"
        class="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        aria-label="Close theme creator"
        onclick={() => void CloseThemeCreator()}
      >
        ✕
      </button>
    </div>
    <a href='https://docs.betterseqta.org/theme-creation/' target='_blank' rel='noopener noreferrer' class='text-sm font-light text-zinc-500 dark:text-zinc-400'>
      <span class='pr-0.5 no-underline font-IconFamily'>{'\ueb44'}</span>
      <span class='underline'>
        Need help? Check out the docs!
      </span>
    </a>

    <Divider />

    <div>
      <div class='pb-2 text-sm'>Theme Name</div>
      <input
        id='themeName'
        type='text'
        placeholder='What is your theme called?'
        bind:value={theme.name}
        class='p-2 mb-4 w-full rounded-lg border-0 transition dark:placeholder-zinc-300 bg-zinc-200 dark:bg-zinc-700 focus:bg-zinc-300/50 dark:focus:bg-zinc-600' />
    </div>

    <div>
      <div class='pb-2 text-sm'>Description <span class='italic font-light opacity-80'>(optional)</span></div>
      <textarea
        id='themeDescription'
        placeholder="Don't worry, this one's optional!"
        bind:value={theme.description}
        class='p-2 w-full rounded-lg border-0 transition dark:placeholder-zinc-300 bg-zinc-200 dark:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-100 dark:focus:ring-zinc-700 focus:bg-zinc-300/50 dark:focus:bg-zinc-600'></textarea>
    </div>

    <Divider />

    <div class="py-3">
      <h2 class="text-sm font-bold">Accent colour</h2>
      <p class="text-xs text-zinc-600 dark:text-zinc-400">Default accent and gradient start colour.</p>
      <div class="mt-2">
        <ColourPicker
          savePresets={false}
          standalone={true}
          customState={theme.defaultColour}
          customOnChange={(color: string) => {
            theme = { ...theme, defaultColour: color };
            touchVisuals();
          }}
        />
      </div>
    </div>

    <Divider />

    <div class="py-3">
      <h2 class="text-sm font-bold">Interface font</h2>
      <select
        class="mt-2 w-full rounded-lg border-0 bg-zinc-200 p-2 text-sm dark:bg-zinc-700"
        value={creatorMeta.fontId}
        onchange={(e) => onFontIdChange(e.currentTarget.value)}
      >
        {#each FONT_PRESETS as preset (preset.id)}
          <option value={preset.id}>{preset.name}</option>
        {/each}
      </select>
    </div>

    <Divider />

    <div class="py-3 space-y-3">
      <div>
        <h2 class="text-sm font-bold">Images &amp; page background</h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          Upload images, then choose how each one is used. Set one as the live SEQTA page background to preview it on the main page.
        </p>
      </div>

      {#each theme.CustomImages as image (image.id)}
        <div class="space-y-2 rounded-lg bg-zinc-200/80 px-2 py-2 dark:bg-zinc-700/80">
          <div class="flex h-16 items-center gap-2">
            <ThemeBlobImage source={image.blob} alt="" class="h-full rounded object-contain" />
            <input
              type="text"
              value={image.variableName}
              oninput={(e) => onImageVariableChange(image.id, e.currentTarget.value)}
              placeholder="CSS variable"
              class="min-w-0 flex-1 rounded-lg border-0 bg-zinc-100 p-2 text-sm dark:bg-zinc-600 dark:text-white"
            />
            <button type="button" class="p-2 dark:text-white" onclick={() => onRemoveImage(image.id)}>
              <span class="text-xl font-IconFamily">{'\ued8c'}</span>
            </button>
          </div>
          <select
            class="w-full rounded-lg border-0 bg-zinc-100 px-2 py-1.5 text-sm dark:bg-zinc-600"
            value={imageUsage(image.id)}
            onchange={(e) =>
              setImageUsage(image.id, e.currentTarget.value as 'decorative' | 'page-background' | 'cover')}
          >
            <option value="decorative">Decorative only (CSS variable)</option>
            <option value="page-background">SEQTA page background</option>
            <option value="cover">Theme store cover</option>
          </select>
        </div>
      {/each}

      <label class="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-700">
        <span class="font-IconFamily">{'\uec60'}</span>
        <span class="text-sm dark:text-white">Add image</span>
        <input type="file" accept="image/*" class="hidden" onchange={onImageUpload} />
      </label>

      <label class="block text-sm">
        Gradient end
        <div class="mt-1">
          <ColourPicker
            savePresets={false}
            standalone={true}
            customState={creatorMeta.gradientEnd || theme.defaultColour}
            customOnChange={(color: string) => patchCreatorMeta({ gradientEnd: color })}
          />
        </div>
      </label>
      <label class="block text-sm">
        Gradient angle ({creatorMeta.gradientAngle}°)
        <Slider
          state={creatorMeta.gradientAngle}
          min={0}
          max={360}
          step={1}
          onChange={(value) => patchCreatorMeta({ gradientAngle: value })}
        />
      </label>
      <label class="block text-sm">
        Colour overlay ({Math.round(creatorMeta.overlayOpacity * 100)}%)
        <Slider
          state={creatorMeta.overlayOpacity}
          min={0}
          max={0.85}
          step={0.05}
          onChange={(value) => patchCreatorMeta({ overlayOpacity: value })}
        />
      </label>
      <label class="block text-sm">
        Background blur ({creatorMeta.backgroundBlurPx}px)
        <Slider
          state={creatorMeta.backgroundBlurPx}
          min={0}
          max={24}
          step={1}
          onChange={(value) => patchCreatorMeta({ backgroundBlurPx: value })}
        />
      </label>
    </div>

    <Divider />

    <div class="py-3">
      <h2 class="text-sm font-bold">Adaptive CSS variables</h2>
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        One per line, each must start with <code class="text-xs">--</code>. These receive the same colour as the adaptive accent when &quot;Adaptive theme colour&quot; is enabled in general settings. Use them in Custom CSS, e.g. <code class="text-xs">border-color: var(--my-accent);</code>
      </p>
      <textarea
        placeholder="--my-accent&#10;--class-banner"
        value={theme.adaptiveCssVariables?.join('\n') ?? ''}
        oninput={(e) => {
          const lines = e.currentTarget.value
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
          theme = { ...theme, adaptiveCssVariables: lines };
        }}
        class="p-2 mt-2 w-full min-h-[5rem] font-mono text-sm rounded-lg border-0 transition dark:placeholder-zinc-400 bg-zinc-200 dark:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-100 dark:focus:ring-zinc-700 focus:bg-zinc-300/50 dark:focus:bg-zinc-600"
      ></textarea>
    </div>

    <Divider />

    <div class="theme-creator-sidebar -mx-2">
      <SidebarAppearance showStylePreview={false} />
    </div>

    <Divider />

    {#each [
      {
        type: 'switch',
        title: 'Hide Theme Name',
        description: 'Useful when your cover image contains text',
        props: {
          state: theme.hideThemeName,
          onChange: (value: boolean) => theme = { ...theme, hideThemeName: value }
        }
      },
      {
        type: 'switch',
        title: 'Force Theme',
        description: 'Force users to use either dark or light mode',
        props: {
          state: shouldForceThemeAppearance(theme),
          onChange: (value: boolean) => {
            if (value) {
              theme = { ...theme, forceTheme: true, forceDark: false };
            } else {
              theme = { ...theme, forceTheme: false, forceDark: undefined };
            }
          }
        }
      },
      {
        type: 'conditional',
        props: {
          condition: shouldForceThemeAppearance(theme),
          children: {
            type: 'lightDarkToggle',
            title: 'Mode',
            description: 'Choose whether to force light or dark mode',
            props: {
              state: theme.forceDark === true,
              onChange: (value: boolean) =>
                (theme = { ...theme, forceDark: value, forceTheme: true })
            }
          }
        }
      },
      {
        type: 'codeEditor',
        title: 'Custom CSS',
        description: 'Extra CSS appended after generated theme rules',
        direction: 'vertical',
        props: {
          value: creatorMeta.userCustomCss,
          onChange: (value: string) => patchCreatorMeta({ userCustomCss: value })
        }
      }
    ] as SettingItem[] as setting}
      {@render settingItem(setting)}
    {/each}

    <div
      class="sticky bottom-0 z-10 -mx-2 mt-4 space-y-2 border-t border-zinc-200/80 bg-zinc-100 p-3 pb-4 dark:border-zinc-700/60 dark:bg-zinc-800"
    >
      <button
        type="button"
        onclick={submitTheme}
        class="w-full rounded-xl bg-zinc-900 px-4 py-3 text-[13px] font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Save & apply
      </button>
      <button
        type="button"
        disabled={communityBusy || !theme.name.trim() || !cloudLoggedIn}
        onclick={() => void submitThemeToCommunity()}
        class="w-full rounded-xl bg-zinc-200 px-4 py-3 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
      >
        {communityBusy ? "Submitting…" : "Save & submit to community"}
      </button>
      {#if !cloudLoggedIn}
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          Sign in with BetterSEQTA Cloud to submit themes to the community library.
        </p>
      {/if}
      {#if communityError}
        <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">{communityError}</p>
      {/if}
    </div>
  </div>
</div>