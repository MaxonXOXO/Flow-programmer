"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OLEDDisplayPackage = void 0;
exports.OLEDDisplayPackage = {
    metadata: {
        id: 'oled_display',
        name: 'OLED Display',
        description: '128Ã—64 monochrome OLED graphic display via I2C (SSD1306)',
        category: 'display',
        icon: 'ðŸ–¥',
        tags: ['oled', 'display', 'graphics', 'i2c', 'ssd1306'],
    },
    pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'sda', label: 'SDA', signal: 'i2c', required: true },
        { id: 'scl', label: 'SCL', signal: 'i2c', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true },
    ],
    outputs: [],
    properties: [
        {
            id: 'address',
            label: 'I2C Address',
            type: 'string',
            defaultValue: '0x3C',
            description: 'I2C address of the OLED controller (commonly 0x3C or 0x3D)',
        },
        {
            id: 'width',
            label: 'Width (px)',
            type: 'number',
            defaultValue: 128,
            min: 64,
            max: 256,
            description: 'Horizontal pixel resolution of the display',
        },
        {
            id: 'height',
            label: 'Height (px)',
            type: 'number',
            defaultValue: 64,
            min: 32,
            max: 128,
            description: 'Vertical pixel resolution of the display',
        },
    ],
    dependencies: {
        includes: ['Wire.h', 'Adafruit_GFX.h', 'Adafruit_SSD1306.h'],
        globals: ['Adafruit_SSD1306 display($width, $height, &Wire, -1)'],
        setup: ['display.begin(SSD1306_SWITCHCAPVCC, $address)', 'display.clearDisplay()'],
    },
    implementation: { type: 'builtin' },
};
