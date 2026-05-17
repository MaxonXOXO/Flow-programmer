'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '@/store/userFlowStore'
import BaseNode from '@/components/nodes/BaseNode'

const nodeTypes = {
  baseNode: BaseNode,
}

export default function FlowCanvas() {
  const { flowNodes, flowEdges, setFlowNodes, setFlowEdges, setSelectedNode } = useFlowStore()

  const onConnect = useCallback(
    (connection: Connection) => setFlowEdges(addEdge(connection, flowEdges)),
    [flowEdges, setFlowEdges]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => setFlowNodes(applyNodeChanges(changes, flowNodes))}
        onEdgesChange={(changes) => setFlowEdges(applyEdgeChanges(changes, flowEdges))}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        fitView
        style={{ background: '#0a0a0f' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2330" />
        <Controls />
        <MiniMap style={{ background: '#111318' }} nodeColor="#3d8bff" />
      </ReactFlow>
    </div>
  )
}