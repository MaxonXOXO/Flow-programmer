import { Node, Edge } from '@xyflow/react'

// ===== TYPES =====
interface Connection {
  componentId: string
  componentLabel: string
  componentType: string
  pin: string
  arduinoPin: string
}

// ===== SCHEMA PARSING =====
function parseConnections(schemaNodes: Node[], schemaEdges: Edge[]): Connection[] {
  const connections: Connection[] = []

  schemaEdges.forEach(edge => {
    const sourceNode = schemaNodes.find(n => n.id === edge.source)
    const targetNode = schemaNodes.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return

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

function pinToNumber(pin: string): string {
  if (pin.startsWith('D')) return pin.slice(1)
  return pin
}

function safeVarName(label: string): string {
  return label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
}

// ===== INCLUDES =====
function generateIncludes(connections: Connection[]): string {
  const includes = new Set<string>()
  const labels = connections.map(c => c.componentLabel)

  if (labels.some(l => l.includes('DHT')))       { includes.add('#include <DHT.h>') }
  if (labels.some(l => l.includes('Servo')))      { includes.add('#include <Servo.h>') }
  if (labels.some(l => l.includes('LCD')))        { includes.add('#include <Wire.h>'); includes.add('#include <LiquidCrystal_I2C.h>') }
  if (labels.some(l => l.includes('OLED')))       { includes.add('#include <Wire.h>'); includes.add('#include <Adafruit_SSD1306.h>') }
  if (labels.some(l => l.includes('Bluetooth')))  { includes.add('#include <SoftwareSerial.h>') }

  return Array.from(includes).join('\n')
}

// ===== DEFINES =====
function generateDefines(connections: Connection[]): string {
  const lines: string[] = []
  const seen = new Set<string>()

  connections.forEach(conn => {
    // Skip power/ground pins
    if (['gnd', 'vcc', 'cathode', 'neg', 'gnd'].includes(conn.pin.toLowerCase())) return
    if (['GND', '5V', '3.3V', 'VIN'].includes(conn.arduinoPin)) return

    const key = `${conn.componentId}_${conn.pin}`
    if (seen.has(key)) return
    seen.add(key)

    const pinNum = pinToNumber(conn.arduinoPin)
    const name = conn.componentLabel.replace(/\s+/g, '_').toUpperCase()
    const pinName = conn.pin.toUpperCase()
    lines.push(`#define ${name}_${pinName} ${pinNum}`)
  })

  return lines.join('\n')
}
// ===== GLOBAL DECLARATIONS =====
function generateGlobals(connections: Connection[]): string {
  const lines: string[] = []
  const seen = new Set<string>()

  connections.forEach(conn => {
    const label = conn.componentLabel
    const varName = safeVarName(label)
    if (seen.has(varName)) return
    seen.add(varName)

    if (label.includes('DHT22')) {
      const pin = pinToNumber(conn.arduinoPin)
      lines.push(`DHT ${varName}(${pin}, DHT22);`)
    }
    if (label.includes('DHT11')) {
      const pin = pinToNumber(conn.arduinoPin)
      lines.push(`DHT ${varName}(${pin}, DHT11);`)
    }
    if (label.includes('Servo')) {
      lines.push(`Servo ${varName};`)
    }
    if (label.includes('LCD')) {
      lines.push(`LiquidCrystal_I2C ${varName}(0x27, 16, 2);`)
    }
    if (label.includes('OLED')) {
      lines.push(`Adafruit_SSD1306 ${varName}(128, 64, &Wire, -1);`)
    }
  })

  return lines.join('\n')
}

// ===== SETUP =====
function generateSetup(connections: Connection[]): string {
  const lines: string[] = ['  Serial.begin(9600);']
  const seen = new Set<string>()

  connections.forEach(conn => {
    if (conn.pin === 'gnd' || conn.pin === 'vcc') return
    const label = conn.componentLabel
    const varName = safeVarName(label)
    const pinNum = pinToNumber(conn.arduinoPin)
    const key = `${conn.componentId}_${conn.pin}`
    if (seen.has(key)) return
    seen.add(key)

    if (label.includes('LED') || label.includes('Buzzer') || label.includes('Relay')) {
      if (['GND', '5V', '3.3V', 'VIN'].includes(conn.arduinoPin)) return
      if (['anode', 'pos', 'in', 'signal'].includes(conn.pin)) {
        lines.push(`  pinMode(${pinNum}, OUTPUT); // ${label}`)
      }
    } else if (label.includes('Button') || label.includes('PIR') || label.includes('LDR')) {
      lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
    } else if (label.includes('Ultrasonic')) {
      if (conn.pin === 'trig') lines.push(`  pinMode(${pinNum}, OUTPUT); // HC-SR04 TRIG`)
      if (conn.pin === 'echo') lines.push(`  pinMode(${pinNum}, INPUT);  // HC-SR04 ECHO`)
    } else if (label.includes('DC Motor')) {
      lines.push(`  pinMode(${pinNum}, OUTPUT); // DC Motor`)
    } else if (label.includes('Servo')) {
      lines.push(`  ${varName}.attach(${pinNum});`)
    } else if (label.includes('DHT')) {
      lines.push(`  ${varName}.begin();`)
    } else if (label.includes('LCD')) {
      lines.push(`  ${varName}.init();`)
      lines.push(`  ${varName}.backlight();`)
    } else if (label.includes('OLED')) {
      lines.push(`  ${varName}.begin(SSD1306_SWITCHCAPVCC, 0x3C);`)
      lines.push(`  ${varName}.clearDisplay();`)
    }
    
  })

  return lines.join('\n')
}

// ===== RECURSIVE FLOW CODEGEN =====
function generateNodeCode(
  nodeId: string,
  flowNodes: Node[],
  flowEdges: Edge[],
  visited: Set<string>,
  indent: number
): string {
  if (visited.has(nodeId)) return ''
  visited.add(nodeId)

  const node = flowNodes.find(n => n.id === nodeId)
  if (!node) return ''

  const data = node.data as any
  const pad = '  '.repeat(indent)
  const lines: string[] = []

  // Helper to follow a specific output port
  const followPort = (port: string) => {
    const edge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === port)
    if (!edge) return ''
    return generateNodeCode(edge.target, flowNodes, flowEdges, visited, indent)
  }

  // Helper to follow first available output
  const followFlow = () => {
    const edge = flowEdges.find(e => e.source === nodeId)
    if (!edge) return ''
    return generateNodeCode(edge.target, flowNodes, flowEdges, visited, indent)
  }

  switch (data.nodeType) {
    case 'start':
      lines.push(`${pad}// Program start`)
      lines.push(followFlow())
      break

    case 'end':
      lines.push(`${pad}// Program end`)
      break

    case 'variable':
      lines.push(`${pad}int ${data.params?.name || 'x'} = ${data.params?.value || '0'};`)
      lines.push(followFlow())
      break

    case 'print':
      lines.push(`${pad}Serial.println(${data.params?.message || '""'});`)
      lines.push(followFlow())
      break

    case 'condition': {
      lines.push(`${pad}if (${data.params?.condition || 'true'}) {`)

      // true branch — recurse with deeper indent
      const trueEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'true')
      if (trueEdge) {
        const trueVisited = new Set(visited)
        lines.push(generateNodeCode(trueEdge.target, flowNodes, flowEdges, trueVisited, indent + 1))
      }

      lines.push(`${pad}} else {`)

      // false branch — recurse with deeper indent
      const falseEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'false')
      if (falseEdge) {
        const falseVisited = new Set(visited)
        lines.push(generateNodeCode(falseEdge.target, flowNodes, flowEdges, falseVisited, indent + 1))
      }

      lines.push(`${pad}}`)

      // continue after both branches converge
      const doneEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'flow')
      if (doneEdge) {
        lines.push(generateNodeCode(doneEdge.target, flowNodes, flowEdges, visited, indent))
      }
      break
    }

    case 'loop': {
      const v = data.params?.var || 'i'
      const from = data.params?.from || '0'
      const to = data.params?.to || '10'
      const step = data.params?.step || '1'
      lines.push(`${pad}for (int ${v} = ${from}; ${v} < ${to}; ${v} += ${step}) {`)

      // body branch
      const bodyEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'body')
      if (bodyEdge) {
        const bodyVisited = new Set(visited)
        lines.push(generateNodeCode(bodyEdge.target, flowNodes, flowEdges, bodyVisited, indent + 1))
      }

      lines.push(`${pad}}`)

      // done branch — continues after loop
      const doneEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'done')
      if (doneEdge) {
        lines.push(generateNodeCode(doneEdge.target, flowNodes, flowEdges, visited, indent))
      }
      break
    }

    case 'delay':
      lines.push(`${pad}delay(${data.params?.ms || '1000'});`)
      lines.push(followFlow())
      break

    case 'gpio':
      lines.push(`${pad}digitalWrite(${data.params?.pin || '13'}, ${data.params?.value || 'HIGH'});`)
      lines.push(followFlow())
      break

    case 'sensor':
      lines.push(`${pad}int ${data.params?.var || 'sensorVal'} = analogRead(${data.params?.pin || 'A0'});`)
      lines.push(followFlow())
      break

    case 'function':
      lines.push(`${pad}${data.params?.name || 'myFn'}();`)
      lines.push(followFlow())
      break

    default:
      lines.push(followFlow())
  }

  return lines.filter(l => l !== '').join('\n')
}

function generateFlowCode(flowNodes: Node[], flowEdges: Edge[]): string {
  const startNode = flowNodes.find(n => (n.data as any).nodeType === 'start')
  if (!startNode) return '  // No flow defined yet'

  const visited = new Set<string>()
  const code = generateNodeCode(startNode.id, flowNodes, flowEdges, visited, 1)
  return code || '  // Empty flow'
}

// ===== MAIN EXPORT =====
export function generateArduinoCode(
  schemaNodes: Node[],
  schemaEdges: Edge[],
  flowNodes: Node[],
  flowEdges: Edge[]
): string {
  const connections = parseConnections(schemaNodes, schemaEdges)
  const includes = generateIncludes(connections)
  const defines = generateDefines(connections)
  const globals = generateGlobals(connections)
  const setupCode = generateSetup(connections)
  const flowCode = generateFlowCode(flowNodes, flowEdges)

  const componentSummary = [...new Set(connections.map(c => c.componentLabel))]
    .map(l => ` *   - ${l}`)
    .join('\n')

  return [
    `/*`,
    ` * Generated by Flow Programmer`,
    ` * Platform: Arduino Uno`,
    ` * Components:`,
    componentSummary || ` *   (none connected)`,
    ` */`,
    ``,
    includes,
    ``,
    defines,
    ``,
    globals,
    ``,
    `void setup() {`,
    setupCode,
    `}`,
    ``,
    `void loop() {`,
    flowCode,
    `}`,
  ].filter(l => l !== undefined).join('\n')
}