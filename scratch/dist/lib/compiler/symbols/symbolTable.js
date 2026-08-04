"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolTable = void 0;
class SymbolTable {
    symbols = new Map();
    parent = null;
    scopeType;
    constructor(parent = null, scopeType = 'global') {
        this.parent = parent;
        this.scopeType = scopeType;
    }
    define(symbol) {
        if (this.symbols.has(symbol.name)) {
            return false; // Already declared in local scope
        }
        this.symbols.set(symbol.name, symbol);
        return true;
    }
    lookup(name) {
        let current = this;
        while (current !== null) {
            const sym = current.symbols.get(name);
            if (sym)
                return sym;
            current = current.parent;
        }
        return undefined;
    }
    lookupLocal(name) {
        return this.symbols.get(name);
    }
    clear() {
        this.symbols.clear();
    }
    getAllLocalSymbols() {
        return Array.from(this.symbols.values());
    }
}
exports.SymbolTable = SymbolTable;
