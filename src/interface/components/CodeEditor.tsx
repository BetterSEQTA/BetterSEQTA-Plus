import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { color, colorView, colorTheme } from '@uiw/codemirror-extensions-color';
import { less } from '@codemirror/lang-less'
import { useCallback, useEffect, useState } from 'react';

export default function CodeEditor({ callback, initialState }: { callback: (value: string) => void, initialState: string }) {
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
    <CodeMirror basicSetup={{
      allowMultipleSelections: true,
      lineNumbers: false,
      foldGutter: false,
      dropCursor: true,
      tabSize: 2
    }} theme={ darkMode ? githubDark : githubLight } placeholder={"It's time to dream up some code!"} value={value} height="200px" extensions={[less(), color]} onChange={onChange} />
  )
}