import { InputOptions, OutputOptions, rollup } from "rollup";
import { reassign } from "../src/index";

const code = `import at, { bt } from 'test';
import ct from 'test2';

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
  let h = at(undefined,$=>h=$);
  let p = ct("hello",$=>p=$);

  return {
    a,
    c,
    d,
    e,
    g,
    h,
    p,
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
          sourcemap: true,
          targetFns: {
            test: {
              default: 1,
              bt: 1,
            },
            test2: {
              default: 1,
            },
          },
        }),
      ],
      external: ["test", "test2"],
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
