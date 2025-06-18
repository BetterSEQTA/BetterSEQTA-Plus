import { slashVisible, slashItems, slashLocation, slashProps, selectedIndex } from './stores';

export default {
  items: ({ query }: any) => {
    return [
      {
        title: 'To Dos',
        subtitle: 'Create a to do list with checkboxes',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        title: 'Heading 1',
        subtitle: 'BIG heading',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
      },
      {
        title: 'Heading 2',
        subtitle: 'Less Big heading',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
      },
      {
        title: 'Heading 3',
        subtitle: 'Medium big heading',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
      },
      {
        title: 'Bullet List',
        subtitle: 'Pew pew pew',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleBulletList();
        },
      },
      {
        title: 'Numbered List',
        subtitle: '1, 2, 3, 4...',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleOrderedList();
        },
      },
      {
        title: 'Text',
        subtitle: 'Just plain text paragraph',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('paragraph').run();
        },
      },
      {
        title: 'Quote',
        subtitle: 'Capture important quotes',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: 'Code Block',
        subtitle: 'Formatted code snippet',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: 'Divider',
        subtitle: 'Add a horizontal line',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
      },
      {
        title: 'Bold Text',
        subtitle: 'Make text bold',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleBold();
        },
      },
      {
        title: 'Italic Text',
        subtitle: 'Make text italic',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleItalic();
        },
      },
      {
        title: 'Link',
        subtitle: 'Add a web link',
        command: ({ editor, range }: any) => {
          const url = prompt('Enter the URL:');
          if (url) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setLink({ href: url })
              .insertContent('Link text')
              .run();
          }
        },
      },
      {
        title: 'Inline Code',
        subtitle: 'Inline code snippet',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleCode();
        },
      },
    ]
      .filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 10);
  },

  render: () => {
    return {
      onStart: (props: any) => {
        let editor = props.editor;
        let range = props.range;
        let location = props.clientRect();
        const editorRect = editor.view.dom.getBoundingClientRect();
        slashProps.set({ editor, range });
        slashVisible.set(true);
        slashLocation.set({
          x: location.x - editorRect.left,
          y: location.y - editorRect.top + location.height / 2 + 4,
          height: location.height,
        });
        slashItems.set(props.items);
        selectedIndex.set(0);
      },

      onUpdate(props: any) {
        slashItems.set(props.items);
        selectedIndex.set(0);
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          slashVisible.set(false);
          return true;
        }
      },

      onExit() {
        slashVisible.set(false);
        selectedIndex.set(0);
      },
    };
  },
};
