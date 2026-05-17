import { Node, Edge } from '@xyflow/react'

interface Connection {
  componentId: string
  componentLabel: string
  componentType: string
  pin: string        // component pin (e.g. "data", "trig")
  arduinoPin: string // arduino pin (e.g. "D2", "A0")
}

function parseConnections(schemaNodes: Node[], schemaEdges: Edge[]): Connection[] {
  const connections: Connection[] = []

  schemaEdges.forEach(edge => {
    const sourceNode = schemaNodes.find(n => n.id === edge.source)
    const targetNode = schemaNodes.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return

    // Figure out which is the Uno and which is the component
    const isSourceUno = sourceNode.id === 'arduino-uno'
    const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle
    const compNode = isSourceUno ? targetNode : sourceNode
    const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle

    if (!unoPin || !compNode || !compPin) return
    const data = compNode.data as any

    connections.push({
      componentId: compNode.id,
      componentLabel: data.label,
      componentType: data.componentType,
      pin: compPin,
      arduinoPin: unoPin,
    })
  })

  return connections
}

function pinToArduinoNumber(pin: string): string {
  if (pin.startsWith('D')) return pin.slice(1)
  if (pin.startsWith('A')) return pin
  return pin
}

function generateIncludes(connections: Connection[]): string {
  const includes = new Set<string>()
  const labels = connections.map(c => c.componentLabel)

  if (labels.some(l => l.includes('DHT'))) {
    includes.add('#include <DHT.h>')
  }
  if (labels.some(l => l.includes('LCD'))) {
    includes.add('#include <Wire.h>')
    includes.add('#include <LiquidCrystal_I2C.h>')
  }
  if (labels.some(l => l.includes('OLED'))) {
    includes.add('#include <Wire.h>')
    includes.add('#include <Adafruit_SSD1306.h>')
  }
  if (labels.some(l => l.includes('Servo'))) {
    includes.add('#include <Servo.h>')
  }

  return Array.from(includes).join('\n')
}

function generateDefines(connections: Connection[]): string {
  const lines: string[] = []
  const seen = new Set<string>()

  connections.forEach(conn => {
    const key = conn.componentId + '_' + conn.pin
    if (seen.has(key)) return
    seen.add(key)

    const pinNum = pinToArduinoNumber(conn.arduinoPin)
    const name = conn.componentLabel.replace(/\s+/g, '_').toUpperCase()
    const pinName = conn.pin.toUpperCase()

    if (conn.pin === 'gnd' || conn.pin === 'vcc') return
    lines.push(`#define ${name}_${pinName}_PIN ${pinNum}`)
  })

  return lines.join('\n')
}

function generateSetup(connections: Connection[]): string {
  const lines: string[] = ['  Serial.begin(9600);']
  const seen = new Set<string>()

  connections.forEach(conn => {
    if (conn.pin === 'gnd' || conn.pin === 'vcc') return
    const key = conn.componentId + '_' + conn.pin
    if (seen.has(key)) return
    seen.add(key)

    const pinNum = pinToArduinoNumber(conn.arduinoPin)
    const label = conn.componentLabel

    if (label.includes('LED') || label.includes('Buzzer') || label.includes('Relay') || label.includes('Motor')) {
      if (conn.pin === 'anode' || conn.pin === 'pos' || conn.pin === 'in' || conn.pin === 'signal') {
        lines.push(`  pinMode(${pinNum}, OUTPUT); // ${label}`)
      }
    } else if (label.includes('Button') || label.includes('PIR') || label.includes('LDR')) {
      lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
    } else if (label.includes('Ultrasonic')) {
      if (conn.pin === 'trig') lines.push(`  pinMode(${pinNum}, OUTPUT); // HC-SR04 TRIG`)
      if (conn.pin === 'echo') lines.push(`  pinMode(${pinNum}, INPUT);  // HC-SR04 ECHO`)
    }
  })

  return lines.join('\n')
}

function generateFlowCode(flowNodes: Node[], flowEdges: Edge[]): string {
  const lines: string[] = []

  // Topological sort from start node
  const startNode = flowNodes.find(n => (n.data as any).nodeType === 'start')
  if (!startNode) return '  // No flow defined'

  const visited = new Set<string>()
  const queue = [startNode.id]

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const node = flowNodes.find(n => n.id === id)
    if (!node) continue
    const data = node.data as any
    const outEdges = flowEdges.filter(e => e.source === id)

    switch (data.nodeType) {
      case 'start':
        lines.push('  // --- Flow start ---')
        break
      case 'end':
        lines.push('  // --- Flow end ---')
        break
      case 'variable':
        lines.push(`  int ${data.params?.name || 'x'} = ${data.params?.value || '0'};`)
        break
      case 'print':
        lines.push(`  Serial.println(${data.params?.message || '""'});`)
        break
      case 'condition':
        lines.push(`  if (${data.params?.condition || 'true'}) {`)
        lines.push('    // true branch')
        lines.push('  } else {')
        lines.push('    // false branch')
        lines.push('  }')
        break
      case 'loop':
        lines.push(`  for (int ${data.params?.var || 'i'} = ${data.params?.from || '0'}; ${data.params?.var || 'i'} < ${data.params?.to || '10'}; ${data.params?.var || 'i'}++) {`)
        lines.push('    // loop body')
        lines.push('  }')
        break
      case 'delay':
        lines.push(`  delay(${data.params?.ms || '1000'});`)
        break
      case 'gpio':
        lines.push(`  digitalWrite(${data.params?.pin || '13'}, ${data.params?.value || 'HIGH'});`)
        break
      case 'sensor':
        lines.push(`  int ${data.params?.var || 'sensorVal'} = analogRead(${data.params?.pin || 'A0'});`)
        break
    }

    outEdges.forEach(e => queue.push(e.target))
  }

  return lines.join('\n')
}

export function generateArduinoCode(
  schemaNodes: Node[],
  schemaEdges: Edge[],
  flowNodes: Node[],
  flowEdges: Edge[]
): string {
  const connections = parseConnections(schemaNodes, schemaEdges)
  const includes = generateIncludes(connections)
  const defines = generateDefines(connections)
  const setupCode = generateSetup(connections)
  const flowCode = generateFlowCode(flowNodes, flowEdges)

  const componentSummary = [...new Set(connections.map(c => c.componentLabel))]
    .map(l => ` *   - ${l}`)
    .join('\n')

  return `/*
 * Generated by Flow Programmer
 * Platform: Arduino Uno
 * Components:
${componentSummary || ' *   (none connected)'}
 */

${includes}

${defines}

void setup() {
${setupCode}
}

void loop() {
${flowCode}
}
`
}