import { Node, Edge } from '@xyflow/react'
import { generateDHTCode } from './sensors/dht'
import { generateUltrasonicCode, resetUltrasonicCounter } from './sensors/ultrasonic'
import { generatePIRCode } from './sensors/pir'
import { generateLDRCode } from './sensors/ldr'
import { generateServoCode } from './sensors/servo'
import { generateLCDCode } from './sensors/lcd'
import { generateOLEDCode } from './sensors/oled'
import { generateIRCode } from './sensors/ir'
import { generateFlameCode } from './sensors/flame'
import { generateSoilMoistureCode } from './sensors/soilMoisture'
import { generateWaterLevelCode } from './sensors/waterLevel'
import { generateMQGasCode } from './sensors/mqGas'
import { generateVibrationCode } from './sensors/vibration'
import { generateL298NCode } from './sensors/l298n'
import { generateL293DCode } from './sensors/l293d'

// ===== TYPES =====
export interface Connection {
  componentId: string
  componentLabel: string
  componentType: string
  pin: string
  arduinoPin: string
}

// ===== POWER PIN HELPERS =====
const POWER_PINS_COMPONENT = ['gnd', 'vcc', 'vdd', 'vss', 'vin', '5v', '3.3v', '3v3', 'cathode', 'neg']
const POWER_PINS_ARDUINO = ['gnd', '5v', '3.3v', 'vin']

function isPowerPin(conn: Connection): boolean {
  return (
    POWER_PINS_COMPONENT.includes(conn.pin.toLowerCase()) ||
    POWER_PINS_ARDUINO.includes(conn.arduinoPin.toLowerCase())
  )
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

// ===== UTILITY EXPORTS =====
export function pinToNumber(pin: string): string {
  if (pin.startsWith('D')) return pin.slice(1)
  return pin
}

export function safeVarName(label: string): string {
  return label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
}

/**
 * Formats a value for use inside Serial.println / lcd.print / oled.print.
 * - If the value contains `+` or variable references (no surrounding quotes), treat as C++ expression and pass through.
 * - If the value is a plain string without quotes, wrap it in double quotes.
 * - If it already has proper double quotes, return as-is.
 * - If it uses single quotes, convert to double quotes.
 */
export function formatStringLiteral(str: string): string {
  if (!str) return '""'

  const trimmed = str.trim()

  // Already properly quoted — pass through
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
  }

  // Single-quoted string → convert to double quotes
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return `"${trimmed.slice(1, -1)}"`
  }

  // Check if it's a numeric literal (int or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed
  }

  // Check if it's a boolean literal
  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed
  }

  // Plain word/identifier (variable reference)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed
  }

  // Contains operators, parentheses or member access (treat as expression)
  // e.g. temp + 5, analogRead(A0), String(val)
  if (/[\+\-\*\/\(\)\.]/.test(trimmed)) {
    return trimmed
  }

  // Default fallback: wrap string literals in double quotes
  return `"${trimmed}"`
}

export function parsePrintArguments(str: string): string[] {
  if (!str) return []
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if ((char === '"' || char === "'") && (i === 0 || str[i-1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      current += char
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) {
    parts.push(current.trim())
  }
  return parts.filter(p => p !== '')
}

export function generateSerialPrintLines(rawString: string, pad: string): string[] {
  const args = parsePrintArguments(rawString)
  if (args.length === 0) return [`${pad}Serial.println("");`]
  if (args.length === 1) return [`${pad}Serial.println(${formatStringLiteral(args[0])});`]

  const lines: string[] = []
  for (let i = 0; i < args.length; i++) {
    const formatted = formatStringLiteral(args[i])
    const method = i === args.length - 1 ? 'println' : 'print'
    lines.push(`${pad}Serial.${method}(${formatted});`)
  }
  return lines
}

// ===== VARIABLE TRACKING =====
/**
 * Collects all variables that are explicitly declared by 'variable' nodes in the flow.
 * Used to avoid re-declaring variables that sensor nodes also output.
 */
export function getDefinedVariables(flowNodes: Node[]): Set<string> {
  const vars = new Set<string>()
  flowNodes.forEach(node => {
    const d = node.data as any
    if (d?.nodeType === 'variable' && d?.params?.name) {
      vars.add(d.params.name)
    }
  })
  return vars
}

/**
 * Collects ALL variable names that will be declared anywhere in the flow,
 * including sensor output variables. Used to prevent duplicate declarations
 * when the same variable name appears in multiple nodes.
 */
function getAllDeclaredVars(flowNodes: Node[]): Set<string> {
  const vars = new Set<string>()
  flowNodes.forEach(node => {
    const d = node.data as any
    const t = d?.nodeType
    const p = d?.params || {}
    if (t === 'variable' && p.name) vars.add(p.name)
    if (t === 'dht') { vars.add(p.varTemp || 'temp'); vars.add(p.varHum || 'hum') }
    if (t === 'ultrasonic') vars.add(p.varDist || 'distance')
    if (t === 'pir') vars.add(p.varMotion || 'motion')
    if (t === 'ldr') vars.add(p.varLight || 'lightVal')
    if (t === 'sensor') vars.add(p.var || 'sensorVal')
    if (t === 'ir') vars.add(p.varObstacle || 'obstacle')
    if (t === 'flame') vars.add(p.varFlame || 'flameVal')
    if (t === 'soilMoisture') vars.add(p.varMoisture || 'moisture')
    if (t === 'waterLevel') vars.add(p.varLevel || 'waterLevel')
    if (t === 'mqGas') vars.add(p.varGas || 'gasVal')
    if (t === 'vibration') vars.add(p.varVib || 'vibration')
  })
  return vars
}

// ===== COMPONENT LOOKUP HELPERS =====
export function getComponentVarName(typeKeyword: string, connections: Connection[], defaultName: string): string {
  const conn = connections.find(c => c.componentLabel.toLowerCase().includes(typeKeyword.toLowerCase()))
  if (conn) return safeVarName(conn.componentLabel)
  return defaultName
}

export function getComponentPin(typeKeyword: string, connections: Connection[], defaultPin: string): string {
  const conn = connections.find(c => c.componentLabel.toLowerCase().includes(typeKeyword.toLowerCase()))
  if (conn) return pinToNumber(conn.arduinoPin)
  return defaultPin
}

export function getComponentPinForPort(typeKeyword: string, portName: string, connections: Connection[], defaultPin: string): string {
  const conn = connections.find(c =>
    c.componentLabel.toLowerCase().includes(typeKeyword.toLowerCase()) &&
    c.pin.toLowerCase() === portName.toLowerCase()
  )
  if (conn) return pinToNumber(conn.arduinoPin)
  return defaultPin
}

// ===== INCLUDES =====
function generateIncludes(connections: Connection[], flowNodes: Node[]): string {
  const includes = new Set<string>()
  const labels = connections.map(c => c.componentLabel)

  const hasSchemaOrFlow = (keyword: string, flowType: string) => {
    return labels.some(l => l.toLowerCase().includes(keyword.toLowerCase())) ||
      flowNodes.some(n => (n.data as any)?.nodeType === flowType)
  }

  if (hasSchemaOrFlow('DHT', 'dht')) includes.add('#include <DHT.h>')
  if (hasSchemaOrFlow('Servo', 'servo')) includes.add('#include <Servo.h>')
  if (hasSchemaOrFlow('LCD', 'lcd')) { includes.add('#include <Wire.h>'); includes.add('#include <LiquidCrystal_I2C.h>') }
  if (hasSchemaOrFlow('OLED', 'oled')) { includes.add('#include <Wire.h>'); includes.add('#include <Adafruit_SSD1306.h>') }
  if (hasSchemaOrFlow('Bluetooth', 'bluetooth')) includes.add('#include <SoftwareSerial.h>')

  return Array.from(includes).join('\n')
}

// ===== DEFINES =====
function generateDefines(connections: Connection[]): string {
  const lines: string[] = []
  const seen = new Set<string>()

  connections.forEach(conn => {
    if (isPowerPin(conn)) return

    const key = `${conn.componentId}_${conn.pin}`
    if (seen.has(key)) return
    seen.add(key)

    const pinNum = pinToNumber(conn.arduinoPin)
    const name = conn.componentLabel.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
    const pinName = conn.pin.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
    lines.push(`#define ${name}_${pinName} ${pinNum}`)
  })

  return lines.join('\n')
}

// ===== GLOBAL DECLARATIONS =====
function generateGlobals(connections: Connection[], flowNodes: Node[]): string {
  const lines: string[] = []
  const seen = new Set<string>()

  // From schematic connections
  connections.forEach(conn => {
    if (isPowerPin(conn)) return

    const label = conn.componentLabel
    const varName = safeVarName(label)
    if (seen.has(varName)) return
    seen.add(varName)

    if (label.includes('DHT22')) {
      lines.push(`DHT ${varName}(${pinToNumber(conn.arduinoPin)}, DHT22);`)
    } else if (label.includes('DHT11') || (label.includes('DHT') && !label.includes('DHT22'))) {
      lines.push(`DHT ${varName}(${pinToNumber(conn.arduinoPin)}, DHT11);`)
    } else if (label.includes('Servo')) {
      lines.push(`Servo ${varName};`)
    } else if (label.includes('LCD')) {
      lines.push(`LiquidCrystal_I2C ${varName}(0x27, 16, 2);`)
    } else if (label.includes('OLED')) {
      lines.push(`Adafruit_SSD1306 ${varName}(128, 64, &Wire, -1);`)
    }
  })

  // From flow nodes (fallback when no schematic component exists)
  flowNodes.forEach(node => {
    const d = node.data as any
    const type = d?.nodeType
    if (type === 'dht' && !seen.has('dht_sensor')) {
      if (!connections.some(c => c.componentLabel.includes('DHT'))) {
        lines.push(`DHT dht_sensor(${d?.params?.pin || '2'}, DHT11);`)
        seen.add('dht_sensor')
      }
    }
    if (type === 'servo' && !seen.has('my_servo')) {
      if (!connections.some(c => c.componentLabel.includes('Servo'))) {
        lines.push(`Servo my_servo;`)
        seen.add('my_servo')
      }
    }
    if (type === 'lcd' && !seen.has('lcd_display')) {
      if (!connections.some(c => c.componentLabel.includes('LCD'))) {
        lines.push(`LiquidCrystal_I2C lcd_display(0x27, 16, 2);`)
        seen.add('lcd_display')
      }
    }
    if (type === 'oled' && !seen.has('oled_display')) {
      if (!connections.some(c => c.componentLabel.includes('OLED'))) {
        lines.push(`Adafruit_SSD1306 oled_display(128, 64, &Wire, -1);`)
        seen.add('oled_display')
      }
    }
  })

  return lines.join('\n')
}

// ===== SETUP =====
function generateSetup(connections: Connection[], flowNodes: Node[]): string {
  const lines: string[] = ['  Serial.begin(9600);']
  const seen = new Set<string>()

  connections.forEach(conn => {
    if (isPowerPin(conn)) return

    const label = conn.componentLabel
    const varName = safeVarName(label)
    const pinNum = pinToNumber(conn.arduinoPin)
    const key = `${conn.componentId}_${conn.pin}`
    if (seen.has(key)) return
    seen.add(key)

    const setupKey = `${conn.componentId}_setup`

    if (label.includes('LED') || label.includes('Buzzer') || label.includes('Relay')) {
      if (['anode', 'pos', 'in', 'signal'].includes(conn.pin)) {
        lines.push(`  pinMode(${pinNum}, OUTPUT); // ${label}`)
      }
    } else if (label.includes('Button')) {
      lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
    } else if (label.includes('PIR')) {
      lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
    } else if (label.includes('LDR')) {
      lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
    } else if (label.includes('IR') || label.includes('Flame') || label.includes('Soil') || label.includes('Water') || label.includes('Gas') || label.includes('Vibration')) {
      if (['out', 'do', 'ao', 'digital', 'analog', 'signal', 'pin1', 'pin2'].includes(conn.pin.toLowerCase())) {
        lines.push(`  pinMode(${pinNum}, INPUT); // ${label}`)
      }
    } else if ((label.includes('L298N') || label.includes('L293D')) && !['gnd', 'vcc', '5v', 'vcc1', 'vcc2', 'out1', 'out2', 'out3', 'out4'].includes(conn.pin.toLowerCase())) {
      lines.push(`  pinMode(${pinNum}, OUTPUT); // ${label} ${conn.pin.toUpperCase()}`)
    } else if (label.includes('Ultrasonic')) {
      if (conn.pin === 'trig') lines.push(`  pinMode(${pinNum}, OUTPUT); // HC-SR04 TRIG`)
      if (conn.pin === 'echo') lines.push(`  pinMode(${pinNum}, INPUT);  // HC-SR04 ECHO`)
    } else if (label.includes('DC Motor')) {
      lines.push(`  pinMode(${pinNum}, OUTPUT); // DC Motor`)
    } else if (label.includes('Servo') && !seen.has(setupKey)) {
      seen.add(setupKey)
      lines.push(`  ${varName}.attach(${pinNum});`)
    } else if (label.includes('DHT') && !seen.has(setupKey)) {
      seen.add(setupKey)
      lines.push(`  ${varName}.begin();`)
    } else if (label.includes('LCD') && !seen.has(setupKey)) {
      seen.add(setupKey)
      lines.push(`  ${varName}.init();`)
      lines.push(`  ${varName}.backlight();`)
    } else if (label.includes('OLED') && !seen.has(setupKey)) {
      seen.add(setupKey)
      lines.push(`  ${varName}.begin(SSD1306_SWITCHCAPVCC, 0x3C);`)
      lines.push(`  ${varName}.clearDisplay();`)
    }
  })

  // Fallback from flow nodes when no schematic component
  const flowSeen = new Set<string>()
  flowNodes.forEach(node => {
    const d = node.data as any
    const type = d?.nodeType
    const p = d?.params || {}

    if (type === 'dht' && !flowSeen.has('dht') && !connections.some(c => c.componentLabel.includes('DHT'))) {
      flowSeen.add('dht')
      lines.push(`  dht_sensor.begin();`)
    }
    if (type === 'servo' && !flowSeen.has('servo') && !connections.some(c => c.componentLabel.includes('Servo'))) {
      flowSeen.add('servo')
      lines.push(`  my_servo.attach(${p.pin || '9'});`)
    }
    if (type === 'lcd' && !flowSeen.has('lcd') && !connections.some(c => c.componentLabel.includes('LCD'))) {
      flowSeen.add('lcd')
      lines.push(`  lcd_display.init();`)
      lines.push(`  lcd_display.backlight();`)
    }
    if (type === 'oled' && !flowSeen.has('oled') && !connections.some(c => c.componentLabel.includes('OLED'))) {
      flowSeen.add('oled')
      lines.push(`  oled_display.begin(SSD1306_SWITCHCAPVCC, 0x3C);`)
      lines.push(`  oled_display.clearDisplay();`)
    }
    if (type === 'ultrasonic' && !flowSeen.has('ultrasonic') && !connections.some(c => c.componentLabel.includes('Ultrasonic'))) {
      flowSeen.add('ultrasonic')
      lines.push(`  pinMode(${p.trigPin || '9'}, OUTPUT); // Ultrasonic TRIG`)
      lines.push(`  pinMode(${p.echoPin || '10'}, INPUT);  // Ultrasonic ECHO`)
    }
    if (type === 'pir' && !flowSeen.has('pir') && !connections.some(c => c.componentLabel.includes('PIR'))) {
      flowSeen.add('pir')
      lines.push(`  pinMode(${p.pin || '3'}, INPUT); // PIR Sensor`)
    }
    if (type === 'ldr' && !flowSeen.has('ldr') && !connections.some(c => c.componentLabel.includes('LDR'))) {
      flowSeen.add('ldr')
      lines.push(`  pinMode(${p.pin || 'A0'}, INPUT); // LDR Sensor`)
    }
    if (type === 'ir' && !flowSeen.has('ir') && !connections.some(c => c.componentLabel.includes('IR'))) {
      flowSeen.add('ir')
      lines.push(`  pinMode(${p.pin || '3'}, INPUT); // IR Sensor`)
    }
    if (type === 'flame' && !flowSeen.has('flame') && !connections.some(c => c.componentLabel.includes('Flame'))) {
      flowSeen.add('flame')
      lines.push(`  pinMode(${p.pin || '4'}, INPUT); // Flame Sensor`)
    }
    if (type === 'soilMoisture' && !flowSeen.has('soilMoisture') && !connections.some(c => c.componentLabel.includes('Soil'))) {
      flowSeen.add('soilMoisture')
      lines.push(`  pinMode(${p.pin || 'A1'}, INPUT); // Soil Moisture Sensor`)
    }
    if (type === 'waterLevel' && !flowSeen.has('waterLevel') && !connections.some(c => c.componentLabel.includes('Water'))) {
      flowSeen.add('waterLevel')
      lines.push(`  pinMode(${p.pin || 'A2'}, INPUT); // Water Level Sensor`)
    }
    if (type === 'mqGas' && !flowSeen.has('mqGas') && !connections.some(c => c.componentLabel.includes('Gas'))) {
      flowSeen.add('mqGas')
      lines.push(`  pinMode(${p.pin || 'A3'}, INPUT); // MQ Gas Sensor`)
    }
    if (type === 'vibration' && !flowSeen.has('vibration') && !connections.some(c => c.componentLabel.includes('Vibration'))) {
      flowSeen.add('vibration')
      lines.push(`  pinMode(${p.pin || '5'}, INPUT); // Vibration Sensor`)
    }
    if (type === 'l298n' && !flowSeen.has('l298n') && !connections.some(c => c.componentLabel.includes('L298N'))) {
      flowSeen.add('l298n')
      lines.push(`  pinMode(9, OUTPUT);  // L298N ENA`)
      lines.push(`  pinMode(8, OUTPUT);  // L298N IN1`)
      lines.push(`  pinMode(7, OUTPUT);  // L298N IN2`)
      lines.push(`  pinMode(10, OUTPUT); // L298N ENB`)
      lines.push(`  pinMode(5, OUTPUT);  // L298N IN3`)
      lines.push(`  pinMode(6, OUTPUT);  // L298N IN4`)
    }
    if (type === 'l293d' && !flowSeen.has('l293d') && !connections.some(c => c.componentLabel.includes('L293D'))) {
      flowSeen.add('l293d')
      lines.push(`  pinMode(9, OUTPUT);  // L293D EN1`)
      lines.push(`  pinMode(8, OUTPUT);  // L293D IN1`)
      lines.push(`  pinMode(7, OUTPUT);  // L293D IN2`)
      lines.push(`  pinMode(10, OUTPUT); // L293D EN2`)
      lines.push(`  pinMode(5, OUTPUT);  // L293D IN3`)
      lines.push(`  pinMode(6, OUTPUT);  // L293D IN4`)
    }
  })

  return lines.join('\n')
}

// ===== RECURSIVE FLOW CODEGEN =====
function getArgumentNames(argsStr: string): string[] {
  if (!argsStr) return []
  return argsStr.split(',').map(part => {
    const trimmed = part.trim()
    const matches = trimmed.match(/(\w+)$/)
    return matches ? matches[1] : ''
  }).filter(Boolean)
}

function findFunctionNode(
  nodeId: string,
  flowNodes: Node[],
  subFlows: Record<string, any>
): Node | null {
  let found = flowNodes.find(n => n.id === nodeId)
  if (found) return found

  for (const sfId of Object.keys(subFlows)) {
    found = subFlows[sfId].nodes.find((n: any) => n.id === nodeId)
    if (found) return found
  }
  return null
}

function generateNodeCode(
  nodeId: string,
  flowNodes: Node[],
  flowEdges: Edge[],
  visited: Set<string>,
  indent: number,
  connections: Connection[],
  declaredVars: Set<string>,
  isSubFlow?: boolean,
  returnType?: string
): string {
  if (visited.has(nodeId)) return ''
  visited.add(nodeId)

  const node = flowNodes.find(n => n.id === nodeId)
  if (!node) return ''

  const data = node.data as any
  const pad = '  '.repeat(indent)
  const lines: string[] = []

  // Follow a specific named output port
  const followPort = (port: string) => {
    const edge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === port)
    if (!edge) return ''
    return generateNodeCode(edge.target, flowNodes, flowEdges, visited, indent, connections, declaredVars, isSubFlow, returnType)
  }

  // Follow ALL edges from the 'flow' output handle sequentially
  const followFlow = () => {
    const edges = flowEdges.filter(e => e.source === nodeId && e.sourceHandle === 'flow')
    if (edges.length === 0) return ''
    const results: string[] = []
    for (const edge of edges) {
      const code = generateNodeCode(edge.target, flowNodes, flowEdges, visited, indent, connections, declaredVars, isSubFlow, returnType)
      if (code) results.push(code)
    }
    return results.join('\n')
  }

  switch (data.nodeType) {
    case 'start':
      lines.push(followFlow())
      break

    case 'end':
      if (isSubFlow) {
        if (returnType && returnType !== 'void') {
          const retVal = data.params?.value || '0'
          lines.push(`${pad}return ${retVal};`)
        } else {
          lines.push(`${pad}return;`)
        }
      }
      break

    case 'variable': {
      const varName = data.params?.name || 'x'
      const varValue = data.params?.value || '0'
      // Detect type: if value looks like a float, declare as float
      const varType = varValue.includes('.') ? 'float' : 'int'
      if (declaredVars.has(varName)) {
        lines.push(`${pad}${varName} = ${varValue};`)
      } else {
        lines.push(`${pad}${varType} ${varName} = ${varValue};`)
        declaredVars.add(varName)
      }
      lines.push(followFlow())
      break
    }

    case 'print': {
      const printLines = generateSerialPrintLines(data.params?.message || '', pad)
      lines.push(...printLines)
      lines.push(followFlow())
      break
    }

    case 'input': {
      const varName = data.params?.var || 'val'
      const promptLines = generateSerialPrintLines(data.params?.prompt || '', pad)
      lines.push(...promptLines)
      lines.push(`${pad}while (!Serial.available()) {}`)
      if (!declaredVars.has(varName)) {
        lines.push(`${pad}int ${varName} = Serial.parseInt();`)
        declaredVars.add(varName)
      } else {
        lines.push(`${pad}${varName} = Serial.parseInt();`)
      }
      lines.push(followFlow())
      break
    }

    case 'condition': {
      const cond = data.params?.condition || 'true'
      lines.push(`${pad}if (${cond}) {`)

      const trueEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'true')
      if (trueEdge) {
        const trueVisited = new Set(visited)
        lines.push(generateNodeCode(trueEdge.target, flowNodes, flowEdges, trueVisited, indent + 1, connections, declaredVars, isSubFlow, returnType))
      }

      // Only emit else block if there's a false branch connected
      const falseEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'false')
      if (falseEdge) {
        lines.push(`${pad}} else {`)
        const falseVisited = new Set(visited)
        lines.push(generateNodeCode(falseEdge.target, flowNodes, flowEdges, falseVisited, indent + 1, connections, declaredVars, isSubFlow, returnType))
      }

      lines.push(`${pad}}`)

      // Continue after condition block converges
      const doneEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'flow')
      if (doneEdge) {
        lines.push(generateNodeCode(doneEdge.target, flowNodes, flowEdges, visited, indent, connections, declaredVars, isSubFlow, returnType))
      }
      break
    }

    case 'loop': {
      const v = data.params?.var || 'i'
      const from = data.params?.from || '0'
      const to = data.params?.to || '10'
      const step = data.params?.step || '1'
      lines.push(`${pad}for (int ${v} = ${from}; ${v} < ${to}; ${v} += ${step}) {`)

      const bodyEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'body')
      if (bodyEdge) {
        const bodyVisited = new Set(visited)
        lines.push(generateNodeCode(bodyEdge.target, flowNodes, flowEdges, bodyVisited, indent + 1, connections, declaredVars, isSubFlow, returnType))
      }

      lines.push(`${pad}}`)

      const doneEdge = flowEdges.find(e => e.source === nodeId && e.sourceHandle === 'done')
      if (doneEdge) {
        lines.push(generateNodeCode(doneEdge.target, flowNodes, flowEdges, visited, indent, connections, declaredVars, isSubFlow, returnType))
      }
      break
    }

    case 'delay':
      lines.push(`${pad}delay(${data.params?.ms || '1000'});`)
      lines.push(followFlow())
      break

    case 'gpio': {
      const gpioPin = data.params?.pin || '13'
      lines.push(`${pad}digitalWrite(${gpioPin}, ${data.params?.value || 'HIGH'});`)
      lines.push(followFlow())
      break
    }

    case 'sensor': {
      const sensorVar = data.params?.var || 'sensorVal'
      const sensorPin = data.params?.pin || 'A0'
      if (declaredVars.has(sensorVar)) {
        lines.push(`${pad}${sensorVar} = analogRead(${sensorPin});`)
      } else {
        lines.push(`${pad}int ${sensorVar} = analogRead(${sensorPin});`)
        declaredVars.add(sensorVar)
      }
      lines.push(followFlow())
      break
    }

    case 'dht': {
      lines.push(generateDHTCode(data, connections, declaredVars, pad))
      const dhtVarT = data.params?.varTemp || 'temp'
      const dhtVarH = data.params?.varHum || 'hum'
      declaredVars.add(dhtVarT)
      declaredVars.add(dhtVarH)
      lines.push(followFlow())
      break
    }

    case 'ultrasonic': {
      lines.push(generateUltrasonicCode(data, nodeId, connections, declaredVars, pad))
      declaredVars.add(data.params?.varDist || 'distance')
      lines.push(followFlow())
      break
    }

    case 'pir': {
      lines.push(generatePIRCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varMotion || 'motion')
      lines.push(followFlow())
      break
    }

    case 'ldr': {
      lines.push(generateLDRCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varLight || 'lightVal')
      lines.push(followFlow())
      break
    }

    case 'ir': {
      lines.push(generateIRCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varObstacle || 'obstacle')
      lines.push(followFlow())
      break
    }

    case 'flame': {
      lines.push(generateFlameCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varFlame || 'flameVal')
      lines.push(followFlow())
      break
    }

    case 'soilMoisture': {
      lines.push(generateSoilMoistureCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varMoisture || 'moisture')
      lines.push(followFlow())
      break
    }

    case 'waterLevel': {
      lines.push(generateWaterLevelCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varLevel || 'waterLevel')
      lines.push(followFlow())
      break
    }

    case 'mqGas': {
      lines.push(generateMQGasCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varGas || 'gasVal')
      lines.push(followFlow())
      break
    }

    case 'vibration': {
      lines.push(generateVibrationCode(data, connections, declaredVars, pad))
      declaredVars.add(data.params?.varVib || 'vibration')
      lines.push(followFlow())
      break
    }

    case 'l298n': {
      lines.push(generateL298NCode(data, connections, pad))
      lines.push(followFlow())
      break
    }

    case 'l293d': {
      lines.push(generateL293DCode(data, connections, pad))
      lines.push(followFlow())
      break
    }

    case 'servo':
      lines.push(generateServoCode(data, connections, pad))
      lines.push(followFlow())
      break

    case 'lcd':
      lines.push(generateLCDCode(data, connections, pad))
      lines.push(followFlow())
      break

    case 'oled':
      lines.push(generateOLEDCode(data, connections, pad))
      lines.push(followFlow())
      break

    case 'function': {
      const fnName = data.params?.name || 'myFn'
      const returnTypeParam = data.params?.returnType || 'void'
      const argValues = data.params?.argValues || ''
      const assignTo = data.params?.assignTo || ''

      let callCode = `${fnName}(${argValues});`
      if (returnTypeParam !== 'void' && assignTo) {
        if (declaredVars.has(assignTo)) {
          callCode = `${assignTo} = ${fnName}(${argValues});`
        } else {
          callCode = `${returnTypeParam} ${assignTo} = ${fnName}(${argValues});`
          declaredVars.add(assignTo)
        }
      }
      lines.push(`${pad}${callCode}`)
      lines.push(followFlow())
      break
    }

    case 'api':
      lines.push(`${pad}// HTTP API: ${data.params?.method || 'GET'} ${data.params?.url || ''}`)
      lines.push(followFlow())
      break

    default:
      lines.push(followFlow())
  }

  return lines.filter(l => l !== '').join('\n')
}

// ===== FLOW ENTRY POINT =====
function generateFlowCode(flowNodes: Node[], flowEdges: Edge[], connections: Connection[]): string {
  const startNode = flowNodes.find(n => (n.data as any).nodeType === 'start')
  if (!startNode) return '  // No flow defined yet'

  const visited = new Set<string>()
  const declaredVars = new Set<string>()
  const code = generateNodeCode(startNode.id, flowNodes, flowEdges, visited, 1, connections, declaredVars)
  return code || '  // Empty flow'
}

export function generateFunctionCode(
  fnNode: Node,
  subFlow: { nodes: Node[]; edges: Edge[] },
  connections: Connection[]
): string {
  const data = fnNode.data as any
  const fnName = data.params?.name || 'myFn'
  const returnType = data.params?.returnType || 'void'
  const args = data.params?.arguments || ''

  const startNode = subFlow.nodes.find(n => (n.data as any).nodeType === 'start')
  if (!startNode) return `// Empty function ${fnName}`

  const visited = new Set<string>()
  const declaredVars = new Set<string>(getArgumentNames(args))
  
  const bodyCode = generateNodeCode(
    startNode.id,
    subFlow.nodes,
    subFlow.edges,
    visited,
    1,
    connections,
    declaredVars,
    true,        // isSubFlow = true
    returnType   // returnType
  )

  return [
    `${returnType} ${fnName}(${args}) {`,
    bodyCode || '  // Empty body',
    `}`
  ].join('\n')
}

// ===== MAIN EXPORT =====
export function generateArduinoCode(
  schemaNodes: Node[],
  schemaEdges: Edge[],
  flowNodes: Node[],
  flowEdges: Edge[],
  subFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {}
): { main: string; files: Record<string, string> } {
  // Reset module-level counters for clean variable naming
  resetUltrasonicCounter()

  const connections = parseConnections(schemaNodes, schemaEdges)
  const includes = generateIncludes(connections, flowNodes)
  const defines = generateDefines(connections)
  const globals = generateGlobals(connections, flowNodes)
  const setupCode = generateSetup(connections, flowNodes)
  const flowCode = generateFlowCode(flowNodes, flowEdges, connections)

  // Compile sub-flows (functions)
  const functionPrototypes: string[] = []
  const functionFiles: Record<string, string> = {}
  const selfContainedFunctions: string[] = []

  Object.entries(subFlows).forEach(([nodeId, subFlow]) => {
    const fnNode = findFunctionNode(nodeId, flowNodes, subFlows)
    if (!fnNode) return

    const data = fnNode.data as any
    const fnName = data.params?.name || 'myFn'
    const returnType = data.params?.returnType || 'void'
    const args = data.params?.arguments || ''

    // Add function prototype
    functionPrototypes.push(`${returnType} ${fnName}(${args});`)

    // Compile function body
    const fileCode = generateFunctionCode(fnNode, subFlow, connections)
    functionFiles[`${fnName}.ino`] = fileCode
    selfContainedFunctions.push(fileCode)
  })

  const componentSummary = [...new Set(connections.map(c => c.componentLabel))]
    .map(l => ` *   - ${l}`)
    .join('\n')

  // Build output, skipping empty sections
  const sections: string[] = [
    `/*`,
    ` * Generated by Flow Programmer`,
    ` * Platform: Arduino Uno`,
    ` * Components:`,
    componentSummary || ` *   (none connected)`,
    ` */`,
  ]

  if (includes) {
    sections.push('', includes)
  }

  if (defines) {
    sections.push('', `// Pin Definitions`, defines)
  }

  if (globals) {
    sections.push('', `// Global Instances`, globals)
  }

  if (functionPrototypes.length > 0) {
    sections.push('', `// Function Prototypes`, functionPrototypes.join('\n'))
  }

  sections.push(
    '',
    `void setup() {`,
    setupCode,
    `}`,
    '',
    `void loop() {`,
    flowCode,
    `}`,
  )

  if (selfContainedFunctions.length > 0) {
    sections.push('', `// Function Definitions`, selfContainedFunctions.join('\n\n'))
  }

  return {
    main: sections.join('\n'),
    files: functionFiles
  }
}