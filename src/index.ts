import {
  AttachedScope,
  attachScopes,
  createFilter,
  FilterPattern,
} from "@rollup/pluginutils";
import type { Plugin } from "rollup";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import type {
  ImportDeclaration,
  ImportSpecifier,
  AssignmentExpression,
  VariableDeclarator,
  Identifier,
  Program,
  BaseNode,
  AssignmentPattern,
} from "estree";
import {
  isArrayPattern,
  isAssignmentPattern,
  isIdentifier,
  isObjectPattern,
  isProperty,
  isRestElement,
} from "./utils";

export enum TYPE {
  REPLACE,
  ALIA_ADD,
}

declare module "estree" {
  interface BaseNode {
    opType?: TYPE;
    scope?: AttachedScope;
    start: number;
    end: number;
  }
}

export interface ReassignOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
  sourcemap?: boolean;
  targetFns: {
    [index: string]: {
      [index: string]: number;
    };
  };
}

export enum OP_TYPE {
  APPEND_REASSIGN_VAR,
  REPLACE_WITH_REASSIGN_VAR,
  DECONSTRUCT_WITH_DEFAULT_VAL,
}

const is_APPEND_REASSIGN_VAR = (node: any): node is Identifier => {
  return node.opType === OP_TYPE.APPEND_REASSIGN_VAR;
};

const is_REPLACE_WITH_REASSIGN_VAR = (node: any): node is Identifier => {
  return node.opType === OP_TYPE.REPLACE_WITH_REASSIGN_VAR;
};

const is_DECONSTRUCT_TRIM_DEFAULT_VAL = (
  node: any
): node is AssignmentPattern => {
  return node.opType === OP_TYPE.DECONSTRUCT_WITH_DEFAULT_VAL;
};

const SUFFIX = "$$NO";
const REASSIGN_FLAG = "$";

export function reassign(options: ReassignOptions): Plugin {
  const { targetFns: targets, include, exclude, sourcemap = true } = options;

  const idFilter = createFilter(include, exclude);

  return {
    name: "reassign",
    transform(code: any, id: string) {
      if (!idFilter(id)) return;
      const ast = this.parse(code);
      const magicString = new MagicString(code);

      let scope: AttachedScope | undefined = attachScopes(ast, "scope");

      let sourceMatch = false;
      const importFns: { [index: string]: number } = {};

      walk(ast, {
        enter(node) {
          if (sourcemap) {
            magicString.addSourcemapLocation(node.start);
            magicString.addSourcemapLocation(node.end);
          }

          if (node.scope) scope = node.scope;

          const skip = () => {
            if (node.scope) scope = scope?.parent;
            this.skip();
          };

          if ("Program" === node.type) {
            const { body } = node as Program;
            const imports = body.filter(
              (i) => i.type === "ImportDeclaration"
            ) as ImportDeclaration[];

            if (imports.length === 0) return skip();

            imports.forEach((node) => {
              const { specifiers, source } = node;

              if (targets[source.value + ""]) {
                const targetFns = targets[source.value + ""];
                sourceMatch = true;

                specifiers.forEach((specifier) => {
                  const { type } = specifier;

                  if ("ImportSpecifier" === type) {
                    const { imported, local } = specifier as ImportSpecifier;
                    Object.keys(targetFns).includes(imported.name) &&
                      (importFns[local.name] = targetFns[local.name]);
                  }

                  if ("ImportDefaultSpecifier" === type) {
                    const { local } = specifier;
                    Object.keys(targetFns).includes("default") &&
                      (importFns[local.name] = targetFns["default"]);
                  }

                  if ("ImportNamespaceSpecifier" === type) {
                    const { local } = specifier;
                    importFns[local.name] = targetFns[local.name];
                  }
                });
              }
            });
            if (!sourceMatch || importFns.length === 0) {
              return skip();
            }
          }

          if ("AssignmentExpression" === node.type) {
            const { left } = node as AssignmentExpression;
            if (left.type === "Identifier" && left.name in importFns) {
              scope!.declarations[left.name + SUFFIX] = true;
            }
          }

          if ("VariableDeclarator" === node.type) {
            const { init, id } = node as VariableDeclarator;

            if (
              init?.type === "CallExpression" &&
              init.callee.type === "Identifier" &&
              init.callee.name in importFns &&
              !scope?.contains(init.callee.name + SUFFIX)
            ) {
              const args = init.arguments;

              const start = args.length ? args[0].start : node.end - 1;
              const end = args.length ? args.slice(-1)[0].end : node.end - 1;

              const reassignFnIndex = importFns[init.callee.name];
              const isAppendEnd = reassignFnIndex === -1;

              const originParamsStr = args.length
                ? magicString.slice(args[0].start, args.slice(-1)[0].end)
                : "";

              let assignFnStr = "";
              let undefinedStr = "";

              if (reassignFnIndex - args.length > 0)
                undefinedStr = new Array(reassignFnIndex - args.length)
                  .fill("undefined")
                  .join(",");

              let finallyParamsStr = "";

              // Do nothing when reassignFnIndex place already exist argument
              if (args[reassignFnIndex]) return;

              if (id.type === "Identifier") {
                assignFnStr = `${REASSIGN_FLAG}=>${id.name}=${REASSIGN_FLAG}`;

                if (isAppendEnd) {
                  finallyParamsStr = `${!args.length ? "" : ","}${assignFnStr}`;
                } else {
                  finallyParamsStr = [
                    originParamsStr,
                    undefinedStr,
                    assignFnStr,
                  ]
                    .filter((i) => i)
                    .join(",");
                }
              } else if (
                id.type === "ObjectPattern" ||
                id.type === "ArrayPattern"
              ) {
                const result = find(id);
                const cloneMagicString = magicString.clone();

                result.forEach((i, index) => {
                  switch (i.opType) {
                    case TYPE.REPLACE:
                      cloneMagicString.overwrite(
                        i.start,
                        i.end,
                        `${REASSIGN_FLAG}${index}`
                      );
                      break;
                    case TYPE.ALIA_ADD:
                      cloneMagicString.appendRight(
                        i.end,
                        `:${REASSIGN_FLAG}${index}`
                      );
                      break;
                  }
                });

                const assigns = result
                  .map((i, index) => `${i.name}=${REASSIGN_FLAG}${index}`)
                  .join(";");

                let assignFnStr = `(${cloneMagicString.slice(
                  id.start,
                  id.end
                )})=>{${assigns}}`.replace(/[\s]*/g, "");

                if (isAppendEnd) {
                  finallyParamsStr = `${args.length ? "," : ""}${assignFnStr}`;
                } else {
                  finallyParamsStr = [
                    originParamsStr,
                    undefinedStr,
                    assignFnStr,
                  ]
                    .filter((i) => i)
                    .join(",");
                }
              }

              isAppendEnd
                ? magicString.appendRight(end, finallyParamsStr)
                : start === end
                ? magicString.appendRight(end, finallyParamsStr)
                : magicString.overwrite(start, end, finallyParamsStr);
            }
          }
        },
        leave(node) {
          if (node.scope) scope = scope?.parent;
        },
      });

      if (!sourceMatch || importFns.length === 0) {
        return {
          code,
          ast,
          map: sourcemap ? magicString.generateMap({ hires: true }) : null,
        };
      }

      return {
        code: magicString.toString(),
        map: sourcemap ? magicString.generateMap({ hires: true }) : null,
      };
    },
  };
}

const find = (idNode: BaseNode): Identifier[] => {
  const arr = [] as Identifier[];

  if (isObjectPattern(idNode)) {
    idNode.properties.forEach((property) => arr.push(...find(property)));
  }

  if (isArrayPattern(idNode)) {
    idNode.elements.forEach((element) => {
      if (!element) return;
      if (isIdentifier(element)) {
        element.opType = TYPE.REPLACE;
        arr.push(element);
      } else {
        arr.push(...find(element));
      }
    });
  }

  if (isAssignmentPattern(idNode)) {
    arr.push(...find(idNode.left));
  }

  if (isRestElement(idNode)) {
    if (isIdentifier(idNode.argument)) {
      idNode.argument.opType = TYPE.REPLACE;
      arr.push(idNode.argument);
    } else {
      arr.push(...find(idNode.argument));
    }
  }

  if (isProperty(idNode)) {
    if (isIdentifier(idNode.key)) {
      if (isIdentifier(idNode.value)) {
        idNode.value.opType =
          idNode.key.name === idNode.value.name ? TYPE.ALIA_ADD : TYPE.REPLACE;
        arr.push(idNode.value);
      } else if (isAssignmentPattern(idNode.value)) {
        if (isIdentifier(idNode.value.left)) {
          if (idNode.key.name === idNode.value.left.name) {
            idNode.key.opType = TYPE.ALIA_ADD;
            arr.push(idNode.key);
          } else {
            idNode.value.left.opType = TYPE.REPLACE;
            arr.push(idNode.value.left);
          }
        }
      }
      arr.push(...find(idNode.value));
    } else {
      if (isIdentifier(idNode.value)) {
        idNode.value.opType = TYPE.REPLACE;
        arr.push(idNode.value);
      }
      if (isAssignmentPattern(idNode.value)) {
        if (isIdentifier(idNode.value.left)) {
          idNode.value.left.opType = TYPE.REPLACE;
          arr.push(idNode.value.left);
        }
      }
      arr.push(...find(idNode.value));
    }
  }

  return arr;
};
