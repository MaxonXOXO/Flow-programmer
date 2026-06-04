import {
  Program,
  Statement,
  Expression,
  BlockStatement,
  VariableDeclaration,
  AssignmentStatement,
  IfStatement,
  ForLoop,
  WhileLoop,
  ReturnStatement,
  ExpressionStatement,
  FunctionDeclaration,
  Parameter
} from './ast';
import { parseExpressionString } from './compiler';

export interface Token {
  type: 'KEYWORD' | 'IDENTIFIER' | 'NUMBER' | 'STRING' | 'OPERATOR' | 'PUNCTUATION' | 'EOF';
  value: string;
}

export class CPPLexer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Skip whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Skip single line comments
      if (char === '/' && this.input[this.pos + 1] === '/') {
        this.pos += 2;
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }

      // Skip multi-line comments
      if (char === '/' && this.input[this.pos + 1] === '*') {
        this.pos += 2;
        while (this.pos < this.input.length - 1 && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          this.pos++;
        }
        this.pos += 2;
        continue;
      }

      // Skip preprocessor directives (e.g. #include, #define)
      if (char === '#') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        const quote = char;
        let strVal = '';
        this.pos++;
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          strVal += this.input[this.pos];
          this.pos++;
        }
        this.pos++; // skip closing quote
        tokens.push({ type: 'STRING', value: strVal });
        continue;
      }

      // Numeric literals
      if (/\d/.test(char)) {
        let numVal = '';
        while (this.pos < this.input.length && /[\d\.]/.test(this.input[this.pos])) {
          numVal += this.input[this.pos];
          this.pos++;
        }
        tokens.push({ type: 'NUMBER', value: numVal });
        continue;
      }

      // Identifiers and Keywords
      if (/[a-zA-Z_]/.test(char)) {
        let idVal = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_\.]/.test(this.input[this.pos])) {
          idVal += this.input[this.pos];
          this.pos++;
        }
        const keywords = ['if', 'else', 'for', 'while', 'int', 'float', 'void', 'return', 'setup', 'loop'];
        if (keywords.includes(idVal)) {
          tokens.push({ type: 'KEYWORD', value: idVal });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: idVal });
        }
        continue;
      }

      // Operators: ==, !=, >=, <=, &&, ||, +=, -=, +, -, *, /, =, <, >, !
      const ops2 = ['==', '!=', '>=', '<=', '&&', '||', '+=', '-='];
      const sub2 = this.input.substring(this.pos, this.pos + 2);
      if (ops2.includes(sub2)) {
        tokens.push({ type: 'OPERATOR', value: sub2 });
        this.pos += 2;
        continue;
      }

      const ops1 = ['+', '-', '*', '/', '=', '<', '>', '!'];
      if (ops1.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        this.pos++;
        continue;
      }

      // Punctuation
      const punc = [';', ',', '(', ')', '{', '}'];
      if (punc.includes(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char });
        this.pos++;
        continue;
      }

      // Unknown character fallback
      this.pos++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }
}

export class CPPParser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Program {
    const body: Statement[] = [];

    while (!this.isAtEnd()) {
      const tok = this.peek();

      // Top level declarations (e.g. void setup(), void loop(), void myFunc())
      if (tok.type === 'KEYWORD' && (tok.value === 'void' || tok.value === 'int' || tok.value === 'float')) {
        const retType = this.advance().value;
        const nameTok = this.consume('IDENTIFIER', 'Expected function name');
        
        // Skip setup() block contents as visual wiring handles it
        if (nameTok.value === 'setup') {
          this.consume('PUNCTUATION', 'Expected (');
          this.consume('PUNCTUATION', 'Expected )');
          this.parseBlock(); // parse and throw away
          continue;
        }

        // loop() body holds the main sequence
        if (nameTok.value === 'loop') {
          this.consume('PUNCTUATION', 'Expected (');
          this.consume('PUNCTUATION', 'Expected )');
          const block = this.parseBlock();
          body.push(...block.body);
          continue;
        }

        // Custom function declaration
        this.consume('PUNCTUATION', 'Expected (');
        const params: Parameter[] = [];
        if (this.peek().value !== ')') {
          do {
            const pType = this.consume('KEYWORD', 'Expected parameter type').value;
            const pName = this.consume('IDENTIFIER', 'Expected parameter name').value;
            params.push({ dataType: pType, name: pName });
          } while (this.match(',') && !this.isAtEnd());
        }
        this.consume('PUNCTUATION', 'Expected )');

        const block = this.parseBlock();
        const funcDecl: FunctionDeclaration = {
          type: 'FunctionDeclaration',
          name: nameTok.value,
          returnType: retType,
          params,
          body: block
        };

        // Represent function declarations stringified in main AST for generator reference
        body.push({
          type: 'ExpressionStatement',
          expression: {
            type: 'LiteralExpression',
            value: JSON.stringify(funcDecl),
            valueType: 'string'
          } as any
        });
      } else {
        // Fallback statements not inside function wraps
        body.push(this.parseStatement());
      }
    }

    return {
      type: 'Program',
      body
    };
  }

  private parseStatement(): Statement {
    const tok = this.peek();

    if (tok.type === 'KEYWORD') {
      if (tok.value === 'if') {
        this.advance(); // consume 'if'
        this.consume('PUNCTUATION', 'Expected (');
        const cond = this.parseExpression();
        this.consume('PUNCTUATION', 'Expected )');

        const consequent = this.parseStatementAsBlock();
        let alternate: BlockStatement | undefined = undefined;

        if (this.match('else')) {
          alternate = this.parseStatementAsBlock();
        }

        return {
          type: 'IfStatement',
          condition: cond,
          consequent,
          alternate
        };
      }

      if (tok.value === 'for') {
        this.advance(); // consume 'for'
        this.consume('PUNCTUATION', 'Expected (');

        // Init: int i = 0
        const init = this.parseStatement(); // parses declaration or assignment

        // Condition: i < 10
        const cond = this.parseExpression();
        this.consume('PUNCTUATION', 'Expected ;');

        // Update: i += 1
        const update = this.parseStatementWithoutSemicolon();
        this.consume('PUNCTUATION', 'Expected )');

        const body = this.parseStatementAsBlock();

        return {
          type: 'ForLoop',
          init: init as any,
          condition: cond,
          update: update as any,
          body
        };
      }

      if (tok.value === 'while') {
        this.advance();
        this.consume('PUNCTUATION', 'Expected (');
        const cond = this.parseExpression();
        this.consume('PUNCTUATION', 'Expected )');
        const body = this.parseStatementAsBlock();

        return {
          type: 'WhileLoop',
          condition: cond,
          body
        };
      }

      if (tok.value === 'return') {
        this.advance();
        let valExpr: Expression | undefined = undefined;
        if (this.peek().value !== ';') {
          valExpr = this.parseExpression();
        }
        this.consume('PUNCTUATION', 'Expected ;');
        return {
          type: 'ReturnStatement',
          value: valExpr
        };
      }

      // Variable Declarations: int x = 5;
      if (tok.value === 'int' || tok.value === 'float') {
        const varType = this.advance().value;
        const name = this.consume('IDENTIFIER', 'Expected variable name').value;
        this.consume('OPERATOR', 'Expected =');
        const val = this.parseExpression();
        this.consume('PUNCTUATION', 'Expected ;');

        return {
          type: 'VariableDeclaration',
          name,
          varType,
          value: val
        };
      }
    }

    // Assignment or Expression Statement
    if (tok.type === 'IDENTIFIER') {
      const name = tok.value;
      // If assignment
      if (this.tokens[this.current + 1]?.value === '=') {
        this.advance(); // consume name
        this.advance(); // consume '='
        const val = this.parseExpression();
        this.consume('PUNCTUATION', 'Expected ;');
        return {
          type: 'AssignmentStatement',
          name,
          value: val
        };
      }
    }

    // Default: expression statement
    const expr = this.parseExpression();
    this.consume('PUNCTUATION', 'Expected ;');
    return {
      type: 'ExpressionStatement',
      expression: expr
    };
  }

  private parseStatementWithoutSemicolon(): Statement {
    const tok = this.peek();
    if (tok.type === 'IDENTIFIER') {
      const name = tok.value;
      if (this.tokens[this.current + 1]?.value === '=') {
        this.advance();
        this.advance();
        const val = this.parseExpression();
        return {
          type: 'AssignmentStatement',
          name,
          value: val
        };
      }
      if (this.tokens[this.current + 1]?.value === '+=') {
        this.advance();
        this.advance();
        const val = this.parseExpression();
        return {
          type: 'AssignmentStatement',
          name,
          value: {
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'IdentifierExpression', name },
            right: val
          }
        };
      }
    }
    return {
      type: 'ExpressionStatement',
      expression: this.parseExpression()
    };
  }

  private parseStatementAsBlock(): BlockStatement {
    if (this.peek().value === '{') {
      return this.parseBlock();
    }
    return {
      type: 'BlockStatement',
      body: [this.parseStatement()]
    };
  }

  private parseBlock(): BlockStatement {
    this.consume('PUNCTUATION', 'Expected {');
    const body: Statement[] = [];
    while (this.peek().value !== '}' && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('PUNCTUATION', 'Expected }');
    return {
      type: 'BlockStatement',
      body
    };
  }

  private parseExpression(): Expression {
    // Basic expression parser mapping helper (delegates to string compiler helper)
    let exprStr = '';
    while (this.peek().value !== ';' && this.peek().value !== ')' && this.peek().value !== ',' && !this.isAtEnd()) {
      const tok = this.advance();
      if (tok.type === 'STRING') {
        exprStr += `"${tok.value}"`;
      } else {
        exprStr += tok.value;
      }
    }
    return parseExpressionString(exprStr);
  }

  // Helper matching token properties
  private match(val: string): boolean {
    if (this.peek().value === val) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: string, errorMsg: string): Token {
    const tok = this.peek();
    if (tok.type === type || tok.value === type) {
      return this.advance();
    }
    throw new Error(`${errorMsg} (found "${tok.value}" of type ${tok.type})`);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.tokens[this.current].type === 'EOF';
  }
}
