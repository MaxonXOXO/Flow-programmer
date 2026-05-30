import { getComponentVarName, Connection, formatStringLiteral } from '../generateArduino'

export function generateLCDCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const lcdName = getComponentVarName('LCD', connections, 'lcd_display')
  const text = formatStringLiteral(data.params?.text || '')
  const row = data.params?.row || '0'
  const col = data.params?.col || '0'

  return [
    `${pad}${lcdName}.setCursor(${col}, ${row});`,
    `${pad}${lcdName}.print(${text});`
  ].join('\n')
}
