/* 
  TEMPORARY FIX FOR CHROME 130+ builds
*/

import path from 'node:path';
import fs from 'fs';
import { PluginOption } from 'vite';
import { ManifestV3Export } from '@crxjs/vite-plugin';

const manifestPath = path.resolve('dist/chrome/manifest.json');

export function updateManifestPlugin(): PluginOption {
  return {
    name: 'update-manifest-plugin',
    enforce: 'post',
    closeBundle() {
      forceDisableUseDynamicUrl();
    },

    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const updated = forceDisableUseDynamicUrl();
        if (updated) {
          server.ws.send({ type: 'full-reload' });
          console.log('** updated **');
        }

        fs.watchFile(manifestPath, () => {
          console.log('** watchFile ** ');
          const manifestContents = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (manifestContents.web_accessible_resources.some((resource: any) => resource.use_dynamic_url)) {
            const updated = forceDisableUseDynamicUrl();
            if (updated) {
              server.ws.send({ type: 'full-reload' });
              console.log('** updated **');
            }
          }
        });
      });
    },

    writeBundle() {
      console.log('### writeBundle ##');
      forceDisableUseDynamicUrl();
    },
  };
}

function forceDisableUseDynamicUrl() {
  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  const manifestContents = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Awaited<ManifestV3Export>;

  if (typeof manifestContents === 'function' || !manifestContents.web_accessible_resources) return false;
  if (manifestContents.web_accessible_resources.every((resource) => !resource.use_dynamic_url)) return false;

  manifestContents.web_accessible_resources.forEach((resource) => {
    if (resource.use_dynamic_url) resource.use_dynamic_url = false;
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifestContents, null, 2));
  return true;
}
