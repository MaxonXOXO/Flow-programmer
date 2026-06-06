import { ArduinoUno, BoardDefinition } from './arduino_uno';

export * from './arduino_uno';

export const boardRegistry: Record<string, BoardDefinition> = {
  arduino_uno: ArduinoUno
};
