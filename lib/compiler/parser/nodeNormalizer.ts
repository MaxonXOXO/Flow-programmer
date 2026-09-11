import { Node, Edge } from '@xyflow/react';

/**
 * Maps legacy or specialized component node types to their canonical package IDs.
 */
const LEGACY_COMPONENT_MAP: Record<string, { packageId: string; defaultTarget?: string; varKey?: string }> = {
  ldr: { packageId: 'ldr_light', defaultTarget: 'lightVal', varKey: 'varLight' },
  ultrasonic: { packageId: 'ultrasonic_hcsr04', defaultTarget: 'distance', varKey: 'varDist' },
  pir: { packageId: 'pir_motion', defaultTarget: 'motion', varKey: 'varMotion' },
  ir: { packageId: 'ir_obstacle', defaultTarget: 'obstacle', varKey: 'varObstacle' },
  flame: { packageId: 'flame_sensor', defaultTarget: 'flameVal', varKey: 'varFlame' },
  soilMoisture: { packageId: 'soil_moisture', defaultTarget: 'moisture', varKey: 'varMoisture' },
  waterLevel: { packageId: 'water_level', defaultTarget: 'waterLevel', varKey: 'varLevel' },
  mqGas: { packageId: 'mq_gas', defaultTarget: 'gasVal', varKey: 'varGas' },
  vibration: { packageId: 'vibration_sensor', defaultTarget: 'vibration', varKey: 'varVib' },
  servo: { packageId: 'servo_motor' },
  lcd: { packageId: 'lcd_16x2' },
  oled: { packageId: 'oled_display' },
  l298n: { packageId: 'l298n' },
  l293d: { packageId: 'l293d' },
  dht: { packageId: 'dht11' },
};

/**
 * Deep clones a React Flow node.
 */
function cloneNode(node: Node): Node {
  return JSON.parse(JSON.stringify(node));
}

/**
 * Normalizes a single flow graph node at the ingestion boundary.
 *
 * Enforces canonical primitive identities:
 * - 'gpio' -> 'digital_write'
 * - 'sensor' / 'analogRead' -> 'analog_read'
 * - 'delay' with { ms } -> { duration, unit: 'ms' }
 * - Specialized component nodes -> { nodeType: 'component', packageId: '...' }
 * - Harmonizes output variables into params.target
 */
export function normalizeFlowGraphNode(node: Node): Node {
  const cloned = cloneNode(node);
  const data = (cloned.data || {}) as any;
  const rawType = data.nodeType || cloned.type || 'start';
  const params = { ...(data.params || {}) };

  // 1. Normalize legacy aliases for hardware primitives
  if (rawType === 'gpio') {
    data.nodeType = 'digital_write';
    if (!params.pin && params.pin !== '0') params.pin = '13';
    if (!params.value) params.value = 'HIGH';
  } else if (rawType === 'sensor' || rawType === 'analogRead') {
    data.nodeType = 'analog_read';
    if (!params.target && params.var) {
      params.target = params.var;
    }
    if (!params.target) {
      params.target = 'sensorVal';
    }
  } else if (rawType === 'analog_read') {
    if (!params.target && params.var) {
      params.target = params.var;
    }
  } else if (rawType === 'digital_read') {
    if (!params.target && params.var) {
      params.target = params.var;
    }
  } else if (rawType === 'pulse_in') {
    if (!params.target && params.var) {
      params.target = params.var;
    }
    if (!params.var && params.target) {
      params.var = params.target;
    }
  } else if (rawType === 'delay') {
    if (params.ms && !params.duration) {
      params.duration = String(params.ms);
      params.unit = 'ms';
    }
    if (!params.unit) {
      params.unit = 'ms';
    }
  } else if (rawType === 'pwm_write') {
    if (!params.value) {
      params.value = '255';
    }
  } else if (LEGACY_COMPONENT_MAP[rawType]) {
    // 2. Normalize specialized component templates to component instances
    const compMeta = LEGACY_COMPONENT_MAP[rawType];
    data.nodeType = 'component';
    if (!params.packageId) {
      params.packageId = compMeta.packageId;
    }
    data.packageId = params.packageId;

    // Harmonize target variable
    if (compMeta.varKey && params[compMeta.varKey] && !params.target) {
      params.target = params[compMeta.varKey];
    } else if (!params.target && compMeta.defaultTarget) {
      params.target = compMeta.defaultTarget;
    }
  } else if (params.packageId && rawType !== 'component') {
    // Has explicit packageId but non-canonical type
    data.nodeType = 'component';
    data.packageId = params.packageId;
  }

  data.params = params;
  cloned.data = data;
  return cloned;
}

/**
 * Normalizes an entire flow graph (nodes and edges) at the boundary.
 */
export function normalizeFlowGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: nodes.map(normalizeFlowGraphNode),
    edges: edges.map(e => JSON.parse(JSON.stringify(e))),
  };
}
