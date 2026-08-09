'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import DockZonePreview from './DockZonePreview'

/**
 * Portal-mounted overlay container for floating panels.
 * Sits above the main layout. Empty space does not capture pointer events.
 * Floating DockablePanels render their float content into this layer via portal.
 */
export default function FloatLayer() {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or find the float-layer container at document body level
    let el = document.getElementById('flow-ide-float-layer')
    if (!el) {
      el = document.createElement('div')
      el.id = 'flow-ide-float-layer'
      el.style.position = 'fixed'
      el.style.top = '0'
      el.style.left = '0'
      el.style.width = '100vw'
      el.style.height = '100vh'
      el.style.pointerEvents = 'none'
      el.style.zIndex = '500'
      document.body.appendChild(el)
    }
    setContainer(el)

    return () => {
      // Don't remove on unmount — other panels may still use it
    }
  }, [])

  if (!container) return null

  return createPortal(<DockZonePreview />, container)
}

/**
 * Utility to get the float-layer DOM element for panel portals.
 */
export function getFloatLayerElement(): HTMLElement | null {
  return document.getElementById('flow-ide-float-layer')
}
