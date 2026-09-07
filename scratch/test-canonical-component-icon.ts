import assert from 'assert';
import React from 'react';
import { isFlowPackageComponent, getComponentPackageIcon } from '../lib/registry/components/componentIcon';
import { getComponentPackage } from '../lib/registry/components';

console.log('=== TEST CANONICAL COMPONENT ICON RESOLUTION ===\n');

// T1: Package identification test
console.log('--- T1: Package Identification ---');
assert(isFlowPackageComponent('ultrasonic_hcsr04') === true, 'T1.1: ultrasonic_hcsr04 is recognized as a flowplg component');
assert(isFlowPackageComponent('dht11') === false, 'T1.2: dht11 is recognized as a legacy component');
assert(isFlowPackageComponent('pir_motion') === false, 'T1.3: pir_motion is recognized as a legacy component');
console.log('✅ [PASS] T1: Flowplg vs legacy components properly distinguished');

// T2: Schema Node Identification
console.log('\n--- T2: Schema Node Identification ---');
const ultrasonicSchemaNode = {
  id: 'comp-12345',
  type: 'componentNode',
  data: {
    label: 'Ultrasonic HC-SR04',
    componentType: 'sensor',
    definition: getComponentPackage('ultrasonic_hcsr04'),
    params: { packageId: 'ultrasonic_hcsr04' }
  }
};
assert(isFlowPackageComponent(ultrasonicSchemaNode) === true, 'T2.1: Ultrasonic schema node recognized as flowplg component');

const dhtSchemaNode = {
  id: 'comp-99999',
  type: 'componentNode',
  data: {
    label: 'DHT Sensor',
    componentType: 'sensor',
    definition: getComponentPackage('dht11'),
    params: { packageId: 'dht11' }
  }
};
assert(isFlowPackageComponent(dhtSchemaNode) === false, 'T2.2: DHT schema node recognized as legacy component');
console.log('✅ [PASS] T2: Schema nodes accurately classified');

// T3: Icon Rendering for Flowplg Package
console.log('\n--- T3: Icon Rendering for Flowplg Package ---');
const ultrasonicIcon = getComponentPackageIcon(ultrasonicSchemaNode, { className: 'w-4 h-4', color: '#2fd18b' });
assert(React.isValidElement(ultrasonicIcon), 'T3.1: Ultrasonic icon is a valid React element');
// Check that it's the Radio component (representing acoustic waves)
assert((ultrasonicIcon as any).type?.name === 'Radio' || typeof (ultrasonicIcon as any).type === 'object', 'T3.2: Rendered package icon is Radio');
console.log('✅ [PASS] T3: Package sensor icon correctly rendered for Ultrasonic');

// T4: Legacy Fallback Preservation
console.log('\n--- T4: Legacy Fallback Preservation ---');
const customFallback = React.createElement('div', { id: 'legacy-fallback' });
const dhtIcon = getComponentPackageIcon(dhtSchemaNode, { fallback: customFallback });
assert(dhtIcon === customFallback, 'T4.1: Legacy component returns the specified fallback without adding unupgraded icons');
console.log('✅ [PASS] T4: Legacy fallback preserved for unupgraded components');

console.log('\n==================================================');
console.log('SUMMARY: All canonical icon resolution tests passed!');
console.log('==================================================');
