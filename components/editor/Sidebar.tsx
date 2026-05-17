 'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useCallback } from 'react'

const SCHEMA_COMPONENTS = [
  {
    section: 'Sensors',
    nodes: [
      { label: 'LED', icon: '💡', componentType: 'actuator', pins: [{ id: 'anode', label: 'Anode (+)' }, { id: 'cathode', label: 'Cathode (−)' }] },
      { label: 'Push Button', icon: '⬛', componentType: 'sensor', pins: [{ id: 'pin1', label: 'Pin 1' }, { id: 'pin2', label: 'Pin 2' }] },
      { label: 'DHT22', icon: '🌡', componentType: 'sensor', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'data', label: 'DATA' }, { id: 'gnd', label: 'GND' }] },
      { label: 'Ultrasonic HC-SR04', icon: '📡', componentType: 'sensor', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'trig', label: 'TRIG' }, { id: 'echo', label: 'ECHO' }, { id: 'gnd', label: 'GND' }] },
      { label: 'PIR Sensor', icon: '👁', componentType: 'sensor', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'out', label: 'OUT' }, { id: 'gnd', label: 'GND' }] },
      { label: 'LDR', icon: '☀', componentType: 'sensor', pins: [{ id: 'pin1', label: 'Pin 1' }, { id: 'pin2', label: 'Pin 2' }] },
    ]
  },
  {
    section: 'Actuators',
    nodes: [
      { label: 'DC Motor', icon: '⚙', componentType: 'actuator', pins: [{ id: 'pos', label: '+' }, { id: 'neg', label: '−' }] },
      { label: 'Servo Motor', icon: '🔧', componentType: 'actuator', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'signal', label: 'Signal' }, { id: 'gnd', label: 'GND' }] },
      { label: 'Buzzer', icon: '🔔', componentType: 'actuator', pins: [{ id: 'pos', label: '+' }, { id: 'neg', label: '−' }] },
      { label: 'Relay', icon: '⚡', componentType: 'actuator', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'in', label: 'IN' }, { id: 'gnd', label: 'GND' }] },
    ]
  },
  {
    section: 'Display',
    nodes: [
      { label: 'LCD 16x2', icon: '📺', componentType: 'display', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'gnd', label: 'GND' }, { id: 'sda', label: 'SDA' }, { id: 'scl', label: 'SCL' }] },
      { label: 'OLED 128x64', icon: '🖥', componentType: 'display', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'gnd', label: 'GND' }, { id: 'sda', label: 'SDA' }, { id: 'scl', label: 'SCL' }] },
    ]
  },
  {
    section: 'Comms',
    nodes: [
      { label: 'HC-05 Bluetooth', icon: '📶', componentType: 'comms', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'gnd', label: 'GND' }, { id: 'tx', label: 'TX' }, { id: 'rx', label: 'RX' }] },
      { label: 'NRF24L01', icon: '📡', componentType: 'comms', pins: [{ id: 'vcc', label: 'VCC' }, { id: 'gnd', label: 'GND' }, { id: 'ce', label: 'CE' }, { id: 'csn', label: 'CSN' }, { id: 'sck', label: 'SCK' }, { id: 'mosi', label: 'MOSI' }, { id: 'miso', label: 'MISO' }] },
    ]
  },
]



const NODE_TYPES = [
  {
    section: 'Control Flow',
    nodes: [
      { type: 'start',     label: 'Start',        icon: '▶',   nodeType: 'start',     params: {} },
      { type: 'end',       label: 'End',           icon: '⬛',  nodeType: 'end',       params: {} },
      { type: 'condition', label: 'If Condition',  icon: '◇',   nodeType: 'condition', params: { condition: 'x > 0' } },
      { type: 'loop',      label: 'For Loop',      icon: '↻',   nodeType: 'loop',      params: { from: '0', to: '10', step: '1', var: 'i' } },
      { type: 'delay',     label: 'Delay',         icon: '⏱',   nodeType: 'delay',     params: { ms: '500' } },
    ]
  },
  {
    section: 'Data',
    nodes: [
      { type: 'variable',  label: 'Variable',      icon: 'x=',  nodeType: 'variable',  params: { name: 'x', value: '0' } },
      { type: 'function',  label: 'Function',      icon: 'ƒ()', nodeType: 'function',  params: { name: 'myFn', body: 'return x' } },
    ]
  },
  {
    section: 'I/O',
    nodes: [
      { type: 'print',     label: 'Print',         icon: '»',   nodeType: 'print',     params: { message: '"Hello"' } },
      { type: 'input',     label: 'User Input',    icon: '←',   nodeType: 'input',     params: { prompt: '"Enter:"', var: 'val' } },
    ]
  },
  {
    section: 'Hardware',
    nodes: [
      { type: 'sensor',    label: 'Sensor Read',   icon: '≋',   nodeType: 'sensor',    params: { pin: 'A0', var: 'sensorVal' } },
      { type: 'gpio',      label: 'GPIO Write',    icon: '⚡',   nodeType: 'gpio',      params: { pin: '13', value: 'HIGH' } },
      { type: 'api',       label: 'HTTP API',      icon: '⇌',   nodeType: 'api',       params: { url: 'https://api.example.com', method: 'GET' } },
    ]
  },
]

const typeAccents: Record<string, string> = {
  start: '#2fd18b', end: '#3d8bff', condition: '#f5a623',
  loop: '#9b6cff', delay: '#8a94b0', variable: '#26d4c8',
  function: '#e85050', print: '#2fd18b', input: '#3d8bff',
  sensor: '#5effc3', gpio: '#3d8bff', api: '#e85050',
}

let nodeCounter = 10

export default function Sidebar() {
  const { addNode, activeCanvas } = useFlowStore()
  const list = activeCanvas === 'schema' ? SCHEMA_COMPONENTS : NODE_TYPES

  const onDragStart = useCallback((e: React.DragEvent, nodeConfig: any) => {
    const type = activeCanvas === 'schema' ? 'schemaComponent' : 'flowNode'
    e.dataTransfer.setData('application/flownode', JSON.stringify({ ...nodeConfig, canvasType: type }))
    e.dataTransfer.effectAllowed = 'move'
  }, [activeCanvas])

  return (
    <div style={{
      width: 220,
      height: '100vh',
      background: '#111318',
      borderRight: '1px solid #2a3040',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #2a3040',
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#4a5270',
      }}>
        {activeCanvas === 'schema' ? '⎔ Components' : '⟳ Flow Nodes'}
      </div>

      {list.map((section: any) => (
        <div key={section.section}>
          <div style={{
            padding: '10px 14px 4px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1.2px',
            color: '#4a5270',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}>
            {section.section}
          </div>
          {section.nodes.map((node: any) => (
            <div
              key={node.label}
              draggable
              onDragStart={(e) => onDragStart(e, node)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                margin: '2px 8px',
                borderRadius: 6,
                cursor: 'grab',
                fontSize: 13,
                color: '#8a94b0',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = '#1e2330'
                ;(e.currentTarget as HTMLDivElement).style.color = '#e4e8f4'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLDivElement).style.color = '#8a94b0'
              }}
            >
              <span style={{ fontSize: 16 }}>{node.icon}</span>
              <span>{node.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}