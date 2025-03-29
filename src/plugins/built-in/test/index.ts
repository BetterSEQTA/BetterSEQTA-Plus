import type { Plugin } from '../../core/types';
import { BasePlugin, BooleanSetting } from '../../core/settings';

class TestPluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Test Plugin",
    description: "Some random setting",
  })
  someSetting!: boolean;
}

const settingsInstance = new TestPluginClass();

const testPlugin: Plugin<typeof settingsInstance.settings> = {
  id: 'test',
  name: 'Test Plugin',
  description: 'A test plugin for BetterSEQTA+',
  version: '1.0.0',
  settings: settingsInstance.settings,

  run: async (api) => {
    console.log('Test plugin running');

    const { unregister } = api.seqta.onPageChange((page) => {
      console.log('Page changed to', page);
    });

    return () => {
      console.log('Test plugin stopped');
      unregister();
    }
  }
};

export default testPlugin;