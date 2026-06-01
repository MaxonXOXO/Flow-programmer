import { getComponentPin, Connection } from '../generateArduino'

export function generateFlameCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('Flame', connections, data.params?.pin || '4')
  const varFlame = data.params?.varFlame || 'flameVal'
  const variant = data.params?.variant || 'Active Low'
  const decl = declaredVars.has(varFlame) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varFlame} = ${readExpr};`
}
