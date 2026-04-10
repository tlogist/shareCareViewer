import dicomParser from 'dicom-parser'
import { onSliceChange, getCurrentImageIds } from './viewer'

// Well-known DICOM tags for the summary section
const KEY_TAGS: Record<string, string> = {
  'x00100010': 'Patient Name',
  'x00100020': 'Patient ID',
  'x00080020': 'Study Date',
  'x00080060': 'Modality',
  'x00081030': 'Study Description',
  'x0008103e': 'Series Description',
  'x00280010': 'Rows',
  'x00280011': 'Columns',
  'x00280030': 'Pixel Spacing',
  'x00280100': 'Bits Allocated',
  'x00280101': 'Bits Stored',
  'x00281050': 'Window Center',
  'x00281051': 'Window Width',
  'x00280004': 'Photometric Interpretation',
  'x00180050': 'Slice Thickness',
  'x00200013': 'Instance Number',
  'x00080070': 'Manufacturer',
}

let currentFilePaths: string[] = []

export function initMetadataPanel(): void {
  // Listen for slice changes to update metadata
  onSliceChange((imageIndex: number) => {
    if (currentFilePaths[imageIndex]) {
      updateMetadata(currentFilePaths[imageIndex])
    }
  })
}

export async function updateMetadata(filePath: string): Promise<void> {
  const container = document.getElementById('metadata-content')!

  // Track file paths for slice navigation
  const imageIds = getCurrentImageIds()
  if (imageIds.length > 0) {
    // Reconstruct file paths from current loaded series
    // filePaths are passed when the series is first loaded
    currentFilePaths = imageIds.map(id => {
      // Extract file path from wadouri:http://127.0.0.1:port/path
      const url = id.replace('wadouri:', '')
      const urlObj = new URL(url)
      return decodeURIComponent(urlObj.pathname.slice(1))
    })
  }

  try {
    const buffer = await window.dicomApi.getMetadata(filePath)
    const byteArray = new Uint8Array(buffer)
    const dataSet = dicomParser.parseDicom(byteArray)

    let html = ''

    // Key tags summary
    html += '<div class="meta-section">'
    html += '<div class="meta-section-title">Key Information</div>'
    html += '<table class="meta-table">'
    for (const [tag, label] of Object.entries(KEY_TAGS)) {
      const value = dataSet.string(tag) || '—'
      html += `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`
    }
    html += '</table></div>'

    // All tags
    html += '<div class="meta-section">'
    html += '<div class="meta-section-title">All Tags</div>'
    html += '<table class="meta-table">'
    for (const tag of Object.keys(dataSet.elements).sort()) {
      const element = dataSet.elements[tag]
      let value = ''
      try {
        value = dataSet.string(tag) || `[binary ${element.length} bytes]`
      } catch {
        value = `[binary ${element.length} bytes]`
      }
      const groupElem = tag.slice(1) // remove 'x' prefix
      const displayTag = `(${groupElem.slice(0,4)},${groupElem.slice(4)})`
      html += `<tr><th>${displayTag}</th><td>${escapeHtml(value.slice(0, 100))}</td></tr>`
    }
    html += '</table></div>'

    container.innerHTML = html
  } catch (err) {
    container.innerHTML = `<p style="color: #888;">Failed to load metadata</p>`
    console.error('Metadata load error:', err)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
