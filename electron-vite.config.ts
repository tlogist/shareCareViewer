import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    worker: {
      format: 'es'
    },
    build: {
      rollupOptions: {
        external: ['@icr/polyseg-wasm']
      }
    }
  }
})
