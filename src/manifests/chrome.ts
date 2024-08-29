import { createManifest } from '../../lib/createManifest'
import baseManifest from './manifest.json'

export const chrome = createManifest(baseManifest, 'chrome')
