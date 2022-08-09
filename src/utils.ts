import {
  ArrayPattern,
  AssignmentPattern,
  AssignmentProperty,
  BaseNode,
  ObjectPattern,
  RestElement,
  ExportAllDeclaration,
  Identifier,
  Property,
} from "estree";

export const isObjectPattern = (node: BaseNode): node is ObjectPattern =>
  node.type === "ObjectPattern";

export const isArrayPattern = (node: BaseNode): node is ArrayPattern =>
  node.type === "ArrayPattern";

export const isAssignmentPattern = (
  node: BaseNode
): node is AssignmentPattern => node.type === "AssignmentPattern";

export const isRestElement = (node: BaseNode): node is RestElement =>
  node.type === "RestElement";

export const isIdentifier = (node: BaseNode): node is Identifier =>
  node.type === "Identifier";

export const isProperty = (node: BaseNode): node is Property =>
  node.type === "Property";
