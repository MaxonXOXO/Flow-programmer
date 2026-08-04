"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlameSensorPackage = void 0;
exports.FlameSensorPackage = {
    metadata: {
        id: 'flame_sensor',
        name: 'Flame Sensor',
        description: 'Flame detection sensor â€” outputs both digital and analog signals',
        category: 'sensor',
        icon: 'ðŸ”¥',
        tags: ['flame', 'fire', 'safety'],
    },
    pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'do', label: 'D0', signal: 'digital_output', required: false },
        { id: 'ao', label: 'A0', signal: 'analog_output', required: false },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true },
    ],
    outputs: [
        { id: 'flameDigital', label: 'Flame Detected (Digital)', type: 'bool', description: 'True when flame is detected (digital threshold)' },
        { id: 'flameAnalog', label: 'Flame Level (Analog)', type: 'int', description: 'Raw analog flame intensity (0â€“1023)' },
    ],
    properties: [],
    dependencies: {
        includes: [],
        globals: [],
        setup: [],
    },
    implementation: { type: 'builtin' },
};
