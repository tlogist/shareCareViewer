import type { DicomStudy, DicomSeries } from './main'
import { loadSeries } from './viewer'
import { updateMetadata } from './metadata-panel'

let activeSeriesUID = ''

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
}

function formatPatientName(name: string): string {
  // DICOM patient names use ^ as separator: LastName^FirstName
  return name.replace(/\^/g, ', ')
}

export function renderStudyBrowser(studies: DicomStudy[], port: number): void {
  const container = document.getElementById('study-list')!
  container.innerHTML = ''

  for (const study of studies) {
    const studyEl = document.createElement('div')
    studyEl.className = 'study-item'

    const header = document.createElement('div')
    header.className = 'study-header'
    header.innerHTML = `
      ${study.studyDescription || 'Unknown Study'}
      <div class="study-meta">
        ${formatPatientName(study.patientName)} &middot; ${formatDate(study.studyDate)} &middot; ${study.modality}
      </div>
    `

    const seriesList = document.createElement('div')
    seriesList.className = 'series-list'

    // Toggle series list visibility
    let expanded = true
    header.addEventListener('click', () => {
      expanded = !expanded
      seriesList.style.display = expanded ? 'block' : 'none'
    })

    for (const series of study.series) {
      const seriesEl = document.createElement('div')
      seriesEl.className = 'series-item'
      seriesEl.innerHTML = `
        <span>${series.seriesDescription || `Series ${series.seriesNumber}`}</span>
        <span class="series-count">${series.instances.length}</span>
      `

      seriesEl.addEventListener('click', () => onSeriesClick(series, seriesEl))
      seriesList.appendChild(seriesEl)
    }

    studyEl.appendChild(header)
    studyEl.appendChild(seriesList)
    container.appendChild(studyEl)
  }
}

async function onSeriesClick(series: DicomSeries, element: HTMLElement): Promise<void> {
  // Highlight active series
  document.querySelectorAll('.series-item.active').forEach(el => el.classList.remove('active'))
  element.classList.add('active')
  activeSeriesUID = series.seriesInstanceUID

  try {
    // Load the series into the viewer
    const filePaths = series.instances.map(inst => inst.filePath)
    console.log('Loading series:', series.seriesDescription, filePaths.length, 'images')
    console.log('First file path:', filePaths[0])
    await loadSeries(filePaths)

    // Update metadata panel with the first image
    if (filePaths.length > 0) {
      updateMetadata(filePaths[0])
    }
  } catch (err) {
    console.error('Failed to load series:', err)
  }
}
