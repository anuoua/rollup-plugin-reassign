import { InputOptions, OutputOptions, rollup } from "rollup";
import { reassign } from "../src/index";

const code = `import at, { bt } from 'test';

function main() {
  let {
    a: {
      b: { c },
      ...d
    },
    ...e
  } = at("hello",({a:{b:{c:$0},...$1},...$2})=>{c=$0;d=$1;e=$2;});
  let [{ f: g }] = bt("hello",([{f:$0}])=>{g=$0;});
  let a = bt("hello",$=>a=$);

  return {
    a,
    c,
    d,
    e,
    g,
  };
}

export { main };
`;

describe("test", () => {
  it("transform", async () => {
    const inputOptions: InputOptions = {
      input: "./test/reassign.js",
      plugins: [
        reassign({
          packageName: "test",
          fns: ["at", "bt"],
          sourcemap: true,
        }),
      ],
      external: ["test"],
    };
    const outputOptions: OutputOptions = {
      file: "bundle.js",
      format: "esm",
    };

    const bundle = await rollup(inputOptions);

    const { output } = await bundle.generate(outputOptions);

    for (let chunk of output) {
      // @ts-ignore
      expect(chunk.code).toBe(code);
    }
  });
});
