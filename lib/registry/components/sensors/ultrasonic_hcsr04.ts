import { PackageDefinition } from '../types';
import ultrasonicFlowJson from '../../../../flow-packages/ultrasonic_hcsr04.flow.json';

const ULTRASONIC_SUBFLOW_GRAPH = {
  entry: (ultrasonicFlowJson as any).entry || 'trig_low_1',
  exit: (ultrasonicFlowJson as any).exit || 'return_distance',
  nodes: (ultrasonicFlowJson as any).nodes || [],
  edges: (ultrasonicFlowJson as any).edges || [],
};

export const UltrasonicHCSR04Package: PackageDefinition = {
  id: 'ultrasonic_hcsr04',
  version: '1.0.0',

  metadata: {
    id: 'ultrasonic_hcsr04',
    name: 'Ultrasonic HC-SR04',
    description: 'Ultrasonic distance sensor — measures distance via echo timing',
    category: 'sensor',
    icon: '📡',
    tags: ['distance', 'ultrasonic', 'hcsr04'],
  },

  pins: [
    { id: 'vcc',  label: 'VCC',  signal: 'power',          required: true },
    { id: 'trig', label: 'TRIG', signal: 'digital_input',  required: true },
    { id: 'echo', label: 'ECHO', signal: 'digital_output', required: true },
    { id: 'gnd',  label: 'GND',  signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'distance', label: 'Distance', type: 'float', description: 'Measured distance in centimetres' },
  ],

  properties: [
    {
      id: 'trigPin',
      label: 'Trigger Pin',
      type: 'pin',
      defaultValue: '',
      description: 'Arduino pin connected to the TRIG pin of the sensor',
    },
    {
      id: 'echoPin',
      label: 'Echo Pin',
      type: 'pin',
      defaultValue: '',
      description: 'Arduino pin connected to the ECHO pin of the sensor',
    },
  ],

  dependencies: {
    includes: [],
    globals:  [],
    setup: [
      'pinMode($trig, OUTPUT);',
      'pinMode($echo, INPUT);',
    ],
  },

  implementations: {
    arduino_uno: {
      strategy: 'graph',
      version: 1,
      entry: ULTRASONIC_SUBFLOW_GRAPH.entry,
      exit: ULTRASONIC_SUBFLOW_GRAPH.exit,
      graph: ULTRASONIC_SUBFLOW_GRAPH,
      subflow: ULTRASONIC_SUBFLOW_GRAPH,
    },
    esp32_arduino: {
      strategy: 'graph',
      version: 1,
      entry: ULTRASONIC_SUBFLOW_GRAPH.entry,
      exit: ULTRASONIC_SUBFLOW_GRAPH.exit,
      graph: ULTRASONIC_SUBFLOW_GRAPH,
      subflow: ULTRASONIC_SUBFLOW_GRAPH,
    },
    generic: {
      strategy: 'graph',
      version: 1,
      entry: ULTRASONIC_SUBFLOW_GRAPH.entry,
      exit: ULTRASONIC_SUBFLOW_GRAPH.exit,
      graph: ULTRASONIC_SUBFLOW_GRAPH,
      subflow: ULTRASONIC_SUBFLOW_GRAPH,
    },
  },

  implementation: {
    strategy: 'graph',
    version: 1,
    entry: ULTRASONIC_SUBFLOW_GRAPH.entry,
    exit: ULTRASONIC_SUBFLOW_GRAPH.exit,
    graph: ULTRASONIC_SUBFLOW_GRAPH,
    subflow: ULTRASONIC_SUBFLOW_GRAPH,
  },
};
