import CodeEditor from '../components/CodeEditor';
import Accordion from '../components/Accordian';
import { useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';

export default function ThemeCreator() {
  const [theme, setTheme] = useState<CustomTheme>({
    name: '',
    description: '',
    defaultColour: '',
    CanChangeColour: false,
    CustomCSS: '',
    CustomImages: []
  });

  const handleSave = (value: string) => {
    // Save the theme
    console.log(value)
  }

  return (
    <div className='w-full min-h-[100vh] bg-zinc-100 dark:bg-zinc-800 dark:text-white transition duration-30'>
      <div className='flex flex-col gap-2 p-2'>
        <h1 className='text-xl font-semibold pb-0.5'>Theme Creator</h1>

        <div>
          <label htmlFor='themeName' className='pb-1 text-sm'>Theme Name</label>
          <input id='themeName' type='text' placeholder='Whatcha calling it?' value={theme.name} onChange={e => setTheme({ ...theme, name: e.target.value })} className='w-full p-2 mb-4 rounded-lg dark:border-gray-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <div>
          <label htmlFor='themeDescription' className='pb-1 text-sm'>Description <span className='italic opacity-80'>(optional)</span></label>
          <textarea id='themeDescription' placeholder='' value={theme.description} onChange={e => setTheme({ ...theme, description: e.target.value })} className='w-full p-2 mb-4 rounded-lg dark:border-gray-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <div className=''>
          <label htmlFor='defaultColour' className='pb-1 text-sm'>Default Colour</label>
          <div className=''>
            <ColorPicker
              disableDarkMode={true}
              hideInputs={true}
              value={theme.defaultColour}
              onChange={(color: string) => setTheme({ ...theme, defaultColour: color })} />
          </div>
        </div>
      
        
        <div>
          <label htmlFor='defaultColour' className='pb-1 text-sm'>Default Colour</label>
          <CodeEditor height='100px' initialState={''} callback={handleSave} />
        </div>

        <button className='w-full px-4 py-2 mb-4 text-white transition bg-blue-500 rounded dark:text-white'>
          Save Theme
        </button>
      </div>
    </div>
  );
}