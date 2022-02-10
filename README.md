# Reassign plugin

A plugin for self renewal variable.

## Install

```shell
npm i rollup-plugin-reassign
```

## Config

```typescript
import { reassign } from 'rollup-plugin-reassign'

interface ReassignOptions {
  include?: string;
  exclude?: string;
  sourcemap?: boolean;
  packageName: string;
  fns: string[];
}

export default {
    ...
    plugins: [reassign({...} as ReassignOptions)]
}
```

## Example

rollup.config

```typescript
import { reassign } from 'rollup-plugin-reassign'

export default {
    ...
    plugins: [reassign({ packageName: 'test', fns: ['fn1', 'fn2'] })]
}
```

code

```typescript
import { fn1, fn2 } from "test";

const a = fn1("a");
const { b } = fn2("a");
```

compile to

```typescript
import { fn1, fn2 } from "test";

const a = fn1("a", ($) => (a = $));
const { b } = fn2("a", ({ b: $0 }) => {
  b = $0;
});
```

## License

MIT @anuoua
