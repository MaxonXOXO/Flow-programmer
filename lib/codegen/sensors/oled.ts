import { getComponentVarName, Connection, formatStringLiteral } from '../generateArduino'

export function generateOLEDCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const oledName = getComponentVarName('OLED', connections, 'oled_display')
  const text = formatStringLiteral(data.params?.text || '')
  const x = data.params?.x || '0'
  const y = data.params?.y || '0'
  const size = data.params?.size || '1'

  return [
    `${pad}${oledName}.setTextSize(${size});`,
    `${pad}${oledName}.setTextColor(SSD1306_WHITE);`,
    `${pad}${oledName}.setCursor(${x}, ${y});`,
    `${pad}${oledName}.print(${text});`,
    `${pad}${oledName}.display();`
  ].join('\n')
}
