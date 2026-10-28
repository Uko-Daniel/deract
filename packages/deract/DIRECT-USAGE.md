# Deract — usage reference

Compact reference for `@atlis/deract` v0.1. Matches the shipped code exactly.

## Naming conventions

- **Entry ids**: kebab-case, unique — `"text-input"`, `"gsap-box"`.
- **Entry titles**: human-readable — `"Text Input"`.
- **Entry groups**: one level, Title Case — `"Primitives"`, `"Layout"`, `"Adapters"`. Ungrouped entries appear under **Other**.
- **Context ids**: kebab-case — `"theme"`, `"density"`, `"locale"`.
- **Context option ids**: kebab-case — `"light"`, `"dark"`, `"compact"`.
- **Variant names**: camelCase — `"primary"`, `"largePrimary"`.
- **Control names**: camelCase, matching the arg prop — `"label"`, `"maxLength"`.

## Adding an entry

React (`render`):

```tsx
import { defineComponent } from '@atlis/deract';

export const button = defineComponent({
  id: 'button',
  title: 'Button',
  group: 'Primitives',
  controls: {
    label: { type: 'text', default: 'Click me' },
    variant: { type: 'select', default: 'primary', options: ['primary', 'ghost'] as const },
  },
  variants: {
    primary: { variant: 'primary' },
    ghost: { variant: 'ghost' },
  },
  render: (args) => <button className={`btn btn-${args.variant}`}>{args.label}</button>,
});

## Non-React (mount):
export const counter = defineComponent({
  id: 'counter',
  title: 'Counter',
  controls: { start: { type: 'number', default: 0 } },
  mount(el, initialArgs) {
    let args = initialArgs;
    let count = args.start;
    const render = () => { el.textContent = String(count); };
    const onClick = () => { count += 1; render(); };
    el.addEventListener('click', onClick);
    render();
    return {
      update(next) {
        if (next.start !== args.start) count = next.start;
        args = next;
        render();
      },
      destroy() { el.removeEventListener('click', onClick); },
    };
  },
});

Register and render:

tsx
import { createRegistry } from '@atlis/deract';
import { Playground } from '@atlis/deract/playground';
import '@atlis/deract/styles.css';

const registry = createRegistry([button, counter]);

<Playground registry={registry} />
Non-React host: mountPlayground(el, { registry }) returns a Cleanup.

Adding a context
ts
import { defineContext } from '@atlis/deract';

export const densityContext = defineContext({
  id: 'density',
  label: 'Density',
  default: 'comfortable',
  options: [
    { id: 'comfortable', label: 'Comfortable' },
    { id: 'compact', label: 'Compact' },
  ],
  apply({ root, document }, option) {
    root.setAttribute('data-density', option.id);
    return () => root.removeAttribute('data-density');
  },
});

<Playground
  registry={registry}
  contexts={[themeContext, reducedMotionContext, densityContext]}
/>
Omitting apply sets data-<id>="<option-id>" on the canvas root and removes it on change. That default is correct for theme/density/locale-style contexts; use apply only when you need side effects (like color-scheme).

Entry-level scoping: contexts: ['theme', 'motion'] in an entry limits env.contexts to those ids. Omitting it gives the entry every registered context.

Lifecycle
Args change: if mount() returned { update }, update(args, env) is called. Otherwise the entry is destroyed and re-mounted.

Context or viewport change: same rule (the env changed).

Entry change or unmount: destroy() (or the cleanup returned by mount()) always runs.

Variant selection: the variant's args override defaults; user edits override the variant; Reset restores the variant.

Selecting a variant or another entry clears user edits. Contexts and viewport persist across entries.

Env
ts
interface Env {
  contexts: Readonly<Record<string, string>>; // only contexts relevant to this entry
  viewport: { width: number; height: number };
  document: Document; // the iframe's document
  window: Window;
}
Inside the canvas iframe, use env.document and env.window, not the globals — event listeners, timers and API access should go through them so cleanup and portals land in the right document.

Exports
@atlis/deract
defineComponent<C>(entry) — validates and returns the entry.

defineContext(def) — identity function.

createRegistry(entries?) — Registry with add, get, list, groups, subscribe.

themeContext, reducedMotionContext, localeContext(locales).

viewportPresets (Phone 360, Tablet 768, Desktop 1280, Fit).

Types: Entry, ReactEntry, MountEntry, Env, ControlDef, Controls, ArgsOf, ContextDef, ContextOption, ViewportPreset, Registry, Cleanup.

@atlis/deract/playground
<Playground registry contexts? viewports? stylesheets? isolation? title? initial? />

mountPlayground(el, props): Cleanup

Assets
@atlis/deract/styles.css — required for the playground to look right.

@atlis/deract/fonts.css — optional Space Grotesk wordmark (loads from the package, no network).

@atlis/deract/logo.svg — the [/] mark.

Limitations
An iframe cannot have prefers-reduced-motion forced. reducedMotionContext sets data-motion="reduce" and env.contexts.motion === 'reduce' — entries must honour this themselves (CSS via [data-motion="reduce"], JS via env.contexts.motion).

Host <style> and <link rel=stylesheet> tags are mirrored into the iframe and kept in sync (Vite HMR works). Styles injected via CSSOM (insertRule, adoptedStyleSheets) are not mirrored.

Errors thrown inside mount()'s event handlers or promises are logged and forwarded to onCanvasError (if provided). They do not render the entry's error panel — only render-time and synchronous mount-time errors do.

Nested iframes are not supported: entries render inside Deract's iframe and cannot spawn their own.