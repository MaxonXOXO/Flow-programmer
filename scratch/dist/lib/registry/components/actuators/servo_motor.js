"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServoMotorPackage = void 0;
exports.ServoMotorPackage = {
    metadata: {
        id: 'servo_motor',
        name: 'Servo Motor',
        description: 'Angular position controlled motor (0Â°â€“180Â°)',
        category: 'actuator',
        icon: 'ðŸ”§',
        tags: ['servo', 'motor', 'angular', 'position'],
    },
    pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'signal', label: 'Signal', signal: 'pwm_input', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true },
    ],
    outputs: [],
    properties: [
        {
            id: 'signalPin',
            label: 'Signal Pin',
            type: 'pin',
            defaultValue: '',
            description: 'Arduino PWM-capable pin connected to the servo signal wire',
        },
    ],
    dependencies: {
        includes: ['Servo.h'],
        globals: ['Servo myServo'],
        setup: ['myServo.attach($signalPin)'],
    },
    implementation: { type: 'builtin' },
};
