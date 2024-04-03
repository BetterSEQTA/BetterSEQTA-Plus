import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { color } from '@uiw/codemirror-extensions-color';
import { less } from '@codemirror/lang-less'
import { useCallback, useEffect, useState } from 'react';
import './CodeEditor.css'

export default function CodeEditor({ 
  className = '', 
  height = '100%', 
  value,
  setValue
}: {
  className?: string;
  height?: string;
  value: string;
  setValue: (value: string) => void;
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (document.body.classList.contains('dark')) {
      setDarkMode(true)
    }
  }, [])

  const onChange = useCallback((value: string, _: ViewUpdate) => {
    setValue(value)
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
      placeholder={"Happy coding!"}
      className={`rounded-lg text-[13px] ${className}`}
      value={value}
      height={height}
      extensions={[less(), color]}
      onChange={onChange} />
  )
}