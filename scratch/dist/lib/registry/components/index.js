"use strict";
// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Component Package Registry
//  Phase 2 — Component Package Architecture (Foundation)
// ─────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentsRegistry = exports.getComponentPackage = exports.NRF24L01Component = exports.NRF24L01Package = exports.HC05BluetoothComponent = exports.HC05BluetoothPackage = exports.RelayComponent = exports.RelayPackage = exports.BuzzerComponent = exports.BuzzerPackage = exports.DCMotorComponent = exports.DCMotorPackage = exports.LEDComponent = exports.LEDPackage = exports.L293DComponent = exports.L293DPackage = exports.L298NComponent = exports.L298NPackage = exports.OLEDDisplayComponent = exports.OLEDDisplayPackage = exports.LCD16x2Component = exports.LCD16x2Package = exports.ServoMotorComponent = exports.ServoMotorPackage = exports.PushButtonComponent = exports.PushButtonPackage = exports.VibrationSensorComponent = exports.VibrationSensorPackage = exports.MQGasComponent = exports.MQGasPackage = exports.WaterLevelComponent = exports.WaterLevelPackage = exports.SoilMoistureComponent = exports.SoilMoisturePackage = exports.FlameSensorComponent = exports.FlameSensorPackage = exports.IRObstacleComponent = exports.IRObstaclePackage = exports.LDRLightComponent = exports.LDRLightPackage = exports.PIRMotionComponent = exports.PIRMotionPackage = exports.UltrasonicHCSR04Component = exports.UltrasonicHCSR04Package = exports.DHT11Component = exports.DHT11Package = void 0;
exports.getComponentDefinition = getComponentDefinition;
exports.getAllComponents = getAllComponents;
exports.getComponentsByCategory = getComponentsByCategory;
exports.getComponentProperties = getComponentProperties;
exports.getComponentDependencies = getComponentDependencies;
// ─────────────────────────────────────────────────────────────────
//  Registry Helper: makePackage
//
//  All package definition objects call makePackage() which stamps
//  flat-shim fields (id, name, category, icon, etc.) from metadata
//  onto the top-level object.
//  This keeps individual package files clean (metadata section only)
//  while allowing existing consumers to access comp.name, comp.id, etc.
// ─────────────────────────────────────────────────────────────────
// ─── Sensor Imports ───────────────────────────────────────────────
const dht11_1 = require("./sensors/dht11");
Object.defineProperty(exports, "DHT11Package", { enumerable: true, get: function () { return dht11_1.DHT11Package; } });
Object.defineProperty(exports, "DHT11Component", { enumerable: true, get: function () { return dht11_1.DHT11Package; } });
const ultrasonic_hcsr04_1 = require("./sensors/ultrasonic_hcsr04");
Object.defineProperty(exports, "UltrasonicHCSR04Package", { enumerable: true, get: function () { return ultrasonic_hcsr04_1.UltrasonicHCSR04Package; } });
Object.defineProperty(exports, "UltrasonicHCSR04Component", { enumerable: true, get: function () { return ultrasonic_hcsr04_1.UltrasonicHCSR04Package; } });
const pir_motion_1 = require("./sensors/pir_motion");
Object.defineProperty(exports, "PIRMotionPackage", { enumerable: true, get: function () { return pir_motion_1.PIRMotionPackage; } });
Object.defineProperty(exports, "PIRMotionComponent", { enumerable: true, get: function () { return pir_motion_1.PIRMotionPackage; } });
const ldr_light_1 = require("./sensors/ldr_light");
Object.defineProperty(exports, "LDRLightPackage", { enumerable: true, get: function () { return ldr_light_1.LDRLightPackage; } });
Object.defineProperty(exports, "LDRLightComponent", { enumerable: true, get: function () { return ldr_light_1.LDRLightPackage; } });
const ir_obstacle_1 = require("./sensors/ir_obstacle");
Object.defineProperty(exports, "IRObstaclePackage", { enumerable: true, get: function () { return ir_obstacle_1.IRObstaclePackage; } });
Object.defineProperty(exports, "IRObstacleComponent", { enumerable: true, get: function () { return ir_obstacle_1.IRObstaclePackage; } });
const flame_sensor_1 = require("./sensors/flame_sensor");
Object.defineProperty(exports, "FlameSensorPackage", { enumerable: true, get: function () { return flame_sensor_1.FlameSensorPackage; } });
Object.defineProperty(exports, "FlameSensorComponent", { enumerable: true, get: function () { return flame_sensor_1.FlameSensorPackage; } });
const soil_moisture_1 = require("./sensors/soil_moisture");
Object.defineProperty(exports, "SoilMoisturePackage", { enumerable: true, get: function () { return soil_moisture_1.SoilMoisturePackage; } });
Object.defineProperty(exports, "SoilMoistureComponent", { enumerable: true, get: function () { return soil_moisture_1.SoilMoisturePackage; } });
const water_level_1 = require("./sensors/water_level");
Object.defineProperty(exports, "WaterLevelPackage", { enumerable: true, get: function () { return water_level_1.WaterLevelPackage; } });
Object.defineProperty(exports, "WaterLevelComponent", { enumerable: true, get: function () { return water_level_1.WaterLevelPackage; } });
const mq_gas_1 = require("./sensors/mq_gas");
Object.defineProperty(exports, "MQGasPackage", { enumerable: true, get: function () { return mq_gas_1.MQGasPackage; } });
Object.defineProperty(exports, "MQGasComponent", { enumerable: true, get: function () { return mq_gas_1.MQGasPackage; } });
const vibration_sensor_1 = require("./sensors/vibration_sensor");
Object.defineProperty(exports, "VibrationSensorPackage", { enumerable: true, get: function () { return vibration_sensor_1.VibrationSensorPackage; } });
Object.defineProperty(exports, "VibrationSensorComponent", { enumerable: true, get: function () { return vibration_sensor_1.VibrationSensorPackage; } });
const push_button_1 = require("./sensors/push_button");
Object.defineProperty(exports, "PushButtonPackage", { enumerable: true, get: function () { return push_button_1.PushButtonPackage; } });
Object.defineProperty(exports, "PushButtonComponent", { enumerable: true, get: function () { return push_button_1.PushButtonPackage; } });
// ─── Actuator / Display / Comms Imports ──────────────────────────
const servo_motor_1 = require("./actuators/servo_motor");
Object.defineProperty(exports, "ServoMotorPackage", { enumerable: true, get: function () { return servo_motor_1.ServoMotorPackage; } });
Object.defineProperty(exports, "ServoMotorComponent", { enumerable: true, get: function () { return servo_motor_1.ServoMotorPackage; } });
const lcd_16x2_1 = require("./actuators/lcd_16x2");
Object.defineProperty(exports, "LCD16x2Package", { enumerable: true, get: function () { return lcd_16x2_1.LCD16x2Package; } });
Object.defineProperty(exports, "LCD16x2Component", { enumerable: true, get: function () { return lcd_16x2_1.LCD16x2Package; } });
const oled_display_1 = require("./actuators/oled_display");
Object.defineProperty(exports, "OLEDDisplayPackage", { enumerable: true, get: function () { return oled_display_1.OLEDDisplayPackage; } });
Object.defineProperty(exports, "OLEDDisplayComponent", { enumerable: true, get: function () { return oled_display_1.OLEDDisplayPackage; } });
const l298n_1 = require("./actuators/l298n");
Object.defineProperty(exports, "L298NPackage", { enumerable: true, get: function () { return l298n_1.L298NPackage; } });
Object.defineProperty(exports, "L298NComponent", { enumerable: true, get: function () { return l298n_1.L298NPackage; } });
const l293d_1 = require("./actuators/l293d");
Object.defineProperty(exports, "L293DPackage", { enumerable: true, get: function () { return l293d_1.L293DPackage; } });
Object.defineProperty(exports, "L293DComponent", { enumerable: true, get: function () { return l293d_1.L293DPackage; } });
const led_1 = require("./actuators/led");
Object.defineProperty(exports, "LEDPackage", { enumerable: true, get: function () { return led_1.LEDPackage; } });
Object.defineProperty(exports, "LEDComponent", { enumerable: true, get: function () { return led_1.LEDPackage; } });
const dc_motor_1 = require("./actuators/dc_motor");
Object.defineProperty(exports, "DCMotorPackage", { enumerable: true, get: function () { return dc_motor_1.DCMotorPackage; } });
Object.defineProperty(exports, "DCMotorComponent", { enumerable: true, get: function () { return dc_motor_1.DCMotorPackage; } });
const buzzer_1 = require("./actuators/buzzer");
Object.defineProperty(exports, "BuzzerPackage", { enumerable: true, get: function () { return buzzer_1.BuzzerPackage; } });
Object.defineProperty(exports, "BuzzerComponent", { enumerable: true, get: function () { return buzzer_1.BuzzerPackage; } });
const relay_1 = require("./actuators/relay");
Object.defineProperty(exports, "RelayPackage", { enumerable: true, get: function () { return relay_1.RelayPackage; } });
Object.defineProperty(exports, "RelayComponent", { enumerable: true, get: function () { return relay_1.RelayPackage; } });
const hc05_bluetooth_1 = require("./actuators/hc05_bluetooth");
Object.defineProperty(exports, "HC05BluetoothPackage", { enumerable: true, get: function () { return hc05_bluetooth_1.HC05BluetoothPackage; } });
Object.defineProperty(exports, "HC05BluetoothComponent", { enumerable: true, get: function () { return hc05_bluetooth_1.HC05BluetoothPackage; } });
const nrf24l01_1 = require("./actuators/nrf24l01");
Object.defineProperty(exports, "NRF24L01Package", { enumerable: true, get: function () { return nrf24l01_1.NRF24L01Package; } });
Object.defineProperty(exports, "NRF24L01Component", { enumerable: true, get: function () { return nrf24l01_1.NRF24L01Package; } });
// ─── Re-export Types ──────────────────────────────────────────────
__exportStar(require("./types"), exports);
// ─── Internal Registry Map ────────────────────────────────────────
/**
 * Stamps flat compatibility shims (id, name, category, icon, etc.) from
 * a package's metadata section onto the top-level object.
 *
 * This allows existing consumers (Sidebar, ComponentNode) to access
 * comp.name, comp.id, comp.category etc. without any code changes,
 * while new code should read from pkg.metadata.* instead.
 */
function makePackage(pkg) {
    return {
        ...pkg,
        // Flat shims — mirror metadata fields
        id: pkg.metadata.id,
        name: pkg.metadata.name,
        category: pkg.metadata.category,
        icon: pkg.metadata.icon,
        description: pkg.metadata.description,
        tags: pkg.metadata.tags,
    };
}
/**
 * The central registry of all Component Packages.
 * Keys must match each package's metadata.id exactly.
 */
const COMPONENT_REGISTRY = Object.fromEntries([
    dht11_1.DHT11Package,
    ultrasonic_hcsr04_1.UltrasonicHCSR04Package,
    pir_motion_1.PIRMotionPackage,
    ldr_light_1.LDRLightPackage,
    ir_obstacle_1.IRObstaclePackage,
    flame_sensor_1.FlameSensorPackage,
    soil_moisture_1.SoilMoisturePackage,
    water_level_1.WaterLevelPackage,
    mq_gas_1.MQGasPackage,
    vibration_sensor_1.VibrationSensorPackage,
    push_button_1.PushButtonPackage,
    servo_motor_1.ServoMotorPackage,
    lcd_16x2_1.LCD16x2Package,
    oled_display_1.OLEDDisplayPackage,
    l298n_1.L298NPackage,
    l293d_1.L293DPackage,
    led_1.LEDPackage,
    dc_motor_1.DCMotorPackage,
    buzzer_1.BuzzerPackage,
    relay_1.RelayPackage,
    hc05_bluetooth_1.HC05BluetoothPackage,
    nrf24l01_1.NRF24L01Package,
].map(pkg => [pkg.metadata.id, makePackage(pkg)]));
// ─── Public API ───────────────────────────────────────────────────
/**
 * Get a Component Package by its unique identifier.
 * Returns the full package including metadata, pins, outputs,
 * properties, dependencies, and implementation.
 */
function getComponentDefinition(id) {
    return COMPONENT_REGISTRY[id];
}
/** Alias for getComponentDefinition — preferred name for new code. */
exports.getComponentPackage = getComponentDefinition;
/**
 * Get all registered Component Packages.
 */
function getAllComponents() {
    return Object.values(COMPONENT_REGISTRY);
}
/**
 * Get all Component Packages belonging to a specific category.
 */
function getComponentsByCategory(category) {
    return getAllComponents().filter(pkg => pkg.metadata.category === category);
}
/**
 * Get only the editable properties for a component.
 * Useful for the Properties Panel to render the correct controls
 * without needing to load the full package.
 */
function getComponentProperties(id) {
    return COMPONENT_REGISTRY[id]?.properties ?? [];
}
/**
 * Get only the dependency declarations for a component.
 * Useful for the compiler to quickly gather includes / globals / setup
 * without loading the full package.
 */
function getComponentDependencies(id) {
    return COMPONENT_REGISTRY[id]?.dependencies ?? {};
}
// ─── Convenience: componentsRegistry (used by SchemaCanvas) ──────
/**
 * Direct registry map access.
 * SchemaCanvas uses: componentsRegistry[compId]
 * This export preserves that access pattern without any changes to SchemaCanvas.
 */
exports.componentsRegistry = COMPONENT_REGISTRY;
