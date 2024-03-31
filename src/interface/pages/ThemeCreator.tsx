import CodeEditor from '../components/CodeEditor';
import Accordion from '../components/Accordian';
import { useState } from 'react';

export default function ThemeCreator() {
  const [theme, setTheme] = useState();

  const handleSave = (value: string) => {
    // Save the theme
    console.log(value)
  }

  return (
    <div className='w-full h-[100vh] bg-zinc-100 dark:bg-zinc-800 dark:text-white transition duration-30'>
      <div className='flex flex-col gap-2 p-2'>
        <h1 className='text-xl font-semibold pb-0.5'>Theme Creator</h1>

        <input type='text' placeholder='Theme Name' className='w-full p-2 mb-4 rounded-lg dark:border-gray-700 dark:bg-zinc-900 dark:text-white' />
      
        

        <Accordion>
          <CodeEditor height='100px' initialState={''} callback={handleSave} />
        </Accordion>

        <button className='w-full px-4 py-2 mb-4 text-white transition bg-blue-500 rounded dark:text-white'>
          Save Theme
        </button>
      </div>
    </div>
  );
}