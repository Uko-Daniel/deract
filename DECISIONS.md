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

## `vp` in the hash holds the viewport preset id, not the width
Reason: the spec example showed `vp=360`, but ids stay valid for custom presets (several could share a width, or be "fit").
Alternatives: store the width (ambiguous for custom presets).

## The hash module only parses and formats; it does not validate against the registry
Reason: it stays pure and testable. The Playground drops unknown entry, variant, context and viewport values.
Alternatives: validate inside the hash module (couples it to the registry).

## The hash stores only user edits to args, not defaults
Reason: shorter URLs, and links keep working when defaults change.
Alternatives: store all args (long URLs, stale on default changes).

## Mount runner empties the container after every teardown
Reason: entries that don't clean their own DOM would otherwise stack up on remount.
Alternatives: trust entries to clean up (leaks, duplicated UI).

## Errors from mount/update go to the error panel; errors from cleanup go to console.error
Reason: a cleanup error shown in the panel would be hidden by the next successful mount.
Alternatives: show both in the panel (cleanup errors would flash and vanish).

## A throwing update tears the entry down; the next change remounts
Reason: after a failed update the entry's internal state is unknown.
Alternatives: keep the half-updated entry (risk of stuck UI).

## A mount() that throws cannot be cleaned up by us
Reason: it never returned a handle. The runner clears the container, but timers or listeners created before the throw are the entry's responsibility.
Alternatives: none possible without a different API.

## The runner calls onError(null) after every success
Reason: the UI clears a stale error panel without extra state tracking.
Alternatives: a separate onSuccess callback (more API for the same result).

## Style mirroring reconciles the whole <head> list on every mutation
Reason: one idempotent function is simpler and cannot drift, unlike handling add/remove/change/reorder separately.
Alternatives: per-mutation handlers (more code, more edge cases).

## Only the host's <head> is mirrored
Reason: that is where Vite, CSS files and most CSS-in-JS dev builds put styles.
Alternatives: also observe <body> (rare, adds cost).

## Known limitation: styles created through the CSSOM are not mirrored
Reason: insertRule(), adoptedStyleSheets and CSS-in-JS "speedy" production mode leave no DOM text to copy.
Alternatives: serialise document.styleSheets rules (large and fragile).

## Mounting waits for copied <link> stylesheets, capped at 2 seconds
Reason: avoids entries measuring unstyled elements. The cap means a dead link cannot freeze the canvas.
Alternatives: mount immediately (flash of unstyled content, wrong measurements).

## Extra stylesheets (props.stylesheets) are placed after the mirrored host styles
Reason: lets the Playground user override host CSS predictably.
Alternatives: before (host CSS would win conflicts).