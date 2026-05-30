import { getComponentPin, Connection } from '../generateArduino'

export function generatePIRCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('PIR', connections, data.params?.pin || '3')
  const varMotion = data.params?.varMotion || 'motion'
  const declMotion = declaredVars.has(varMotion) ? '' : 'int '

  return `${pad}${declMotion}${varMotion} = digitalRead(${pin});`
}
