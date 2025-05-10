<script lang="ts">
  // Import necessary modules and components
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

  // Extract the theme ID from props
  const { themeID } = $props<{ themeID: string }>()
  // Get the singleton instance of ThemeManager
  const themeManager = ThemeManager.getInstance();

  // Initialize reactive theme state with default values
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

  // Track closed accordion sections
  let closedAccordions = $state<string[]>([])
  // Flag to determine if theme data has finished loading
  let themeLoaded = $state(false);
  // Toggle for fullscreen mode in code editor
  let codeEditorFullscreen = $state(false);
  
  // Toggle fullscreen mode for the code editor
  function toggleCodeEditorFullscreen(e: MouseEvent) {
    e.preventDefault();
    codeEditorFullscreen = !codeEditorFullscreen;
  }

  // Toggle visibility of an accordion section
  function toggleAccordion(title: string, e: MouseEvent | KeyboardEvent) {
    // Skip toggling if the fullscreen toggle button was clicked
    if (e.target instanceof HTMLButtonElement && e.target.classList.contains('fullscreen-toggle')) {
      return;
    }

    // Toggle open/closed state of the specified accordion section
    if (closedAccordions.includes(title)) {
      closedAccordions = closedAccordions.filter(t => t !== title);
    } else {
      closedAccordions = [...closedAccordions, title];
    }
  }

  // Lifecycle method to run when the component is mounted
  onMount(async () => {
    await themeManager.disableTheme();

    // Load existing theme data if themeID is provided
    if (themeID) {
      const tempTheme = await themeManager.getTheme(themeID)

      if (!tempTheme) return

      // Transform the retrieved theme into the expected format
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

    // Trigger a global update to inform other parts of the app
    themeUpdates.triggerUpdate();
  });

  // Handle image file upload for custom theme images
  async function onImageUpload(event: Event) {
    theme = await handleImageUpload(event, theme);
  }

  // Remove a specific image from the theme by ID
  function onRemoveImage(imageId: string) {
    theme = handleRemoveImage(imageId, theme);
  }

  // Update the variable name for an image in the theme
  function onImageVariableChange(imageId: string, variableName: string) {
    theme = handleImageVariableChange(imageId, variableName, theme);
  }

  // Handle file upload for the cover image
  async function onCoverImageUpload(event: Event) {
    theme = await handleCoverImageUpload(event, theme);
  }

  // Submit and save the theme
  async function submitTheme() {
    const themeClone = JSON.parse(JSON.stringify(theme));

    // Preserve blob references in the cloned theme
    themeClone.CustomImages = theme.CustomImages.map((image) => ({
      ...image,
      blob: image.blob
    }))
    themeClone.coverImage = theme.coverImage

    // Save and apply the theme
    themeManager.clearPreview();
    await themeManager.saveTheme(themeClone);
    await themeManager.setTheme(themeClone.id);
    themeUpdates.triggerUpdate();
    CloseThemeCreator();
  }

  // Reactively update the theme preview when theme data is loaded
  $effect(() => {
    if (themeLoaded) {
      void themeManager.updatePreviewDebounced(theme);
    }
  });

  // Define possible setting component types
  type SettingType = 'switch' | 'button' | 'slider' | 'colourPicker' | 'select' | 'codeEditor' | 'imageUpload' | 'conditional' | 'lightDarkToggle';

  // Define prop types for each supported setting component
  type SwitchProps = { state: boolean; onChange: (value: boolean) => void };
  type ButtonProps = { onClick: () => void; text: string };
  type SliderProps = { state: number; onChange: (value: number) => void; min?: number; max?: number };
  type ColourPickerProps = { color: string; onChange: (color: string) => void };
  type SelectProps = { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void };
  type CodeEditorProps = { value: string; onChange: (value: string) => void };
  type LightDarkToggleProps = { state: boolean; onChange: (value: boolean) => void };

  // Conditional setting component props
  type ConditionalProps = {
    condition: boolean;
    children: SettingItem;
  };

  // Union type of all possible props for a setting component
  type ComponentProps = SwitchProps | ButtonProps | SliderProps | ColourPickerProps | SelectProps | CodeEditorProps | LightDarkToggleProps | ConditionalProps;

  // Main type representing a setting item in the theme creator
  type SettingItem = {
    type: SettingType;
    title: string;
    description: string;
    direction?: 'horizontal' | 'vertical';
    props: ComponentProps;
  };
</script>
