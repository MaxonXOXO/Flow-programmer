"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchPackageExecution = dispatchPackageExecution;
const packageResolver_1 = require("./packageResolver");
/**
 * Execution Dispatcher for Component Packages.
 *
 * Routes execution based on the package's declared implementation strategy:
 * - strategy === 'builtin': delegates to builtin handler or fallback.
 * - strategy === 'subflow': throws Phase 6 error ("Subflow package execution is not implemented yet.")
 * - strategy === 'native': throws Phase 6 error ("Native package execution is not implemented yet.")
 */
function dispatchPackageExecution(pkgOrId, context = {}, builtinHandler) {
    const resolved = (0, packageResolver_1.resolvePackageImplementation)(pkgOrId);
    switch (resolved.strategy) {
        case 'builtin': {
            if (builtinHandler) {
                return builtinHandler(resolved, context);
            }
            return {
                strategy: 'builtin',
                handled: true,
            };
        }
        case 'subflow': {
            throw new Error(`Subflow package execution is not implemented yet.`);
        }
        case 'native': {
            throw new Error(`Native package execution is not implemented yet.`);
        }
        default: {
            const invalidStrategy = resolved.strategy;
            throw new Error(`Unknown package implementation strategy "${invalidStrategy}".`);
        }
    }
}
