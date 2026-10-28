# @atlis/deract

A tiny playground for isolated UI components. React optional, offline-first, unopinionated about what an entry renders.

## Install

```bash
pnpm add @atlis/deract

React is a peer dependency (^18 || ^19). Install it if you're using the playground.

Use
tsx
import { createRegistry, defineComponent } from '@atlis/deract';
import { Playground } from '@atlis/deract/playground';
import '@atlis/deract/styles.css';

const button = defineComponent({
  id: 'button',
  title: 'Button',
  controls: {
    label: { type: 'text', default: 'Click me' },
  },
  render: (args) => <button>{args.label}</button>,
});

const registry = createRegistry([button]);

export function App() {
  return <Playground registry={registry} />;
}
Non-React hosts use mountPlayground(el, { registry }), which returns a cleanup function.

Exports
@atlis/deract — core: defineComponent, defineContext, createRegistry, built-in contexts, viewportPresets, and types.

@atlis/deract/playground — <Playground> and mountPlayground.

@atlis/deract/styles.css — required for the playground to look right.

@atlis/deract/fonts.css — optional Space Grotesk for the wordmark (bundled locally, no network).

@atlis/deract/logo.svg — the [/] mark.

Highlights
Zero runtime dependencies. Core is framework-free; React is used only by the playground UI.

Works fully offline. No web fonts, no CDN, no network calls.

Unopinionated about what an entry renders. React, Rive, Lottie, GSAP, Three.js, or plain DOM all work with zero adapters — use render for React, mount for everything else.

Contexts, not a theme union. Theme, density, locale and reduced-motion are named sets of options the playground switches live.

Shareable state. The URL holds the entry, variant, contexts, viewport, and args, so any view is a link.

Full reference
See DERACT-USAGE.md — every export with signature and one example, the lifecycle rules, how to add an entry, how to add a context, and known limitations.

Known limitation
An iframe cannot have its prefers-reduced-motion media query forced. reducedMotionContext sets data-motion="reduce" on the canvas root and env.contexts.motion === 'reduce', but entries must honour this themselves — CSS via [data-motion="reduce"], JS via env.contexts.motion. Documented in full in DERACT-USAGE.md.