import { createManifest } from '../../lib/createManifest'
import baseManifest from './manifest.json'
import pkg from '../../package.json'

const updatedFirefoxManifest = {
  ...baseManifest,
  background: {
    scripts: [baseManifest.background.service_worker],
  },
  action: {
    "default_popup": "interface/index.html#settings",
  },
  browser_specific_settings: {
    gecko: {
      id: pkg.author.email,
    },
  }
}

export const firefox = createManifest(updatedFirefoxManifest, 'firefox')
