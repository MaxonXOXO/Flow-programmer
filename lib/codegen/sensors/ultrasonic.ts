import { getComponentPinForPort, Connection } from '../generateArduino'

// Module-level counter for unique duration variable names
let ultrasonicCounter = 0

export function resetUltrasonicCounter(): void {
  ultrasonicCounter = 0
}

export function generateUltrasonicCode(
  data: any,
  _nodeId: string,
  connections: Connection[],
  declaredVars: Set<string>,
  pad: string
): string {
  const trig = getComponentPinForPort('Ultrasonic', 'trig', connections, data.params?.trigPin || '9')
  const echo = getComponentPinForPort('Ultrasonic', 'echo', connections, data.params?.echoPin || '10')
  const varDist = data.params?.varDist || 'distance'
  const declDist = declaredVars.has(varDist) ? '' : 'float '

  // Use a clean suffix: first ultrasonic gets no suffix, subsequent ones get _2, _3, etc.
  ultrasonicCounter++
  const suffix = ultrasonicCounter === 1 ? '' : `_${ultrasonicCounter}`
  const durVar = `duration${suffix}`

  return [
    `${pad}digitalWrite(${trig}, LOW);`,
    `${pad}delayMicroseconds(2);`,
    `${pad}digitalWrite(${trig}, HIGH);`,
    `${pad}delayMicroseconds(10);`,
    `${pad}digitalWrite(${trig}, LOW);`,
    `${pad}long ${durVar} = pulseIn(${echo}, HIGH);`,
    `${pad}${declDist}${varDist} = ${durVar} * 0.034 / 2;`
  ].join('\n')
}
