"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.L293DPackage = void 0;
exports.L293DPackage = {
    metadata: {
        id: 'l293d',
        name: 'L293D Motor Driver',
        description: 'Quadruple half-H driver IC â€” controls two DC motors or one stepper',
        category: 'motor_driver',
        icon: 'âš™',
        tags: ['motor', 'driver', 'l293d', 'h-bridge', 'stepper'],
    },
    pins: [
        { id: 'vcc1', label: 'VCC1 (5V)', signal: 'power', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true },
        { id: 'vcc2', label: 'VCC2 (Motor)', signal: 'power', required: true },
        { id: 'en1', label: 'EN1', signal: 'pwm_input', required: true },
        { id: 'in1', label: 'IN1', signal: 'digital_input', required: true },
        { id: 'in2', label: 'IN2', signal: 'digital_input', required: true },
        { id: 'in3', label: 'IN3', signal: 'digital_input', required: true },
        { id: 'in4', label: 'IN4', signal: 'digital_input', required: true },
        { id: 'en2', label: 'EN2', signal: 'pwm_input', required: true },
        { id: 'out1', label: 'OUT1', signal: 'power', required: false },
        { id: 'out2', label: 'OUT2', signal: 'power', required: false },
        { id: 'out3', label: 'OUT3', signal: 'power', required: false },
        { id: 'out4', label: 'OUT4', signal: 'power', required: false },
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
