import { Expression } from './ast';

export function mapLabelToPluginType(label: string): string | undefined {
  const lbl = label.toLowerCase();
  if (lbl.includes('dht')) return 'dht';
  if (lbl.includes('ultrasonic')) return 'ultrasonic';
  if (lbl.includes('servo')) return 'servo';
  if (lbl.includes('lcd')) return 'lcd';
  if (lbl.includes('oled')) return 'oled';
  if (lbl.includes('ldr')) return 'ldr';
  if (lbl.includes('soil')) return 'soilMoisture';
  if (lbl.includes('water')) return 'waterLevel';
  if (lbl.includes('gas') || lbl.includes('mq')) return 'mqGas';
  if (lbl.includes('pir')) return 'pir';
  if (lbl.includes('ir sensor') || lbl.includes('obstacle')) return 'ir';
  if (lbl.includes('vibration')) return 'vibration';
  if (lbl.includes('flame')) return 'flame';
  if (lbl.includes('l298n')) return 'l298n';
  if (lbl.includes('l293d')) return 'l293d';
  return undefined;
}

export function formatStringLiteral(str: string): string {
  if (!str) return '""';
  const trimmed = str.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed;
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return `"${trimmed.slice(1, -1)}"`;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed;
  }
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  if (/[\+\-\*\/\(\)\.]/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed}"`;
}

export function parsePrintArguments(str: string): string[] {
  if (!str) return [];
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if ((char === '"' || char === "'") && (i === 0 || str[i-1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      }
      current += char;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts.filter(p => p !== '');
}

export interface PinRequirement {
  name: string;
  type: 'digital' | 'analog' | 'power' | 'i2c' | 'spi';
}

export interface ComponentPlugin {
  type: string;
  label: string;
  icon: string;
  category: 'sensors' | 'displays' | 'actuators' | 'communication';
  pins: PinRequirement[];
  codegen: {
    includes: string[];
    defines?: (instanceName: string, pins: Record<string, string>) => string[];
    globals?: (instanceName: string, pins: Record<string, string>, params: Record<string, string>) => string[];
    setup?: (instanceName: string, pins: Record<string, string>, params: Record<string, string>) => string[];
    // Translates the node action into AST statement or custom target C++ code
    customCodegen?: (
      instanceName: string,
      pins: Record<string, string>,
      params: Record<string, string>,
      declaredVars: Set<string>,
      pad: string
    ) => string;
  };
  simulation: {
    initialize: (params: Record<string, string>) => Record<string, any>;
    execute: (
      methodName: string,
      args: any[],
      params: Record<string, string>,
      simState: any
    ) => { value: any; updatedState: any };
  };
}

export class PluginRegistry {
  private plugins: Map<string, ComponentPlugin> = new Map();

  constructor() {
    this.registerDefaultPlugins();
  }

  public register(plugin: ComponentPlugin) {
    this.plugins.set(plugin.type, plugin);
  }

  public get(type: string): ComponentPlugin | undefined {
    return this.plugins.get(type);
  }

  public getAll(): ComponentPlugin[] {
    return Array.from(this.plugins.values());
  }

  private registerDefaultPlugins() {
    // 1. DHT
    this.register({
      type: 'dht',
      label: 'DHT Sensor',
      icon: 'Thermometer',
      category: 'sensors',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'data', type: 'digital' }
      ],
      codegen: {
        includes: ['#include <DHT.h>'],
        globals: (instance, pins, params) => {
          const pin = pins['data'] || params.pin || '2';
          const sensorType = params.sensorType || 'DHT11';
          return [`DHT ${instance}(${pin}, ${sensorType});`];
        },
        setup: (instance) => [`${instance}.begin();`],
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const varTemp = params.varTemp || 'temp';
          const varHum = params.varHum || 'hum';
          const declTemp = declaredVars.has(varTemp) ? '' : 'float ';
          const declHum = declaredVars.has(varHum) ? '' : 'float ';
          return [
            `${pad}${declTemp}${varTemp} = ${instance}.readTemperature();`,
            `${pad}${declHum}${varHum} = ${instance}.readHumidity();`
          ].join('\n');
        }
      },
      simulation: {
        initialize: () => ({ temperature: 24.0, humidity: 45.0 }),
        execute: (methodName, args, params, simState) => {
          if (methodName === 'readTemperature') return { value: simState.temperature || 24.0, updatedState: simState };
          if (methodName === 'readHumidity') return { value: simState.humidity || 45.0, updatedState: simState };
          return { value: 0, updatedState: simState };
        }
      }
    });

    // 2. Ultrasonic
    this.register({
      type: 'ultrasonic',
      label: 'Ultrasonic Distance',
      icon: 'Radio',
      category: 'sensors',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'trig', type: 'digital' },
        { name: 'echo', type: 'digital' }
      ],
      codegen: {
        includes: [],
        setup: (instance, pins, params) => {
          const trig = pins['trig'] || params.trigPin || '9';
          const echo = pins['echo'] || params.echoPin || '10';
          return [
            `pinMode(${trig}, OUTPUT); // HC-SR04 TRIG`,
            `pinMode(${echo}, INPUT);  // HC-SR04 ECHO`
          ];
        },
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const trig = pins['trig'] || params.trigPin || '9';
          const echo = pins['echo'] || params.echoPin || '10';
          const varDist = params.varDist || 'distance';
          const declDist = declaredVars.has(varDist) ? '' : 'float ';
          const durVar = `duration_${instance}`;
          return [
            `${pad}digitalWrite(${trig}, LOW);`,
            `${pad}delayMicroseconds(2);`,
            `${pad}digitalWrite(${trig}, HIGH);`,
            `${pad}delayMicroseconds(10);`,
            `${pad}digitalWrite(${trig}, LOW);`,
            `${pad}long ${durVar} = pulseIn(${echo}, HIGH);`,
            `${pad}${declDist}${varDist} = ${durVar} * 0.034 / 2;`
          ].join('\n');
        }
      },
      simulation: {
        initialize: () => ({ distance: 50 }),
        execute: (methodName, args, params, simState) => {
          if (methodName === 'readDistance') return { value: simState.distance || 50, updatedState: simState };
          return { value: 0, updatedState: simState };
        }
      }
    });

    // 3. Servo Motor
    this.register({
      type: 'servo',
      label: 'Servo Motor',
      icon: 'Wrench',
      category: 'actuators',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'signal', type: 'digital' }
      ],
      codegen: {
        includes: ['#include <Servo.h>'],
        globals: (instance) => [`Servo ${instance};`],
        setup: (instance, pins, params) => {
          const pin = pins['signal'] || params.pin || '9';
          return [`${instance}.attach(${pin});`];
        },
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const angle = params.angle || '90';
          return `${pad}${instance}.write(${angle});`;
        }
      },
      simulation: {
        initialize: () => ({ angle: 90 }),
        execute: (methodName, args, params, simState) => {
          if (methodName === 'write') {
            const angle = args[0] !== undefined ? args[0] : 90;
            return { value: null, updatedState: { ...simState, angle } };
          }
          return { value: null, updatedState: simState };
        }
      }
    });

    // 4. LCD Display (LiquidCrystal_I2C)
    this.register({
      type: 'lcd',
      label: 'LCD 16x2 Display',
      icon: 'Tv',
      category: 'displays',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'sda', type: 'i2c' },
        { name: 'scl', type: 'i2c' }
      ],
      codegen: {
        includes: ['#include <Wire.h>', '#include <LiquidCrystal_I2C.h>'],
        globals: (instance, pins, params) => {
          const addr = params.i2cAddr || params.address || '0x27';
          const cols = params.cols || '16';
          const rows = params.rows || '2';
          return [`LiquidCrystal_I2C ${instance}(${addr}, ${cols}, ${rows});`];
        },
        setup: (instance) => [
          `${instance}.init();`,
          `${instance}.backlight();`
        ],
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const rawText = params.text || '';
          const row = params.row || '0';
          const col = params.col || '0';
          const parts = parsePrintArguments(rawText);

          const lines = [`${pad}${instance}.setCursor(${col}, ${row});`];
          if (parts.length === 0) {
            lines.push(`${pad}${instance}.print("");`);
          } else {
            parts.forEach(part => {
              lines.push(`${pad}${instance}.print(${formatStringLiteral(part)});`);
            });
          }
          return lines.join('\n');
        }
      },
      simulation: {
        initialize: () => ({ lines: ['', ''] }),
        execute: (methodName, args, params, simState) => {
          if (methodName === 'print') {
            const text = args[0] !== undefined ? String(args[0]) : '';
            const row = args[1] !== undefined ? Number(args[1]) : 0;
            const lines = [...(simState.lines || ['', ''])];
            lines[row] = text.slice(0, 16);
            return { value: null, updatedState: { ...simState, lines } };
          }
          return { value: null, updatedState: simState };
        }
      }
    });

    // 5. Analog sensors helper (LDR, Soil Moisture, Water Level, Gas)
    const registerAnalogSensor = (type: string, label: string, defaultPin: string, defaultVar: string, icon: string) => {
      this.register({
        type,
        label,
        icon,
        category: 'sensors',
        pins: [
          { name: 'vcc', type: 'power' },
          { name: 'gnd', type: 'power' },
          { name: 'signal', type: 'analog' }
        ],
        codegen: {
          includes: [],
          setup: (instance, pins, params) => {
            const pin = pins['signal'] || params.pin || defaultPin;
            return [`pinMode(${pin}, INPUT);`];
          },
          customCodegen: (instance, pins, params, declaredVars, pad) => {
            const pin = pins['signal'] || params.pin || defaultPin;
            const varName = params[defaultVar] || defaultVar;
            const decl = declaredVars.has(varName) ? '' : 'int ';
            return `${pad}${decl}${varName} = analogRead(${pin});`;
          }
        },
        simulation: {
          initialize: () => ({ val: 512 }),
          execute: (methodName, args, params, simState) => {
            return { value: simState.val || 512, updatedState: simState };
          }
        }
      });
    };

    registerAnalogSensor('ldr', 'LDR Light Sensor', 'A0', 'lightVal', 'Sun');
    registerAnalogSensor('soilMoisture', 'Soil Moisture', 'A1', 'moisture', 'Droplets');
    registerAnalogSensor('waterLevel', 'Water Level Sensor', 'A2', 'waterLevel', 'Waves');
    registerAnalogSensor('mqGas', 'MQ Gas Sensor', 'A3', 'gasVal', 'Wind');

    // 6. Digital sensors helper (PIR, IR Obstacle, Vibration)
    const registerDigitalSensor = (type: string, label: string, defaultPin: string, defaultVar: string, icon: string) => {
      this.register({
        type,
        label,
        icon,
        category: 'sensors',
        pins: [
          { name: 'vcc', type: 'power' },
          { name: 'gnd', type: 'power' },
          { name: 'signal', type: 'digital' }
        ],
        codegen: {
          includes: [],
          setup: (instance, pins, params) => {
            const pin = pins['signal'] || params.pin || defaultPin;
            return [`pinMode(${pin}, INPUT);`];
          },
          customCodegen: (instance, pins, params, declaredVars, pad) => {
            const pin = pins['signal'] || params.pin || defaultPin;
            const varName = params[defaultVar] || defaultVar;
            const decl = declaredVars.has(varName) ? '' : 'int ';
            return `${pad}${decl}${varName} = digitalRead(${pin});`;
          }
        },
        simulation: {
          initialize: () => ({ val: 0 }),
          execute: (methodName, args, params, simState) => {
            return { value: simState.val || 0, updatedState: simState };
          }
        }
      });
    };

    registerDigitalSensor('pir', 'PIR Motion Sensor', '3', 'motion', 'Eye');
    registerDigitalSensor('ir', 'IR Obstacle Sensor', '3', 'obstacle', 'Eye');
    registerDigitalSensor('vibration', 'Vibration Sensor', '5', 'vibration', 'Activity');

    // 7. Flame Sensor (Digital/Analog dual)
    this.register({
      type: 'flame',
      label: 'Flame Sensor',
      icon: 'Flame',
      category: 'sensors',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'signal', type: 'digital' }
      ],
      codegen: {
        includes: [],
        setup: (instance, pins, params) => {
          const pin = pins['signal'] || params.pin || '4';
          return [`pinMode(${pin}, INPUT);`];
        },
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const pin = pins['signal'] || params.pin || '4';
          const varFlame = params.varFlame || 'flameVal';
          const variant = params.variant || 'Active Low';
          const decl = declaredVars.has(varFlame) ? '' : 'int ';
          const readExpr = pin.startsWith('A')
            ? `analogRead(${pin})`
            : (variant === 'Active Low' ? `!digitalRead(${pin})` : `digitalRead(${pin})`);
          return `${pad}${decl}${varFlame} = ${readExpr};`;
        }
      },
      simulation: {
        initialize: () => ({ val: 0 }),
        execute: (methodName, args, params, simState) => {
          return { value: simState.val || 0, updatedState: simState };
        }
      }
    });

    // 8. OLED Display (Adafruit_SSD1306)
    this.register({
      type: 'oled',
      label: 'OLED Display 128x64',
      icon: 'Monitor',
      category: 'displays',
      pins: [
        { name: 'vcc', type: 'power' },
        { name: 'gnd', type: 'power' },
        { name: 'sda', type: 'i2c' },
        { name: 'scl', type: 'i2c' }
      ],
      codegen: {
        includes: ['#include <Wire.h>', '#include <Adafruit_SSD1306.h>'],
        globals: (instance, pins, params) => {
          const width = params.width || '128';
          const height = params.height || '64';
          return [`Adafruit_SSD1306 ${instance}(${width}, ${height}, &Wire, -1);`];
        },
        setup: (instance, pins, params) => {
          const addr = params.i2cAddr || params.address || '0x3C';
          return [
            `${instance}.begin(SSD1306_SWITCHCAPVCC, ${addr});`,
            `${instance}.clearDisplay();`
          ];
        },
        customCodegen: (instance, pins, params, declaredVars, pad) => {
          const rawText = params.text || '';
          const row = params.row || '0';
          const col = params.col || '0';
          const size = params.size || '1';
          const parts = parsePrintArguments(rawText);

          const lines = [
            `${pad}${instance}.setTextSize(${size});`,
            `${pad}${instance}.setTextColor(SSD1306_WHITE);`,
            `${pad}${instance}.setCursor(${col}, ${row});`
          ];

          if (parts.length === 0) {
            lines.push(`${pad}${instance}.print("");`);
          } else {
            parts.forEach(part => {
              lines.push(`${pad}${instance}.print(${formatStringLiteral(part)});`);
            });
          }

          lines.push(`${pad}${instance}.display();`);
          return lines.join('\n');
        }
      },
      simulation: {
        initialize: () => ({ text: '' }),
        execute: (methodName, args, params, simState) => {
          if (methodName === 'print') {
            return { value: null, updatedState: { ...simState, text: String(args[0]) } };
          }
          if (methodName === 'clear') {
            return { value: null, updatedState: { ...simState, text: '' } };
          }
          return { value: null, updatedState: simState };
        }
      }
    });

    // 9. Motor drivers helper (L298N, L293D)
    const registerMotorDriver = (type: string, label: string) => {
      this.register({
        type,
        label,
        icon: 'Cpu',
        category: 'actuators',
        pins: [
          { name: 'vcc', type: 'power' },
          { name: 'gnd', type: 'power' },
          { name: 'ena', type: 'digital' },
          { name: 'in1', type: 'digital' },
          { name: 'in2', type: 'digital' },
          { name: 'in3', type: 'digital' },
          { name: 'in4', type: 'digital' },
          { name: 'enb', type: 'digital' }
        ],
        codegen: {
          includes: [],
          setup: (instance, pins, params) => {
            const ena = pins['ena'] || pins['en1'] || '9';
            const in1 = pins['in1'] || '8';
            const in2 = pins['in2'] || '7';
            const enb = pins['enb'] || pins['en2'] || '10';
            const in3 = pins['in3'] || '5';
            const in4 = pins['in4'] || '6';
            return [
              `pinMode(${ena}, OUTPUT);`,
              `pinMode(${in1}, OUTPUT);`,
              `pinMode(${in2}, OUTPUT);`,
              `pinMode(${enb}, OUTPUT);`,
              `pinMode(${in3}, OUTPUT);`,
              `pinMode(${in4}, OUTPUT);`
            ];
          },
          customCodegen: (instance, pins, params, declaredVars, pad) => {
            const motor = params.motor || 'Motor A';
            const direction = params.direction || 'Forward';
            const speed = params.speed || '255';
            const isMotorA = motor === 'Motor A';

            const enPin = isMotorA
              ? (pins['ena'] || pins['en1'] || '9')
              : (pins['enb'] || pins['en2'] || '10');
            const in1Pin = isMotorA ? (pins['in1'] || '8') : (pins['in3'] || '5');
            const in2Pin = isMotorA ? (pins['in2'] || '7') : (pins['in4'] || '6');

            const lines: string[] = [];
            if (direction === 'Forward') {
              lines.push(`${pad}digitalWrite(${in1Pin}, HIGH);`);
              lines.push(`${pad}digitalWrite(${in2Pin}, LOW);`);
              lines.push(`${pad}analogWrite(${enPin}, ${speed});`);
            } else if (direction === 'Backward') {
              lines.push(`${pad}digitalWrite(${in1Pin}, LOW);`);
              lines.push(`${pad}digitalWrite(${in2Pin}, HIGH);`);
              lines.push(`${pad}analogWrite(${enPin}, ${speed});`);
            } else {
              lines.push(`${pad}digitalWrite(${in1Pin}, LOW);`);
              lines.push(`${pad}digitalWrite(${in2Pin}, LOW);`);
              lines.push(`${pad}analogWrite(${enPin}, 0);`);
            }
            return lines.join('\n');
          }
        },
        simulation: {
          initialize: () => ({ motorA: { direction: 'Stop', speed: 0 }, motorB: { direction: 'Stop', speed: 0 } }),
          execute: (methodName, args, params, simState) => {
            const motor = params.motor || 'Motor A';
            const direction = params.direction || 'Forward';
            const speed = Number(params.speed || '255');
            if (motor === 'Motor A') {
              return { value: null, updatedState: { ...simState, motorA: { direction, speed } } };
            } else {
              return { value: null, updatedState: { ...simState, motorB: { direction, speed } } };
            }
          }
        }
      });
    };

    registerMotorDriver('l298n', 'L298N Motor Driver');
    registerMotorDriver('l293d', 'L293D Motor Driver');
  }
}

export const pluginRegistry = new PluginRegistry();
