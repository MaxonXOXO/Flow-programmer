export interface OperationParameter {
  id: string;
  label: string;
  type: 'select_component' | 'select_pin' | 'text' | 'select' | 'variable_name';
  options?: string[] | (() => string[]);
  defaultValue?: string;
  placeholder?: string;
}

export interface OperationDefinition {
  id: string;
  name: string;
  category: 'control' | 'data' | 'io' | 'hardware';
  icon: string;
  description: string;
  parameters: OperationParameter[];
}

export const operationsRegistry: Record<string, OperationDefinition> = {
  start: {
    id: "start",
    name: "Start",
    category: "control",
    icon: "▶",
    description: "Program entry point",
    parameters: []
  },
  end: {
    id: "end",
    name: "End / Return",
    category: "control",
    icon: "⬛",
    description: "Program termination or function return",
    parameters: [
      { id: "value", label: "Return Value", type: "text", defaultValue: "", placeholder: "Expression or blank" }
    ]
  },
  condition: {
    id: "condition",
    name: "If Condition",
    category: "control",
    icon: "◇",
    description: "Conditional branching branch based on truth value",
    parameters: [
      { id: "condition", label: "Condition", type: "text", defaultValue: "x > 0", placeholder: "e.g., x > 5" }
    ]
  },
  loop: {
    id: "loop",
    name: "For Loop",
    category: "control",
    icon: "↻",
    description: "Repeats a block of code a set number of times",
    parameters: [
      { id: "var", label: "Loop Variable", type: "variable_name", defaultValue: "i" },
      { id: "from", label: "From", type: "text", defaultValue: "0" },
      { id: "to", label: "To", type: "text", defaultValue: "10" },
      { id: "step", label: "Step", type: "text", defaultValue: "1" }
    ]
  },
  loop_node: {
    id: "loop_node",
    name: "Loop Block",
    category: "control",
    icon: "↻",
    description: "Repeats connected subflow branch continuously",
    parameters: []
  },
  delay: {
    id: "delay",
    name: "Delay",
    category: "control",
    icon: "⏱",
    description: "Pause execution for a duration of milliseconds",
    parameters: [
      { id: "ms", label: "Milliseconds", type: "text", defaultValue: "1000" }
    ]
  },
  variable: {
    id: "variable",
    name: "Variable",
    category: "data",
    icon: "x=",
    description: "Declare or assign a variable",
    parameters: [
      { id: "name", label: "Variable Name", type: "variable_name", defaultValue: "x" },
      { id: "value", label: "Value", type: "text", defaultValue: "0" }
    ]
  },
  function: {
    id: "function",
    name: "Function Definition",
    category: "data",
    icon: "ƒ()",
    description: "Define a reusable function subflow",
    parameters: [
      { id: "name", label: "Function Name", type: "text", defaultValue: "myFn" },
      { id: "returnType", label: "Return Type", type: "select", options: ["void", "int", "float", "bool"], defaultValue: "void" }
    ]
  },
  function_call: {
    id: "function_call",
    name: "Function Call",
    category: "data",
    icon: "call()",
    description: "Call a user-defined function subflow",
    parameters: [
      { id: "functionName", label: "Select Function", type: "text", defaultValue: "" },
      { id: "assignTo", label: "Assign Return To", type: "variable_name", defaultValue: "", placeholder: "Variable name or empty" }
    ]
  },
  print: {
    id: "print",
    name: "Print",
    category: "io",
    icon: "»",
    description: "Print text or expressions to Serial Monitor",
    parameters: [
      { id: "message", label: "Message", type: "text", defaultValue: '"Hello"', placeholder: '"Hello" or x' }
    ]
  },
  input: {
    id: "input",
    name: "User Input",
    category: "io",
    icon: "←",
    description: "Read an integer value from Serial Monitor",
    parameters: [
      { id: "prompt", label: "Prompt Message", type: "text", defaultValue: '"Enter value:"' },
      { id: "var", label: "Assign To Variable", type: "variable_name", defaultValue: "val" }
    ]
  },
  
  // Generic Hardware operations driven by the Universal Components Registry:
  sensor_read: {
    id: "sensor_read",
    name: "Sensor Read",
    category: "hardware",
    icon: "≋",
    description: "Read a value from a connected sensor component",
    parameters: [
      { id: "componentId", label: "Select Sensor Component", type: "select_component" },
      { id: "readingType", label: "Reading Type (DHT only)", type: "select", options: ["Temperature", "Humidity", "Default"], defaultValue: "Temperature" },
      { id: "var", label: "Assign Reading To", type: "variable_name", defaultValue: "sensorVal" }
    ]
  },
  gpio_write: {
    id: "gpio_write",
    name: "GPIO Write",
    category: "hardware",
    icon: "⚡",
    description: "Write digital HIGH or LOW state to a pin",
    parameters: [
      { id: "pin", label: "Pin", type: "select_pin" },
      { id: "value", label: "Value", type: "select", options: ["HIGH", "LOW"], defaultValue: "HIGH" }
    ]
  },
  servo_control: {
    id: "servo_control",
    name: "Servo Control",
    category: "hardware",
    icon: "🔧",
    description: "Set the angle of a connected servo motor",
    parameters: [
      { id: "componentId", label: "Select Servo", type: "select_component" },
      { id: "angle", label: "Angle (0-180)", type: "text", defaultValue: "90" }
    ]
  },
  print_lcd: {
    id: "print_lcd",
    name: "Print to LCD",
    category: "hardware",
    icon: "📺",
    description: "Display message on connected LCD",
    parameters: [
      { id: "componentId", label: "Select LCD", type: "select_component" },
      { id: "text", label: "Message Expression", type: "text", defaultValue: '"Hello"' },
      { id: "row", label: "Row (0-1)", type: "text", defaultValue: "0" },
      { id: "col", label: "Column (0-15)", type: "text", defaultValue: "0" }
    ]
  },
  print_oled: {
    id: "print_oled",
    name: "Print to OLED",
    category: "hardware",
    icon: "🖥",
    description: "Display message on connected OLED screen",
    parameters: [
      { id: "componentId", label: "Select OLED", type: "select_component" },
      { id: "text", label: "Message Expression", type: "text", defaultValue: '"Hello"' },
      { id: "x", label: "X Coordinate", type: "text", defaultValue: "0" },
      { id: "y", label: "Y Coordinate", type: "text", defaultValue: "0" },
      { id: "size", label: "Font Size", type: "text", defaultValue: "1" }
    ]
  },
  api: {
    id: "api",
    name: "HTTP API",
    category: "io",
    icon: "⇌",
    description: "Execute a remote network request (if supported)",
    parameters: [
      { id: "url", label: "API URL", type: "text", defaultValue: '"https://api.example.com"' },
      { id: "method", label: "HTTP Method", type: "select", options: ["GET", "POST"], defaultValue: "GET" }
    ]
  }
};

export const getOperationById = (id: string): OperationDefinition | undefined => {
  return operationsRegistry[id];
};

export const getAllOperations = (): OperationDefinition[] => {
  return Object.values(operationsRegistry);
};
