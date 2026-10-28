
---

# `DECISIONS.md`

```md
# Decisions

Every design choice, with the reason and the alternatives considered. Deviations from the spec are called out explicitly. Chronological, oldest first.

---

## The hook stores the raw (hash-shaped) selection and validates everything at read time
Reason: stale or hand-edited URLs can never put the playground in a broken state.
Alternatives: validate on write (misses registry changes such as HMR removing a variant).

## Selecting a variant or entry clears user edits; contexts and viewport persist across entries
Reason: a preset should start clean, but your chosen theme and width should survive browsing.
Alternatives: keep edits across variants (confusing), reset everything on entry change (annoying).

## env.contexts contains only the contexts relevant to the entry
Reason: an entry should not be updated when a context it doesn't care about changes.
Alternatives: all contexts always (spurious updates).

## Default viewport is the first preset with width null (Fit), else the first preset
Reason: Fit is the least surprising start, and it works with custom preset lists.

## The URL hash wins over props.initial
Reason: reloading a shared link must restore it exactly.

## The hash is written with replaceState, and contains only valid user choices
Reason: no history entries per keystroke, and invalid input never survives a reload.
Alternatives: pushState (Back button becomes unusable).

## checkValue is exported from define-component.ts for internal reuse, not from the package index
Reason: the hook applies the same control rules to args coming from the URL.

---

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

---

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

---

## The canvas is an iframe by default; React entries render into it via createPortal
Reason: a real nested browsing context means a 360 px preset fires real media queries. React attaches its own event listeners to the portal container, so clicks inside the iframe reach the React tree (covered by a test).
Alternatives: render in a plain div (isolation: 'none' covers the rare case), shadow DOM (no media-query isolation, more code).

## Canvas renders a caller-supplied child via a render prop that receives `env` and `target`
Reason: keeps Canvas independent of EntryView, so the iframe/portal/mirroring logic is testable on its own.

## Style mirroring clones host <style> and <link rel=stylesheet> with importNode, tracked in a Map, kept in sync by a MutationObserver on the host <head>
Reason: the spec asks for mirrored styles that follow Vite CSS HMR. importNode avoids cross-document adopt edge cases. `<style>` text is re-copied when it changes in place.
Alternatives: copy CSS rules (misses @import and relative urls), no mirroring (breaks most apps).

## Contexts apply to the canvas root, using `apply` when present, otherwise `data-<id>="<optionId>"`
Reason: matches the spec's default and lets themeContext set color-scheme through its own apply. All cleanups run on change and unmount. A throwing apply is logged and swallowed.

## The viewport preset constrains the canvas frame width (with max-width: 100%), and `fit` fills
Reason: preset widths must reach the iframe's own viewport for media queries to fire.

## Canvas measures its root (ResizeObserver, with an initial synchronous measure) and reports `{width,height}` to the host and to `env.viewport`
Reason: the toolbar readout needs the live width, and entries need the real viewport size in env. Falls back gracefully where ResizeObserver is unavailable.

## `isolation: 'none'` renders in a plain div in the host document, with no portal and no mirroring
Reason: for the rare entry that needs the host document (e.g. a global overlay).

## `mountPlayground` uses `createRoot` from react-dom/client and returns `root.unmount`
Reason: the only React-DOM imperative API in the package, isolated to the playground entry, not core.

---

## Chrome palette is light and dark, driven by `prefers-color-scheme` on `.dct-playground` unless overridden
Reason: matches the spec's "follows the OS", and the same token set works for a manual toggle without any CSS changes. See the batch-1 addendum for the manual override.
Contrast ratios checked against `--dct-surface`:
  light: ink 17.83:1, muted 5.43:1, accent 6.72:1, accent-strong on tint 7.91:1, border 3.30:1
  dark:  ink 14.49:1, muted 6.90:1, accent 7.01:1, accent-strong on tint 8.10:1, border 3.75:1
The border tokens were darkened from the original blue-gray proposal (`#D5DCE8` light) because it fell below the WCAG 2.1 non-text 3:1 threshold; `#7F8FA3` light and `#64748B` dark pass.
Alternatives: a lighter decorative border (fails 3:1), a manual toggle (see later).

## `--dct-on-accent` flips between light and dark instead of forcing white
Reason: white on #60A5FA in dark mode is only 2.54:1 (fails). Dark ink #0F172A on #60A5FA is 7.01:1. The selected segment therefore shows as a bright chip with dark text in dark mode.
Alternatives: use a darker accent in dark mode (less vivid), force white everywhere (fails dark mode).

## All chrome rules live inside `@layer deract`
Reason: an unlayered consumer stylesheet overrides layered rules automatically, so "override the tokens" or "restyle a control" works without `!important` or higher-specificity selectors.
Alternatives: high-specificity selectors (fragile), CSS custom properties only (limits structural overrides).

## The canvas (iframe body and inline root) does not follow OS dark mode; only `data-theme` on the root does
Reason: the spec is explicit. The iframe's `color-scheme: light` and the `.dct-canvas-root[data-theme]` rules make `data-theme` the only switch that affects the canvas, and give native form elements inside the canvas the correct palette when the entry uses one.
Alternatives: let the iframe follow the OS (violates the spec), ignore `data-theme` on the root (breaks entries that rely on it).

## Layout breakpoints at 800px (props panel wraps below the canvas) and 560px (sidebar stacks above)
Reason: the spec asks for 360 px usable; at ≤560px the whole playground becomes a vertical stack and every panel scrolls on its own.

## Focus ring is a 2 px solid `--dct-focus` with 1 px offset on every interactive element
Reason: visible focus for keyboard users; the ring color follows the accent so it flips with the OS.

## Reduced motion: animations and transitions are killed via a `prefers-reduced-motion: reduce` block, and `scroll-behavior` is reset to `auto`
Reason: the spec asks for `prefers-reduced-motion` respected on the chrome. Entries must do the same in their own CSS; the README and DERACT-USAGE say so.

---

## Space Grotesk: option B — a Latin subset at `fonts.css` + `fonts/`, opt-in
Reason: approved by the founder — a bundled local font, offline, but not part of the default install. `fonts.css` is a separate export, so consumers who don't import it pay zero bytes. The woff2 is fetched once, at dev time, from Google Fonts' prebuilt Latin subset (`scripts/fetch-font.mjs`) and committed; there is no runtime network call. Measured size: 13,284 bytes.
Deviation from spec: the spec said "no web fonts". The font is bundled locally, under SIL OFL 1.1, and does not violate offline or "no CDN" because it loads from the package.
Alternatives: A (font stack only — loses the look on most machines); C (self-host whole family — 3+ weights, too much weight for a wordmark).

## Error panel selectors are `.dct-error`, `.dct-error-title`, `.dct-error-stack`
Reason: they match the component shipped in piece 4 (error.tsx). A mismatch would leave the canvas error unstyled.

## Brand header spans the top of the playground (`grid-area: brand`, `grid-column: 1 / -1`)
Reason: logo and wordmark belong to the whole playground, not to the sidebar. Putting the brand inside `<nav aria-label="Components">` would be noise for screen readers.
Alternatives: brand inside the sidebar header (muddies the nav landmark), no brand (loses identity).

## The inline logo uses `currentColor`, the standalone `logo.svg` uses the fixed accent
Reason: the chrome logo must flip with the light/dark token set; the file is for docs, website and favicon where a stable brand color is correct.

## `fonts.css` falls back gracefully when the woff2 is missing
Reason: consumers who clone the repo without running `pnpm fonts:fetch` still get a working playground with system fonts. No test asserts on font loading, so a missing file cannot fail CI.

---

## The example aliases `@atlis/deract/*` at source level for dev
Reason: the library's `exports` map points at `dist/`, and `dist` is produced by the build. The example must run without requiring a prior `pnpm build`, otherwise `pnpm -C examples/vite-react dev` fails out of the box. Vite aliases with exact regex entries (`playground`, `styles.css`, `fonts.css`, then bare `@atlis/deract`) and `dedupe: ['react', 'react-dom']` keep a single React copy and a working HMR path. TypeScript resolves the same files through `tsconfig.paths`, and both ends must agree.
Alternatives: force a build first (worse DX, and pins the example to whatever the build emits); publish a `src` subpath in `exports` (pollutes the package surface for a dev-only need).

## `vite.config.ts` uses `fileURLToPath(import.meta.url)` instead of `__dirname`
Reason: `"type": "module"` means the config is ESM, where `__dirname` does not exist. `fileURLToPath` is the portable equivalent.
Alternatives: `new URL(..., import.meta.url).pathname` (URL-encoded on Windows, breaks on paths with spaces).

## `@types/node` is a devDependency of the example only, not of `packages/deract`
Reason: `vite.config.ts` needs it; the library must never import `node:*` at runtime, and keeping `@types/node` out of the library's devDependencies is a structural reminder of that.

## The GSAP example reads `env.contexts.motion` in JS; the CSS-transition entries rely on `[data-motion="reduce"]`
Reason: GSAP cannot be disabled from CSS alone — a JS tween must be skipped at the call site. Plain CSS transitions on `.ex-btn` and `.ex-counter` are neutralised by the `[data-motion="reduce"]` rule, which is the pattern the README asks entries to adopt.
Alternatives: force every entry to check `env.contexts.motion` (burdensome for CSS-driven entries); rely on `prefers-reduced-motion` alone (does not work inside an iframe that the playground cannot force).

## The Counter's `update` resets its internal count only when the `start` arg changes
Reason: an `update` that silently discards the user's clicks would be a surprise; resetting only on an explicit `start` change is predictable and demonstrates the update-vs-remount contract cleanly.
Alternatives: reset on every update (breaks the "state lives in the entry" model); never reset (surprises when `start` changes and nothing happens).

---

## Chrome light/dark is a two-state toggle persisted to localStorage under `dct-chrome`, overriding `prefers-color-scheme`
Reason: the chrome follows the OS by default. A user who clicks the toggle overrides the OS for the session and across reloads. Clearing `localStorage.dct-chrome` restores auto. The canvas is unaffected: it stays on the Theme context, which is `data-theme` on the canvas root.
Alternatives: three-state toggle (auto/light/dark) — more UI, more code, same outcome via "clear localStorage"; OS-only (no override — the LATER item asked for a manual toggle).

## The chrome toggle lives in the brand bar, `margin-left: auto`
Reason: one obvious home for it; the brand bar is above every other chrome surface so the affordance is always visible.
Alternatives: bottom-right FAB (competing with the props panel), settings popover (too much UI for a single toggle).

## "/" focuses the sidebar search when the user is not typing
Reason: it is the standard shortcut for search, discoverable via the placeholder hint, and harmless (we skip it inside inputs, textareas, selects, and contenteditable).
Alternatives: Cmd/Ctrl+K (also nice, easy to add later, but "/" is one keystroke), no shortcut (LATER item asked for one).

## Errors thrown in the canvas's event handlers and promises are logged and forwarded to `onCanvasError`; they do not show the entry error panel
Reason: the entry error boundary is for render-time exceptions (which React can catch). Event handler and promise errors are outside React's reach. Surfacing them as a panel would flood the UI on a single bad click; logging plus an optional callback gives the host control without noise.
Alternatives: `window.onerror` in the host document (misses iframe-scoped errors), let them disappear (they currently disappear — that's the bug we're fixing).

## Custom viewport is a synthesized `ViewportPreset { id: 'custom' }`, not a new type
Reason: the rest of the code (Canvas `frameStyle`, `Env.viewport`, tests) already handles a `ViewportPreset` with `width: number | null` and an optional `height`. Synthesizing `{ id: 'custom', label: 'Custom', width, height }` reuses that path with zero new interfaces. The preset is never listed in `viewportPresets`; it only appears when the user activates it.
Alternatives: extend `ViewportPreset` with a `custom` variant (breaks user-supplied presets), add a separate `customViewport` state field (extra field to thread through everywhere).

## The URL gains `vw` and `vh` only when `vp=custom`, and only when valid
Reason: named presets already encode their dimensions; duplicating them in the URL would let a stale URL fight a preset change. `vw`/`vh` are cleared the moment the user picks a preset, so the hash reflects a single source of truth.
Alternatives: always write `vw`/`vh` (URL churn), encode dimensions in `vp` as `vp=420x640` (harder to read, ambiguous for presets).

## `setViewport('custom')` alone is a no-op; `setCustomViewport(width, height?)` is the action
Reason: "custom" without dimensions is not a meaningful state. `setCustomViewport` always sets dimensions; `setViewport(presetId)` always clears them. The URL rewrite decides validity, not the action.
Alternatives: single `setViewport(id, width?, height?)` (harder to read at call sites).

## The rotate button is disabled until both W and H are set
Reason: rotating a width-only viewport has no defined meaning. Once height exists, rotate swaps them and the URL updates through the same `setCustomViewport` path. Rotate is not stored in the hash; the swapped values are.
Alternatives: encode rotation as `rot=1` (redundant state, easy to get out of sync), hide the button entirely (loses the affordance).

## Switching from custom back to a preset discards the custom dimensions
Reason: the URL cannot carry both `vp=phone` and `vw=420` without ambiguity, and keeping dimensions hidden in state means two sources of truth. The custom editor pre-fills from whatever preset is active, so re-entering custom is one click, not four.
Alternatives: remember the last custom dims in state (extra field, harder to reason about), reset to a fixed default each time (worse UX).

## The playground chrome is `data-dct-chrome`, the canvas theme is `data-theme` on the canvas root
Reason: two different switches. `data-dct-chrome` is a manual user preference persisted to `localStorage.dct-chrome`; it affects only the surrounding UI. `data-theme` on the canvas root is chosen per-entry and is what `themeContext` applies. Neither leaks into the other.
Alternatives: one attribute shared by both (couples UI and canvas in a surprising way).

---

## Publishing targets `dist`, source stays out of the tarball
Reason: `tsc` emits ESM `.js`, `.d.ts` and `.d.ts.map`; `scripts/copy-assets.mjs` copies `styles.css`, `fonts.css`, `logo.svg` and `fonts/` in. `files` lists only `dist`, `README.md` and `DERACT-USAGE.md`, so consumers get nothing they can't use. `exports` maps every entry point at `dist/`, and `sideEffects: ["*.css"]` tells bundlers they can tree-shake JS.
Alternatives: ship `src` for consumers' bundlers (more bytes, exposes internals), use tsup/rollup to bundle (adds a dev dep and a build step; tsc is enough at this size).

## React and React DOM are optional peer dependencies
Reason: core has no React runtime dependency. A consumer who only uses `defineComponent` and the plain-DOM path does not need React installed. The playground imports React at runtime, so consumers using it will naturally have React in their tree — but we do not force it.
Alternatives: required peers (fails core-only installs), no peer declaration (bundlers can double-bundle React).

## `scripts/size.mjs` uses approximate minification via regex, not a minifier dep
Reason: the spec forbids adding a dependency for the size script ("built-in zlib, not a new dependency"). The regex minifier strips block comments, line comments (excluding `://` URLs), and collapses whitespace around operators. It is 2–5% larger than `terser` output, which keeps the reported numbers honest by erring high against the targets.
Alternatives: `terser` (better accuracy, adds a dev dep the spec forbids), report raw gzip (misleadingly larger, could fail spurious targets).

## Size targets are hard limits, not goals; the final report lists overruns, not adjustments
Reason: the spec is explicit ("Do not silently raise the targets"). If any measurement exceeds its target, the report says so and piece 8 revisits that surface before declaring done; the target value itself does not move.
Alternatives: relax targets to hit green (dishonest).

---

## Considered and rejected: mirroring styles through CSSOM (`insertRule`, `adoptedStyleSheets`)
Reason: `adoptedStyleSheets` cannot be shared cross-document in every browser, breaks `@import`, and breaks relative `url()` resolution against the target document (so fonts/images 404 in the mirrored copy). The current `<style>`/`<link>` cloning delegates all of that to the browser and is strictly more correct.
Alternatives: read `document.styleSheets[i].cssRules` and `insertRule` each rule into a constructed sheet on the target (more code, same limitations), keep cloning (chosen).

## Considered and rejected for v0.1: branded website and docs site
Reason: the spec scopes v0.1 to a library; a website/docs site is a separate project that should follow a stable API. `DERACT-USAGE.md` is the architect-facing reference; a real docs site is v0.2 work.

## Considered and deferred: resizable sidebar/main split, collapsible sidebar, theme swatches
Reason:
- **Resizable split:** needs pointer-event plumbing and its own hash state; adds surface area before size and stability gates.
- **Collapsible sidebar:** every collapse state is a layout the CSS has to hold together; worth doing once the layout is settled, not immediately before shipping v0.1.
- **Theme swatches:** requires a `preview` field on `ContextOption`, which is a public API addition. Belongs in a v0.2 design pass.
See LATER.md.