"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePackageImplementation = resolvePackageImplementation;
const components_1 = require("../../registry/components");
/**
 * Resolves the implementation strategy and configuration for a Component Package or Package ID.
 *
 * The compiler should query this resolver instead of inspecting component IDs or labels directly.
 */
function resolvePackageImplementation(pkgOrId) {
    let pkg;
    let packageId = 'unknown';
    if (typeof pkgOrId === 'string') {
        packageId = pkgOrId;
        pkg = (0, components_1.getComponentPackage)(pkgOrId);
        // Also support matching by common sensor key aliases if needed
        if (!pkg) {
            if (pkgOrId.includes('ultrasonic') || pkgOrId === 'hcsr04') {
                pkg = (0, components_1.getComponentPackage)('ultrasonic_hcsr04');
            }
        }
    }
    else {
        pkg = pkgOrId;
        packageId = pkg.id || pkg.metadata?.id || 'unknown';
    }
    const impl = pkg?.implementation || { strategy: 'builtin', version: 1 };
    // Normalize strategy: prefer impl.strategy, fallback to impl.type mapping, default to 'builtin'
    let strategy = 'builtin';
    if (impl.strategy) {
        strategy = impl.strategy;
    }
    else if (impl.type === 'subflow') {
        strategy = 'subflow';
    }
    else if (impl.type === 'native') {
        strategy = 'native';
    }
    else {
        strategy = 'builtin';
    }
    let parsedSubflow = undefined;
    if (impl.subflow && typeof impl.subflow === 'object') {
        const s = impl.subflow;
        if (Array.isArray(s.nodes) && Array.isArray(s.edges)) {
            parsedSubflow = { nodes: s.nodes, edges: s.edges };
        }
    }
    return {
        strategy,
        version: impl.version || 1,
        entry: impl.entry,
        subflow: parsedSubflow,
        packageId,
    };
}
