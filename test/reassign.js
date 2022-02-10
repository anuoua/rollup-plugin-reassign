import at, { bt } from "test";

export function main() {
  let {
    a: {
      b: { c },
      ...d
    },
    ...e
  } = at("hello");
  let [{ f: g }] = bt("hello");
  let a = bt("hello");

  return {
    a,
    c,
    d,
    e,
    g,
  };
}
