# calc

A small calculator used by a spreadsheet-like tool: `evaluate("2 + 3")` gives `5`.

    node src/cli.js "2 + 3 * 4"
    node --test

## What it must support (the spec)

- Numbers, with decimals: `3`, `0.5`, `12.25`.
- `+ - * /` and `^` (power), with the usual precedence: `^` first, then `* /`, then `+ -`.
  `^` groups from the right (`2 ^ 3 ^ 2` is `2 ^ 9`); the others group from the left.
- Parentheses, nested to any depth.
- Unary minus: `-3`, `2 * -3`, `-(1 + 2)`, `-2 ^ 2` is `-(2 ^ 2)`.
- Spaces anywhere between tokens, or none.
- Errors: anything else throws an `Error` whose message ends with `at position N`,
  where N is the 0-based index in the input where the problem was found
  (for a missing token at the end, N is the input's length). Division by zero
  throws `division by zero at position N`, N being the index of the `/`.

## The report

> It only does left to right. `2 + 3 * 4` gives 20. Brackets crash it.
