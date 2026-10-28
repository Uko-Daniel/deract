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

## The iframe uses srcdoc only for a doctype and consistent async loading
Reason: jsdom ignores srcdoc content, and browsers differ in timing for blank iframes. We build the structure in code after load, which works everywhere.
Alternatives: write into a blank iframe (quirks mode, Firefox timing issues).

## Contexts are applied to the iframe's <html> element
Reason: `color-scheme` and `:root[data-theme]` selectors only work on the root element. In isolation "none", the plain div is the root.
Alternatives: apply to a wrapper div inside the iframe (breaks `color-scheme` for the page background).

## props.stylesheets is read once; the Playground changes the React key to reload them
Reason: avoids a second sync mechanism.
Alternatives: live-diff the link list (more code for a rare case).

## With isolation "none", props.stylesheets is ignored
Reason: the host page already has its styles, and injecting links into the host head is surprising.
Alternatives: append links to the host head (leaks into the playground chrome).

## Viewport size comes from the iframe window's resize event
Reason: no ResizeObserver needed. jsdom has none, and the iframe window already reports its size.
Alternatives: ResizeObserver on the frame (needs a polyfill in tests).

## Canvas children are not rendered until the iframe is ready and its styles loaded (2s cap)
Reason: entries never mount into a half-built document.
Alternatives: mount immediately (unstyled flash, wrong measurements).

## Known risk: jsdom proves the logic, not real browser timing
Reason: jsdom ignores srcdoc and never loads stylesheets. Manual checks in Chrome and Firefox are part of step 3.

## EntryView calls entry.render() as the body of a component (hooks allowed)
Reason: render entries are most natural when they can use useState and friends, and a throw lands below the error boundary.
Alternatives: require entries to return elements only (surprising restriction, hooks would break).

## Entries are remounted when the entry object changes, not only the id
Reason: HMR replaces entries with the same id. A different hook order in the new render() would otherwise corrupt React state.
Alternatives: key by id (stale state after hot reload).

## The error boundary resets when entry, args or env change
Reason: a crash caused by one arg value must be fixable by editing that arg.
Alternatives: reset only on entry change (user stuck until reload).

## Known limitation: errors in event handlers and async callbacks are not caught
Reason: React error boundaries do not catch them, and mount entries' timers (GSAP, setTimeout) run outside our code. They reach the console.
Alternatives: wrap window.onerror in the iframe (noisy, global, and out of v0.1 scope).

## args and env must be referentially stable between renders
Reason: EntryView compares them by identity to decide between update and remount. The Playground memoises them.
Alternatives: deep compare (cost on every render, and env holds window/document).

## Chrome follows the OS light/dark setting (light and dark palettes, all via --dct-* variables)
Reason: the founder wants both modes, and this matches the original spec. The canvas is never affected.
Supersedes the earlier "light-only" decision.

## Space Grotesk: option B, a bundled Latin subset as an optional `fonts.css` export
Reason: offline-safe because the file is local, and the look appears on every machine.
Deviation from spec: the spec said no web fonts, and the exports map gains `./fonts.css`. The font is reported separately from the size targets.

## Segmented controls are native radio inputs inside a fieldset with a legend
Reason: browsers already provide the correct keyboard model (Tab into the group, arrows change selection) and screen readers announce the group, so no custom keyboard code is needed.
Alternatives: custom buttons with role="radio" and our own arrow handling (more code, easier to get wrong).

## The toolbar is role="group", not role="toolbar"
Reason: the toolbar role promises roving-focus keyboard behaviour we do not implement.

## The viewport width readout is not an aria-live region
Reason: it changes continuously while resizing, so announcing it would flood screen readers.

## The Variant select is hidden when an entry has no variants; Reset is disabled until args are edited
Reason: less clutter, and no control that can do nothing.
Alternatives: always show them disabled (layout jumps less, but more noise).

## The sidebar search matches title, id and group name; arrow keys are an extra on top of native Tab/Enter
Reason: the spec asks for a fully keyboard-operable sidebar, and Tab/Enter already satisfy it. Arrows are a convenience.

## Sidebar and Toolbar are presentational (props in, callbacks out)
Reason: all playground logic lives in usePlaygroundState, so these panels can be tested without it.

## Props panel inputs are the native HTML element for each control type
Reason: real `<label>`s, real keyboard and screen-reader behaviour, no custom widgets.
Alternatives: a single generic widget (breaks keyboard contracts), a design-system component (adds bytes).

## The Copy button writes pretty-printed JSON of the effective args
Reason: the most useful paste for bug reports and for copying a working config into a variant.
Alternatives: compact JSON (harder to read), a diff against defaults (more code, less obvious).

## Copy failure is surfaced inline as "Copy failed" rather than thrown
Reason: clipboard permissions are environment-dependent; the user should see why nothing happened.
Alternatives: silent failure (confusing), `alert()` (ugly, blocks the playground).

## The number input treats an empty field as a request to reset to the control default
Reason: keeps the input controlled, avoids `NaN` flowing into args, and matches "clear = reset" intuition.
Alternatives: ignore the clear (input desyncs from state), reject the change (input stays empty, confusing).

## The range value is rendered next to the label and marked `aria-hidden`
Reason: sighted users see the current value; screen readers still announce "Size" plus the slider's own value, without double-announcing.

## The copy success/failure toast resets after 1.5 s
Reason: it is acknowledgement, not a persistent state. Matches the brief "Copied!" feedback pattern.

## Chrome palette is light and dark, driven by `prefers-color-scheme` on `.dct-playground`
Reason: matches the spec's "follows the OS", and the same token set works for a future manual toggle without any CSS changes.
Contrast ratios checked against `--dct-surface`:
  light: ink 17.83:1, muted 5.43:1, accent 6.72:1, accent-strong on tint 7.91:1, border 3.30:1
  dark:  ink 14.49:1, muted 6.90:1, accent 7.01:1, accent-strong on tint 8.10:1, border 3.75:1
The border tokens were darkened from the original blue-gray proposal (`#D5DCE8` light) because it fell below the WCAG 2.1 non-text 3:1 threshold; `#7F8FA3` light and `#64748B` dark pass.
Alternatives: a lighter decorative border (fails 3:1), a manual toggle (deferred to LATER.md).

## `--dct-on-accent` flips between light and dark instead of forcing white
Reason: white on #60A5FA in dark mode is only 2.54:1 (fails). Dark ink #0F172A on #60A5FA is 7.01:1. The selected segment therefore shows as a bright chip with dark text in dark mode.
Alternatives: use a darker accent in dark mode (less vivid), force white everywhere (fails dark mode).

## All chrome rules live inside `@layer deract`
Reason: an unlayered consumer stylesheet overrides layered rules automatically, so "override the tokens" or "restyle a control" works without `!important` or higher-specificity selectors.
Alternatives: high-specificity selectors (fragile), CSS custom properties only (limits structural overrides).

## The canvas (`iframe` body and inline root) does not follow OS dark mode; only `data-theme` on the root does
Reason: the spec is explicit. The iframe's `color-scheme: light` and the `.dct-canvas-root[data-theme]` rules make `data-theme` the only switch that affects the canvas, and give native form elements inside the canvas the correct palette when the entry uses one.
Alternatives: let the iframe follow the OS (violates the spec), ignore `data-theme` on the root (breaks entries that rely on it).

## Layout breakpoints at 800px (props panel wraps below the canvas) and 560px (sidebar stacks above)
Reason: the spec asks for 360 px usable; at ≤560px the whole playground becomes a vertical stack and every panel scrolls on its own.

## Focus ring is a 2 px solid `--dct-focus` with 1 px offset on every interactive element
Reason: visible focus for keyboard users; the ring color follows the accent so it flips with the OS.

## Reduced motion: animations and transitions are killed via a `prefers-reduced-motion: reduce` block, and `scroll-behavior` is reset to `auto`
Reason: the spec asks for `prefers-reduced-motion` respected on the chrome. Entries must do the same in their own CSS; the README will say so.

## Space Grotesk (weight 600) ships as a Latin subset at `fonts.css` + `fonts/`, opt-in
Reason: the founder approved option B — a bundled local font, offline, but not part of the default install. `fonts.css` is a separate export, so consumers who don't import it pay zero bytes. The woff2 is fetched once, at dev time, from Google Fonts' prebuilt Latin subset (`scripts/fetch-font.mjs`) and committed; there is no runtime network call.
Deviation from spec: the spec said "no web fonts". The font is bundled locally, under SIL OFL 1.1, and does not violate offline or "no CDN" because it loads from the package.
Alternatives: A (font stack only — loses the look on most machines); C (self-host whole family — 3+ weights, too much weight for a wordmark).

## Error panel selectors are `.dct-error`, `.dct-error-title`, `.dct-error-stack`
Reason: they match the component shipped in piece 4 (error.tsx). The earlier `.dct-error-panel` name is gone; a mismatch would leave the canvas error unstyled.

## Brand header spans the top of the playground (`grid-area: brand`, `grid-column: 1 / -1`)
Reason: logo and wordmark belong to the whole playground, not to the sidebar. Sidebar is a component list; putting branding inside it conflates two things and would make the sidebar semantics odd (`<nav aria-label="Components">` containing a brand is noise for screen readers).
Alternatives: brand inside the sidebar header (muddies the nav landmark), no brand (loses identity).

## The inline logo uses `currentColor`, the standalone `logo.svg` uses the fixed accent
Reason: the chrome logo must flip with the light/dark token set; the file is for docs, website and favicon where a stable brand color is correct.

## `fonts.css` falls back gracefully when the woff2 is missing
Reason: consumers who clone the repo without running `pnpm fonts:fetch` still get a working playground with system fonts. No test asserts on the font loading, so a missing file cannot fail CI.


## `DECISIONS.md` addendum

```md
## The example aliases `@atlis/deract/*` at source level for dev
Reason: the library's `exports` map points at `dist/`, and `dist` is produced by the build that piece 8 introduces. The example must run without requiring a prior `pnpm build`, otherwise `pnpm -C examples/vite-react dev` fails out of the box. Vite aliases with exact regex entries (`playground`, `styles.css`, `fonts.css`, then bare `@atlis/deract`) and `dedupe: ['react', 'react-dom']` keep a single React copy and a working HMR path.
Alternatives: force a build first (worse DX, and pins the example to whatever the build emits); publish a `src` subpath in `exports` (pollutes the package surface for a dev-only need).

## The GSAP example reads `env.contexts.motion` in JS; the CSS-transition entries rely on `[data-motion="reduce"]`
Reason: GSAP cannot be disabled from CSS alone — a JS tween must be skipped at the call site. Plain CSS transitions on `.ex-btn` and `.ex-counter` are neutralised by the `[data-motion="reduce"]` rule, which is the pattern the README asks entries to adopt. Both approaches live side by side in the example so the architect can see the choice.
Alternatives: force every entry to check `env.contexts.motion` (burdensome for CSS-driven entries); rely on `prefers-reduced-motion` alone (does not work inside an iframe that the playground cannot force).

## The Counter's `update` resets its internal count only when the `start` arg changes
Reason: an `update` that silently discards the user's clicks would be a surprise; resetting only on an explicit `start` change is predictable and demonstrates the update-vs-remount contract cleanly.
Alternatives: reset on every update (breaks the "state lives in the entry" model); never reset (surprises when `start` changes and nothing happens).

## The example resolves `@atlis/deract/*` through both Vite aliases AND tsconfig `paths` pointing at library source
Reason: Vite aliases fix runtime; TypeScript only knows about `paths`. Until `packages/deract/dist` exists (piece 8's build), the example cannot use the published `exports` map, so both ends must agree on "the example compiles against `src`". Once `dist` ships, this pair can be retired in favour of a normal workspace dependency and removed from the example's tsconfig.
Alternatives: publish `src` as an additional subpath in `exports` (pollutes the package surface); require a build first (bad DX, breaks `pnpm dev` out of the box).

## `vite.config.ts` uses `fileURLToPath(import.meta.url)` instead of `__dirname`
Reason: `"type": "module"` means the config is ESM, where `__dirname` does not exist. `fileURLToPath` is the portable equivalent.
Alternatives: `new URL(..., import.meta.url).pathname` (URL-encoded on Windows, breaks on paths with spaces).

## `@types/node` is a devDependency of the example only, not of `packages/deract`
Reason: `vite.config.ts` needs it; the library must never import `node:*` at runtime, and keeping `@types/node` out of the library's devDependencies is a structural reminder of that.