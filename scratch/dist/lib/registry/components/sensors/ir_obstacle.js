"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRObstaclePackage = void 0;
exports.IRObstaclePackage = {
    metadata: {
        id: 'ir_obstacle',
        name: 'IR Obstacle Sensor',
        description: 'Infrared obstacle avoidance sensor â€” detects objects in front',
        category: 'sensor',
        icon: 'ðŸ‘',
        tags: ['obstacle', 'infrared', 'avoidance', 'ir'],
    },
    pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'out', label: 'OUT', signal: 'digital_output', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true },
    ],
    outputs: [
        { id: 'obstacle', label: 'Obstacle Detected', type: 'bool', description: 'True when an obstacle is detected' },
    ],
    properties: [],
    dependencies: {
        includes: [],
        globals: [],
        setup: [],
    },
    implementation: { type: 'builtin' },
};
