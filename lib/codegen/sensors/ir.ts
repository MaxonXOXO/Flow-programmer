import { getComponentPin, Connection } from '../generateArduino'

export function generateIRCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('IR', connections, data.params?.pin || '3')
  const varObstacle = data.params?.varObstacle || 'obstacle'
  const variant = data.params?.variant || 'Active Low'
  const decl = declaredVars.has(varObstacle) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varObstacle} = ${readExpr};`
}
