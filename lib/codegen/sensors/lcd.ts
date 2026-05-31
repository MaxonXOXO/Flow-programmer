import { getComponentVarName, Connection, formatStringLiteral, parsePrintArguments } from '../generateArduino'

export function generateLCDCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const lcdName = getComponentVarName('LCD', connections, 'lcd_display')
  const rawText = data.params?.text || ''
  const row = data.params?.row || '0'
  const col = data.params?.col || '0'

  const args = parsePrintArguments(rawText)
  const lines: string[] = [`${pad}${lcdName}.setCursor(${col}, ${row});`]
  if (args.length === 0) {
    lines.push(`${pad}${lcdName}.print("");`)
  } else {
    args.forEach(arg => {
      lines.push(`${pad}${lcdName}.print(${formatStringLiteral(arg)});`)
    })
  }

  return lines.join('\n')
}
