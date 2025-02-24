<script lang="ts">
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

  // Theme
  import { githubLight, githubDark } from '@uiw/codemirror-theme-github';

  // Language
  import { css } from "@codemirror/lang-css";

  let editor = $state<HTMLDivElement | null>(null)
  let view: EditorView | null = null;
  let editorTheme = new Compartment();
  let { value, onChange, className } = $props<{value: string, onChange: (value: string) => void, className?: string}>()

  function createEditorState(initialContents: string) {
      let extensions = [
          highlightSpecialChars(),
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
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
          css(),
          color,
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      ];

      return EditorState.create({
          doc: initialContents,
          extensions
      });
  }

  function createEditorView(state: EditorState, parent: HTMLElement) {
      return new EditorView({ state, parent });
  }

  onMount(() => {
    if (editor) {
      const state = createEditorState(value);
      view = createEditorView(state, editor as HTMLElement);
    }

    settingsState.subscribe((settings) => {
      if (view) {
        view.dispatch({
          effects: editorTheme.reconfigure(
            settings.DarkMode ? githubDark : githubLight
          )
        })
      }
    });
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  })
</script>

<div class={`rounded-lg text-[13px] overflow-clip w-full bg-white dark:bg-zinc-900 ${className}`} bind:this={editor}></div>