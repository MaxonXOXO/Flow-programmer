'use client'

import React from 'react'
import { NodeProps } from '@xyflow/react'
import BoardNode from './BoardNode'

/**
 * Backward-compatibility wrapper for legacy 'unoNode' schema nodes.
 * Automatically delegates rendering to data-driven BoardNode.
 */
export default function UnoNode(props: NodeProps) {
  const mergedData = {
    ...props.data,
    boardId: (props.data as any)?.boardId || 'arduino_uno',
  }
  return <BoardNode {...props} data={mergedData} />
}