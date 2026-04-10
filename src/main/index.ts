import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { readFile, stat } from 'fs/promises'
import { scanStudies } from './dicom-scanner'

// Local HTTP server to serve DICOM files to Cornerstone's wadouri loader.
// Bound to 127.0.0.1 only — not accessible from other machines.
let fileServerPort = 0

// In dev mode, __dirname is out/main/ so we go up two levels to reach the project root.
// In production, app.getAppPath() points to the app resources.
const PROJECT_ROOT = app.isPackaged
  ? join(app.getAppPath(), '..')
  : join(__dirname, '..', '..')

function startFileServer(projectsDir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers so the renderer can fetch from localhost
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
      res.setHeader('Access-Control-Allow-Headers', 'Range')
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      const urlPath = decodeURIComponent(req.url || '/')
      const filePath = join(projectsDir, urlPath)

      // Prevent directory traversal outside projects/
      if (!filePath.startsWith(projectsDir)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }

      try {
        const fileStat = await stat(filePath)
        const data = await readFile(filePath)
        res.writeHead(200, {
          'Content-Type': 'application/dicom',
          'Content-Length': fileStat.size
        })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        resolve(addr.port)
      } else {
        reject(new Error('Failed to get server port'))
      }
    })
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // IPC handlers
  const projectsDir = join(PROJECT_ROOT, 'projects')

  ipcMain.handle('get-file-server-port', () => fileServerPort)

  ipcMain.handle('scan-studies', async () => {
    console.log('Scanning studies in:', projectsDir)
    const studies = await scanStudies(projectsDir)
    console.log(`Found ${studies.length} studies with ${studies.reduce((n, s) => n + s.series.length, 0)} series`)
    return studies
  })

  ipcMain.handle('get-metadata', async (_event, filePath: string) => {
    // filePath is relative to projects/
    const fullPath = join(projectsDir, filePath)
    if (!fullPath.startsWith(projectsDir)) return null
    const data = await readFile(fullPath)
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const projectsDir = join(PROJECT_ROOT, 'projects')
  fileServerPort = await startFileServer(projectsDir)
  console.log(`DICOM file server running on http://127.0.0.1:${fileServerPort}`)

  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
