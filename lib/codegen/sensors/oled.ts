import { getComponentVarName, Connection, formatStringLiteral, parsePrintArguments } from '../generateArduino'

export function generateOLEDCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const oledName = getComponentVarName('OLED', connections, 'oled_display')
  const rawText = data.params?.text || ''
  const x = data.params?.x || '0'
  const y = data.params?.y || '0'
  const size = data.params?.size || '1'

  const args = parsePrintArguments(rawText)
  const lines: string[] = [
    `${pad}${oledName}.setTextSize(${size});`,
    `${pad}${oledName}.setTextColor(SSD1306_WHITE);`,
    `${pad}${oledName}.setCursor(${x}, ${y});`
  ]

  if (args.length === 0) {
    lines.push(`${pad}${oledName}.print("");`)
  } else {
    args.forEach(arg => {
      lines.push(`${pad}${oledName}.print(${formatStringLiteral(arg)});`)
    })
  }

  lines.push(`${pad}${oledName}.display();`)

  return lines.join('\n')
}
