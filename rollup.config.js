import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

const configGen = (format) =>
  defineConfig({
    input: "src/index.ts",
    plugins: [typescript()],
    external: ["@rollup/pluginutils", "estree-walker", "magic-string"],
    output: {
      sourcemap: true,
      dir: "dist",
      entryFileNames: `index.${format === "esm" ? "mjs" : "js"}`,
      format,
    },
  });

export default [configGen("cjs"), configGen("esm")];
