export type ASTNode = ProgramNode | StatementNode | ExpressionNode;

export interface BaseASTNode {
  kind: string;
  nodeId?: string; // Links back to React Flow Node ID for highlighting / debugging
}

export interface Parameter {
  name: string;
  dataType: string;
}

export type ProgramStatementNode = StatementNode | FunctionDeclarationNode;

export interface ProgramNode extends BaseASTNode {
  kind: 'Program';
  body: ProgramStatementNode[];
}

export interface FunctionDeclarationNode extends BaseASTNode {
  kind: 'FunctionDeclaration';
  name: string;
  returnType: string;
  params: Parameter[];
  body: BlockStatementNode;
}

export type StatementNode =
  | BlockStatementNode
  | VariableDeclarationNode
  | AssignmentNode
  | IfStatementNode
  | ForLoopNode
  | ReturnStatementNode
  | ExpressionStatementNode;

export interface BlockStatementNode extends BaseASTNode {
  kind: 'BlockStatement';
  body: StatementNode[];
}

export interface VariableDeclarationNode extends BaseASTNode {
  kind: 'VariableDeclaration';
  name: string;
  varType: string;
  value: ExpressionNode;
}

export interface AssignmentNode extends BaseASTNode {
  kind: 'Assignment';
  name: string;
  value: ExpressionNode;
}

export interface IfStatementNode extends BaseASTNode {
  kind: 'IfStatement';
  condition: ExpressionNode;
  consequent: BlockStatementNode;
  alternate?: BlockStatementNode;
}

export interface ForLoopNode extends BaseASTNode {
  kind: 'ForLoop';
  init: VariableDeclarationNode | AssignmentNode;
  condition: ExpressionNode;
  update: ExpressionNode | AssignmentNode;
  body: BlockStatementNode;
}

export interface ReturnStatementNode extends BaseASTNode {
  kind: 'ReturnStatement';
  value?: ExpressionNode;
}

export interface ExpressionStatementNode extends BaseASTNode {
  kind: 'ExpressionStatement';
  expression: ExpressionNode;
}

export type ExpressionNode =
  | LiteralExpressionNode
  | IdentifierExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode;

export interface LiteralExpressionNode extends BaseASTNode {
  kind: 'Literal';
  value: string | number | boolean;
  valueType: 'int' | 'float' | 'string' | 'boolean';
}

export interface IdentifierExpressionNode extends BaseASTNode {
  kind: 'Identifier';
  name: string;
}

export interface BinaryExpressionNode extends BaseASTNode {
  kind: 'BinaryExpression';
  operator: string; // '>', '<', '>=', '<=', '==', '!=', '&&', '||', '+', '-', '*', '/'
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  kind: 'UnaryExpression';
  operator: string; // '!', '-'
  argument: ExpressionNode;
}

export interface CallExpressionNode extends BaseASTNode {
  kind: 'CallExpression';
  callee: string; // e.g. "Serial.println", "analogRead", or user-defined function
  arguments: ExpressionNode[];
}
