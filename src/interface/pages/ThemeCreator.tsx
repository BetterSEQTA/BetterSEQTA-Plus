import CodeEditor from '../components/CodeEditor';

export default function ThemeCreator() {
  const handleSave = (value: string) => {
    // Save the theme
    console.log(value)
  }

  return (
    <div className='w-full h-full'>
      <CodeEditor initialState={'.hi {}'} callback={handleSave} />
    </div>
  );
}