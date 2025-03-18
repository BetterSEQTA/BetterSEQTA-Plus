# Creating Custom UI Components for Settings

When adding new setting types to BetterSEQTA+, you'll often need to create custom UI components to render and edit these settings. This guide covers how to create Svelte components for the settings UI and how to integrate them with the settings system.

## Understanding the Settings UI

Settings in BetterSEQTA+ are rendered by the `src/interface/pages/settings/general.svelte` component. This component:

1. Loads settings from all plugins
2. Maps setting types to appropriate UI components
3. Renders the settings UI
4. Handles updates when settings are changed

## Basic Component Requirements

Every setting UI component should follow these conventions:

1. **Accept a `state` prop** for the current value
2. **Accept an `onChange` prop** for updating the value
3. **Accept any additional props** specific to the setting type (e.g., `options`, `min`, `max`)
4. **Handle user input** and call `onChange` with the new value

## Creating a Basic Component

Here's an example of a basic Svelte component for a custom setting type:

```svelte
<!-- src/interface/components/MyCustomSetting.svelte -->
<script lang="ts">
  // Current value
  export let state: any = null;
  
  // Callback for updates
  export let onChange = (newValue: any) => {};
  
  // Other props specific to your setting type
  export let customOption: string = "default";
  
  // Local state or methods if needed
  function handleChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    onChange(value);
  }
</script>

<div class="my-custom-setting">
  <input 
    type="text" 
    value={state} 
    on:input={handleChange} 
    data-option={customOption}
  />
</div>

<style>
  .my-custom-setting {
    /* Your component styles */
  }
</style>
```

## Example: Slider Component

BetterSEQTA+ includes a Slider component for number settings:

```svelte
<!-- src/interface/components/Slider.svelte -->
<script lang="ts">
  export let state: number | string = 0;
  export let onChange = (value: number) => {};
  export let min = 0;
  export let max = 100;
  export let step = 1;
  
  let stringValue = typeof state === "string" ? state : state.toString();
  
  function handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const newValue = parseFloat(input.value);
    stringValue = input.value;
    onChange(newValue);
  }
</script>

<div class="relative flex items-center">
  <input 
    type="range" 
    class="w-24 accent-indigo-500" 
    min={min} 
    max={max} 
    step={step}
    value={state}
    on:input={handleChange}
  />
  <span class="ml-2 text-xs text-zinc-500 dark:text-zinc-400 w-8">{stringValue}</span>
</div>
```

## Example: Color Picker Component

Here's a more complex example of a color picker component:

```svelte
<!-- src/interface/components/ColorPicker.svelte -->
<script lang="ts">
  export let state = "#000000";
  export let onChange = (value: string) => {};
  export let presets: string[] = ["#ff0000", "#00ff00", "#0000ff"];
  
  let isOpen = false;
  
  function handleColorChange(e: Event) {
    const input = e.target as HTMLInputElement;
    onChange(input.value);
  }
  
  function selectPreset(color: string) {
    onChange(color);
    isOpen = false;
  }
  
  function togglePicker() {
    isOpen = !isOpen;
  }
</script>

<div class="color-picker relative">
  <button 
    class="color-swatch" 
    style="background-color: {state}" 
    on:click={togglePicker}
    aria-label="Open color picker"
  ></button>
  
  {#if isOpen}
    <div class="picker-popup">
      <input 
        type="color" 
        value={state} 
        on:input={handleColorChange}
      />
      
      <div class="presets">
        {#each presets as preset}
          <button 
            class="preset-swatch" 
            style="background-color: {preset}" 
            on:click={() => selectPreset(preset)}
            aria-label={`Select color ${preset}`}
          ></button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .color-picker {
    position: relative;
  }
  
  .color-swatch {
    width: 2rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: 1px solid #ccc;
    cursor: pointer;
  }
  
  .picker-popup {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
  
  .presets {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }
  
  .preset-swatch {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 1px solid #ccc;
    cursor: pointer;
  }
</style>
```

## Integrating with the Settings System

Once you've created your component, you need to update `general.svelte` to use it for your custom setting type.

### 1. Import Your Component

At the top of `src/interface/pages/settings/general.svelte`, add an import for your component:

```typescript
import ColorPicker from "../../components/ColorPicker.svelte"
```

### 2. Update Component Mapping

Find the `getPluginSettingEntries` function in `general.svelte` and update the component mapping:

```typescript
function getPluginSettingEntries() {
  const entries: any[] = [];
  
  pluginSettings.forEach(plugin => {
    if (Object.keys(plugin.settings).length === 0) return;
    
    Object.entries(plugin.settings).forEach(([key, setting]) => {
      const id = getPluginSettingId(plugin.pluginId, key);
      
      entries.push({
        title: setting.title || key,
        description: setting.description || '',
        id,
        Component: setting.type === 'boolean' ? Switch :
                  setting.type === 'select' ? Select :
                  setting.type === 'number' ? Slider : 
                  setting.type === 'color' ? ColorPicker : // Add your component here
                  setting.type === 'string' ? (setting.options ? Select : null) : Switch,
        props: {
          state: pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default,
          onChange: (value: any) => {
            updatePluginSetting(plugin.pluginId, key, value);
          },
          options: setting.options,
          // Add any additional props your component needs
          presets: setting.presets,
          min: setting.min,
          max: setting.max,
          step: setting.step
        }
      });
    });
  });
  
  return entries;
}
```

## Handling Different UI Needs

Different setting types may have different UI needs:

### Toggle Switches

For boolean settings, a toggle switch is usually appropriate:

```svelte
<script lang="ts">
  export let state = false;
  export let onChange = (value: boolean) => {};
</script>

<button
  class="switch"
  class:active={state}
  on:click={() => onChange(!state)}
>
  <div class="toggle"></div>
</button>

<style>
  .switch {
    position: relative;
    width: 40px;
    height: 24px;
    background-color: #ccc;
    border-radius: 12px;
    cursor: pointer;
  }
  
  .switch.active {
    background-color: #4CAF50;
  }
  
  .toggle {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  
  .switch.active .toggle {
    transform: translateX(16px);
  }
</style>
```

### Text Inputs

For string settings, a text input with validation:

```svelte
<script lang="ts">
  export let state = "";
  export let onChange = (value: string) => {};
  export let maxLength: number | undefined = undefined;
  export let pattern: string | undefined = undefined;
  
  let error = "";
  
  function validate(value: string) {
    if (maxLength && value.length > maxLength) {
      error = `Value must be under ${maxLength} characters`;
      return false;
    }
    
    if (pattern && !new RegExp(pattern).test(value)) {
      error = "Value doesn't match the required pattern";
      return false;
    }
    
    error = "";
    return true;
  }
  
  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const newValue = input.value;
    
    if (validate(newValue)) {
      onChange(newValue);
    }
  }
</script>

<div class="text-input">
  <input 
    type="text" 
    value={state} 
    on:input={handleInput}
    maxlength={maxLength}
    pattern={pattern}
  />
  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .text-input {
    position: relative;
  }
  
  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }
  
  .error {
    color: red;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>
```

### Complex Interactive Components

For more complex settings, you may need more interactive components with dropdowns, modals, or other features. Consider using additional Svelte features like:

- `{#if}...{/if}` blocks for conditional rendering
- Svelte transitions for animations
- Svelte actions for DOM interactions
- Svelte stores for shared state

## Best Practices

1. **Keep Components Focused**: Each component should do one thing well
2. **Use TypeScript**: Define proper types for your props
3. **Handle Errors**: Validate input and show meaningful error messages
4. **Use Clear UI**: Make it obvious how to interact with the component
5. **Add Accessibility**: Include proper ARIA attributes and keyboard handling
6. **Support Theming**: Use CSS variables or design system tokens for consistent styling
7. **Test Edge Cases**: Ensure your component handles all possible inputs

## Complete Example

Here's a complete example of a custom file picker component:

```svelte
<!-- src/interface/components/FilePicker.svelte -->
<script lang="ts">
  export let state: string | null = null;
  export let onChange = (value: string | null) => {};
  export let accept = ".txt,.pdf,.doc,.docx";
  export let maxSize = 1024 * 1024 * 5; // 5MB
  
  let error = "";
  let fileName = state ? state.split('/').pop() : "No file selected";
  let inputEl: HTMLInputElement;
  
  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) {
      onChange(null);
      fileName = "No file selected";
      error = "";
      return;
    }
    
    const file = files[0];
    
    // Validate file size
    if (file.size > maxSize) {
      error = `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`;
      input.value = "";
      return;
    }
    
    error = "";
    fileName = file.name;
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        onChange(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }
  
  function clearFile() {
    if (inputEl) inputEl.value = "";
    onChange(null);
    fileName = "No file selected";
    error = "";
  }
</script>

<div class="file-picker">
  <div class="file-input">
    <button class="browse-btn" on:click={() => inputEl.click()}>
      Browse...
    </button>
    <span class="file-name">{fileName}</span>
    {#if state}
      <button class="clear-btn" on:click={clearFile}>
        ✕
      </button>
    {/if}
  </div>
  
  <input 
    type="file" 
    bind:this={inputEl}
    on:change={handleFileChange}
    {accept}
    class="hidden"
  />
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .file-picker {
    width: 100%;
  }
  
  .file-input {
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.25rem;
  }
  
  .browse-btn {
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    margin-right: 0.5rem;
    cursor: pointer;
  }
  
  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
  }
  
  .clear-btn {
    color: #999;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 0.5rem;
  }
  
  .hidden {
    display: none;
  }
  
  .error {
    color: red;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>
```

To use this in the settings system, you would:

1. Define a `FileSetting` interface in `types.ts`
2. Create a `FileSetting` decorator in `settings.ts`
3. Update the `getPluginSettingEntries` function in `general.svelte`

This component demonstrates:
- Handling file input (a more complex input type)
- Input validation
- Error handling
- Multiple interactive elements
- Binding to DOM elements
- Clean UI that follows platform conventions 