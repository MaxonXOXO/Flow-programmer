'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FlowCanvas from '@/components/editor/FlowCanvas'
import Sidebar from '@/components/editor/Sidebar'
import TopBar from '@/components/editor/TopBar'
import SchemaCanvas from '@/components/schema/SchemaCanvas'
import { useFlowStore } from '@/store/userFlowStore'
import { useReactFlow, ReactFlowProvider } from '@xyflow/react'

let nodeCounter = 1

function EditorInner() {
  const { addSchemaNode, addFlowNode, setProject, activeCanvas } = useFlowStore()
  const { screenToFlowPosition } = useReactFlow()
  const router = useRouter()

  useEffect(() => {
    const raw = localStorage.getItem('fp_project')
    if (!raw) { router.push('/'); return }
    setProject(JSON.parse(raw))
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/flownode')
    if (!raw) return
    const nodeConfig = JSON.parse(raw)
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    if (activeCanvas === 'schema') {
      addSchemaNode({
        id: `comp-${++nodeCounter}`,
        type: 'componentNode',
        position,
        data: {
          label: nodeConfig.label,
          componentType: nodeConfig.componentType,
          pins: nodeConfig.pins,
          icon: nodeConfig.icon,
        },
      })
    } else {
      addFlowNode({
        id: `node-${++nodeCounter}`,
        type: 'baseNode',
        position,
        data: {
          label: nodeConfig.label,
          nodeType: nodeConfig.nodeType,
          icon: nodeConfig.icon,
          params: nodeConfig.params,
        },
      })
    }
  }, [screenToFlowPosition, addSchemaNode, addFlowNode, activeCanvas])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
          {activeCanvas === 'schema' ? <SchemaCanvas /> : <FlowCanvas />}
        </div>
      </div>
    </div>
  )
}

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  )
}