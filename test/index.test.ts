import { InputOptions, OutputOptions, rollup } from "rollup";
import reassign from "../src/index";

describe("test", () => {
  it("1", async () => {
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
      console.log(chunk);
    }

    expect("1").toBe("1");
  });
});
