import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
//import { generateHTML } from '@tiptap/html'
import './Editor.css'
 

export default function Editor() {
  const editor = useCreateBlockNote({});
  
  /* debounce on change to export to html */
  editor._tiptapEditor.on('update', () => {
    window.parent.postMessage({
      type: 'message-html',
      data: editor._tiptapEditor.getHTML()
    }, '*')
  })

  return (
    <div className="h-screen">
      <BlockNoteView editor={editor} />
    </div>
  )
}