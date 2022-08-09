import at, { bt } from "test";
import ct from "test2";

export function main() {
  let {
    a: {
      b: { c = 1 },
      ...d
    },
    f: { j = 1, ["k"]: ki } = {},
    k: [{ u }] = [],
    ...e
  } = at("hello");
  let [{ f: g }] = bt("hello");
  let a = bt("hello");
  let h = at();
  let p = ct("hello");

  return {
    a,
    c,
    d,
    j,
    ki,
    e,
    g,
    h,
    p,
  };
}
