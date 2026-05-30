import { getComponentVarName, Connection } from '../generateArduino'

export function generateDHTCode(
  data: any,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const dhtName = getComponentVarName('DHT', connections, 'dht_sensor')
  const varTemp = data.params?.varTemp || 'temp'
  const varHum = data.params?.varHum || 'hum'

  const declTemp = declaredVars.has(varTemp) ? '' : 'float '
  const declHum = declaredVars.has(varHum) ? '' : 'float '

  return [
    `${pad}${declTemp}${varTemp} = ${dhtName}.readTemperature();`,
    `${pad}${declHum}${varHum} = ${dhtName}.readHumidity();`
  ].join('\n')
}
