import { getComponentPin, Connection } from '../generateArduino'

export function generateMQGasCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('Gas', connections, data.params?.pin || 'A3')
  const varGas = data.params?.varGas || 'gasVal'
  const variant = data.params?.variant || 'Active Low'
  const decl = declaredVars.has(varGas) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varGas} = ${readExpr};`
}
