# Deract example — Vite + React

Three entries that prove the "no adapters" claim:

- **Button** — a React component with controls and four variants.
- **Counter** — a plain-DOM widget mounted via `mount()`, with an `update` handle so changing args does not remount it.
- **GSAP Box** — a GSAP tween that reads `env.contexts.motion` and skips animation when set to `reduce`.

## Run

```bash
pnpm install
pnpm -C examples/vite-react dev