# Rollup reassign plugin [![Node.js Package](https://github.com/anuoua/rollup-plugin-reassign/actions/workflows/npm-publish-github-packages.yml/badge.svg)](https://github.com/anuoua/rollup-plugin-reassign/actions/workflows/npm-publish-github-packages.yml)

A rollup plugin for self reassign variable.

## Install

```shell
npm i rollup-plugin-reassign -D
```

## Config

```typescript
import { reassign } from "rollup-plugin-reassign"

// See: https://github.com/rollup/plugins/blob/master/packages/pluginutils/README.md#createfilter
type FilterPattern = String | RegExp | Array[...String|RegExp]

interface ReassignOptions {
  include?: FilterPattern; // Include files
  exclude?: FilterPattern; // Eclude files
  sourcemap?: boolean; // Sourcemap default: true
  targetFns: {
    // Specify package
    [index: string]: {
      // Specify reassign function name and insert position (Nature number). if position === -1, it will be inserted end of params.
      [index: string]: number;
    };
  };
}

export default {
    plugins: [reassign(opt as ReassignOptions)]
}
```

## Example

rollup.config.js

```typescript
import { reassign } from "rollup-plugin-reassign";

export default {
  plugins: [
    reassign({
      targetFns: {
        "a-package": {
          default: 1,
          fn1: 1,
          fn2: 1,
          fn3: -1,
        },
      },
    }),
  ],
};

// `default` is `export default` variable, see `fn0` below
```

Code

```typescript
import fn0, { fn1, fn2, fn3 } from "a-package";

let [k, setK] = fn0("a");
let { b } = fn1("a");
let a = fn2("a");
let c = fn2();
let d = fn3();
```

Compile to

```typescript
import fn0, { fn1, fn2, fn3 } from "a-package";

let [k, setK] = fn0("a", ([$0, $1]) => (k = $0; setK = $1));
let { b } = fn1("a", ({ b: $0 }) => {
  b = $0;
});
let a = fn2("a", $ => a = $);
let c = fn2(undefined, $ => c = $);
let d = fn3($ => d = $)
```

## License

MIT @anuoua
