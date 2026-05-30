import { getComponentVarName, Connection } from '../generateArduino'

export function generateServoCode(
  data: any,
  connections: Connection[],
  pad: string
): string {
  const servoName = getComponentVarName('Servo', connections, 'my_servo')
  const angle = data.params?.angle || '90'

  return `${pad}${servoName}.write(${angle});`
}
