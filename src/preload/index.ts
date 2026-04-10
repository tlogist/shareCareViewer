import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('dicomApi', {
  getFileServerPort: (): Promise<number> => ipcRenderer.invoke('get-file-server-port'),
  scanStudies: (): Promise<unknown[]> => ipcRenderer.invoke('scan-studies'),
  getMetadata: (filePath: string): Promise<ArrayBuffer> => ipcRenderer.invoke('get-metadata', filePath)
})
