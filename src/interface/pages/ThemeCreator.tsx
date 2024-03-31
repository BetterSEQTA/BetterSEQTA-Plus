import CodeEditor from '../components/CodeEditor';
import { useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import { SettingsContextProvider } from '../SettingsContext';
import Accordion from '../components/Accordian';
import Switch from '../components/Switch';

export default function ThemeCreator() {
  const [theme, setTheme] = useState<CustomTheme>({
    name: '',
    description: '',
    defaultColour: '',
    CanChangeColour: true,
    CustomCSS: '',
    CustomImages: []
  });

  return (
    <div className='w-full min-h-[100vh] bg-zinc-100 dark:bg-zinc-800 dark:text-white transition duration-30'>
      <div className='flex flex-col p-2'>
        <h1 className='pb-2 text-xl font-semibold'>Theme Creator</h1>

        <div>
          <div className='pb-2 text-sm'>Theme Name</div>
          <input
            id='themeName'
            type='text'
            placeholder='Whatcha calling it?'
            value={theme.name}
            onChange={e => setTheme({ ...theme, name: e.target.value })}
            className='w-full p-2 mb-4 rounded-lg dark:border-gray-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <div>
          <div className='pb-2 text-sm'>Description <span className='italic opacity-80'>(optional)</span></div>
          <textarea
          id='themeDescription'
          value={theme.description}
          onChange={e => setTheme({ ...theme, description: e.target.value })}
          className='w-full p-2 mb-4 rounded-lg dark:border-gray-700 dark:bg-zinc-900 dark:text-white' />
        </div>
        
        <Accordion defaultOpened title='Default Theme Colour'>
          <div className='p-2 bg-white rounded-lg w-fit dark:bg-zinc-900'>
            <ColorPicker
              width={278}
              disableDarkMode={true}
              hideInputs={true}
              value={theme.defaultColour}
              onChange={(color: string) => setTheme({ ...theme, defaultColour: color })} />
          </div>
          
          <div className='flex items-center justify-between py-2'>
            <div className='text-sm '>Allow users to change the colour</div>
            <Switch
              state={theme.CanChangeColour}
              onChange={value => setTheme({ ...theme, CanChangeColour: value })} />
          </div>
        </Accordion>
        
        <div className='h-4'></div>

        <Accordion defaultOpened title='Custom CSS'>
          <CodeEditor
            height='300px'
            initialState={theme.CustomCSS}
            callback={(code: string) => setTheme({ ...theme, CustomCSS: code })} />
        </Accordion>
        
        <button className='w-full px-4 py-2 my-4 text-white transition bg-blue-500 rounded dark:text-white'>
          Save Theme
        </button>

        <SettingsContextProvider><></></SettingsContextProvider>
      </div>
    </div>
  );
}