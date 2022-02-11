# Rollup reassign plugin

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
    [index: string]: string[]; // Effective package and fns
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
        "a-package": ["default", "fn1", "fn2"],
      },
    }),
  ],
};

// `default` is `export default` variable, see `fn0` below
```

code

```typescript
import fn0, { fn1, fn2 } from "a-package";

let [k, setK] = fn0("a");
let { b } = fn1("a");
let a = fn2("a");
```

compile to

```typescript
import fn0, { fn1, fn2 } from "a-package";

let [k, setK] = fn0("a", ([$0, $1]) => (k = $0; setK = $1));
let { b } = fn1("a", ({ b: $0 }) => {
  b = $0;
});
let a = fn2("a", ($) => (a = $));
```

## License

MIT @anuoua
