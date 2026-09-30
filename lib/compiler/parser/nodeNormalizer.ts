import { Node, Edge } from '@xyflow/react';

/**
 * Authoritative mapping of legacy or short package identifiers to canonical package IDs.
 * Normalization occurs exclusively at the ingestion boundary (nodeNormalizer).
 */
export const LEGACY_PACKAGE_ID_ALIASES: Record<string, string> = {
  // Sensors
  ldr: 'ldr_light',
  light: 'ldr_light',
  photoresistor: 'ldr_light',
  ultrasonic: 'ultrasonic_hcsr04',
  hcsr04: 'ultrasonic_hcsr04',
  hc_sr04: 'ultrasonic_hcsr04',
  sonar: 'ultrasonic_hcsr04',
  pir: 'pir_motion',
  motion: 'pir_motion',
  ir: 'ir_obstacle',
  obstacle: 'ir_obstacle',
  flame: 'flame_sensor',
  soilMoisture: 'soil_moisture',
  soil_moisture: 'soil_moisture',
  soil: 'soil_moisture',
  waterLevel: 'water_level',
  water_level: 'water_level',
  water: 'water_level',
  mqGas: 'mq_gas',
  mq_gas: 'mq_gas',
  gas: 'mq_gas',
  vibration: 'vibration_sensor',
  dht: 'dht11',
  dht22: 'dht11',
  button: 'push_button',
  btn: 'push_button',
  pushbutton: 'push_button',

  // Actuators & Displays & Comms
  servo: 'servo_motor',
  lcd: 'lcd_16x2',
  lcd1602: 'lcd_16x2',
  lcd_1602: 'lcd_16x2',
  oled: 'oled_display',
  ssd1306: 'oled_display',
  motor: 'dc_motor',
  dcMotor: 'dc_motor',
  buzzer: 'piezo_buzzer',
  relay: 'relay_module',
  stepper: 'stepper_motor',
  bluetooth: 'hc05_bluetooth',
  hc05: 'hc05_bluetooth',
  hc_05: 'hc05_bluetooth',
  nrf: 'nrf24l01',
  nrf24: 'nrf24l01',
  nrf_24: 'nrf24l01',
} as const;

/**
 * Normalizes a raw or legacy component package identifier to its canonical ID.
 * If the input is already canonical or unknown, returns the input trimmed.
 * Strictly checks own-properties to prevent prototype-pollution/method collisions (e.g. toString, constructor).
 */
export function normalizePackageId(rawId: string | undefined): string {
  if (!rawId || typeof rawId !== 'string') return '';
  const trimmed = rawId.trim();
  if (trimmed === '') return '';
  if (Object.prototype.hasOwnProperty.call(LEGACY_PACKAGE_ID_ALIASES, trimmed)) {
    return LEGACY_PACKAGE_ID_ALIASES[trimmed];
  }
  return trimmed;
}

/**
 * LEGACY NODE MIGRATION ADAPTER (Historical Ingestion Boundary Only)
 *
 * ARCHITECTURAL RULE:
 * This map is strictly a legacy migration adapter for pre-Phase 6A visual flow graphs.
 * It is NOT canonical package metadata. Canonical package metadata lives in:
 *   lib/registry/components/
 *
 * This adapter exists to translate specialized node types (e.g. nodeType="ldr") and legacy
 * output variable keys (e.g. params.varLight) into canonical component nodes:
 *   { nodeType: 'component', packageId: '...', params: { target: '...' } }
 */
interface LegacyNodeMigrationAdapter {
  packageId: string;
  defaultTarget?: string;
  varKey?: string;
}

const LEGACY_COMPONENT_MAP: Record<string, LegacyNodeMigrationAdapter> = {
  ldr: { packageId: 'ldr_light', defaultTarget: 'lightVal', varKey: 'varLight' },
  ldr_light: { packageId: 'ldr_light', defaultTarget: 'lightVal', varKey: 'varLight' },
  ultrasonic: { packageId: 'ultrasonic_hcsr04', defaultTarget: 'distance', varKey: 'varDist' },
  hcsr04: { packageId: 'ultrasonic_hcsr04', defaultTarget: 'distance', varKey: 'varDist' },
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
  button: { packageId: 'push_button' },
  btn: { packageId: 'push_button' },
  motor: { packageId: 'dc_motor' },
  buzzer: { packageId: 'piezo_buzzer' },
  relay: { packageId: 'relay_module' },
  stepper: { packageId: 'stepper_motor' },
  bluetooth: { packageId: 'hc05_bluetooth' },
  hc05: { packageId: 'hc05_bluetooth' },
  nrf: { packageId: 'nrf24l01' },
  nrf24: { packageId: 'nrf24l01' },
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
 * - 'gpio' -> 'digital_write' (pin 13, HIGH)
 * - 'sensor' / 'analogRead' -> 'analog_read' (target: 'sensorVal')
 * - 'delay' with { ms } -> { duration, unit: 'ms' }
 * - Specialized component nodes -> { nodeType: 'component', packageId: '...' }
 * - Harmonizes output variables into params.target
 *
 * Intentional Historical Defaults:
 * - gpio pin '13': Default onboard LED pin on standard Arduino hardware.
 * - gpio value 'HIGH': Default assertion state for digital write output.
 * - sensor target 'sensorVal': Default target variable for unconfigured analog read nodes.
 * - delay unit 'ms': Historical unit for visual delay blocks.
 * - pwm_write value '255': Maximum duty cycle (100% full power) default.
 */
export function normalizeFlowGraphNode(node: Node): Node {
  const cloned = cloneNode(node);
  const data = (cloned.data || {}) as any;
  const rawType = data.nodeType || cloned.type || 'start';
  const params = { ...(data.params || {}) };

  // 1. Normalize legacy aliases and historical defaults for hardware primitives
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
  } else if (Object.prototype.hasOwnProperty.call(LEGACY_COMPONENT_MAP, rawType)) {
    // 2. Normalize specialized component templates to component instances
    const compMeta = LEGACY_COMPONENT_MAP[rawType];
    data.nodeType = 'component';
    params.packageId = normalizePackageId(params.packageId || compMeta.packageId);
    data.packageId = params.packageId;

    // Harmonize target variable
    if (compMeta.varKey && params[compMeta.varKey] && !params.target) {
      params.target = params[compMeta.varKey];
    } else if (params.var && !params.target) {
      params.target = params.var;
    } else if (!params.target && compMeta.defaultTarget) {
      params.target = compMeta.defaultTarget;
    }

    // Harmonize legacy single-pin parameters
    if (params.pin && !params.pin1) {
      params.pin1 = params.pin;
    }
    if (params.sensorPin && !params.pin1) {
      params.pin1 = params.sensorPin;
    }
  } else if (params.packageId || data.packageId || rawType === 'component') {
    // 3. Node is already a component node or has packageId (possibly legacy alias)
    if (params.packageId) {
      params.packageId = normalizePackageId(params.packageId);
    }
    if (data.packageId) {
      data.packageId = normalizePackageId(data.packageId);
    }
    if (!params.packageId && data.packageId) {
      params.packageId = data.packageId;
    }
    if (!data.packageId && params.packageId) {
      data.packageId = params.packageId;
    }
    if (rawType !== 'component' && (params.packageId || data.packageId)) {
      data.nodeType = 'component';
    }

    // Harmonize legacy target variables
    if (!params.target) {
      if (params.var) params.target = params.var;
      else if (params.varLight) params.target = params.varLight;
      else if (params.varDist) params.target = params.varDist;
      else if (params.varMotion) params.target = params.varMotion;
    }
    if (params.pin && !params.pin1) {
      params.pin1 = params.pin;
    }
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
