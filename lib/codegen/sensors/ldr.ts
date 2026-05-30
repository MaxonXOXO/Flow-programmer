import { getComponentPin, Connection } from '../generateArduino'

export function generateLDRCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const pin = getComponentPin('LDR', connections, data.params?.pin || 'A0')
  const varLight = data.params?.varLight || 'lightVal'
  const declLight = declaredVars.has(varLight) ? '' : 'int '

  return `${pad}${declLight}${varLight} = analogRead(${pin});`
}
