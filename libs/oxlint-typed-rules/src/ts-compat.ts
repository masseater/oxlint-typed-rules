import { Array as Arr, Function, Option, Predicate } from "effect";
import { SyntaxKind } from "typescript-7/ast";
import type { Node } from "typescript-7/ast";

const FUNCTION_LIKE_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodSignature,
  SyntaxKind.CallSignature,
  SyntaxKind.JSDocSignature,
  SyntaxKind.ConstructSignature,
  SyntaxKind.IndexSignature,
  SyntaxKind.FunctionType,
  SyntaxKind.ConstructorType,
]);

const isFunctionLike = (node: Node | null | undefined): boolean =>
  Option.fromNullishOr(node).pipe(Option.exists(({ kind }) => FUNCTION_LIKE_KINDS.has(kind)));

const forEachChild: {
  <Result>(visit: (child: Node) => Result | undefined): (node: Node) => Result | undefined;
  <Result>(node: Node, visit: (child: Node) => Result | undefined): Result | undefined;
} = Function.dual(
  (args) =>
    Arr.head(Arr.fromIterable(args)).pipe(Option.exists(Predicate.not(Predicate.isFunction))),
  <Result>(node: Node, visit: (child: Node) => Result | undefined): Result | undefined =>
    node.forEachChild(visit),
);

export {
  isArrayBindingPattern,
  isArrowFunction,
  isBindingElement,
  isCallExpression,
  isClassDeclaration,
  isClassExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportClause,
  isImportSpecifier,
  isInterfaceDeclaration,
  isJsxAttribute,
  isJsxExpression,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isMethodDeclaration,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeParameterDeclaration,
  isTypeQueryNode,
  isTypeReferenceNode,
  isVariableDeclaration,
  isVariableStatement,
  isParameterDeclaration as isParameter,
} from "typescript-7/ast/is";
export { SyntaxKind } from "typescript-7/ast";
export { SymbolFlags } from "typescript-7/sync";
export { forEachChild, isFunctionLike };
