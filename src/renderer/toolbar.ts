import * as cornerstoneTools from '@cornerstonejs/tools'
import { getViewportId, getRenderingEngineId, getViewport } from './viewer'

const {
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
  LengthTool,
  AngleTool,
  EllipticalROITool,
  RectangleROITool,
  ToolGroupManager,
  Enums: ToolEnums
} = cornerstoneTools

const TOOL_GROUP_ID = 'mainTools'

interface ToolDef {
  name: string
  label: string
  toolClass: unknown
  group: string
}

const tools: ToolDef[] = [
  { name: WindowLevelTool.toolName, label: 'W/L', toolClass: WindowLevelTool, group: 'navigate' },
  { name: PanTool.toolName, label: 'Pan', toolClass: PanTool, group: 'navigate' },
  { name: ZoomTool.toolName, label: 'Zoom', toolClass: ZoomTool, group: 'navigate' },
  { name: StackScrollTool.toolName, label: 'Scroll', toolClass: StackScrollTool, group: 'navigate' },
  { name: LengthTool.toolName, label: 'Length', toolClass: LengthTool, group: 'measure' },
  { name: AngleTool.toolName, label: 'Angle', toolClass: AngleTool, group: 'measure' },
  { name: EllipticalROITool.toolName, label: 'Ellipse ROI', toolClass: EllipticalROITool, group: 'measure' },
  { name: RectangleROITool.toolName, label: 'Rect ROI', toolClass: RectangleROITool, group: 'measure' },
]

let activeTool = ''

export function initToolbar(): void {
  // Register all tool classes with Cornerstone
  for (const tool of tools) {
    cornerstoneTools.addTool(tool.toolClass as cornerstoneTools.Types.IToolClassReference)
  }

  // Create tool group and add our viewport
  const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID)!
  toolGroup.addViewport(getViewportId(), getRenderingEngineId())

  // Add all tools to the group — start as Passive (visible but not interactive)
  for (const tool of tools) {
    toolGroup.addTool(tool.name)
  }

  // StackScroll is always active on mousewheel
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }]
  })

  // Set W/L as the default active tool on left click
  setActiveTool(WindowLevelTool.toolName)

  // Build the toolbar UI
  renderToolbar()
}

function setActiveTool(toolName: string): void {
  const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID)!

  // Deactivate previous tool (set to Passive so existing annotations stay visible)
  if (activeTool) {
    toolGroup.setToolPassive(activeTool)
  }

  // Activate the new tool on left mouse button
  toolGroup.setToolActive(toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }]
  })

  activeTool = toolName

  // Update button states
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName)
  })
}

function renderToolbar(): void {
  const toolbar = document.getElementById('toolbar')!

  // Group tools by category
  const groups = new Map<string, ToolDef[]>()
  for (const tool of tools) {
    if (!groups.has(tool.group)) groups.set(tool.group, [])
    groups.get(tool.group)!.push(tool)
  }

  for (const [, groupTools] of groups) {
    const groupEl = document.createElement('div')
    groupEl.className = 'toolbar-group'

    for (const tool of groupTools) {
      const btn = document.createElement('button')
      btn.className = 'tool-btn'
      btn.setAttribute('data-tool', tool.name)
      btn.textContent = tool.label
      if (tool.name === activeTool) btn.classList.add('active')
      btn.addEventListener('click', () => setActiveTool(tool.name))
      groupEl.appendChild(btn)
    }

    toolbar.appendChild(groupEl)
  }

  // Reset button in its own group
  const resetGroup = document.createElement('div')
  resetGroup.className = 'toolbar-group'
  const resetBtn = document.createElement('button')
  resetBtn.className = 'tool-btn'
  resetBtn.textContent = 'Reset'
  resetBtn.addEventListener('click', () => {
    const vp = getViewport()
    if (vp) {
      vp.resetCamera()
      vp.resetProperties()
      vp.render()
    }
  })
  resetGroup.appendChild(resetBtn)

  // Clear all annotations (measurement lines, angles, ROIs)
  const clearBtn = document.createElement('button')
  clearBtn.className = 'tool-btn'
  clearBtn.textContent = 'Clear'
  clearBtn.addEventListener('click', () => {
    cornerstoneTools.annotation.state.removeAllAnnotations()
    const vp = getViewport()
    if (vp) vp.render()
  })
  resetGroup.appendChild(clearBtn)

  // Metadata toggle
  const metaBtn = document.createElement('button')
  metaBtn.className = 'tool-btn'
  metaBtn.textContent = 'Tags'
  metaBtn.addEventListener('click', () => {
    const panel = document.getElementById('metadata-panel')!
    panel.classList.toggle('hidden')
    metaBtn.classList.toggle('active')
  })
  resetGroup.appendChild(metaBtn)

  toolbar.appendChild(resetGroup)
}
