'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import { useFlowStore } from '@/store/userFlowStore'
import { 
  PlayCircle, StopCircle, GitFork, RotateCw, Timer, 
  Binary, Braces, Printer, Type, Activity, Zap, Link,
  Eye, Thermometer, Radio, Sun, Wrench, Tv, Monitor,
  Flame, Droplets, Waves, Wind, Cpu, Maximize2
} from 'lucide-react'

interface BaseNodeData {
  label: string
  params?: Record<string, string>
  nodeType?: string
  icon?: string
}

// Category headers matching the neon style colors
const categoryStyles: Record<string, { headerBg: string, iconColor: string, textColor: string }> = {
  start:     { headerBg: 'rgba(47, 209, 139, 0.15)', iconColor: '#2fd18b', textColor: '#2fd18b' },
  end:       { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  return:    { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  condition: { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  loop:      { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  variable:  { headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  assignment:{ headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  function:  { headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  function_call: { headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  print:     { headerBg: 'rgba(47, 209, 139, 0.15)', iconColor: '#2fd18b', textColor: '#2fd18b' },
  sensor:    { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  delay:     { headerBg: 'rgba(165, 179, 205, 0.15)', iconColor: '#a5b3cd', textColor: '#a5b3cd' },
  gpio:      { headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  api:       { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  input:     { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  
  // Specific sensor templates
  dht:          { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  ultrasonic:   { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  pir:          { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  ldr:          { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  ir:           { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  flame:        { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  soilMoisture: { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  waterLevel:   { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  mqGas:        { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  vibration:    { headerBg: 'rgba(255, 177, 61, 0.15)', iconColor: '#ffb13d', textColor: '#ffb13d' },
  
  // Specific control devices
  servo:        { headerBg: 'rgba(165, 179, 205, 0.15)', iconColor: '#a5b3cd', textColor: '#a5b3cd' },
  lcd:          { headerBg: 'rgba(95, 163, 255, 0.15)', iconColor: '#5fa3ff', textColor: '#5fa3ff' },
  oled:         { headerBg: 'rgba(255, 95, 158, 0.15)', iconColor: '#ff5f9e', textColor: '#ff5f9e' },
  l298n:        { headerBg: 'rgba(165, 179, 205, 0.15)', iconColor: '#a5b3cd', textColor: '#a5b3cd' },
  l293d:        { headerBg: 'rgba(165, 179, 205, 0.15)', iconColor: '#a5b3cd', textColor: '#a5b3cd' },
}

// Get vector icons for node headers
function getNodeHeaderIcon(nodeType: string, color: string, className: string = 'w-4 h-4') {
  const iconProps = { className, style: { color } }
  switch (nodeType) {
    case 'start': return <PlayCircle {...iconProps} />
    case 'end': return <StopCircle {...iconProps} />
    case 'return': return <StopCircle {...iconProps} />
    case 'condition': return <GitFork {...iconProps} />
    case 'loop': return <RotateCw {...iconProps} />
    case 'delay': return <Timer {...iconProps} />
    case 'variable': return <Binary {...iconProps} />
    case 'assignment': return <Binary {...iconProps} />
    case 'function': return <Braces {...iconProps} />
    case 'function_call': return <PlayCircle {...iconProps} />
    case 'print': return <Printer {...iconProps} />
    case 'input': return <Type {...iconProps} />
    case 'sensor': return <Activity {...iconProps} />
    case 'gpio': return <Zap {...iconProps} />
    case 'api': return <Link {...iconProps} />
    
    // Specific sensor templates
    case 'dht': return <Thermometer {...iconProps} />
    case 'ultrasonic': return <Radio {...iconProps} />
    case 'pir': return <Eye {...iconProps} />
    case 'ldr': return <Sun {...iconProps} />
    case 'ir': return <Eye {...iconProps} />
    case 'flame': return <Flame {...iconProps} />
    case 'soilMoisture': return <Droplets {...iconProps} />
    case 'waterLevel': return <Waves {...iconProps} />
    case 'mqGas': return <Wind {...iconProps} />
    case 'vibration': return <Activity {...iconProps} />
    
    // Specific control devices
    case 'servo': return <Wrench {...iconProps} />
    case 'lcd': return <Tv {...iconProps} />
    case 'oled': return <Monitor {...iconProps} />
    case 'l298n': return <Cpu {...iconProps} />
    case 'l293d': return <Cpu {...iconProps} />
    
    default: return <PlayCircle {...iconProps} />
  }
}

export default function BaseNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const type = nodeData.nodeType || 'start'
  const style = categoryStyles[type] || categoryStyles.start
  const { simState, subFlows, subFlowStack, flowNodes } = useFlowStore()
  const params = nodeData.params || {}
  const hasSubFlow = type === 'function' && subFlows[id] && subFlows[id].nodes.length > 2

  const isSubFlowStart = type === 'start' && subFlowStack.length > 0
  const parentFnNode = isSubFlowStart ? (() => {
    const parentId = subFlowStack[subFlowStack.length - 1]
    let pNode = flowNodes.find(n => n.id === parentId)
    if (!pNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === parentId)
        if (found) { pNode = found; break; }
      }
    }
    return pNode
  })() : null

  const actualParams = parentFnNode ? (parentFnNode.data as any)?.params || {} : params

  // True if simulation runner is currently executing this specific node block
  const isActive = simState.running && simState.currentNodeId === id

  let nodeLabel = nodeData.label
  if (type === 'function' && actualParams.name) {
    nodeLabel = `${actualParams.name}()`
  } else if (type === 'function_call') {
    nodeLabel = params.functionName ? `Call: ${params.functionName}()` : 'Call Function'
  } else if (isSubFlowStart) {
    const fnName = actualParams.name || 'myFn'
    nodeLabel = `${fnName}() Start`
  }

  return (
    <div 
      className="transition-shadow duration-200"
      style={{
        background: 'var(--color-bg-panel)',
        border: `1px solid ${
          isActive 
            ? '#2fd18b' 
            : selected 
              ? 'var(--color-accent-blue)' 
              : 'var(--color-border)'
        }`,
        borderRadius: 8,
        minWidth: 180,
        fontFamily: 'var(--font-sans)',
        boxShadow: isActive
          ? '0 0 20px rgba(47, 209, 139, 0.4), 0 0 0 1px #2fd18b'
          : selected 
            ? '0 0 14px rgba(95, 163, 255, 0.35), 0 0 0 1px var(--color-accent-blue)' 
            : '0 4px 16px rgba(0,0,0,0.5)',
        position: 'relative',
        // Removed overflow: hidden so connection handle dots are not clipped!
      }}
    >
      
      {/* Node Header */}
      <div style={{
        background: style.headerBg,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--color-border)',
        borderRadius: '7px 7px 0 0', // Round header top corners to match card!
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {getNodeHeaderIcon(type, style.iconColor)}
        </div>
        <span style={{ 
          flex: 1, 
          color: 'var(--color-text-bright)', 
          fontWeight: 700, 
          fontSize: 11.5,
          letterSpacing: '0.2px' 
        }}>
          {nodeLabel}
        </span>
        <span style={{
          fontSize: 8,
          background: 'rgba(255,255,255,0.03)',
          color: style.textColor,
          border: `1px solid ${style.textColor}33`,
          padding: '1px 4px',
          borderRadius: 3,
          fontWeight: 700,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}>
          {type}
        </span>
        {type === 'function' && (
          <Maximize2 className="w-3 h-3" style={{ color: hasSubFlow ? '#2fd18b' : '#546484', marginLeft: 2 }} />
        )}
      </div>

      {/* Target input handle (Left Side) - centered vertically on Header (19px) */}
      {type !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          id="flow"
          style={{
            position: 'absolute',
            left: 0,
            top: '19px',
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            background: '#07090d',
            border: `2px solid ${style.iconColor}`,
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: `0 0 6px ${style.iconColor}55`,
            zIndex: 20,
          }}
        />
      )}

      {/* Node Parameters Body Drawer */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {type === 'function' || isSubFlowStart ? (
          (() => {
            const rawInputs = actualParams.inputs || actualParams.parameters || []
            let inputsList: { name: string; type: string }[] = []
            if (Array.isArray(rawInputs)) inputsList = rawInputs
            else if (typeof rawInputs === 'string' && rawInputs.trim() !== '') {
              try { inputsList = JSON.parse(rawInputs); } catch(e) {}
            }

            const returnType = actualParams.returnType || 'void'
            const fnName = actualParams.name || 'myFn'
            const sigStr = `${returnType} ${fnName}(${inputsList.map(p => `${p.type} ${p.name}`).join(', ')})`

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Signature Preview */}
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 3, fontWeight: 600 }}>
                    Signature
                  </div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: '#60a5fa', fontFamily: 'var(--font-mono)', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                    {sigStr}
                  </div>
                </div>

                {/* Input Handles List */}
                {inputsList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Inputs
                    </div>
                    {inputsList.map((input, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          height: 22,
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: 4,
                          paddingLeft: 8,
                          paddingRight: 6,
                          marginLeft: -12,
                          marginRight: 0,
                        }}
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`input_${input.name}`}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 8,
                            height: 8,
                            background: '#07090d',
                            border: '2px solid #38bdf8',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            boxShadow: '0 0 6px rgba(56, 189, 248, 0.6)',
                            zIndex: 20,
                          }}
                        />
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                          {input.name}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', marginLeft: 'auto' }}>
                          :{input.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Output Handle */}
                {returnType !== 'void' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                    <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Outputs
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: 22,
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: 4,
                        paddingLeft: 6,
                        paddingRight: 8,
                        marginLeft: 0,
                        marginRight: -12,
                      }}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#a855f7', fontWeight: 600 }}>
                        return
                      </span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                        :{returnType}
                      </span>
                      <Handle
                        type="source"
                        position={Position.Right}
                        id="return"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          width: 8,
                          height: 8,
                          background: '#07090d',
                          border: '2px solid #a855f7',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)',
                          zIndex: 20,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })()
        ) : type === 'function_call' ? (
          (() => {
            const targetFnName = params.functionName || ''
            let targetFnNode = flowNodes.find((n: any) => n.data?.nodeType === 'function' && n.data?.params?.name === targetFnName)
            if (!targetFnNode) {
              for (const sfId of Object.keys(subFlows)) {
                const found = subFlows[sfId].nodes.find((n: any) => n.data?.nodeType === 'function' && n.data?.params?.name === targetFnName)
                if (found) { targetFnNode = found; break }
              }
            }

            const fnParams = targetFnNode ? (targetFnNode.data as any)?.params || {} : {}
            const rawInputs = fnParams.inputs || fnParams.parameters || []
            let inputsList: { name: string; type: string }[] = []
            if (Array.isArray(rawInputs)) inputsList = rawInputs
            else if (typeof rawInputs === 'string' && rawInputs.trim() !== '') {
              try { inputsList = JSON.parse(rawInputs); } catch(e) {}
            }

            const returnType = fnParams.returnType || params.returnType || 'void'

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 3, fontWeight: 600 }}>
                    Target Function
                  </div>
                  <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#3b82f6', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {targetFnName ? `${targetFnName}()` : '(Select Function)'}
                  </div>
                </div>

                {/* Input Handles for Function Call */}
                {inputsList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Inputs
                    </div>
                    {inputsList.map((input, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          height: 22,
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: 4,
                          paddingLeft: 8,
                          paddingRight: 6,
                          marginLeft: -12,
                          marginRight: 0,
                        }}
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`input_${input.name}`}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 8,
                            height: 8,
                            background: '#07090d',
                            border: '2px solid #38bdf8',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            boxShadow: '0 0 6px rgba(56, 189, 248, 0.6)',
                            zIndex: 20,
                          }}
                        />
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                          {input.name}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', marginLeft: 'auto' }}>
                          :{input.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Output Handle for Function Call */}
                {returnType !== 'void' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                    <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Outputs
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: 22,
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: 4,
                        paddingLeft: 6,
                        paddingRight: 8,
                        marginLeft: 0,
                        marginRight: -12,
                      }}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#a855f7', fontWeight: 600 }}>
                        {params.assignTo || 'return'}
                      </span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                        :{returnType}
                      </span>
                      <Handle
                        type="source"
                        position={Position.Right}
                        id="return"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          width: 8,
                          height: 8,
                          background: '#07090d',
                          border: '2px solid #a855f7',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)',
                          zIndex: 20,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          Object.entries(params).map(([key, val]) => (
            <div key={key}>
              <div style={{
                fontSize: 8.5,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                marginBottom: 3,
                fontWeight: 600,
              }}>
                {key}
              </div>
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                color: 'var(--color-text-bright)',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {val}
              </div>
            </div>
          ))
        )}

        {/* Function sub-flow indicator */}
        {type === 'function' && (
          <div style={{
            marginTop: 4,
            padding: '5px 8px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: hasSubFlow ? '#2fd18b' : '#333',
              boxShadow: hasSubFlow ? '0 0 6px #2fd18b' : 'none',
            }} />
            <span style={{
              fontSize: 8.5,
              color: hasSubFlow ? '#a5b3cd' : '#546484',
              fontStyle: 'italic',
            }}>
              {hasSubFlow ? 'Sub-flow defined' : 'Double-click to edit sub-flow'}
            </span>
          </div>
        )}

        {/* Condition Output Handles (TRUE/FALSE) */}
        {type === 'condition' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
            
            {/* TRUE branch row */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: 20,
              marginRight: -12,
              paddingRight: 12,
            }}>
              <span style={{ fontSize: 9.5, color: '#2fd18b', fontWeight: 800, letterSpacing: '0.5px' }}>TRUE</span>
              <Handle
                type="source"
                position={Position.Right}
                id="true"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: 9,
                  height: 9,
                  background: '#07090d',
                  border: '2.5px solid #2fd18b',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(47,209,139,0.5)',
                  zIndex: 20,
                }}
              />
            </div>

            {/* FALSE branch row */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: 20,
              marginRight: -12,
              paddingRight: 12,
            }}>
              <span style={{ fontSize: 9.5, color: '#ff5f9e', fontWeight: 800, letterSpacing: '0.5px' }}>FALSE</span>
              <Handle
                type="source"
                position={Position.Right}
                id="false"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: 9,
                  height: 9,
                  background: '#07090d',
                  border: '2.5px solid #ff5f9e',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(255,95,158,0.5)',
                  zIndex: 20,
                }}
              />
            </div>

          </div>
        )}

        {/* Loop Output Handles (BODY/DONE) */}
        {type === 'loop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
            
            {/* BODY iteration row */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: 20,
              marginRight: -12,
              paddingRight: 12,
            }}>
              <span style={{ fontSize: 9.5, color: '#ffb13d', fontWeight: 800, letterSpacing: '0.5px' }}>BODY</span>
              <Handle
                type="source"
                position={Position.Right}
                id="body"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: 9,
                  height: 9,
                  background: '#07090d',
                  border: '2.5px solid #ffb13d',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(255,177,61,0.5)',
                  zIndex: 20,
                }}
              />
            </div>

            {/* DONE iteration row */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: 20,
              marginRight: -12,
              paddingRight: 12,
            }}>
              <span style={{ fontSize: 9.5, color: '#5fa3ff', fontWeight: 800, letterSpacing: '0.5px' }}>DONE</span>
              <Handle
                type="source"
                position={Position.Right}
                id="done"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: 9,
                  height: 9,
                  background: '#07090d',
                  border: '2.5px solid #5fa3ff',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(95,163,255,0.5)',
                  zIndex: 20,
                }}
              />
            </div>

          </div>
        )}
      </div>

      {/* Source output handle (Right Side) - centered vertically on Header (19px) */}
      {type !== 'end' && type !== 'return' && type !== 'condition' && type !== 'loop' && (
        <Handle
          type="source"
          position={Position.Right}
          id="flow"
          style={{
            position: 'absolute',
            right: 0,
            top: '19px',
            transform: 'translate(50%, -50%)',
            width: 10,
            height: 10,
            background: '#07090d',
            border: `2px solid ${style.iconColor}`,
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: `0 0 6px ${style.iconColor}55`,
            zIndex: 20,
          }}
        />
      )}

    </div>
  )
}