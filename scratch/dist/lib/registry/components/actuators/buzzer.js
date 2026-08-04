"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuzzerPackage = void 0;
exports.BuzzerPackage = {
    metadata: {
        id: 'buzzer',
        name: 'Buzzer',
        description: 'Piezoelectric buzzer â€” emits tone on digital HIGH',
        category: 'actuator',
        icon: 'ðŸ””',
        tags: ['buzzer', 'sound', 'beeper', 'tone', 'alarm'],
    },
    pins: [
        { id: 'pos', label: '+', signal: 'digital_input', required: true },
        { id: 'neg', label: 'âˆ’', signal: 'ground', required: true },
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
