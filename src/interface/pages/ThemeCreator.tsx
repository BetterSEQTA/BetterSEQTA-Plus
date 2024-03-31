import CodeEditor from '../components/CodeEditor';

export default function ThemeCreator() {
  const handleSave = (value: string) => {
    // Save the theme
    console.log(value)
  }

  return (
    <div className='w-full h-[100vh] bg-zinc-100 dark:bg-zinc-800'>

      <div className='p-2'>
        <CodeEditor height='100px' initialState={'.exampleCode {}'} callback={handleSave} />
      </div>
    </div>
  );
}