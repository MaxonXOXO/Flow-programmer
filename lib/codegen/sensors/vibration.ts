import { getComponentPin, Connection } from '../generateArduino'

export function generateVibrationCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('Vibration', connections, data.params?.pin || '5')
  const varVib = data.params?.varVib || 'vibration'
  const variant = data.params?.variant || 'Active Low'
  const decl = declaredVars.has(varVib) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varVib} = ${readExpr};`
}
