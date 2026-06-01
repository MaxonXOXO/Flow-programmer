import { getComponentPin, Connection } from '../generateArduino'

export function generateWaterLevelCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('Water', connections, data.params?.pin || 'A2')
  const varLevel = data.params?.varLevel || 'waterLevel'
  const variant = data.params?.variant || 'Active High'
  const decl = declaredVars.has(varLevel) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varLevel} = ${readExpr};`
}
