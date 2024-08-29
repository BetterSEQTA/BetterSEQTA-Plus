import { createManifest } from '../../lib/createManifest'
import baseManifest from './manifest.json'

export const edge = createManifest(baseManifest, 'edge')
