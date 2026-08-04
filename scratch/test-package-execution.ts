import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { dispatchPackageExecution } from '../lib/compiler/packages/packageDispatcher';
import { UltrasonicHCSR04Package } from '../lib/registry/components/sensors/ultrasonic_hcsr04';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { ProgramNode } from '../lib/compiler/ast/ast';

function runPackageExecutionTests() {
  console.log('--- STARTING PACKAGE EXECUTION MODEL TESTS ---');

  // Test 1: Resolve Package Implementation by ID
  console.log('\n[Test 1] Resolving HC-SR04 package by ID...');
  const resolvedById = resolvePackageImplementation('ultrasonic_hcsr04');
  console.log('Resolved by ID:', resolvedById);
  if (resolvedById.strategy !== 'builtin') {
    throw new Error(`Test 1 failed: Expected strategy 'builtin', got '${resolvedById.strategy}'`);
  }
  if (resolvedById.version !== 1) {
    throw new Error(`Test 1 failed: Expected version 1, got ${resolvedById.version}`);
  }
  if (resolvedById.packageId !== 'ultrasonic_hcsr04') {
    throw new Error(`Test 1 failed: Expected packageId 'ultrasonic_hcsr04', got '${resolvedById.packageId}'`);
  }

  // Test 2: Resolve Package Implementation by Package Object
  console.log('\n[Test 2] Resolving HC-SR04 package by PackageDefinition object...');
  const resolvedByObj = resolvePackageImplementation(UltrasonicHCSR04Package as any);
  console.log('Resolved by Object:', resolvedByObj);
  if (resolvedByObj.strategy !== 'builtin') {
    throw new Error(`Test 2 failed: Expected strategy 'builtin', got '${resolvedByObj.strategy}'`);
  }

  // Test 3: Dispatch Builtin Strategy
  console.log('\n[Test 3] Dispatching builtin strategy for HC-SR04...');
  const dispatchResult = dispatchPackageExecution('ultrasonic_hcsr04', { instanceName: 'ultrasonic_1' });
  console.log('Dispatch Result:', dispatchResult);
  if (!dispatchResult.handled || dispatchResult.strategy !== 'builtin') {
    throw new Error('Test 3 failed: Dispatching builtin package did not return handled builtin result');
  }

  // Test 4: Subflow Placeholder Error Handling (Phase 6)
  console.log('\n[Test 4] Testing Subflow strategy error placeholder (Phase 6)...');
  const mockSubflowPackage = {
    metadata: { id: 'mock_subflow', name: 'Mock Subflow' },
    pins: [],
    outputs: [],
    properties: [],
    dependencies: { includes: [], globals: [], setup: [] },
    implementation: { strategy: 'subflow' as const, version: 1 }
  };
  
  let subflowErrorCaught = false;
  try {
    dispatchPackageExecution(mockSubflowPackage as any);
  } catch (err: any) {
    subflowErrorCaught = true;
    console.log('Caught expected subflow error:', err.message);
    if (!err.message.includes('Subflow package execution is not implemented yet')) {
      throw new Error(`Test 4 failed: Unexpected error message '${err.message}'`);
    }
  }
  if (!subflowErrorCaught) {
    throw new Error('Test 4 failed: Expected Subflow strategy error was not thrown');
  }

  // Test 5: Native Placeholder Error Handling
  console.log('\n[Test 5] Testing Native strategy error placeholder...');
  const mockNativePackage = {
    metadata: { id: 'mock_native', name: 'Mock Native' },
    pins: [],
    outputs: [],
    properties: [],
    dependencies: { includes: [], globals: [], setup: [] },
    implementation: { strategy: 'native' as const, version: 1 }
  };

  let nativeErrorCaught = false;
  try {
    dispatchPackageExecution(mockNativePackage as any);
  } catch (err: any) {
    nativeErrorCaught = true;
    console.log('Caught expected native error:', err.message);
    if (!err.message.includes('Native package execution is not implemented yet')) {
      throw new Error(`Test 5 failed: Unexpected error message '${err.message}'`);
    }
  }
  if (!nativeErrorCaught) {
    throw new Error('Test 5 failed: Expected Native strategy error was not thrown');
  }

  // Test 6: Arduino Uno Generator Integration
  console.log('\n[Test 6] Testing Arduino Uno Generator with HC-SR04 connections...');
  const mockProgram: ProgramNode = {
    kind: 'Program',
    body: []
  };

  const schemaNodes = [
    {
      id: 'arduino-uno',
      type: 'boardNode',
      data: { label: 'Arduino Uno' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'comp_ultrasonic',
      type: 'componentNode',
      data: { label: 'Ultrasonic HC-SR04', params: {} },
      position: { x: 100, y: 0 }
    }
  ];

  const schemaEdges = [
    {
      id: 'e1',
      source: 'comp_ultrasonic',
      target: 'arduino-uno',
      sourceHandle: 'trig',
      targetHandle: 'd9'
    },
    {
      id: 'e2',
      source: 'comp_ultrasonic',
      target: 'arduino-uno',
      sourceHandle: 'echo',
      targetHandle: 'd10'
    }
  ];

  const generator = new ArduinoUnoGenerator();
  const codeOutput = generator.generate(mockProgram, schemaNodes, schemaEdges);
  console.log('Generated Arduino Setup Code:\n', codeOutput.main);
  
  if (!codeOutput.main.includes('ULTRASONIC_HC_SR04_TRIG') || !codeOutput.main.includes('pinMode')) {
    throw new Error('Test 6 failed: Generated code output did not include expected setup pins');
  }

  console.log('\n--- ALL PACKAGE EXECUTION MODEL TESTS PASSED ---');
}

runPackageExecutionTests();
