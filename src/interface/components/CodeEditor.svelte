<script lang="ts">
  // Import necessary modules and components for the code editor functionality
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'
  import { onDestroy, onMount } from 'svelte'

  import { EditorState } from '@codemirror/state';
  import { highlightSelectionMatches } from '@codemirror/search';
  import { indentWithTab, history, defaultKeymap, historyKeymap } from '@codemirror/commands';
  import { indentOnInput, indentUnit, bracketMatching, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
  import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
  import { highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, keymap, EditorView, dropCursor } from '@codemirror/view';
  import { color } from '@uiw/codemirror-extensions-color'
  import { Compartment } from '@codemirror/state';

  // Theme imports for light and dark modes
  import { githubLight, githubDark } from '@uiw/codemirror-theme-github';

  // Import language support for CSS
  import { css } from "@codemirror/lang-css";

  // Declare reactive editor reference and other necessary variables
  let editor = $state<HTMLDivElement | null>(null)
  let view: EditorView | null = null;
  let editorTheme = new Compartment();
  
  // Destructure props to extract editor value, onChange callback, and optional className
  let { value, onChange, className } = $props<{value: string, onChange: (value: string) => void, className?: string}>()

  // Function to create the editor state with various extensions and configurations
  function createEditorState(initialContents: string) {
      let extensions = [
          history(),
          drawSelection(),
          indentUnit.of("  "),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          dropCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          editorTheme.of(githubLight),
          keymap.of([
              indentWithTab,
              ...closeBracketsKeymap,
              ...defaultKeymap,
              ...historyKeymap,
              ...foldKeymap,
              ...completionKeymap,
          ]),
          EditorView.updateListener.of((update) => {  // Updates the content when document changes
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
          css(),                             // Language support for CSS
          color,                             // Enables color picker extension
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }), // Default syntax highlighting
      ];

      // Return a new editor state with the provided initial contents and extensions
      return EditorState.create({
          doc: initialContents,
          extensions
      });
  }

  // Function to create the editor view attached to a parent element
  function createEditorView(state: EditorState, parent: HTMLElement) {
      return new EditorView({ state, parent });
  }

  // onMount lifecycle function to initialize the editor when the component is mounted
  onMount(() => {
    if (editor) {
      const state = createEditorState(value);  // Create the editor state
      view = createEditorView(state, editor as HTMLElement);  // Create the editor view
    }

    // Subscribe to settingsState to dynamically update theme based on dark mode preference
    settingsState.subscribe((settings) => {
      if (view) {
        view.dispatch({
          effects: editorTheme.reconfigure(
            settings.DarkMode ? githubDark : githubLight  // Switch between dark and light theme
          )
        })
      }
    });
  });

  // onDestroy lifecycle function to clean up when the component is destroyed
  onDestroy(() => {
    if (view) {
      view.destroy();  // Destroy the editor view
    }
  })
</script>

<!-- The editor container with dynamic class names and bound to the editor variable -->
<div class={`rounded-lg text-[13px] overflow-clip w-full bg-white dark:bg-zinc-900 ${className}`} bind:this={editor}></div>
