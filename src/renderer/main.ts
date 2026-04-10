import { initCornerstone } from './cornerstone-setup'
import { renderStudyBrowser } from './study-browser'
import { initViewer } from './viewer'
import { initToolbar } from './toolbar'
import { initMetadataPanel } from './metadata-panel'

// Type declaration for the preload API
declare global {
  interface Window {
    dicomApi: {
      getFileServerPort: () => Promise<number>
      scanStudies: () => Promise<DicomStudy[]>
      getMetadata: (filePath: string) => Promise<ArrayBuffer>
    }
  }
}

export interface DicomInstance {
  filePath: string
  instanceNumber: number
  rows: number
  columns: number
}

export interface DicomSeries {
  seriesInstanceUID: string
  seriesDescription: string
  seriesNumber: number
  modality: string
  instances: DicomInstance[]
}

export interface DicomStudy {
  studyInstanceUID: string
  studyDescription: string
  studyDate: string
  patientName: string
  modality: string
  series: DicomSeries[]
}

async function main(): Promise<void> {
  const port = await window.dicomApi.getFileServerPort()

  await initCornerstone()

  const studies = await window.dicomApi.scanStudies()

  initViewer(port)
  initToolbar()
  initMetadataPanel()
  renderStudyBrowser(studies, port)
}

main().catch(err => {
  console.error('Failed to initialize:', err)
  // Show error visually in the app so it's obvious
  document.body.innerHTML = `<pre style="color:red;padding:20px;white-space:pre-wrap;">
Failed to initialize:\n${err?.stack || err}
  </pre>`
})
