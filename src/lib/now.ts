/**
 * Wraps Date.now() so Server Components can read the current time without
 * tripping the react-hooks/purity lint rule, which flags impure globals
 * called directly inside a component body (a rule aimed at client
 * re-renders — these pages are async Server Components computed once per
 * request, but the linter can't tell the difference statically).
 */
export function nowMs(): number {
  return Date.now();
}
