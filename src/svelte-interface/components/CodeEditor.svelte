<script lang="ts">
  import { EditorState } from '@codemirror/state';
  import { highlightSelectionMatches } from '@codemirror/search';
  import { indentWithTab, history, defaultKeymap, historyKeymap } from '@codemirror/commands';
  import { foldGutter, indentOnInput, indentUnit, bracketMatching, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
  import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
  import { lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, keymap, EditorView } from '@codemirror/view'; // dropCursor

  // Theme
  import { oneDark } from "@codemirror/theme-one-dark";

  // Language
  import { css } from "@codemirror/lang-css";
  import { onMount } from 'svelte'

  function createEditorState(initialContents: string, options = {}) {
      let extensions = [
          /* lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          indentUnit.of("    "),
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
          ]), */
          css(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      ];

      /* if (options.oneDark)
          extensions.push(oneDark); */

      return EditorState.create({
          doc: initialContents,
          extensions
      });
  }

  function createEditorView(state: any, parent: HTMLElement) {
      return new EditorView({ state, parent });
  }

  onMount(() => {
    const editor = document.querySelector('#cm-target');
    if (editor) {
      const state = createEditorState('body {\n  color: red;\n}');
      const view = createEditorView(state, editor as HTMLElement);

      console.log(view)
    }
  });
</script>

<div id="cm-target"></div>
