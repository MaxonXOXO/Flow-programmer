export type ASTNode = Program | Statement | Expression;

export interface BaseASTNode {
  type: string;
  nodeId?: string; // Links back to React Flow Node ID for highlighting / debugging
}

export interface Parameter {
  name: string;
  dataType: string;
}

export interface Program extends BaseASTNode {
  type: 'Program';
  body: Statement[];
}

export interface FunctionDeclaration extends BaseASTNode {
  type: 'FunctionDeclaration';
  name: string;
  returnType: string;
  params: Parameter[];
  body: BlockStatement;
}

export type Statement =
  | BlockStatement
  | VariableDeclaration
  | AssignmentStatement
  | IfStatement
  | WhileLoop
  | ForLoop
  | ReturnStatement
  | ExpressionStatement;

export interface BlockStatement extends BaseASTNode {
  type: 'BlockStatement';
  body: Statement[];
}

export interface VariableDeclaration extends BaseASTNode {
  type: 'VariableDeclaration';
  name: string;
  varType: string;
  value: Expression;
}

export interface AssignmentStatement extends BaseASTNode {
  type: 'AssignmentStatement';
  name: string;
  value: Expression;
}

export interface IfStatement extends BaseASTNode {
  type: 'IfStatement';
  condition: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement;
}

export interface ForLoop extends BaseASTNode {
  type: 'ForLoop';
  init: VariableDeclaration | AssignmentStatement;
  condition: Expression;
  update: Expression | AssignmentStatement; // e.g., i += 1
  body: BlockStatement;
}

export interface WhileLoop extends BaseASTNode {
  type: 'WhileLoop';
  condition: Expression;
  body: BlockStatement;
}

export interface ReturnStatement extends BaseASTNode {
  type: 'ReturnStatement';
  value?: Expression;
}

export interface ExpressionStatement extends BaseASTNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | FunctionCallExpression
  | MemberExpression;

export interface LiteralExpression extends BaseASTNode {
  type: 'LiteralExpression';
  value: string | number | boolean;
  valueType: 'int' | 'float' | 'string' | 'boolean';
}

export interface IdentifierExpression extends BaseASTNode {
  type: 'IdentifierExpression';
  name: string;
}

export interface BinaryExpression extends BaseASTNode {
  type: 'BinaryExpression';
  operator: string; // '+', '-', '*', '/', '>', '<', '>=', '<=', '==', '!=', '&&', '||'
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseASTNode {
  type: 'UnaryExpression';
  operator: string; // '-', '!'
  argument: Expression;
}

export interface FunctionCallExpression extends BaseASTNode {
  type: 'FunctionCallExpression';
  callee: string;
  arguments: Expression[];
}

export interface MemberExpression extends BaseASTNode {
  type: 'MemberExpression';
  object: Expression;
  property: string;
}
