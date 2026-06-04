export interface SymbolInfo {
  name: string;
  type: 'variable' | 'function' | 'hardware';
  dataType: string; // 'int' | 'float' | 'string' | 'boolean' | 'void'
  nodeId?: string;
}

export class SymbolTable {
  private symbols: Map<string, SymbolInfo> = new Map();
  public parent: SymbolTable | null = null;

  constructor(parent: SymbolTable | null = null) {
    this.parent = parent;
  }

  public define(symbol: SymbolInfo): boolean {
    if (this.symbols.has(symbol.name)) {
      return false; // Already declared in this scope!
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
