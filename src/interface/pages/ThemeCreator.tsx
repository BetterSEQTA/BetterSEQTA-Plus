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

  function saveTheme() {
    console.log(theme);
  }

  function CodeUpdate(value: string) {
    console.log(value);
    setTheme((previousTheme) => ({ ...previousTheme, CustomCSS: value }));
  }

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
            className='w-full p-2 mb-4 transition-all duration-300 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white' />
        </div>

        <div>
          <div className='pb-2 text-sm'>Description <span className='italic opacity-80'>(optional)</span></div>
          <textarea
          id='themeDescription'
          value={theme.description}
          onChange={e => setTheme({ ...theme, description: e.target.value })}
          className='w-full p-2 mb-4 rounded-lg focus:outline-none ring-0 focus:ring-1 ring-zinc-100 dark:ring-zinc-700 dark:bg-zinc-900 dark:text-white' />
        </div>
        
        <Accordion defaultOpened title='Default Theme Colour'>
          <div className='p-2 mt-2 bg-white rounded-lg w-fit dark:bg-zinc-900'>
            <ColorPicker
              width={278}
              disableDarkMode={true}
              hideInputs={true}
              value={theme.defaultColour}
              onChange={(color: string) => setTheme({ ...theme, defaultColour: color })} />
          </div>
          
          <div className='flex items-center justify-between pt-4'>
            <div>
              <div className='pr-2 text-sm font-semibold'>Customisable</div>
              <div className='pr-2 text-[11px]'>Allow users to change the theme colour</div>
            </div>
            <Switch
              state={theme.CanChangeColour}
              onChange={value => setTheme({ ...theme, CanChangeColour: value })} />
          </div>
        </Accordion>
        
        <div className='h-4'></div>

        <Accordion defaultOpened title='Custom Images'>
          child
        </Accordion>
        
        <div className='h-4'></div>

        <Accordion defaultOpened title='Custom CSS'>
          <CodeEditor
            className='mt-2'
            height='300px'
            initialState={theme.CustomCSS}
            callback={CodeUpdate} />
        </Accordion>
        
        <button onClick={saveTheme} className='w-full px-4 py-2 my-4 text-white transition bg-blue-500 rounded dark:text-white'>
          Save Theme
        </button>

        <SettingsContextProvider><></></SettingsContextProvider>
      </div>
    </div>
  );
}