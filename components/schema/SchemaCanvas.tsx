'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '@/store/userFlowStore'
import UnoNode from './UnoNode'
import ComponentNode from './ComponentNode'

const nodeTypes = {
  unoNode: UnoNode,
  componentNode: ComponentNode,
}

const UNO_INITIAL = {
  id: 'arduino-uno',
  type: 'unoNode',
  position: { x: 300, y: 80 },
  data: { label: 'Arduino Uno' },
  draggable: true,
}

export default function SchemaCanvas() {
  const { schemaNodes, schemaEdges, setSchemaNodes, setSchemaEdges, setSelectedNode } = useFlowStore()

  const nodes = schemaNodes.some(n => n.id === 'arduino-uno')
    ? schemaNodes
    : [UNO_INITIAL, ...schemaNodes]

  const onConnect = useCallback(
    (connection: Connection) => setSchemaEdges(addEdge(connection, schemaEdges)),
    [schemaEdges, setSchemaEdges]
  )

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={schemaEdges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => setSchemaNodes(applyNodeChanges(changes, nodes))}
        onEdgesChange={(changes) => setSchemaEdges(applyEdgeChanges(changes, schemaEdges))}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        connectionMode={ConnectionMode.Loose}
        fitView
        style={{ background: '#0b0d11' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2330" />
        <Controls />
      </ReactFlow>
    </div>
  )
}