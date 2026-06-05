import { Parameter } from '../ast/ast';

export interface VariableSymbol {
  kind: 'variable';
  name: string;
  type: string; // e.g., 'int', 'float', 'string', 'boolean'
  scope: 'global' | 'function' | 'loop';
  nodeId?: string;
}

export interface FunctionSymbol {
  kind: 'function';
  name: string;
  returnType: string;
  parameters: Parameter[];
  nodeId?: string;
}

export interface HardwareSymbol {
  kind: 'hardware';
  name: string;
  dataType: string; // e.g., 'dht', 'ultrasonic', etc.
  nodeId?: string;
}

export type SymbolInfo = VariableSymbol | FunctionSymbol | HardwareSymbol;

export class SymbolTable {
  private symbols: Map<string, SymbolInfo> = new Map();
  public parent: SymbolTable | null = null;
  public scopeType: 'global' | 'function' | 'loop';

  constructor(parent: SymbolTable | null = null, scopeType: 'global' | 'function' | 'loop' = 'global') {
    this.parent = parent;
    this.scopeType = scopeType;
  }

  public define(symbol: SymbolInfo): boolean {
    if (this.symbols.has(symbol.name)) {
      return false; // Already declared in local scope
    }
    this.symbols.set(symbol.name, symbol);
    return true;
  }

  public lookup(name: string): SymbolInfo | undefined {
    let current: SymbolTable | null = this;
    while (current !== null) {
      const sym = current.symbols.get(name);
      if (sym) return sym;
      current = current.parent;
    }
    return undefined;
  }

  public lookupLocal(name: string): SymbolInfo | undefined {
    return this.symbols.get(name);
  }

  public clear(): void {
    this.symbols.clear();
  }

  public getAllLocalSymbols(): SymbolInfo[] {
    return Array.from(this.symbols.values());
  }
}
