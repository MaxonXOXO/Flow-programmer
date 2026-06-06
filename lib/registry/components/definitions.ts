export interface ComponentPin {
  id: string;
  label: string;
  type: 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'i2c' | 'spi' | 'uart';
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: 'sensor' | 'actuator' | 'display' | 'comms';
  description: string;
  icon: string;
  pins: ComponentPin[];
  operations: string[];
  runtime: {
    includes?: string[];
    globals?: string; // Global variable declarations or initializers
    setup?: string;   // Setup statements (e.g., pinMode or begin calls)
    templates: Record<string, {
      returns: 'int' | 'float' | 'bool' | 'void' | 'string';
      code: string;  // Code template string (with placeholder tokens like {pin})
    }>;
  };
}

export const componentsRegistry: Record<string, ComponentDefinition> = {
  led: {
    id: "led",
    name: "LED",
    category: "actuator",
    description: "Standard Light Emitting Diode",
    icon: "💡",
    pins: [
      { id: "anode", label: "Anode (+)", type: "digital" },
      { id: "cathode", label: "Cathode (-)", type: "ground" }
    ],
    operations: ["gpio_write", "pwm_write"],
    runtime: {
      setup: "pinMode({pin_anode}, OUTPUT);",
      templates: {
        gpio_write: {
          returns: "void",
          code: "digitalWrite({pin_anode}, {value})"
        },
        pwm_write: {
          returns: "void",
          code: "analogWrite({pin_anode}, {value})"
        }
      }
    }
  },

  push_button: {
    id: "push_button",
    name: "Push Button",
    category: "sensor",
    description: "Momentary tactile switch",
    icon: "⬛",
    pins: [
      { id: "pin1", label: "Pin 1", type: "digital" },
      { id: "pin2", label: "Pin 2", type: "ground" }
    ],
    operations: ["sensor_read"],
    runtime: {
      setup: "pinMode({pin_pin1}, INPUT_PULLUP);",
      templates: {
        sensor_read: {
          returns: "bool",
          code: "!digitalRead({pin_pin1})"
        }
      }
    }
  },

  dht22: {
    id: "dht22",
    name: "DHT22",
    category: "sensor",
    description: "Digital temperature and humidity sensor",
    icon: "🌡",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "data", label: "DATA", type: "digital" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["read_temperature", "read_humidity"],
    runtime: {
      includes: ["#include <DHT.h>"],
      globals: "DHT dht_{id}({pin_data}, DHT22);",
      setup: "dht_{id}.begin();",
      templates: {
        read_temperature: {
          returns: "float",
          code: "dht_{id}.readTemperature()"
        },
        read_humidity: {
          returns: "float",
          code: "dht_{id}.readHumidity()"
        }
      }
    }
  },

  ultrasonic: {
    id: "ultrasonic",
    name: "Ultrasonic HC-SR04",
    category: "sensor",
    description: "Ultrasonic distance rangefinder sensor",
    icon: "📡",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "trig", label: "TRIG", type: "digital" },
      { id: "echo", label: "ECHO", type: "digital" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read"],
    runtime: {
      setup: "pinMode({pin_trig}, OUTPUT);\npinMode({pin_echo}, INPUT);",
      templates: {
        sensor_read: {
          returns: "float",
          code: "([]() -> float {\n  digitalWrite({pin_trig}, LOW);\n  delayMicroseconds(2);\n  digitalWrite({pin_trig}, HIGH);\n  delayMicroseconds(10);\n  digitalWrite({pin_trig}, LOW);\n  long duration = pulseIn({pin_echo}, HIGH);\n  return duration * 0.034 / 2.0;\n})()"
        }
      }
    }
  },

  pir: {
    id: "pir",
    name: "PIR Sensor",
    category: "sensor",
    description: "Passive infrared motion detector",
    icon: "👁",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "out", label: "OUT", type: "digital" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read"],
    runtime: {
      setup: "pinMode({pin_out}, INPUT);",
      templates: {
        sensor_read: {
          returns: "bool",
          code: "digitalRead({pin_out}) == HIGH"
        }
      }
    }
  },

  ldr: {
    id: "ldr",
    name: "LDR Light",
    category: "sensor",
    description: "Light Dependent Resistor (Photoresistor)",
    icon: "☀",
    pins: [
      { id: "pin1", label: "AO", type: "analog" },
      { id: "pin2", label: "VCC", type: "power" }
    ],
    operations: ["sensor_read"],
    runtime: {
      templates: {
        sensor_read: {
          returns: "int",
          code: "analogRead({pin_pin1})"
        }
      }
    }
  },

  flame_sensor: {
    id: "flame_sensor",
    name: "Flame Sensor",
    category: "sensor",
    description: "Infrared flame detection sensor",
    icon: "🔥",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "do", label: "DO", type: "digital" },
      { id: "ao", label: "AO", type: "analog" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read", "analog_read"],
    runtime: {
      setup: "pinMode({pin_do}, INPUT);",
      templates: {
        sensor_read: {
          returns: "bool",
          code: "digitalRead({pin_do}) == LOW"
        },
        analog_read: {
          returns: "int",
          code: "analogRead({pin_ao})"
        }
      }
    }
  },

  soil_moisture: {
    id: "soil_moisture",
    name: "Soil Moisture",
    category: "sensor",
    description: "Soil moisture and water content sensor",
    icon: "🌱",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "do", label: "DO", type: "digital" },
      { id: "ao", label: "AO", type: "analog" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read", "analog_read"],
    runtime: {
      setup: "pinMode({pin_do}, INPUT);",
      templates: {
        sensor_read: {
          returns: "bool",
          code: "digitalRead({pin_do}) == LOW"
        },
        analog_read: {
          returns: "int",
          code: "analogRead({pin_ao})"
        }
      }
    }
  },

  water_level: {
    id: "water_level",
    name: "Water Level",
    category: "sensor",
    description: "Water level and depth detection sensor",
    icon: "💧",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "out", label: "OUT", type: "analog" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read"],
    runtime: {
      templates: {
        sensor_read: {
          returns: "int",
          code: "analogRead({pin_out})"
        }
      }
    }
  },

  mq_gas: {
    id: "mq_gas",
    name: "MQ Gas Sensor",
    category: "sensor",
    description: "Gas, smoke, and air quality detector",
    icon: "💨",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "do", label: "DO", type: "digital" },
      { id: "ao", label: "AO", type: "analog" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["sensor_read", "analog_read"],
    runtime: {
      setup: "pinMode({pin_do}, INPUT);",
      templates: {
        sensor_read: {
          returns: "bool",
          code: "digitalRead({pin_do}) == LOW"
        },
        analog_read: {
          returns: "int",
          code: "analogRead({pin_ao})"
        }
      }
    }
  },

  servo: {
    id: "servo",
    name: "Servo Motor",
    category: "actuator",
    description: "Standard angular servo motor",
    icon: "🔧",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "signal", label: "Signal", type: "pwm" },
      { id: "gnd", label: "GND", type: "ground" }
    ],
    operations: ["servo_control"],
    runtime: {
      includes: ["#include <Servo.h>"],
      globals: "Servo servo_{id};",
      setup: "servo_{id}.attach({pin_signal});",
      templates: {
        servo_control: {
          returns: "void",
          code: "servo_{id}.write({angle})"
        }
      }
    }
  },

  lcd1602: {
    id: "lcd1602",
    name: "LCD 16x2",
    category: "display",
    description: "Character LCD screen with I2C module",
    icon: "📺",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "gnd", label: "GND", type: "ground" },
      { id: "sda", label: "SDA", type: "i2c" },
      { id: "scl", label: "SCL", type: "i2c" }
    ],
    operations: ["print_lcd", "clear_lcd"],
    runtime: {
      includes: ["#include <Wire.h>", "#include <LiquidCrystal_I2C.h>"],
      globals: "LiquidCrystal_I2C lcd_{id}(0x27, 16, 2);",
      setup: "lcd_{id}.init();\nlcd_{id}.backlight();",
      templates: {
        print_lcd: {
          returns: "void",
          code: "lcd_{id}.setCursor({col}, {row});\nlcd_{id}.print({text});"
        },
        clear_lcd: {
          returns: "void",
          code: "lcd_{id}.clear();"
        }
      }
    }
  },

  oled: {
    id: "oled",
    name: "OLED 128x64",
    category: "display",
    description: "Monochrome graphical OLED display using I2C",
    icon: "🖥",
    pins: [
      { id: "vcc", label: "VCC", type: "power" },
      { id: "gnd", label: "GND", type: "ground" },
      { id: "sda", label: "SDA", type: "i2c" },
      { id: "scl", label: "SCL", type: "i2c" }
    ],
    operations: ["print_oled", "clear_oled"],
    runtime: {
      includes: ["#include <Adafruit_GFX.h>", "#include <Adafruit_SSD1306.h>"],
      globals: "#define SCREEN_WIDTH 128\n#define SCREEN_HEIGHT 64\nAdafruit_SSD1306 oled_{id}(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);",
      setup: "if(!oled_{id}.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n  for(;;);\n}\noled_{id}.clearDisplay();\noled_{id}.setTextSize(1);\noled_{id}.setTextColor(SSD1306_WHITE);",
      templates: {
        print_oled: {
          returns: "void",
          code: "oled_{id}.setCursor({x}, {y});\noled_{id}.setTextSize({size});\noled_{id}.print({text});\noled_{id}.display();"
        },
        clear_oled: {
          returns: "void",
          code: "oled_{id}.clearDisplay();\noled_{id}.display();"
        }
      }
    }
  }
};
