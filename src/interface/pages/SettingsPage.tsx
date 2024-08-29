import TabbedContainer from '../components/TabbedContainer';
import Settings from './SettingsPage/Settings';
import logo from '@/resources/icons/betterseqta-dark-full.png';
import logoDark from '@/resources/icons/betterseqta-light-full.png';
import { SettingsContextProvider } from '../SettingsContext';
import Shortcuts from './SettingsPage/Shortcuts';
import Picker from '../components/Picker';
import Themes from './SettingsPage/Themes';
import { ToastContainer } from 'react-toastify';
import { memo } from 'react';

import browser from 'webextension-polyfill';

interface SettingsPage {
  standalone: boolean;
}

const SettingsPage = ({ standalone }: SettingsPage) => {
  const tabs = [
    {
      title: 'Settings',
      content: <Settings />
    },
    {
      title: 'Shortcuts',
      content: <Shortcuts />
    },
    {
      title: 'Themes',
      content: <Themes />
    }
  ];  

  return (
    <SettingsContextProvider>
      <ToastContainer stacked toastStyle={{ borderRadius: '16px' }} draggable theme={document.body.classList.contains('dark') ? 'dark' : 'light'} />
      <div className={`flex flex-col w-[384px] shadow-2xl gap-2 bg-white ${ standalone ? 'h-[600px]' : 'h-[100vh] rounded-xl' } overflow-clip dark:bg-zinc-800 dark:text-white`}>
        <div className="grid border-b border-b-zinc-200/40 place-items-center">
          <img src={logo} className="w-4/5 dark:hidden" />
          <img src={logoDark} className="hidden w-4/5 dark:block" />
          <button onClick={() => browser.runtime.sendMessage({ type: 'currentTab', info: 'OpenChangelog' })} className="absolute w-8 h-8 text-lg rounded-xl font-IconFamily top-1 right-1 bg-zinc-100 dark:bg-zinc-700"></button>
        </div>
        <Picker />
        <TabbedContainer tabs={tabs} animations={false} />
      </div>
    </SettingsContextProvider>
  );
};

export default memo(SettingsPage);