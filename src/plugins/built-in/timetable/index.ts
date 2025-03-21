import { settingsState } from '@/seqta/utils/listeners/SettingsState';
import type { Plugin } from '../../core/types';
import { convertTo12HourFormat } from '@/seqta/utils/convertTo12HourFormat';
import { waitForElm } from '@/seqta/utils/waitForElm';
import { BasePlugin, BooleanSetting } from '../../core/settings';

// Define only the typed settings - no need for redundant interface
class TimetablePluginClass extends BasePlugin {
  @BooleanSetting({
    default: true,
    title: "Timetable Enhancer",
    description: "Adds extra features to the timetable view."
  })
  enabled!: boolean;
}

// Create an instance to extract settings
const settingsInstance = new TimetablePluginClass();

const timetablePlugin: Plugin<typeof settingsInstance.settings> = {
  id: 'timetable',
  name: 'Timetable Enhancer',
  description: 'Adds extra features to the timetable view',
  version: '1.0.0',
  settings: settingsInstance.settings,
  run: async (api) => {
    if (api.settings.enabled) {
      api.seqta.onMount('.timetablepage', handleTimetable)
    }
    
    const enabledCallback = (value: any) => {
      if (value) {
        api.seqta.onMount('.timetablepage', handleTimetable)
      } else {
        const timetablePage = document.querySelector('.timetablepage')
        if (timetablePage) {
          const zoomControls = document.querySelector('.timetable-zoom-controls')
          if (zoomControls) zoomControls.remove()
          
          const hideControls = document.querySelector('.timetable-hide-controls')
          if (hideControls) hideControls.remove()
          
          resetTimetableStyles()
        }
      }
    }
    
    api.settings.onChange('enabled', enabledCallback)
    
    return () => {
      api.settings.offChange('enabled', enabledCallback)
    }
  }
};

// Store event handlers globally for cleanup
const zoomHandlers = new WeakMap<Element, { zoomIn: () => void; zoomOut: () => void }>()

function resetTimetableStyles(): void {
  const firstDayColumn = document.querySelector(".dailycal .content .days td") as HTMLElement
  if (!firstDayColumn) return
  
  const baseContainerHeight = parseInt(firstDayColumn.style.height) || firstDayColumn.offsetHeight
  
  const dayColumns = document.querySelectorAll(".dailycal .content .days td")
  dayColumns.forEach((td: Element) => {
    (td as HTMLElement).style.height = `${baseContainerHeight}px`
  })
  
  const timeColumn = document.querySelector(".times")
  if (timeColumn) {
    const times = timeColumn.querySelectorAll(".time")
    const timeHeight = baseContainerHeight / times.length
    times.forEach((time: Element) => {
      (time as HTMLElement).style.height = `${timeHeight}px`
    })
  }
  
  const lessons = document.querySelectorAll(".dailycal .lesson")
  lessons.forEach((lesson: Element) => {
    const lessonEl = lesson as HTMLElement
    const originalHeight = lessonEl.getAttribute('data-original-height')
    if (originalHeight) {
      lessonEl.style.height = `${originalHeight}px`
    }
  })

  const entries = document.querySelectorAll(".entry")
  entries.forEach((entry: Element) => {
    const entryEl = entry as HTMLElement
    entryEl.style.opacity = '1'
  })

  const zoomControls = document.querySelector('.timetable-zoom-controls')
  if (zoomControls) {
    const handlers = zoomHandlers.get(zoomControls)
    if (handlers) {
      const zoomIn = zoomControls.querySelector('.timetable-zoom:nth-child(2)')
      const zoomOut = zoomControls.querySelector('.timetable-zoom:nth-child(1)')
      if (zoomIn) zoomIn.removeEventListener('click', handlers.zoomIn)
      if (zoomOut) zoomOut.removeEventListener('click', handlers.zoomOut)
      zoomHandlers.delete(zoomControls)
    }
  }
}

async function handleTimetable(): Promise<void> {
  await waitForElm(".time", true, 10)

  // Store original heights when timetable loads
  const lessons = document.querySelectorAll(".dailycal .lesson")
  lessons.forEach((lesson: Element) => {
    const lessonEl = lesson as HTMLElement
    lessonEl.setAttribute(
      "data-original-height",
      lessonEl.offsetHeight.toString(),
    )
  })

  // Existing time format code
  if (settingsState.timeFormat == "12") {
    const times = document.querySelectorAll(".timetablepage .times .time")
    for (const time of times) {
      if (!time.textContent) continue
      time.textContent = convertTo12HourFormat(time.textContent, true)
    }
  }

  handleTimetableZoom()
  handleTimetableAssessmentHide()
}

function handleTimetableZoom(): void {
  console.log("Initializing timetable zoom controls")

  // Lazy initialize state variables only when function is first called
  let timetableZoomLevel = 1
  let baseContainerHeight: number | null = null
  const originalEntryPositions = new Map<
    Element,
    { topRatio: number; heightRatio: number }
  >()

  // Create zoom controls
  const zoomControls = document.createElement("div")
  zoomControls.className = "timetable-zoom-controls"

  const zoomIn = document.createElement("button")
  zoomIn.className = "uiButton timetable-zoom iconFamily"
  zoomIn.innerHTML = "&#xed93;" // Unicode for zoom in icon (custom iconfamily)

  const zoomOut = document.createElement("button")
  zoomOut.className = "uiButton timetable-zoom iconFamily"
  zoomOut.innerHTML = "&#xed94;" // Unicode for zoom out icon (custom iconfamily)

  zoomControls.appendChild(zoomOut)
  zoomControls.appendChild(zoomIn)

  const toolbar = document.getElementById("toolbar")
  toolbar?.appendChild(zoomControls)

  // Store event listener references
  const zoomInHandler = () => {
    if (timetableZoomLevel < 2) {
      timetableZoomLevel += 0.2
      updateZoom()
    }
  }

  const zoomOutHandler = () => {
    if (timetableZoomLevel > 0.6) {
      timetableZoomLevel -= 0.2
      updateZoom()
    }
  }

  zoomIn.addEventListener("click", zoomInHandler)
  zoomOut.addEventListener("click", zoomOutHandler)

  // Store references for cleanup
  zoomHandlers.set(zoomControls, { zoomIn: zoomInHandler, zoomOut: zoomOutHandler })

  const initializePositions = () => {
    // Get the base container height from the first TD
    const firstDayColumn = document.querySelector(
      ".dailycal .content .days td",
    ) as HTMLElement
    if (!firstDayColumn) return false

    baseContainerHeight =
      parseInt(firstDayColumn.style.height) || firstDayColumn.offsetHeight

    // Store original ratios
    const entries = document.querySelectorAll(".entriesWrapper .entry")
    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement

      // Calculate ratios relative to detected base height
      if (baseContainerHeight === null) return
      const topRatio = parseInt(entryEl.style.top) / baseContainerHeight
      const heightRatio = parseInt(entryEl.style.height) / baseContainerHeight

      originalEntryPositions.set(entry, { topRatio, heightRatio })
    })

    return true
  }

  const updateZoom = () => {
    // Initialize positions if not already done
    if (baseContainerHeight === null && !initializePositions()) {
      console.error("Failed to initialize positions")
      return
    }

    console.debug(`Updating zoom level to: ${timetableZoomLevel}`)

    // Calculate new container height
    if (baseContainerHeight === null) return
    const newContainerHeight = baseContainerHeight * timetableZoomLevel

    // Update all day columns (TDs)
    const dayColumns = document.querySelectorAll(".dailycal .content .days td")
    dayColumns.forEach((td: Element) => {
      (td as HTMLElement).style.height = `${newContainerHeight}px`
    })

    // Update all entries using stored ratios
    const entries = document.querySelectorAll(".entriesWrapper .entry")
    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement
      const originalRatios = originalEntryPositions.get(entry)

      if (originalRatios) {
        // Calculate new positions from original ratios
        const newTop = originalRatios.topRatio * newContainerHeight
        const newHeight = originalRatios.heightRatio * newContainerHeight

        // Apply new values
        entryEl.style.top = `${Math.round(newTop)}px`
        entryEl.style.height = `${Math.round(newHeight)}px`
      }
    })

    // Update time column to match
    const timeColumn = document.querySelector(".times")
    if (timeColumn) {
      const times = timeColumn.querySelectorAll(".time")
      const timeHeight = newContainerHeight / times.length
      times.forEach((time: Element) => {
        (time as HTMLElement).style.height = `${timeHeight}px`
      })
    }

    entries[Math.round((entries.length - 1) / 2)].scrollIntoView({
      behavior: "instant",
      block: "center",
    })
  }
}

function handleTimetableAssessmentHide(): void {
  const hideControls = document.createElement("div")
  hideControls.className = "timetable-hide-controls"

  const hideOn = document.createElement("button")
  hideOn.className = "uiButton timetable-hide iconFamily"
  hideOn.innerHTML = "&#128065;"

  hideControls.appendChild(hideOn)

  const toolbar = document.getElementById("toolbar")
  toolbar?.appendChild(hideControls)

  function hideElements(): void {
    const entries = document.querySelectorAll(".entry")
    
    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement
      if (!entryEl.classList.contains("assessment")) {
        entryEl.style.opacity = entryEl.style.opacity === "0.3" ? "1" : "0.3"
      }
    })
  }

  hideOn.addEventListener("click", hideElements)
}

export default timetablePlugin; 
