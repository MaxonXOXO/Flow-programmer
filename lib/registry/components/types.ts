// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Component Package Type Definitions
//  Phase 2 — Component Package Architecture (Foundation)
// ─────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';

// ─── Shared Primitives ───────────────────────────────────────────

export type ComponentCategory =
  | 'sensor'
  | 'actuator'
  | 'communication'
  | 'display'
  | 'motor_driver';

export type SignalType =
  | 'digital_input'
  | 'digital_output'
  | 'analog_input'
  | 'analog_output'
  | 'pwm_input'
  | 'pwm_output'
  | 'i2c'
  | 'spi'
  | 'uart'
  | 'power'
  | 'ground';

export type DataType = 'int' | 'float' | 'bool' | 'string';

export type PropertyType =
  | 'number'   // numeric input
  | 'string'   // text input
  | 'select'   // enum dropdown
  | 'pin'      // Arduino pin selector
  | 'boolean'; // checkbox

// ─── Section: Pins ───────────────────────────────────────────────

/**
 * A single physical pin on the component that wires can connect to.
 * Pins describe HARDWARE connections — not user configuration.
 */
export interface ComponentPin {
  /** Stable identifier used as React Flow handle id */
  id: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Electrical signal type carried by this pin */
  signal: SignalType;
  /** Whether a connection on this pin is mandatory */
  required?: boolean;
}

// ─── Section: Outputs ────────────────────────────────────────────

/**
 * A value this component exposes for use in flow nodes.
 * Outputs are what the component PRODUCES, not how it is wired.
 */
export interface ComponentOutput {
  /** Stable identifier referenced in flow nodes */
  id: string;
  /** Human-readable label shown in the output picker */
  label: string;
  /** TypeScript / Arduino data type of this output */
  type: DataType;
  /** Optional description for tooltips */
  description?: string;
}

// ─── Section: Properties ─────────────────────────────────────────

/**
 * A single user-editable configuration property.
 * Properties are what the USER configures, separate from pins.
 */
export interface PropertyDefinition {
  /** Stable identifier — used as the key in the params map */
  id: string;
  /** Human-readable label shown in the Properties Panel */
  label: string;
  /** UI control type */
  type: PropertyType;
  /** Default value applied when the component is first placed */
  defaultValue: string | number | boolean;
  /** For type='select': available option values */
  options?: Array<{ label: string; value: string | number }>;
  /** Optional description / help text */
  description?: string;
  /** Minimum value for type='number' */
  min?: number;
  /** Maximum value for type='number' */
  max?: number;
}

// ─── Section: Dependencies ───────────────────────────────────────

/**
 * Everything this component needs injected into generated Arduino code.
 * These are DECLARATIVE — the compiler consumes them, nothing is generated here.
 *
 * Strings may contain $propertyId placeholders that the compiler
 * interpolates at code-generation time using the instance's params.
 */
export interface ComponentDependencies {
  /** #include directives required (e.g. 'Wire.h', 'Servo.h') */
  includes?: string[];
  /** Global-scope declarations (e.g. 'Servo myServo') */
  globals?: string[];
  /** setup() body lines (e.g. 'myServo.attach($signalPin)') */
  setup?: string[];
}

// ─── Section: Metadata ───────────────────────────────────────────

/**
 * Descriptive information about the component package.
 * Answers: "What is this component?"
 */
export interface PackageMetadata {
  /** Unique identifier — must match the registry key */
  id: string;
  /** Display name shown in the component palette */
  name: string;
  /** Short human-readable description */
  description?: string;
  /** Component grouping for palette organisation */
  category: ComponentCategory;
  /** Emoji or icon identifier for the palette tile */
  icon?: string;
  /** Search / filter tags */
  tags?: string[];
}

// ─── Section: Target & Implementation ────────────────────────────

/**
 * Supported microcontroller / hardware target platform identifiers.
 */
export type TargetId = 
  | 'arduino_uno'
  | 'esp32'
  | 'stm32'
  | 'avr'
  | 'generic'
  | 'default'
  | string;

/**
 * Describes HOW this component is implemented internally for a specific hardware target.
 * Strategy options: 'builtin' | 'subflow' | 'graph' | 'native'.
 */
export type ImplementationStrategy = 'builtin' | 'subflow' | 'graph' | 'native';
export type ImplementationType = ImplementationStrategy | 'ast';

export interface PackageGraphDefinition {
  /** ID of the explicit entry node in the internal subflow graph */
  entry?: string;
  /** ID of the explicit exit/output boundary node in the internal subflow graph */
  exit?: string;
  /** Internal flow graph nodes */
  nodes: any[];
  /** Internal flow graph edges */
  edges: any[];
}

/**
 * An instantiated, independent editor graph instance created from a package graph template.
 */
export interface PackageGraphInstance {
  /** Unique package identifier */
  packageId: string;
  /** Optional component instance identifier for instance-specific graphs */
  componentInstanceId?: string;
  /** Independent flow nodes */
  nodes: Node[];
  /** Independent flow edges */
  edges: Edge[];
  /** Preserved explicit entry node ID */
  entry: string;
  /** Preserved explicit exit node ID */
  exit: string;
  /** Read-only vs unlocked editor state */
  unlocked: boolean;
  /** Document dirty / modified flag */
  dirty: boolean;
  /** Optional target identifier */
  targetId?: TargetId;
  /** Optional package version */
  packageVersion?: string;
}

/**
 * Target-specific implementation descriptor.
 */
export interface TargetImplementation {
  /** The execution/compilation strategy for this target */
  strategy: ImplementationStrategy;
  /** Version of the implementation schema */
  version?: number;
  /** Explicit entry node ID */
  entry?: string;
  /** Explicit exit node ID */
  exit?: string;
  /** Visual flow graph definition */
  graph?: PackageGraphDefinition;
  /** Subflow graph definition alias */
  subflow?: PackageGraphDefinition;
  /** Target-specific compilation dependencies */
  dependencies?: ComponentDependencies;
  /** Target-specific native generator metadata or code templates */
  native?: Record<string, unknown>;
}

export interface PackageImplementation extends Partial<TargetImplementation> {
  /** Legacy compatibility field */
  type?: ImplementationType;
}

// ─── Section: Canonical Component Definition ─────────────────────

export interface ComponentMetadata {
  id: string;
  name: string;
  category: ComponentCategory;
  description?: string;
  icon?: string;
  tags?: string[];
  version?: string;
}

/**
 * Canonical Component Definition representing a discrete physical or virtual hardware component.
 */
export interface CanonicalComponentDefinition {
  /** Unique component identifier */
  id?: string;
  /** Descriptive metadata */
  metadata?: ComponentMetadata | PackageMetadata;
  /** Display name (shorthand) */
  name?: string;
  /** Component category (shorthand) */
  category?: ComponentCategory;
  /** Description (shorthand) */
  description?: string;
  /** Icon (shorthand) */
  icon?: string;
  /** Search tags (shorthand) */
  tags?: string[];
  /** Physical hardware pins */
  pins: ComponentPin[];
  /** Runtime value outputs */
  outputs: ComponentOutput[];
  /** User-configurable properties */
  properties: PropertyDefinition[];
  /** Compilation dependencies */
  dependencies?: ComponentDependencies;
  /** Target-specific implementation mapping (e.g. 'arduino_uno', 'esp32', 'generic') */
  implementations?: Record<TargetId, TargetImplementation>;
  /** Default/generic implementation shorthand */
  implementation?: TargetImplementation | PackageImplementation;
}

// ─── Section: Canonical Package Manifest ─────────────────────────

/**
 * Canonical Package Manifest representing a distributable package container.
 * A package contains metadata, dependencies, and one or more components.
 */
export interface PackageManifest {
  /** Unique canonical package identifier */
  id: string;
  /** Human-readable package name */
  name: string;
  /** Package semver string */
  version: string;
  /** Short package description */
  description?: string;
  /** Package author */
  author?: string;
  /** Package license */
  license?: string;
  /** Search tags */
  tags?: string[];
  /** External package dependencies */
  dependencies?: Record<string, string>;
  /** Components exposed by this package (single or multiple) */
  components: Record<string, CanonicalComponentDefinition | PackageDefinition> | Array<CanonicalComponentDefinition | PackageDefinition>;
}

// ─── Package Definition (used by individual single-component package files) ─

export interface PackageDefinition extends CanonicalComponentDefinition {
  /** Descriptive metadata */
  metadata: PackageMetadata;
  /** Physical hardware pins */
  pins: ComponentPin[];
  /** Runtime value outputs */
  outputs: ComponentOutput[];
  /** User-configurable properties */
  properties: PropertyDefinition[];
  /** Compilation dependencies */
  dependencies: ComponentDependencies;
  /** Implementation strategy */
  implementation: PackageImplementation;
}

// ─── Component Package (returned by registry after shim-stamping) ─

export interface ComponentPackage extends PackageDefinition {
  // ─── Flat Compatibility Shims ─────────────────────────────────
  /** @see metadata.id */
  id: string;
  /** @see metadata.name */
  name: string;
  /** @see metadata.category */
  category: ComponentCategory;
  /** @see metadata.icon */
  icon?: string;
  /** @see metadata.description */
  description?: string;
  /** @see metadata.tags */
  tags?: string[];
  /** Legacy field — unused in Phase 2, reserved for compatibility */
  editable?: boolean;
  /** Legacy field — links to flow package files, reserved for compatibility */
  packageId?: string;
  /** Target-specific implementations if available */
  implementations?: Record<TargetId, TargetImplementation>;
}

// ─── Backwards Compatibility Alias ───────────────────────────────

export type ComponentDefinition = ComponentPackage;
