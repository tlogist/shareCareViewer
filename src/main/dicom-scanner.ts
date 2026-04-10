import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import * as dicomParser from 'dicom-parser'

export interface DicomInstance {
  filePath: string          // relative to projects/
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

function getString(dataSet: dicomParser.DataSet, tag: string): string {
  const elem = dataSet.string(tag)
  return elem || ''
}

function getIntString(dataSet: dicomParser.DataSet, tag: string, fallback: number): number {
  // For IS (Integer String) VR tags like InstanceNumber, SeriesNumber
  const val = dataSet.string(tag)
  if (val !== undefined) {
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function getUint16(dataSet: dicomParser.DataSet, tag: string, fallback: number): number {
  // For US (Unsigned Short) VR tags like Rows, Columns
  const val = dataSet.uint16(tag)
  return val !== undefined ? val : fallback
}

export async function scanStudies(projectsDir: string): Promise<DicomStudy[]> {
  const studies = new Map<string, DicomStudy>()

  // Walk through all directories under projects/
  let topLevelDirs: string[]
  try {
    topLevelDirs = await readdir(projectsDir)
  } catch {
    return []
  }

  for (const dir of topLevelDirs) {
    const dirPath = join(projectsDir, dir)
    let files: string[]
    try {
      files = await readdir(dirPath)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith('.dcm')) continue

      const filePath = join(dir, file)  // relative to projects/
      const fullPath = join(dirPath, file)

      try {
        const data = await readFile(fullPath)
        const byteArray = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        const dataSet = dicomParser.parseDicom(byteArray)

        const studyUID = getString(dataSet, 'x0020000d')
        const seriesUID = getString(dataSet, 'x0020000e')

        if (!studyUID || !seriesUID) continue

        // Get or create study
        if (!studies.has(studyUID)) {
          studies.set(studyUID, {
            studyInstanceUID: studyUID,
            studyDescription: getString(dataSet, 'x00081030'),
            studyDate: getString(dataSet, 'x00080020'),
            patientName: getString(dataSet, 'x00100010'),
            modality: getString(dataSet, 'x00080060'),
            series: []
          })
        }
        const study = studies.get(studyUID)!

        // Get or create series within study
        let series = study.series.find(s => s.seriesInstanceUID === seriesUID)
        if (!series) {
          series = {
            seriesInstanceUID: seriesUID,
            seriesDescription: getString(dataSet, 'x0008103e'),
            seriesNumber: getIntString(dataSet, 'x00200011', 0),
            modality: getString(dataSet, 'x00080060'),
            instances: []
          }
          study.series.push(series)
        }

        series.instances.push({
          filePath,
          instanceNumber: getIntString(dataSet, 'x00200013', 0),
          rows: getUint16(dataSet, 'x00280010', 0),
          columns: getUint16(dataSet, 'x00280011', 0)
        })
      } catch (err) {
        console.warn(`Failed to parse ${fullPath}:`, err)
      }
    }
  }

  // Sort series by number and instances by instance number
  const result = Array.from(studies.values())
  for (const study of result) {
    study.series.sort((a, b) => a.seriesNumber - b.seriesNumber)
    for (const series of study.series) {
      series.instances.sort((a, b) => a.instanceNumber - b.instanceNumber)
    }
  }

  // Sort studies by date
  result.sort((a, b) => a.studyDate.localeCompare(b.studyDate))

  return result
}
