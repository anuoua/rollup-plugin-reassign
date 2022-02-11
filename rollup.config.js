import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

const configGen = (format) =>
  defineConfig({
    input: "src/index.ts",
    plugins: [
      typescript({
        include: "src/**/*.ts",
        module: "esnext",
        declarationDir: `dist/${format}`,
      }),
    ],
    external: ["@rollup/pluginutils", "estree-walker", "magic-string"],
    output: {
      sourcemap: true,
      dir: `dist/${format}`,
      entryFileNames: `index.js`,
      format,
    },
  });

export default [configGen("cjs"), configGen("esm")];
