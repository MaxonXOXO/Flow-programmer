import { getComponentPin, Connection } from '../generateArduino'

export function generateSoilMoistureCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('Soil', connections, data.params?.pin || 'A1')
  const varMoisture = data.params?.varMoisture || 'moisture'
  const variant = data.params?.variant || 'Active Low'
  const decl = declaredVars.has(varMoisture) ? '' : 'int '

  const readExpr = pin.startsWith('A') 
    ? `analogRead(${pin})` 
    : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`)

  return `${pad}${decl}${varMoisture} = ${readExpr};`
}
