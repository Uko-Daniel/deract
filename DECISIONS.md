# Decisions

## `defineComponent<const C>` instead of `<C>`
Reason: without `const`, select options widen to `string[]` and the union is lost.
Alternatives: require `as const` at every call site (worse DX).

## "Duplicate variant names" is not validated
Reason: variants is an object literal, so duplicate keys are overwritten before our code runs and can't be detected.
Instead we validate that variant keys exist in controls and that values match their control. Alternatives: make variants an array (changes the spec's public API).

## Validation always runs and throws (not dev-only)
Reason: it costs microseconds, adds no dependency on `process.env`, and gives the same errors in every bundler.
Alternatives: strip in production via `import.meta.env.DEV` (not portable across bundlers).

## `applyContext` is exported from `contexts.ts` but not from the package index
Reason: the playground needs it, and the spec says no extra public exports.
Alternatives: inline the logic in the playground (harder to test without React).

## "Other" group is always listed last
Reason: ungrouped entries are the least organised, so they sit below named groups.
Alternatives: insertion order (Other could end up on top).

## Registry caches list()/groups() snapshots until the next add()
Reason: React's useSyncExternalStore needs stable references.
Alternatives: build new arrays each call (causes render loops).

## `color-scheme` is set through style.setProperty
Reason: restoring the previous inline value on cleanup, which also works in jsdom without crashing.
Alternatives: a `colorScheme` property (not typed or supported everywhere).