<script lang="ts">
  import { EditorState } from '@codemirror/state';
  import { highlightSelectionMatches } from '@codemirror/search';
  import { indentWithTab, history, defaultKeymap, historyKeymap } from '@codemirror/commands';
  import { indentOnInput, indentUnit, bracketMatching, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
  import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
  import { highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, keymap, EditorView } from '@codemirror/view'; // dropCursor

  // Theme
  import { oneDark } from "@codemirror/theme-one-dark";

  // Language
  import { css } from "@codemirror/lang-css";
  import { onDestroy, onMount } from 'svelte'

  let editor = $state<HTMLDivElement | null>(null)
  let view: EditorView | null = null;
  let { value, onChange } = $props<{value: string, onChange: (value: string) => void}>()

  function createEditorState(initialContents: string, options = {oneDark: false}) {
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
          highlightActiveLine(),
          highlightSelectionMatches(),
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
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      ];

      if (options.oneDark)
          extensions.push(oneDark);

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
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  })
</script>

<div class="rounded-lg text-[13px] overflow-clip w-full bg-white dark:bg-zinc-900" bind:this={editor}></div>