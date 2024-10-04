<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import { onMount } from 'svelte';

  import type { CustomTheme } from '@/types/CustomThemes'

  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { getTheme } from '@/seqta/ui/themes/getTheme'

  import Divider from '@/svelte-interface/components/themeCreator/divider.svelte'
  import Switch from '@/svelte-interface/components/Switch.svelte'
  import Button from '@/svelte-interface/components/Button.svelte'
  import Slider from '@/svelte-interface/components/Slider.svelte'
  import ColourPicker from '../components/ColourPicker.svelte'
  import CodeEditor from '../components/CodeEditor.svelte'

  import {
    handleImageUpload,
    handleRemoveImage,
    handleImageVariableChange,
    handleCoverImageUpload
  } from '../utils/themeImageHandlers';

  const { themeID } = $props<{ themeID: string }>()
  let theme = $state<CustomTheme>({
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
    forceDark: false
  })

  onMount(async () => {
    if (themeID) {
      const tempTheme = await getTheme(themeID)
      if (tempTheme) theme = tempTheme
    }
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

  $effect(() => {

  })

  type SettingType = 'switch' | 'button' | 'slider' | 'colourPicker' | 'select' | 'codeEditor';

  type SwitchProps = { state: boolean; onChange: (value: boolean) => void };
  type ButtonProps = { onClick: () => void; text: string };
  type SliderProps = { state: number; onChange: (value: number) => void; min?: number; max?: number };
  type ColourPickerProps = { color: string; onChange: (color: string) => void };
  type SelectProps = { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void };
  type CodeEditorProps = { value: string; onChange: (value: string) => void };

  type ComponentProps = SwitchProps | ButtonProps | SliderProps | ColourPickerProps | SelectProps | CodeEditorProps;

  type SettingItem = {
    type: SettingType;
    title: string;
    description: string;
    direction?: 'horizontal' | 'vertical';
    props: ComponentProps;
  };
</script>

{#snippet settingItem(item: SettingItem)}
  <div class="flex justify-between {item.direction === 'vertical' ? 'flex-col items-start gap-2' : 'items-center'} py-3">
    <div class="pr-4">
      <h2 class="text-sm font-bold">{item.title}</h2>
      <p class="text-xs">{item.description}</p>
    </div>
    {#if item.type === 'switch'}
      <Switch {...(item.props as SwitchProps)} />
    {:else if item.type === 'button'}
      <Button {...(item.props as ButtonProps)} />
    {:else if item.type === 'slider'}
      <Slider {...(item.props as SliderProps)} />
    {:else if item.type === 'colourPicker'}
      <ColourPicker savePresets={false} standalone={true} {...(item.props)} />
    {:else if item.type === 'codeEditor'}
      <CodeEditor {...(item.props as CodeEditorProps)} />
    {/if}
  </div>
{/snippet}

<div class='h-screen overflow-y-scroll {$settingsState.DarkMode && "dark"} '>
  <div class='flex flex-col w-full min-h-screen p-2 bg-zinc-100 dark:bg-zinc-800 dark:text-white'>
    <h1 class='text-xl font-semibold'>Theme Creator</h1>
    <a href='https://betterseqta.gitbook.io/betterseqta-docs' target='_blank' class='text-sm font-light text-zinc-500 dark:text-zinc-400'>
      <span class='no-underline font-IconFamily pr-0.5'>{'\ueb44'}</span>
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
        class='w-full p-2 mb-4 transition-all duration-300 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white' />
    </div>

    <div>
      <div class='pb-2 text-sm'>Description <span class='italic font-light opacity-80'>(optional)</span></div>
      <textarea
        id='themeDescription'
        placeholder="Don't worry, this one's optional!"
        bind:value={theme.description}
        class='w-full p-2 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white'></textarea>
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

    <div class="relative flex justify-center w-full gap-1 overflow-hidden transition rounded-lg aspect-theme group place-items-center bg-zinc-100 dark:bg-zinc-900">
      <div class={`transition pointer-events-none z-30 font-IconFamily ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>
        {'\ueb44'}
      </div>
      <span class={`dark:text-white pointer-events-none z-30 transition ${ theme.coverImage ? 'opacity-0 group-hover:opacity-100' : ''}`}>{theme.coverImage ? 'Change' : 'Add'} cover image</span>
      <input type="file" accept='image/*' onchange={onCoverImageUpload} class="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
      {#if !theme.hideThemeName && theme.coverImage}
        <div class="absolute z-30 transition-opacity opacity-100 pointer-events-none group-hover:opacity-0">{theme.name}</div>
      {/if}
      {#if theme.coverImage}
        <div class="absolute z-20 w-full h-full transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 bg-black/20"></div>
        <img src={URL.createObjectURL(theme.coverImage)} alt='Cover' class="absolute z-0 object-cover w-full h-full rounded" />
      {/if}
    </div>

    {#each theme.CustomImages as image (image.id)}
      <div class="flex items-center h-16 py-2 mb-4 bg-white rounded-lg shadow-lg dark:bg-zinc-900">
        <div class="flex-1 h-full ">
          <img src={URL.createObjectURL(image.blob)} alt={image.variableName} class="object-contain h-full rounded" />
        </div>
        <input
          type="text"
          bind:value={image.variableName}
          oninput={(e) => onImageVariableChange(image.id, e.currentTarget.value)}
          placeholder="CSS Variable Name"
          class="flex-grow flex-[3] w-full p-2 transition-all duration-300 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-800/50 dark:text-white"
        />
        <button onclick={() => onRemoveImage(image.id)} class="p-2 ml-1 transition dark:text-white">
          <!-- <Duocolor.XcloseIcon height={20} width={20} /> -->
        </button>
      </div>
    {/each}

    <div class="relative flex justify-center w-full h-8 gap-1 overflow-hidden transition rounded-lg place-items-center bg-zinc-100 dark:bg-zinc-900">
      <!-- <Duocolor.PlusIcon height={18} width={18} /> -->
      <span class='dark:text-white'>Add image</span>
      <input type="file" accept='image/*' onchange={onImageUpload} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
    </div>
  </div>
</div>
