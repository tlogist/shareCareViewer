import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { init as initDicomImageLoader, decodeImageFrame } from '@cornerstonejs/dicom-image-loader'
import { expose } from 'comlink'

export async function initCornerstone(): Promise<void> {
  // Initialize Cornerstone3D rendering engine
  await cornerstone.init()

  // Initialize the DICOM image loader (registers wadouri: and wadors: schemes).
  // Our patched init.js skips worker registration — we register a main-thread
  // decoder below instead.
  initDicomImageLoader()

  // Register a main-thread decoder as a "fake worker" with the worker manager.
  // The real init.js creates a Web Worker with Comlink, but Vite can't bundle
  // the Worker(new URL(...)) pattern. Instead we expose the same decodeTask
  // function directly on the main thread via a MessageChannel + Comlink proxy.
  registerMainThreadDecoder()

  // Initialize the tools library
  await cornerstoneTools.init()
}

function registerMainThreadDecoder(): void {
  const workerManager = cornerstone.getWebWorkerManager()

  // Create a fake worker using MessageChannel. Comlink can wrap either end of
  // a MessageChannel, so we expose our decode function on port1 and give port2
  // to the worker manager (which wraps it with Comlink.wrap to get the API).
  const channel = new MessageChannel()

  const decoderAPI = {
    decodeTask({
      imageFrame,
      transferSyntax,
      pixelData,
      decodeConfig,
      options,
      callbackFn
    }: Record<string, unknown>) {
      return decodeImageFrame(
        imageFrame,
        transferSyntax as string,
        pixelData,
        decodeConfig,
        options,
        callbackFn
      )
    }
  }

  // Expose the decoder API on port1 (acts as the "worker" side)
  expose(decoderAPI, channel.port1)

  // Give port2 to the worker manager (acts as the "client" side)
  const workerFn = () => channel.port2 as unknown as Worker
  workerManager.registerWorker('dicomImageLoader', workerFn, {
    maxWorkerInstances: 1
  })
}
