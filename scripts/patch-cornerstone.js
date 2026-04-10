#!/usr/bin/env node
// Patches Cornerstone3D packages to remove Web Worker constructor calls
// that Vite can't bundle with code-splitting. Our DICOM data is uncompressed
// so we decode on the main thread — no workers needed.

const fs = require('fs')
const path = require('path')

const patches = [
  {
    file: 'node_modules/@cornerstonejs/dicom-image-loader/dist/esm/init.js',
    content: `import { setOptions } from './imageLoader/internal/index';
import registerLoaders from './imageLoader/registerLoaders';
function init(options = {}) {
    setOptions(options);
    registerLoaders();
}
export default init;
`
  },
  {
    file: 'node_modules/@cornerstonejs/tools/dist/esm/stateManagement/segmentation/polySeg/registerPolySegWorker.js',
    content: `let registered = false;
export function registerPolySegWorker() {}
`
  }
]

for (const patch of patches) {
  const fullPath = path.join(__dirname, '..', patch.file)
  if (fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, patch.content)
    console.log(`Patched: ${patch.file}`)
  }
}
