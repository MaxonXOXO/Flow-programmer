"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LDRLightPackage = void 0;
exports.LDRLightPackage = {
    metadata: {
        id: 'ldr_light',
        name: 'LDR Light Sensor',
        description: 'Light-dependent resistor â€” measures ambient light level',
        category: 'sensor',
        icon: 'â˜€',
        tags: ['light', 'ambient', 'ldr', 'photoresistor'],
    },
    pins: [
        { id: 'pin1', label: 'Pin 1', signal: 'analog_output', required: true },
        { id: 'pin2', label: 'Pin 2', signal: 'ground', required: true },
    ],
    outputs: [
        { id: 'lightLevel', label: 'Light Level', type: 'int', description: 'Raw analog light level (0â€“1023)' },
    ],
    properties: [],
    dependencies: {
        includes: [],
        globals: [],
        setup: [],
    },
    implementation: { type: 'builtin' },
};
