'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useState } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'
import ArduinoIcon from '@/components/Customkit/ArduinoIcon'
import { 
  SlidersHorizontal, 
  Settings, 
  Link, 
  Edit3, 
  HelpCircle,
  Play,
  Square,
  CornerDownLeft,
  Clock,
  Zap,
  Radio,
  Equal,
  Variable,
  GitBranch,
  RotateCw,
  Code2,
  Terminal,
  Ruler,
  Thermometer,
  Cog,
  Lightbulb,
  CircleDot,
  Car,
  Tv,
  Cpu,
  Plug,
  Box,
  Trash2,
  Plus
} from 'lucide-react'

// Human-readable flow descriptions and metadata registry for node types
const NODE_DESCRIPTIONS: Record<string, { title: string; category: string; description: string }> = {
  start: {
    title: 'Execution Start',
    category: 'CONTROL FLOW',
    description: 'Marks the execution entry point. Execution begins here automatically when the microcontroller boots or loops.'
  },
  end: {
    title: 'Return / End Flow',
    category: 'CONTROL FLOW',
    description: 'Terminates the current sub-flow execution path or returns a calculated result back to the caller.'
  },
  return: {
    title: 'Return Value',
    category: 'CONTROL FLOW',
    description: 'Returns an expression result from an internal sub-flow or function back to the main program.'
  },
  delay: {
    title: 'Pause Delay',
    category: 'TIMING',
    description: 'Pauses program execution for a specified duration in milliseconds (ms) or microseconds (us).'
  },
  gpio: {
    title: 'Digital Pin I/O',
    category: 'HARDWARE GPIO',
    description: 'Controls a microcontroller digital pin. Sets output state to HIGH (5V) or LOW (0V), or reads digital input.'
  },
  pulse_in: {
    title: 'Pulse Duration Measurement',
    category: 'TIMING / SIGNAL',
    description: 'Measures the duration in microseconds for a pulse signal to transition HIGH or LOW on a digital pin.'
  },
  assignment: {
    title: 'Variable Assignment',
    category: 'DATA / VARIABLES',
    description: 'Evaluates an expression or sensor value and assigns the result into a named program variable.'
  },
  variable: {
    title: 'Variable Declaration',
    category: 'DATA / VARIABLES',
    description: 'Declares a global or local variable with a specified type (int, float, bool, String).'
  },
  if: {
    title: 'Conditional Branch (IF)',
    category: 'CONTROL FLOW',
    description: 'Evaluates a boolean condition. Routes execution down Branch A if TRUE, or Branch B if FALSE.'
  },
  condition: {
    title: 'Conditional Branch',
    category: 'CONTROL FLOW',
    description: 'Evaluates a boolean expression to dynamically branch execution paths.'
  },
  loop: {
    title: 'Iterative Loop',
    category: 'CONTROL FLOW',
    description: 'Repeats all connected child nodes continuously or while a loop condition remains TRUE.'
  },
  while: {
    title: 'While Loop',
    category: 'CONTROL FLOW',
    description: 'Continuously executes nested flow nodes as long as the evaluation condition is TRUE.'
  },
  function: {
    title: 'Sub-Flow Function',
    category: 'SUB-FLOW / FUNCTION',
    description: 'Defines a custom reusable visual sub-flow graph with typed input parameters and return type.'
  },
  function_call: {
    title: 'Function Invocation',
    category: 'SUB-FLOW / FUNCTION',
    description: 'Executes a defined sub-flow function by passing argument values and optionally receiving a return value.'
  },
  print: {
    title: 'Serial Monitor Output',
    category: 'COMMUNICATION',
    description: 'Outputs text or variable data to the Serial Monitor at 9600 baud for debugging.'
  },
  ultrasonic: {
    title: 'Ultrasonic Distance Sensor',
    category: 'HARDWARE SENSOR',
    description: 'Measures obstacle distance in centimeters using HC-SR04 ultrasonic sound wave pulse-echo timing.'
  },
  ultrasonic_hcsr04: {
    title: 'Ultrasonic HC-SR04',
    category: 'HARDWARE SENSOR',
    description: 'Measures obstacle distance in centimeters using HC-SR04 ultrasonic sound wave pulse-echo timing.'
  },
  dht: {
    title: 'DHT Temp & Humidity Sensor',
    category: 'HARDWARE SENSOR',
    description: 'Reads ambient temperature (°C) and relative humidity (%) from a DHT11 or DHT22 digital sensor.'
  },
  servo: {
    title: 'Servo Motor Control',
    category: 'ACTUATOR',
    description: 'Positions a rotational servo motor arm to a targeted angle between 0 and 180 degrees.'
  },
  led: {
    title: 'LED Indicator',
    category: 'ACTUATOR / DISPLAY',
    description: 'Controls an illuminated single-color LED indicator connected to a digital PWM output pin.'
  },
  button: {
    title: 'Push Button Switch',
    category: 'INPUT SENSOR',
    description: 'Detects physical button press events via digital pin pull-up/pull-down readings.'
  },
  motor_driver: {
    title: 'L298N Dual Motor Driver',
    category: 'ACTUATOR',
    description: 'Controls DC motor direction (Forward/Backward) and speed (PWM) using an L298N driver module.'
  },
  lcd: {
    title: 'I2C Character LCD',
    category: 'DISPLAY',
    description: 'Renders text lines and numbers onto a 16x2 or 20x4 I2C liquid crystal display screen.'
  },
  unoNode: {
    title: 'Arduino Uno MCU Board',
    category: 'HARDWARE TARGET',
    description: 'Arduino Uno ATmega328P microcontroller mainboard connection map and pin allocation.'
  },
  boardNode: {
    title: 'MCU Hardware Board',
    category: 'HARDWARE TARGET',
    description: 'Microcontroller mainboard connection map and physical pin allocation.'
  },
  componentNode: {
    title: 'Hardware Schematic Component',
    category: 'HARDWARE SCHEMATIC',
    description: 'Physical hardware component package connected to board signal pins.'
  }
}

// Clean Lucide SVG Icon Renderer (No Emojis)
function renderNodeIcon(type: string) {
  switch (type) {
    case 'start': return <Play className="w-3.5 h-3.5 text-[#3b82f6] fill-current" />
    case 'end': return <Square className="w-3.5 h-3.5 text-[#ef5f5f] fill-current" />
    case 'return': return <CornerDownLeft className="w-3.5 h-3.5 text-[#e67e22]" />
    case 'delay': return <Clock className="w-3.5 h-3.5 text-[#ffb13d]" />
    case 'gpio': return <Zap className="w-3.5 h-3.5 text-[#2ecc71]" />
    case 'pulse_in': return <Radio className="w-3.5 h-3.5 text-[#60a5fa]" />
    case 'assignment': return <Equal className="w-3.5 h-3.5 text-[#3b82f6]" />
    case 'variable': return <Variable className="w-3.5 h-3.5 text-[#a855f7]" />
    case 'if':
    case 'condition': return <GitBranch className="w-3.5 h-3.5 text-[#e67e22]" />
    case 'loop':
    case 'while': return <RotateCw className="w-3.5 h-3.5 text-[#2ecc71]" />
    case 'function':
    case 'function_call': return <Code2 className="w-3.5 h-3.5 text-[#3b82f6]" />
    case 'print': return <Terminal className="w-3.5 h-3.5 text-[#a5b3cd]" />
    case 'ultrasonic':
    case 'ultrasonic_hcsr04': return <Ruler className="w-3.5 h-3.5 text-[#3b82f6]" />
    case 'dht': return <Thermometer className="w-3.5 h-3.5 text-[#ef5f5f]" />
    case 'servo': return <Cog className="w-3.5 h-3.5 text-[#ffb13d]" />
    case 'led': return <Lightbulb className="w-3.5 h-3.5 text-[#ffb13d]" />
    case 'button': return <CircleDot className="w-3.5 h-3.5 text-[#2ecc71]" />
    case 'motor_driver': return <Car className="w-3.5 h-3.5 text-[#e67e22]" />
    case 'lcd': return <Tv className="w-3.5 h-3.5 text-[#60a5fa]" />
    case 'unoNode': return <ArduinoIcon size={14} color="#00c4b4" />
    case 'boardNode': return <ArduinoIcon size={14} color="#2fd18b" />
    case 'componentNode': return <Plug className="w-3.5 h-3.5 text-[#2ecc71]" />
    default: return <Box className="w-3.5 h-3.5 text-[#60a5fa]" />
  }
}

export default function PropertiesPanel() {
  const { 
    selectedNodeId, 
    schemaNodes, 
    updateSchemaNodeData, 
    activeCanvas, 
    getActiveFlowNodes, 
    updateAnyFlowNodeData, 
    subFlowStack, 
    flowNodes: allFlowNodes, 
    subFlows 
  } = useFlowStore()

  // Track open accordion sections
  const [openSections, setOpenSections] = useState({
    purpose: true,
    params: true,
    connectors: true,
  })

  const flowNodes = getActiveFlowNodes()
  const nodes = activeCanvas === 'schema' ? schemaNodes : flowNodes
  const originalNode = nodes.find(n => n.id === selectedNodeId)

  const isSubFlowStart = originalNode && originalNode.data?.nodeType === 'start' && subFlowStack.length > 0
  const parentFnNode = isSubFlowStart ? (() => {
    const parentId = subFlowStack[subFlowStack.length - 1]
    let parentNode = allFlowNodes.find(n => n.id === parentId)
    if (!parentNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === parentId)
        if (found) { parentNode = found; break; }
      }
    }
    return parentNode
  })() : null

  const node = parentFnNode || originalNode
  const updateFlowNodeData = updateAnyFlowNodeData

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  if (!node) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: 'var(--color-bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-dim)',
        }}>
          <SlidersHorizontal className="w-6 h-6 text-[#3b82f6]" />
        </div>
        <div style={{ 
          fontSize: 12, 
          fontWeight: 600,
          color: 'var(--color-text-bright)',
          textAlign: 'center', 
        }}>
          No Node Selected
        </div>
        <div style={{ 
          fontSize: 10.5, 
          color: 'var(--color-text-dim)', 
          textAlign: 'center', 
          lineHeight: 1.5,
          maxWidth: 180,
        }}>
          Click any component or flow node on the canvas to inspect its behavior and edit properties.
        </div>
      </div>
    )
  }

  const data = node.data as Record<string, any>
  const pins = data.pins as { id: string, label: string }[] || []
  const rawNodeType = data.nodeType || data.componentType || node.type || 'node'
  
  // Resolve description metadata
  const meta = NODE_DESCRIPTIONS[rawNodeType] || {
    title: data.label || 'Custom Flow Node',
    category: activeCanvas === 'schema' ? 'HARDWARE COMPONENT' : 'FLOW CONTROL',
    description: `Executes ${data.label || rawNodeType} operation in the flow graph.`
  }

  const isEndNodeInSubflow = data.nodeType === 'end' && activeCanvas === 'flow' && subFlowStack.length > 0
  let parentFnReturnType = 'void'
  if (isEndNodeInSubflow) {
    const parentId = subFlowStack[subFlowStack.length - 1]
    let parentFnNode = allFlowNodes.find(n => n.id === parentId)
    if (!parentFnNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === parentId)
        if (found) {
          parentFnNode = found
          break
        }
      }
    }
    parentFnReturnType = (parentFnNode?.data as any)?.params?.returnType || 'void'
  }

  let params = data.params as Record<string, string> || {}
  if (isEndNodeInSubflow && parentFnReturnType !== 'void') {
    if (params.value === undefined) {
      params = { ...params, value: '' }
    }
  }

  const handleLabelChange = (newLabel: string) => {
    const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
    updater(node.id, { ...data, label: newLabel })
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--color-bg-panel)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflowY: 'auto',
    }}>
      {/* Panel Top Banner: Node Title & Category */}
      <div style={{
        padding: '12px 14px',
        background: 'var(--color-bg-header)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {renderNodeIcon(rawNodeType)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-bright)' }}>
                {meta.title}
              </div>
              <div style={{ 
                fontSize: 8.5, 
                fontWeight: 700,
                color: 'var(--color-accent)', 
                textTransform: 'uppercase', 
                marginTop: 2, 
                letterSpacing: '0.5px' 
              }}>
                {meta.category}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Custom Display Label */}
        <div style={{ marginTop: 2 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 9, 
            color: 'var(--color-text-dim)', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            marginBottom: 4 
          }}>
            Display Label
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              value={data.label || ''}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder="Custom node label..."
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 4,
                padding: '5px 8px 5px 24px',
                color: 'var(--color-text-bright)',
                fontSize: 11,
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)' }}
            />
            <Edit3 className="w-3 h-3 text-[var(--color-text-dim)] absolute left-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Accordion 1: Flow Purpose & Behavior */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div 
          onClick={() => toggleSection('purpose')}
          style={{
            padding: '9px 14px',
            background: 'rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--color-text-normal)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle className="w-3.5 h-3.5 text-[var(--color-accent)]" /> FLOW BEHAVIOR
          </span>
          <span style={{ color: '#555', fontSize: 10 }}>{openSections.purpose ? '▼' : '▶'}</span>
        </div>
        {openSections.purpose && (
          <div style={{ padding: '12px 14px' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 10.5,
              color: 'var(--color-text-normal)',
              lineHeight: 1.5,
            }}>
              {meta.description}
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Editable Parameters & Inputs */}
      {Object.keys(params).length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('params')}
            style={{
              padding: '9px 14px',
              background: 'rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings className="w-3.5 h-3.5 text-[var(--color-accent)]" /> EDITABLE PARAMETERS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.params ? '▼' : '▶'}</span>
          </div>
          {openSections.params && (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rawNodeType === 'function' ? (
                (() => {
                  const fnName = params.name || 'getDistance'
                  const returnType = params.returnType || 'int'
                  
                  const rawInputs = params.inputs || params.parameters || []
                  let currentInputs: { name: string; type: string }[] = []
                  if (Array.isArray(rawInputs)) currentInputs = rawInputs
                  else if (typeof rawInputs === 'string' && rawInputs.trim() !== '') {
                    try { currentInputs = JSON.parse(rawInputs); } catch(e) {}
                  }

                  const signatureStr = `${returnType} ${fnName}(${currentInputs.map(p => `${p.type} ${p.name || 'arg'}`).join(', ')})`

                  const updateInputs = (newInputs: { name: string; type: string }[]) => {
                    const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                    updater(node.id, {
                      ...data,
                      params: {
                        ...params,
                        inputs: newInputs,
                        parameters: newInputs,
                      }
                    })
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Name */}
                      <div>
                        <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                          Name
                        </div>
                        <input
                          value={params.name || ''}
                          onChange={e => {
                            const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                            updater(node.id, {
                              ...data,
                              params: { ...params, name: e.target.value }
                            })
                          }}
                          placeholder="e.g. getDistance"
                          style={{
                            width: '100%',
                            background: 'var(--color-bg-input)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            padding: '5px 8px',
                            color: 'var(--color-text-bright)',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Return Type */}
                      <div>
                        <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                          Return Type
                        </div>
                        <CustomSelect
                          value={returnType}
                          options={[
                            { value: 'void', label: 'void (No return value)' },
                            { value: 'int', label: 'int (Integer)' },
                            { value: 'float', label: 'float (Decimal)' },
                            { value: 'bool', label: 'bool (True/False)' },
                            { value: 'char', label: 'char (Character)' },
                            { value: 'String', label: 'String (Text)' },
                            { value: 'long', label: 'long (Large Integer)' },
                          ]}
                          onChange={val => {
                            const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                            updater(node.id, {
                              ...data,
                              params: { 
                                ...params, 
                                returnType: val,
                                outputs: val === 'void' ? [] : [{ name: 'return', type: val }]
                              }
                            })
                          }}
                        />
                      </div>

                      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

                      {/* Live Function Signature Preview */}
                      <div>
                        <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                          Signature Preview
                        </div>
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          color: '#60a5fa',
                          wordBreak: 'break-all',
                          lineHeight: 1.4,
                        }}>
                          {signatureStr}
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

                      {/* Inputs Section */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-bright)' }}>
                            Inputs ({currentInputs.length})
                          </span>
                          <button
                            onClick={() => {
                              const newInputs = [
                                ...currentInputs,
                                { name: `input${currentInputs.length + 1}`, type: 'int' }
                              ]
                              updateInputs(newInputs)
                            }}
                            style={{
                              background: '#2563eb',
                              border: 'none',
                              borderRadius: 4,
                              padding: '3px 8px',
                              fontSize: 10,
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Plus className="w-3 h-3" /> Add Input
                          </button>
                        </div>

                        {currentInputs.length === 0 ? (
                          <div style={{
                            fontSize: 10,
                            color: 'var(--color-text-dim)',
                            fontStyle: 'italic',
                            padding: '10px 8px',
                            textAlign: 'center',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 6,
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                          }}>
                            (No inputs yet)
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {currentInputs.map((input, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.25)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: 6,
                                  padding: '8px 10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                                    Input #{idx + 1}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const newInputs = currentInputs.filter((_, i) => i !== idx)
                                      updateInputs(newInputs)
                                    }}
                                    title="Remove Input"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef5f5f',
                                      cursor: 'pointer',
                                      padding: 2,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-[#ef5f5f]" />
                                  </button>
                                </div>

                                <div>
                                  <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontWeight: 600, marginBottom: 2 }}>
                                    Name
                                  </div>
                                  <input
                                    value={input.name}
                                    placeholder="e.g. triggerPin"
                                    onChange={e => {
                                      const newInputs = [...currentInputs]
                                      newInputs[idx] = { ...newInputs[idx], name: e.target.value }
                                      updateInputs(newInputs)
                                    }}
                                    style={{
                                      width: '100%',
                                      background: 'rgba(0, 0, 0, 0.3)',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      borderRadius: 4,
                                      padding: '5px 8px',
                                      color: 'var(--color-text-bright)',
                                      fontSize: 11,
                                      fontFamily: 'var(--font-mono)',
                                      outline: 'none',
                                    }}
                                  />
                                </div>

                                <div>
                                  <div style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontWeight: 600, marginBottom: 2 }}>
                                    Type
                                  </div>
                                  <CustomSelect
                                    value={input.type || 'int'}
                                    options={[
                                      { value: 'int', label: 'int (Integer)' },
                                      { value: 'float', label: 'float (Decimal)' },
                                      { value: 'bool', label: 'bool (True/False)' },
                                      { value: 'char', label: 'char (Character)' },
                                      { value: 'String', label: 'String (Text)' },
                                      { value: 'long', label: 'long (Large Integer)' },
                                    ]}
                                    onChange={val => {
                                      const newInputs = [...currentInputs]
                                      newInputs[idx] = { ...newInputs[idx], type: val }
                                      updateInputs(newInputs)
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

                      {/* Outputs Section */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-bright)', marginBottom: 6 }}>
                          Outputs
                        </div>
                        {returnType === 'void' ? (
                          <div style={{ fontSize: 10, color: 'var(--color-text-dim)', fontStyle: 'italic', padding: '6px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: 4 }}>
                            (No return output)
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            borderRadius: 6,
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            color: '#e9d5ff',
                          }}>
                            <span>return</span>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.2)', padding: '1px 6px', borderRadius: 3 }}>
                              {returnType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()
              ) : rawNodeType === 'function_call' ? (
                (() => {
                  const definedFunctions: { id: string, name: string, returnType: string, parameters: { name: string, type: string }[] }[] = [];
                  
                  allFlowNodes.forEach((n: any) => {
                    if (n.data?.nodeType === 'function') {
                      const fnName = n.data?.params?.name || 'myFn';
                      const returnType = n.data?.params?.returnType || 'void';
                      const pVal = n.data?.params?.parameters;
                      let paramsList: any[] = [];
                      if (Array.isArray(pVal)) paramsList = pVal;
                      else if (typeof pVal === 'string' && pVal.trim() !== '') {
                        try { paramsList = JSON.parse(pVal); } catch(e) {}
                      }
                      definedFunctions.push({ id: n.id, name: fnName, returnType, parameters: paramsList });
                    }
                  });

                  const currentFnName = params.functionName || '';
                  const selectedFn = definedFunctions.find(f => f.name === currentFnName);

                  return (
                    <>
                      <div>
                        <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, marginBottom: 4 }}>
                          Target Function
                        </div>
                        <CustomSelect
                          value={currentFnName}
                          options={[
                            { value: '', label: '-- Select Function --' },
                            ...definedFunctions.map(f => ({
                              value: f.name,
                              label: `${f.name}() ${f.returnType !== 'void' ? `-> ${f.returnType}` : ''}`
                            }))
                          ]}
                          onChange={newFnName => {
                            const targetFn = definedFunctions.find(f => f.name === newFnName);
                            const newArgs = targetFn ? new Array(targetFn.parameters.length).fill('') : [];
                            const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                            updater(node.id, {
                              ...data,
                              params: {
                                ...params,
                                functionName: newFnName,
                                arguments: newArgs,
                                assignTo: targetFn && targetFn.returnType === 'void' ? '' : (params.assignTo || '')
                              }
                            });
                          }}
                        />
                      </div>

                      {selectedFn && selectedFn.parameters.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, marginBottom: 6 }}>
                            Passed Arguments
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {selectedFn.parameters.map((param, idx) => {
                              let currentArgs: any[] = [];
                              const argsVal = params.arguments;
                              if (Array.isArray(argsVal)) currentArgs = argsVal;
                              else if (typeof argsVal === 'string' && argsVal.trim() !== '') {
                                try {
                                  const parsed = JSON.parse(argsVal);
                                  if (Array.isArray(parsed)) currentArgs = parsed;
                                } catch(e) {}
                              }
                              const currentVal = currentArgs[idx] || '';

                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ fontSize: 8.5, color: 'var(--color-text-normal)', fontFamily: 'var(--font-mono)' }}>
                                    {param.name} ({param.type})
                                  </div>
                                  <input
                                    value={currentVal}
                                    placeholder={`e.g. ${param.type === 'int' ? '13' : 'val'}`}
                                    onChange={e => {
                                      const newArgs = [...currentArgs];
                                      while (newArgs.length <= idx) newArgs.push('');
                                      newArgs[idx] = e.target.value;
                                      const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                      updater(node.id, {
                                        ...data,
                                        params: { ...params, arguments: newArgs }
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      background: 'var(--color-bg-input)',
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 4,
                                      padding: '4px 6px',
                                      color: 'var(--color-text-bright)',
                                      fontSize: 10,
                                      fontFamily: 'var(--font-mono)',
                                      outline: 'none',
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                Object.entries(params).map(([key, val]) => (
                  <div key={key}>
                    <div style={{ fontSize: 9.5, color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </div>

                    {key === 'unit' ? (
                      <CustomSelect
                        value={val}
                        options={[
                          { value: 'ms', label: 'Milliseconds (ms)' },
                          { value: 'us', label: 'Microseconds (us)' },
                        ]}
                        onChange={newVal => {
                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                          updater(node.id, {
                            ...data,
                            params: { ...params, [key]: newVal }
                          })
                        }}
                      />
                    ) : key === 'state' || (key === 'value' && (rawNodeType === 'gpio' || rawNodeType === 'pulse_in')) ? (
                      <CustomSelect
                        value={val}
                        options={[
                          { value: 'HIGH', label: 'HIGH (5V)' },
                          { value: 'LOW', label: 'LOW (0V)' },
                        ]}
                        onChange={newVal => {
                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                          updater(node.id, {
                            ...data,
                            params: { ...params, [key]: newVal }
                          })
                        }}
                      />
                    ) : key === 'mode' ? (
                      <CustomSelect
                        value={val}
                        options={[
                          { value: 'OUTPUT', label: 'OUTPUT' },
                          { value: 'INPUT', label: 'INPUT' },
                          { value: 'INPUT_PULLUP', label: 'INPUT_PULLUP' },
                        ]}
                        onChange={newVal => {
                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                          updater(node.id, {
                            ...data,
                            params: { ...params, [key]: newVal }
                          })
                        }}
                      />
                    ) : (
                      <input
                        value={val}
                        placeholder={`e.g. value for ${key}`}
                        onChange={e => {
                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                          updater(node.id, {
                            ...data,
                            params: { ...params, [key]: e.target.value }
                          })
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          padding: '5px 8px',
                          color: 'var(--color-text-bright)',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-border-focus)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Accordion 3: Hardware Signal Pins & Connectors */}
      {pins.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('connectors')}
            style={{
              padding: '9px 14px',
              background: 'rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link className="w-3.5 h-3.5 text-[#2ecc71]" /> SIGNAL PINS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.connectors ? '▼' : '▶'}</span>
          </div>
          {openSections.connectors && (
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pins.map(pin => (
                <div key={pin.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  fontSize: 10.5,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#2ecc71', fontWeight: 600 }}>
                    {pin.id}
                  </span>
                  <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>
                    {pin.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}