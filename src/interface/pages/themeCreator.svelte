<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { fade } from 'svelte/transition';

  import { type LoadedCustomTheme } from '@/types/CustomThemes'

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
    handleCoverImageUpload
  } from '../utils/themeImageHandlers';
  import { CloseThemeCreator } from '@/plugins/built-in/themes/ThemeCreator'
  import { themeUpdates } from '../hooks/ThemeUpdates'
  import { ThemeManager } from '@/plugins/built-in/themes/theme-manager'

  const { themeID } = $props<{ themeID: string }>()
  const themeManager = ThemeManager.getInstance();

  let theme = $state<LoadedCustomTheme>({
    id: uuidv4(),
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
    forceDark: undefined
  })
  let closedAccordions = $state<string[]>([])
  let themeLoaded = $state(false);
  let codeEditorFullscreen = $state(false);
  
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

  onMount(async () => {
    await themeManager.disableTheme();

    if (themeID) {
      const tempTheme = await themeManager.getTheme(themeID)

      if (!tempTheme) return

      // convert temptheme to LoadedCustomTheme
      const loadedTheme = {
        ...tempTheme,
        CustomImages: tempTheme.CustomImages.map(image => ({
          ...image
        }))
      }

      theme = loadedTheme
      themeLoaded = true
    } else {
      themeLoaded = true
    }

    themeUpdates.triggerUpdate();
  });

  async function onImageUpload(event: Event) {
    theme = await handleImageUpload(event, theme);
  }

  function onRemoveImage(imageId: string) {
    theme = handleRemoveImage(imageId, theme);
  }

  function onImageVariableChange(imageId: string, variableName: string) {
    theme = handleImageVariableChange(imageId, variableName, theme);
  }

  async function onCoverImageUpload(event: Event) {
    theme = await handleCoverImageUpload(event, theme);
  }

  async function submitTheme() {
    const themeClone = JSON.parse(JSON.stringify(theme));

    // re-insert blobs into themeClone
    themeClone.CustomImages = theme.CustomImages.map((image) => ({
      ...image,
      blob: image.blob
    }))
    themeClone.coverImage = theme.coverImage

    themeManager.clearPreview();
    await themeManager.saveTheme(themeClone);
    await themeManager.setTheme(themeClone.id);
    themeUpdates.triggerUpdate();
    CloseThemeCreator();
  }

  $effect(() => {
    if (themeLoaded) {
      void themeManager.updatePreviewDebounced(theme);
    }
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
              <div class="flex gap-2 items-center px-2 py-2 mb-4 h-16 bg-white rounded-lg shadow-lg dark:bg-zinc-700">
                <div class="h-full">
                  <img src={URL.createObjectURL(image.blob)} alt={image.variableName} class="object-contain h-full rounded" />
                </div>
                <input
                  type="text"
                  bind:value={image.variableName}
                  oninput={(e) => onImageVariableChange(image.id, e.currentTarget.value)}
                  placeholder="CSS Variable Name"
                  class="p-2 w-full rounded-lg border-0 transition grow flex-3 dark:placeholder-zinc-300 bg-zinc-200 dark:bg-zinc-600/50 focus:bg-zinc-300/50 dark:focus:bg-zinc-600"
                />
                <button onclick={() => onRemoveImage(image.id)} class="p-2 transition dark:text-white">
                  <span class='text-xl font-IconFamily'>{'\ued8c'}</span>
                </button>
              </div>
            {/each}
      
            <div class="flex overflow-hidden relative gap-1 justify-center place-items-center w-full h-8 rounded-lg transition bg-zinc-200 dark:bg-zinc-700">
              <span class='font-IconFamily'>{'\uec60'}</span>
              <span class='dark:text-white'>Add image</span>
              <input type="file" accept='image/*' onchange={onImageUpload} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          {:else if item.type === 'lightDarkToggle'}
            <button
              class="overflow-hidden relative px-4 py-1 text-xl font-medium rounded-lg transition bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 font-IconFamily"
              onclick={() => (item.props as LightDarkToggleProps).onChange(!(item.props as LightDarkToggleProps).state)}
            >
              {#key (item.props as LightDarkToggleProps).state}
                <span
                  class="absolute"
                  in:fade={{ duration: 150 }}
                  out:fade={{ duration: 150 }}
                >
                  {(item.props as LightDarkToggleProps).state ? '\uec12' : '\uecfe'}
                </span>
              {/key}
              <span class='opacity-0'>{'\uec12'}</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<div class='h-screen overflow-y-scroll {$settingsState.DarkMode && "dark"} no-scrollbar'>
  {#if codeEditorFullscreen}
    <div class="absolute inset-0 bg-white z-[10000] dark:bg-zinc-900 dark:text-white">
      <div class="sticky top-0 px-2 h-screen">
        <div class="flex justify-between items-center my-4">
          <h2 class="text-xl font-bold">Custom CSS</h2>
          <button onclick={toggleCodeEditorFullscreen} class="pr-14 text-xl font-IconFamily">{'\uec06'}</button>
        </div>
        <CodeEditor className="editorHeight" value={theme.CustomCSS} onChange={(value: string) => { theme = { ...theme, CustomCSS: value } }} />
      </div>
    </div>
  {/if}
  <div class='flex relative flex-col p-2 w-full min-h-screen bg-zinc-100 dark:bg-zinc-800 dark:text-white'>


    <h1 class='text-xl font-semibold'>Theme Creator</h1>
    <a href='https://betterseqta.gitbook.io/betterseqta-docs' target='_blank' class='text-sm font-light text-zinc-500 dark:text-zinc-400'>
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

    <div class="flex overflow-hidden relative gap-1 justify-center place-items-center w-full rounded-lg transition aspect-theme group bg-zinc-200 dark:bg-zinc-700">
      <div class={`transition pointer-events-none z-30 font-IconFamily ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>
        {'\uec60'}
      </div>
      <span class={`dark:text-white pointer-events-none z-30 transition ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>{theme.coverImage ? 'Change' : 'Add'} cover image</span>
      <input type="file" accept='image/*' onchange={onCoverImageUpload} class="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
      {#if !theme.hideThemeName && theme.coverImage}
        <div class="absolute z-30 opacity-100 transition-opacity pointer-events-none group-hover:opacity-0">{theme.name}</div>
      {/if}
      {#if theme.coverImage}
        <div class="absolute z-20 w-full h-full opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 bg-black/20"></div>
        <img src="{typeof theme.coverImage === 'string' ? theme.coverImage : URL.createObjectURL(theme.coverImage)}" alt='Cover' class="object-cover absolute z-0 w-full h-full rounded" />
      {/if}
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
          state: theme.forceDark !== undefined,
          onChange: (value: boolean) => theme = { ...theme, forceDark: value ? false : undefined }
        }
      },
      {
        type: 'conditional',
        props: {
          condition: theme.forceDark !== undefined,
          children: {
            type: 'lightDarkToggle',
            title: 'Mode',
            description: 'Choose whether to force light or dark mode',
            props: {
              state: theme.forceDark === true,
              onChange: (value: boolean) => theme = { ...theme, forceDark: value }
            }
          }
        }
      },
      {
        type: 'colourPicker',
        title: 'Default Theme Colour',
        description: 'Set the default color for your theme',
        direction: 'vertical',
        props: {
          customState: theme.defaultColour,
          customOnChange: (color: string) => theme = { ...theme, defaultColour: color }
        }
      },
      {
        type: 'imageUpload',
        title: 'Custom Images',
        description: 'Add custom images to your theme',
        direction: 'vertical',
      },
      {
        type: 'codeEditor',
        title: 'Custom CSS',
        description: 'Add custom CSS to your theme',
        direction: 'vertical',
        props: {
          value: theme.CustomCSS,
          onChange: (value: string) => { theme = { ...theme, CustomCSS: value } }
        }
      }
    ] as SettingItem[] as setting}
      {@render settingItem(setting)}
    {/each}
    
    <button
      onclick={submitTheme}
      class="w-full px-4 py-2 mt-3 text-[13px] dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50">
      Save Theme
    </button>
  </div>
</div>