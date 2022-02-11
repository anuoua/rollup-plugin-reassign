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
  ObjectPattern,
  Identifier,
  ArrayPattern,
  Program,
} from "estree";

declare module "estree" {
  interface BaseNode {
    isReplace?: boolean;
    scope?: AttachedScope;
    start: number;
    end: number;
  }
}

export interface ReassignOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
  sourcemap?: boolean;
  packageName: FilterPattern;
  fns: string[];
}

const SUFFIX = "$NO";

export function reassign(options: ReassignOptions): Plugin {
  const { packageName, fns, include, exclude, sourcemap = true } = options;

  const idFilter = createFilter(include, exclude);
  const packageNameFilter = createFilter(packageName, undefined, {
    resolve: false,
  });

  return {
    name: "reassign",
    transform(code: any, id: string) {
      if (!idFilter(id)) return;
      const ast = this.parse(code);
      const magicString = new MagicString(code);

      let scope: AttachedScope | undefined = attachScopes(ast, "scope");

      let sourceMatch = false;
      const importFns: string[] = [];

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

              if (packageNameFilter(source.value)) {
                sourceMatch = true;

                specifiers.forEach((specifier) => {
                  const { type } = specifier;

                  if ("ImportSpecifier" === type) {
                    const { imported, local } = specifier as ImportSpecifier;
                    fns.includes(imported.name) && importFns.push(local.name);
                  }

                  if ("ImportDefaultSpecifier" === type) {
                    const { local } = specifier;
                    fns.includes("default") && importFns.push(local.name);
                  }

                  if ("ImportNamespaceSpecifier" === type) {
                    const { local } = specifier;
                    importFns.push(local.name);
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
            if (left.type === "Identifier" && importFns.includes(left.name)) {
              scope!.declarations[left.name + SUFFIX] = true;
            }
          }

          if ("VariableDeclarator" === node.type) {
            const { init, id } = node as VariableDeclarator;
            if (
              init?.type === "CallExpression" &&
              init.callee.type === "Identifier" &&
              importFns.includes(init.callee.name) &&
              !scope?.contains(init.callee.name + SUFFIX)
            ) {
              if (id.type === "Identifier") {
                magicString.appendLeft(
                  node.end - 1,
                  `${init.arguments.length === 0 ? "" : ","}$=>${id.name}=$`
                );
              }

              const find = (
                idNode: ObjectPattern | ArrayPattern
              ): Identifier[] => {
                return idNode.type === "ObjectPattern"
                  ? (idNode as ObjectPattern).properties.reduce((pre, i) => {
                      if (i.type === "Property") {
                        const { value, key } = i;
                        if (
                          value.type === "Identifier" &&
                          key.type === "Identifier"
                        ) {
                          if (
                            (key.name === value.name &&
                              i.shorthand === false) ||
                            key.name !== value.name
                          ) {
                            value.isReplace = true;
                          }
                          return pre.concat(value);
                        } else if (
                          value.type === "ObjectPattern" ||
                          value.type === "ArrayPattern"
                        ) {
                          return pre.concat(find(value));
                        }
                        // ...
                      } else if (i.type === "RestElement") {
                        if (i.argument.type === "Identifier") {
                          i.argument.isReplace = true;
                          return pre.concat(i.argument);
                        }
                      }

                      return pre;
                    }, [] as Identifier[])
                  : (idNode as ArrayPattern).elements.reduce((pre, i) => {
                      if (i === null) return pre;
                      if (i.type === "Identifier") {
                        i.isReplace = true;
                        return pre.concat(i);
                      } else if (
                        i.type === "ArrayPattern" ||
                        i.type === "ObjectPattern"
                      ) {
                        return pre.concat(find(i));
                      }
                      // ...
                      return [];
                    }, [] as Identifier[]);
              };

              if (id.type === "ObjectPattern" || id.type === "ArrayPattern") {
                const result = find(id);
                const cloneMagicString = magicString.clone();

                result.forEach((i, index) => {
                  i.isReplace
                    ? cloneMagicString.overwrite(i.start, i.end, `$${index}`)
                    : cloneMagicString.appendRight(i.end, `:$${index}`);
                });

                const assigns = result
                  .map((i, index) => `${i.name}=$${index}`)
                  .join(";");

                magicString.appendRight(
                  node.end - 1,
                  `${
                    init.arguments.length === 0 ? "" : ","
                  }(${cloneMagicString.slice(
                    id.start,
                    id.end
                  )})=>{${assigns}}`.replace(/[\s]*/g, "")
                );
              }
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
