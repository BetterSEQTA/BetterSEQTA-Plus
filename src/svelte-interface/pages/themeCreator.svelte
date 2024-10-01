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
          onChange: (value) => theme.hideThemeName = value
        }
      },
      {
        type: 'switch',
        title: 'Force Theme',
        description: 'Force users to use either dark or light mode',
        props: {
          state: theme.forceDark !== undefined,
          onChange: (value) => theme.forceDark = value ? false : undefined
        }
      },
      {
        type: 'colourPicker',
        title: 'Default Theme Colour',
        description: 'Set the default color for your theme',
        direction: 'vertical',
        props: {
          color: theme.defaultColour,
          onChange: (color) => theme.defaultColour = color
        }
      },
      {
        type: 'codeEditor',
        title: 'Custom CSS',
        description: 'Add custom CSS to your theme',
        direction: 'vertical',
        props: {
          value: theme.CustomCSS,
          onChange: (value) => { theme.CustomCSS = value; console.log(theme.CustomCSS) }
        }
      }
    ] as SettingItem[] as setting}
      {@render settingItem(setting)}
    {/each}
  </div>
</div>
