import {
  ExpressionNode,
  LiteralExpressionNode,
  IdentifierExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode
} from '../ast/ast';

export interface Token {
  type: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';
  value: string;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Parentheses & Comma
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // String literals
    if (char === '"' || char === "'") {
      const quote = char;
      let val = '';
      i++; // Skip quote
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\') {
          i++; // Skip backslash
          if (i < input.length) {
            val += input[i];
          }
        } else {
          val += input[i];
        }
        i++;
      }
      i++; // Skip end quote
      tokens.push({ type: 'STRING', value: val });
      continue;
    }

    // Double char operators
    if (i + 1 < input.length) {
      const twoChars = input.substring(i, i + 2);
      if (['&&', '||', '==', '!=', '>=', '<='].includes(twoChars)) {
        tokens.push({ type: 'OPERATOR', value: twoChars });
        i += 2;
        continue;
      }
    }

    // Single char operators
    if (['>', '<', '+', '-', '*', '/', '!'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      let val = '';
      while (i < input.length && /[\d\.]/.test(input[i])) {
        val += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    // Identifiers and Booleans (allowing dots for member function calls)
    if (/[a-zA-Z_]/.test(char)) {
      let val = '';
      while (i < input.length && /[a-zA-Z0-9_\.]/.test(input[i])) {
        val += input[i];
        i++;
      }
      if (val === 'true' || val === 'false') {
        tokens.push({ type: 'BOOLEAN', value: val });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: val });
      }
      continue;
    }

    throw new Error(`Unexpected character: "${char}" at index ${i}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

export class ExpressionParser {
  private tokens: Token[];
  private current = 0;
  private nodeId?: string;

  constructor(tokens: Token[], nodeId?: string) {
    this.tokens = tokens;
    this.nodeId = nodeId;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: Token['type'][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchOperator(op: string): boolean {
    if (this.check('OPERATOR') && this.peek().value === op) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAnyOperator(ops: string[]): boolean {
    if (this.check('OPERATOR') && ops.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: Token['type'], message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }

  public parse(): ExpressionNode {
    return this.logicOr();
  }

  private logicOr(): ExpressionNode {
    let expr = this.logicAnd();

    while (this.matchOperator('||')) {
      const operator = this.previous().value;
      const right = this.logicAnd();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private logicAnd(): ExpressionNode {
    let expr = this.equality();

    while (this.matchOperator('&&')) {
      const operator = this.previous().value;
      const right = this.equality();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private equality(): ExpressionNode {
    let expr = this.comparison();

    while (this.matchAnyOperator(['==', '!='])) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private comparison(): ExpressionNode {
    let expr = this.term();

    while (this.matchAnyOperator(['>', '<', '>=', '<='])) {
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private term(): ExpressionNode {
    let expr = this.factor();

    while (this.matchAnyOperator(['+', '-'])) {
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private factor(): ExpressionNode {
    let expr = this.unary();

    while (this.matchAnyOperator(['*', '/'])) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        kind: 'BinaryExpression',
        nodeId: this.nodeId,
        operator,
        left: expr,
        right
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private unary(): ExpressionNode {
    if (this.matchAnyOperator(['!', '-'])) {
      const operator = this.previous().value;
      const right = this.unary();
      return {
        kind: 'UnaryExpression',
        nodeId: this.nodeId,
        operator,
        argument: right
      } as UnaryExpressionNode;
    }

    return this.primary();
  }

  private primary(): ExpressionNode {
    if (this.match('BOOLEAN')) {
      const val = this.previous().value === 'true';
      return {
        kind: 'Literal',
        nodeId: this.nodeId,
        value: val,
        valueType: 'boolean'
      } as LiteralExpressionNode;
    }

    if (this.match('NUMBER')) {
      const valStr = this.previous().value;
      const isFloat = valStr.includes('.');
      return {
        kind: 'Literal',
        nodeId: this.nodeId,
        value: Number(valStr),
        valueType: isFloat ? 'float' : 'int'
      } as LiteralExpressionNode;
    }

    if (this.match('STRING')) {
      return {
        kind: 'Literal',
        nodeId: this.nodeId,
        value: this.previous().value,
        valueType: 'string'
      } as LiteralExpressionNode;
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;

      // Check if it is a function call
      if (this.match('LPAREN')) {
        const args: ExpressionNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parse());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', "Expect ')' after arguments.");
        return {
          kind: 'CallExpression',
          nodeId: this.nodeId,
          callee: name,
          arguments: args
        } as CallExpressionNode;
      }

      return {
        kind: 'Identifier',
        nodeId: this.nodeId,
        name
      } as IdentifierExpressionNode;
    }

    if (this.match('LPAREN')) {
      const expr = this.parse();
      this.consume('RPAREN', "Expect ')' after expression.");
      return expr;
    }

    throw new Error(`Expect expression but found token type "${this.peek().type}" with value "${this.peek().value}"`);
  }
}

export function parseExpressionString(input: string, nodeId?: string): ExpressionNode {
  const trimmed = input.trim();
  if (trimmed === '') {
    return {
      kind: 'Literal',
      nodeId,
      value: 0,
      valueType: 'int'
    };
  }
  const tokens = tokenize(trimmed);
  const parser = new ExpressionParser(tokens, nodeId);
  return parser.parse();
}
