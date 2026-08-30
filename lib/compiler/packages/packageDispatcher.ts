import { ResolvedPackageImplementation, resolvePackageImplementation } from './packageResolver';
import { ComponentPackage, PackageDefinition } from '../../registry/components/types';

export interface PackageExecutionContext {
  instanceName?: string;
  pins?: Record<string, string>;
  params?: Record<string, any>;
  [key: string]: any;
}

export interface PackageExecutionResult {
  strategy: string;
  handled: boolean;
  code?: string;
  data?: any;
}

export type BuiltinExecutionHandler = (
  resolved: ResolvedPackageImplementation,
  context: PackageExecutionContext
) => PackageExecutionResult;

/**
 * Execution Dispatcher for Component Packages.
 *
 * Routes execution based on the package's declared implementation strategy:
 * - strategy === 'builtin': delegates to builtin handler or fallback.
 * - strategy === 'subflow': throws Phase 6 error ("Subflow package execution is not implemented yet.")
 * - strategy === 'native': throws Phase 6 error ("Native package execution is not implemented yet.")
 */
export function dispatchPackageExecution(
  pkgOrId: ComponentPackage | PackageDefinition | string,
  context: PackageExecutionContext = {},
  builtinHandler?: BuiltinExecutionHandler
): PackageExecutionResult {
  const resolved = resolvePackageImplementation(pkgOrId);

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

    case 'graph':
    case 'subflow': {
      return {
        strategy: 'graph',
        handled: true,
      };
    }

    case 'native': {
      return {
        strategy: 'native',
        handled: true,
      };
    }

    default: {
      const invalidStrategy = (resolved as any).strategy;
      throw new Error(`Unknown package implementation strategy "${invalidStrategy}".`);
    }
  }
}
