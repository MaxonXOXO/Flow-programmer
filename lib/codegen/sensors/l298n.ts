import { getComponentPinForPort, Connection } from '../generateArduino'

export function generateL298NCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const motor = data.params?.motor || 'Motor A'
  const direction = data.params?.direction || 'Forward'
  const speed = data.params?.speed || '255'

  const isMotorA = motor === 'Motor A'
  const enPin = isMotorA 
    ? getComponentPinForPort('L298N', 'ena', connections, '9')
    : getComponentPinForPort('L298N', 'enb', connections, '10')
  const in1Pin = isMotorA
    ? getComponentPinForPort('L298N', 'in1', connections, '8')
    : getComponentPinForPort('L298N', 'in3', connections, '5')
  const in2Pin = isMotorA
    ? getComponentPinForPort('L298N', 'in2', connections, '7')
    : getComponentPinForPort('L298N', 'in4', connections, '6')

  const lines: string[] = []
  if (direction === 'Forward') {
    lines.push(`${pad}digitalWrite(${in1Pin}, HIGH);`)
    lines.push(`${pad}digitalWrite(${in2Pin}, LOW);`)
    lines.push(`${pad}analogWrite(${enPin}, ${speed});`)
  } else if (direction === 'Backward') {
    lines.push(`${pad}digitalWrite(${in1Pin}, LOW);`)
    lines.push(`${pad}digitalWrite(${in2Pin}, HIGH);`)
    lines.push(`${pad}analogWrite(${enPin}, ${speed});`)
  } else {
    // Stop
    lines.push(`${pad}digitalWrite(${in1Pin}, LOW);`)
    lines.push(`${pad}digitalWrite(${in2Pin}, LOW);`)
    lines.push(`${pad}analogWrite(${enPin}, 0);`)
  }

  return lines.join('\n')
}
