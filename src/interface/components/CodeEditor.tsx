import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { color } from '@uiw/codemirror-extensions-color';
import { less } from '@codemirror/lang-less'
import { useCallback, useEffect, useState } from 'react';
import './CodeEditor.css'

export default function CodeEditor({ callback, initialState, height }: { callback: (value: string) => void, initialState: string, height: string }) {
  const [value, setValue] = useState(initialState)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (document.body.classList.contains('dark')) {
      setDarkMode(true)
    }
  }, [])

  const onChange = useCallback((value: string, _: ViewUpdate) => {
    setValue(value)
    callback(value)
  }, [])

  return(
    <CodeMirror
      basicSetup={{
        allowMultipleSelections: true,
        lineNumbers: false,
        foldGutter: false,
        dropCursor: true,
        tabSize: 2,
      }}
      theme={ darkMode ? githubDark : githubLight }
      placeholder={"It's time to dream up some code!"}
      className='rounded-lg'
      value={value}
      height={height}
      extensions={[less(), color]}
      onChange={onChange} />
  )
}