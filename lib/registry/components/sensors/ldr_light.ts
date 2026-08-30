import { PackageDefinition, PackageManifest } from '../types';
import ldrFlowJson from '../../../../flow-packages/ldr_light.flow.json';

const LDR_SUBFLOW_GRAPH = {
  entry: (ldrFlowJson as any).entry || 'read_analog',
  exit: (ldrFlowJson as any).exit || 'return_light',
  nodes: (ldrFlowJson as any).nodes || [],
  edges: (ldrFlowJson as any).edges || [],
};

export const LDRLightPackage: PackageDefinition = {
  metadata: {
    id: 'ldr_light',
    name: 'LDR Light Sensor',
    description: 'Light-dependent resistor — measures ambient light level',
    category: 'sensor',
    icon: '☀️',
    tags: ['light', 'ambient', 'ldr', 'photoresistor'],
  },

  pins: [
    { id: 'pin1', label: 'Pin 1 (Signal)', signal: 'analog_output', required: true },
    { id: 'pin2', label: 'Pin 2 (GND)',    signal: 'ground',        required: true },
  ],

  outputs: [
    { id: 'lightLevel', label: 'Light Level', type: 'int', description: 'Raw analog light level (0–1023 on AVR, 0–4095 on ESP32)' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementations: {
    arduino_uno: {
      strategy: 'graph',
      version: 1,
      entry: LDR_SUBFLOW_GRAPH.entry,
      exit: LDR_SUBFLOW_GRAPH.exit,
      graph: LDR_SUBFLOW_GRAPH,
    },
    esp32_arduino: {
      strategy: 'graph',
      version: 1,
      entry: LDR_SUBFLOW_GRAPH.entry,
      exit: LDR_SUBFLOW_GRAPH.exit,
      graph: LDR_SUBFLOW_GRAPH,
    },
    generic: {
      strategy: 'graph',
      version: 1,
      entry: LDR_SUBFLOW_GRAPH.entry,
      exit: LDR_SUBFLOW_GRAPH.exit,
      graph: LDR_SUBFLOW_GRAPH,
    },
  },

  implementation: {
    strategy: 'graph',
    version: 1,
    graph: LDR_SUBFLOW_GRAPH,
  },
};

export const BasicSensorsManifest: PackageManifest = {
  id: 'foton.sensors.basic',
  name: 'Basic Sensors Package',
  version: '1.0.0',
  description: 'Standard basic sensors collection including LDR light sensor',
  author: 'Flow-IDE Team',
  license: 'MIT',
  tags: ['sensors', 'analog', 'light', 'basic'],
  components: {
    ldr_light: LDRLightPackage,
  },
};
