import { RenderingEngine, Enums as CSEnums } from '@cornerstonejs/core'
import type { Types as CSTypes } from '@cornerstonejs/core'

const RENDERING_ENGINE_ID = 'mainEngine'
const VIEWPORT_ID = 'mainViewport'

let renderingEngine: RenderingEngine | null = null
let fileServerPort = 0
let currentImageIds: string[] = []

export function getViewportId(): string {
  return VIEWPORT_ID
}

export function getRenderingEngineId(): string {
  return RENDERING_ENGINE_ID
}

export function initViewer(port: number): void {
  fileServerPort = port

  const element = document.getElementById('viewport-element')!

  renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID)

  const viewportInput: CSTypes.PublicViewportInput = {
    viewportId: VIEWPORT_ID,
    type: CSEnums.ViewportType.STACK,
    element
  }

  renderingEngine.enableElement(viewportInput)
}

// Build a wadouri image ID from a file path relative to projects/
// filePath is like "studyDir/file.dcm" — encode each segment but keep the /
function toImageId(filePath: string): string {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/')
  return `wadouri:http://127.0.0.1:${fileServerPort}/${encoded}`
}

export async function loadSeries(filePaths: string[]): Promise<void> {
  if (!renderingEngine) {
    console.error('loadSeries: renderingEngine is null')
    return
  }

  currentImageIds = filePaths.map(toImageId)
  console.log('Loading imageIds:', currentImageIds[0], `(${currentImageIds.length} total)`)

  const viewport = renderingEngine.getViewport(VIEWPORT_ID) as CSTypes.IStackViewport
  if (!viewport) {
    console.error('loadSeries: viewport not found')
    return
  }

  const element = document.getElementById('viewport-element')!
  console.log('Viewport element size:', element.clientWidth, 'x', element.clientHeight)

  await viewport.setStack(currentImageIds)
  viewport.render()

  // Hide the empty state message
  const emptyState = document.getElementById('empty-state')
  if (emptyState) emptyState.style.display = 'none'

  updateSliceIndicator(viewport)
}

export function getCurrentImageIds(): string[] {
  return currentImageIds
}

export function getViewport(): CSTypes.IStackViewport | null {
  if (!renderingEngine) return null
  return renderingEngine.getViewport(VIEWPORT_ID) as CSTypes.IStackViewport
}

function updateSliceIndicator(viewport: CSTypes.IStackViewport): void {
  let indicator = document.querySelector('.slice-indicator') as HTMLElement | null
  if (!indicator) {
    indicator = document.createElement('div')
    indicator.className = 'slice-indicator'
    document.getElementById('viewport-container')!.appendChild(indicator)
  }

  const currentIndex = viewport.getCurrentImageIdIndex()
  const total = currentImageIds.length

  if (total <= 1) {
    indicator.style.display = 'none'
  } else {
    indicator.style.display = 'block'
    indicator.textContent = `${currentIndex + 1} / ${total}`
  }
}

// Listen for slice changes to update the indicator
export function onSliceChange(callback: (imageIndex: number) => void): void {
  const element = document.getElementById('viewport-element')!
  element.addEventListener(CSEnums.Events.STACK_NEW_IMAGE, ((e: CustomEvent) => {
    const { imageIdIndex } = e.detail
    const viewport = getViewport()
    if (viewport) updateSliceIndicator(viewport)
    callback(imageIdIndex)
  }) as EventListener)
}
