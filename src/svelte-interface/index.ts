import { mount } from 'svelte';
import Settings from './pages/settings.svelte';
import { initializeSettingsState } from '@/seqta/utils/listeners/SettingsState';
import './index.css';


initializeSettingsState();

const app = mount(Settings, {
  target: document.body,
  props: {
    standalone: true
  }
});

console.log(app);
