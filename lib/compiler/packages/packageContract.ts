import type { Node, Edge } from '@xyflow/react';
import type { 
  ComponentCategory, 
  SignalType, 
  DataType, 
  PropertyType,
  TargetId,
  ImplementationStrategy
} from '../../registry/components/types';

// Re-export shared primitives for convenience
export type {
  ComponentCategory,
  SignalType,
  DataType,
  PropertyType,
  TargetId,
  ImplementationStrategy
};

// ─────────────────────────────────────────────────────────────────
//  Canonical Primitive Instruction Set (Phase 6A.3 Invariant)
// ─────────────────────────────────────────────────────────────────

export const CANONICAL_PRIMITIVE_TYPES = [
  'start',
  'end',
  'return',
  'condition',
  'loop',
  'delay',
  'digital_read',
  'digital_write',
  'analog_read',
  'pwm_write',
  'pulse_in',
  'variable',
  'assignment',
  'function',
  'function_call',
  'print',
  'input',
] as const;

export type CanonicalPrimitiveType = typeof CANONICAL_PRIMITIVE_TYPES[number];

// ─────────────────────────────────────────────────────────────────
//  Phase 6A.4 Component Package Contract Definitions
// ─────────────────────────────────────────────────────────────────

/**
 * Strict Physical Hardware Pin Declaration Contract.
 * Pins describe electrical and physical connections on the board/component.
 */
export interface ComponentPinContract {
  /** Stable identifier matching schematic wire handles (e.g. 'pin1', 'trig', 'echo') */
  id: string;
  /** Human-readable label shown in Schema UI */
  label: string;
  /** Electrical signal capability carried by this pin */
  signal: SignalType;
  /** Whether a connection on this pin is mandatory for compilation */
  required?: boolean;
  /** Description for tooltips and wiring guides */
  description?: string;
}

/**
 * Strict Runtime Output Value Declaration Contract.
 * Outputs are what the component produces into flow variables.
 */
export interface ComponentOutputContract {
  /** Output variable identifier referenced in subflows (e.g. 'lightLevel', 'distance') */
  id: string;
  /** Human-readable label shown in Output picker */
  label: string;
  /** Data type produced */
  type: DataType;
  /** Description for tooltips */
  description?: string;
}

/**
 * User-configurable Property Definition Contract.
 * Properties are what the user configures in the IDE Properties Panel.
 */
export interface ComponentPropertyContract {
  id: string;
  label: string;
  type: PropertyType;
  defaultValue: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
  description?: string;
  min?: number;
  max?: number;
}

/**
 * Declarative C++ Dependencies Contract.
 * Strings may contain $<pinId> or $<propertyId> placeholders interpolated by compiler.
 */
export interface ComponentDependenciesContract {
  /** Header include directives (e.g. 'Wire.h', 'Servo.h') */
  includes?: string[];
  /** Global-scope declarations with pin placeholders (e.g. 'Servo myServo;') */
  globals?: string[];
  /** setup() initialization lines with pin placeholders (e.g. 'pinMode($pin1, INPUT);') */
  setup?: string[];
}

/**
 * Internal Subflow Graph Definition Contract.
 * Contains the canonical primitive graph implementing the component.
 */
export interface ComponentSubflowContract {
  /** ID of explicit entry node in nodes array */
  entry: string;
  /** ID of explicit exit node in nodes array */
  exit: string;
  /** Canonical primitive nodes */
  nodes: Node[];
  /** Flow execution edges */
  edges: Edge[];
}

/**
 * Target Implementation Contract.
 */
export interface ComponentImplementationContract {
  /** Implementation strategy: 'graph' requires subflow, 'builtin' uses backend emitter, 'native' uses code generator */
  strategy: ImplementationStrategy;
  /** Implementation schema version */
  version?: number;
  /** Explicit entry node ID (if strategy === 'graph') */
  entry?: string;
  /** Explicit exit node ID (if strategy === 'graph') */
  exit?: string;
  /** Visual subflow graph definition */
  subflow?: ComponentSubflowContract;
  /** Backwards-compatible alias for subflow graph */
  graph?: ComponentSubflowContract;
  /** Target-specific compilation dependencies */
  dependencies?: ComponentDependenciesContract;
  /** Native generator metadata if applicable */
  native?: Record<string, unknown>;
}

/**
 * Component Package Metadata Contract.
 */
export interface ComponentPackageMetadataContract {
  id: string;
  name: string;
  description?: string;
  category: ComponentCategory;
  icon?: string;
  tags?: string[];
}

/**
 * Authoritative Canonical Component Package Contract.
 */
export interface ComponentPackageContract {
  /** Unique canonical package identifier (e.g. 'ldr_light', 'ultrasonic_hcsr04') */
  id: string;
  /** Valid semver string (e.g. '1.0.0') */
  version: string;
  /** Descriptive metadata */
  metadata: ComponentPackageMetadataContract;
  /** Declared hardware pins */
  pins: ComponentPinContract[];
  /** Declared runtime outputs */
  outputs: ComponentOutputContract[];
  /** User-configurable properties */
  properties?: ComponentPropertyContract[];
  /** Default / generic compilation dependencies */
  dependencies?: ComponentDependenciesContract;
  /** Target-specific implementations mapping */
  implementations?: Record<TargetId, ComponentImplementationContract>;
  /** Default/generic implementation */
  implementation?: ComponentImplementationContract;
}

// ─────────────────────────────────────────────────────────────────
//  Validation Diagnostics & Result Types
// ─────────────────────────────────────────────────────────────────

export type DiagnosticSeverity = 'error' | 'warning';

/**
 * Structured Diagnostic for Validation Issues
 */
export interface ValidationDiagnostic {
  code: string;
  path?: string;
  message: string;
  severity?: DiagnosticSeverity;
}

/**
 * Validation Result Container
 */
export interface ValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  errors: string[];
  warnings: string[];
}
