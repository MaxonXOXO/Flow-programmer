'use client'

import React from 'react'
import {
  Radio,
  Sun,
  Lightbulb,
  Square,
  Thermometer,
  Eye,
  Settings,
  Wrench,
  Volume2,
  Zap,
  Tv,
  Monitor,
  Wifi,
  Flame,
  Droplets,
  Waves,
  Wind,
  Activity,
  Cpu,
  GripHorizontal,
  GripVertical,
  Layers,
  Plug,
} from 'lucide-react'
import { getComponentPackage } from './index'
import { resolveCanonicalPackageId } from '../../packages/packageGraphInstantiator'

export interface ComponentIconOptions {
  className?: string
  color?: string
  style?: React.CSSProperties
  fallback?: React.ReactNode
}

/**
 * Checks whether a component or schema node is an upgraded flowplg/AST package
 * version (e.g. ultrasonic_hcsr04 with an internal graph) vs a legacy component.
 */
export function isFlowPackageComponent(componentOrNode: any): boolean {
  if (!componentOrNode) return false

  // Direct packageId string
  if (typeof componentOrNode === 'string') {
    if (componentOrNode === 'ultrasonic_hcsr04' || componentOrNode.includes('ultrasonic')) return true
    const pkg = getComponentPackage(componentOrNode)
    if (!pkg) return false
    return Boolean(
      pkg.id === 'ultrasonic_hcsr04' ||
      (pkg.implementation as any)?.graph ||
      (pkg.implementations && Object.values(pkg.implementations).some((impl: any) => impl.graph))
    )
  }

  // Schema node or package object
  const data = componentOrNode.data || componentOrNode
  const candidateId =
    resolveCanonicalPackageId(componentOrNode) ||
    data.params?.packageId ||
    data.definition?.packageId ||
    data.definition?.metadata?.id ||
    data.definition?.id ||
    data.packageId ||
    componentOrNode.id

  if (candidateId === 'ultrasonic_hcsr04' || String(candidateId).includes('ultrasonic')) {
    return true
  }

  if (candidateId && typeof candidateId === 'string') {
    const pkg = getComponentPackage(candidateId)
    if (pkg) {
      return Boolean(
        pkg.id === 'ultrasonic_hcsr04' ||
        (pkg.implementation as any)?.graph ||
        (pkg.implementations && Object.values(pkg.implementations).some((impl: any) => impl.graph))
      )
    }
  }

  // Check definition directly
  const def = componentOrNode.definition || componentOrNode.data?.definition
  if (def) {
    if (def.id === 'ultrasonic_hcsr04' || def.packageId === 'ultrasonic_hcsr04') return true
    if ((def.implementation as any)?.graph) return true
    if (def.implementations && Object.values(def.implementations).some((impl: any) => impl.graph)) return true
  }

  return false
}

/**
 * Maps a package icon symbol (e.g. '📡') to its canonical Lucide vector component.
 */
export function renderVectorIconForSymbol(
  symbol: string,
  options?: { className?: string; color?: string; style?: React.CSSProperties }
): React.ReactNode {
  const iconProps = {
    className: options?.className || 'w-4 h-4',
    style: {
      color: options?.color || 'currentColor',
      ...options?.style,
    },
  }

  switch (symbol) {
    case '📡':
      return <Radio {...iconProps} />
    case '☀️':
    case '☀':
      return <Sun {...iconProps} />
    case '💡':
      return <Lightbulb {...iconProps} />
    case '⬛':
      return <Square {...iconProps} />
    case '🌡':
      return <Thermometer {...iconProps} />
    case '👁':
      return <Eye {...iconProps} />
    case '⚙':
      return <Settings {...iconProps} />
    case '🔧':
      return <Wrench {...iconProps} />
    case '🔔':
      return <Volume2 {...iconProps} />
    case '⚡':
      return <Zap {...iconProps} />
    case '📺':
      return <Tv {...iconProps} />
    case '🖥':
      return <Monitor {...iconProps} />
    case '📶':
      return <Wifi {...iconProps} />
    case '🔥':
      return <Flame {...iconProps} />
    case '🌱':
      return <Droplets {...iconProps} />
    case '💧':
      return <Waves {...iconProps} />
    case '💨':
      return <Wind {...iconProps} />
    case '📳':
      return <Activity {...iconProps} />
    case '🔌':
      return <Cpu {...iconProps} />
    default:
      return null
  }
}

/**
 * Resolves and renders the canonical sensor package icon for any component, node, or packageId.
 *
 * Per requirements:
 * - Only upgraded flowplg package components receive package sensor icons.
 * - Legacy components retain their legacy fallback representation so that upgraded
 *   AST components are visibly distinct.
 * - Centralizes icon resolution to avoid duplicated switch mappings across the codebase.
 */
export function getComponentPackageIcon(
  componentOrNode: any,
  options?: ComponentIconOptions
): React.ReactNode {
  const fallback = options?.fallback !== undefined
    ? options.fallback
    : <GripHorizontal className={options?.className || 'w-4 h-4'} style={{ color: options?.color || '#555', ...options?.style }} />

  if (!componentOrNode) return fallback

  // If this is not an upgraded flowplg component, keep legacy representation
  if (!isFlowPackageComponent(componentOrNode)) {
    return fallback
  }

  // Resolve the package definition
  let pkg: any = null
  if (typeof componentOrNode === 'string') {
    pkg = getComponentPackage(componentOrNode)
  } else {
    pkg =
      componentOrNode.definition ||
      componentOrNode.data?.definition ||
      (componentOrNode.metadata ? componentOrNode : null)

    if (!pkg) {
      const pkgId =
        resolveCanonicalPackageId(componentOrNode) ||
        componentOrNode.data?.params?.packageId ||
        componentOrNode.data?.packageId ||
        componentOrNode.id
      if (pkgId) {
        pkg = getComponentPackage(pkgId)
      }
    }
  }

  // Extract raw icon symbol from the package
  const rawSymbol = pkg?.icon || pkg?.metadata?.icon || (pkg?.id === 'ultrasonic_hcsr04' ? '📡' : null)
  if (!rawSymbol) {
    // If it's the ultrasonic package specifically, default to '📡'
    return <Radio className={options?.className || 'w-4 h-4'} style={{ color: options?.color || '#2fd18b', ...options?.style }} />
  }

  const rendered = renderVectorIconForSymbol(rawSymbol, options)
  return rendered || fallback
}
