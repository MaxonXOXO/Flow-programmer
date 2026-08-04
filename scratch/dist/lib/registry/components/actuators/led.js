"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEDPackage = void 0;
exports.LEDPackage = {
    metadata: {
        id: 'led',
        name: 'LED',
        description: 'Light Emitting Diode â€” simple digital output indicator',
        category: 'actuator',
        icon: 'ðŸ’¡',
        tags: ['led', 'light', 'indicator', 'output'],
    },
    pins: [
        { id: 'anode', label: 'Anode (+)', signal: 'digital_input', required: true },
        { id: 'cathode', label: 'Cathode (âˆ’)', signal: 'ground', required: true },
    ],
    outputs: [],
    properties: [],
    dependencies: {
        includes: [],
        globals: [],
        setup: [],
    },
    implementation: { type: 'builtin' },
};
