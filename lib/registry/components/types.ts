// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Component Package Type Definitions
//  Phase 2 — Component Package Architecture (Foundation)
// ─────────────────────────────────────────────────────────────────

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

// ─── Section: Implementation ─────────────────────────────────────

/**
 * Describes HOW this component is implemented internally.
 * Strategy options: 'builtin' | 'subflow' | 'native'.
 */
export type ImplementationStrategy = 'builtin' | 'subflow' | 'native';
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

export interface PackageImplementation {
  /** The strategy used to implement this component's behaviour */
  strategy?: ImplementationStrategy;
  /** Version of the implementation schema */
  version?: number;
  /** Entry point if applicable */
  entry?: string;
  /** Exit point if applicable */
  exit?: string;
  /** Subflow graph data (nodes & edges) when strategy === 'subflow' or builtin subflow */
  subflow?: PackageGraphDefinition | unknown;
  /** Internal visual flow graph (nodes & edges) for subflow implementation */
  graph?: PackageGraphDefinition | unknown;
  /** Legacy compatibility field */
  type?: ImplementationType;
}

// ─── Package Definition (used by individual package files) ───────

/**
 * What individual package files (sensors/dht11.ts, actuators/lcd_16x2.ts, etc.)
 * export. These do NOT include the flat shim fields — those are stamped on
 * by makePackage() in the registry when each package is registered.
 */
export interface PackageDefinition {
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
  /** Implementation strategy (Phase 2: always 'builtin') */
  implementation: PackageImplementation;
}

// ─── Component Package (returned by registry after shim-stamping) ─

/**
 * A fully-hydrated Component Package as returned by the registry.
 *
 * Extends PackageDefinition with flat compatibility shims so that
 * existing consumers (Sidebar, ComponentNode) can access .id, .name,
 * .category etc. without any code changes.
 *
 * The shims are populated automatically by makePackage() in the registry.
 * For new code, prefer reading from .metadata.* instead.
 */
export interface ComponentPackage extends PackageDefinition {
  // ─── Flat Compatibility Shims ─────────────────────────────────
  // These mirror metadata.* so that existing consumers (Sidebar,
  // ComponentNode, SchemaCanvas) continue to work without changes.
  // They are populated by makePackage() in the registry helpers.
  // DO NOT use these in new code — read from .metadata instead.

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
}

// ─── Backwards Compatibility Alias ───────────────────────────────

/**
 * @deprecated Prefer ComponentPackage for new code.
 * Kept as an alias so all existing consumer imports continue to compile
 * without modification during the Phase 2 migration window.
 *
 * Sidebar, ComponentNode, SchemaCanvas, PropertiesPanel, compilerValidator,
 * and arduinoGenerator all import ComponentDefinition — they continue to work
 * unchanged because ComponentPackage now includes the flat shim fields.
 */
export type ComponentDefinition = ComponentPackage;
