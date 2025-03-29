import fs from 'fs';

export default function touchGlobalCSSPlugin() {
  return {
    name: 'touch-global-css',
    handleHotUpdate({ modules }) {
      // log all of the staticImportedUrls
      const importers = modules[0]._clientModule.importers
      importers.forEach((importer) => {
        if (importer.file.includes('.css')) {
          console.log("touching", importer.file)
          fs.utimesSync(importer.file, new Date(), new Date())
        }
      })
    }
  };
}
