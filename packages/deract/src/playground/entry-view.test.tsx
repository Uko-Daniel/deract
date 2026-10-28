import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { defineComponent } from '../define-component';
import type { Env } from '../types';
import type { CanvasTarget } from './canvas';
import { EntryView } from './entry-view';
import { ErrorBoundary } from './error';

let box: HTMLElement;
let target: CanvasTarget;

const makeEnv = (theme = 'light'): Env => ({
  contexts: { theme },
  viewport: { width: 360, height: 640 },
  document,
  window,
});

beforeEach(() => {
  box = document.createElement('div');
  document.body.append(box);
  target = { document, window, root: box, container: box };
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs caught errors
});

afterEach(() => {
  cleanup();
  box.remove();
  vi.restoreAllMocks();
});

function Boom({ when }: { when: boolean }) {
  if (when) throw new Error('kaboom');
  return <p>fine</p>;
}

describe('ErrorBoundary', () => {
  it('shows message and stack, and leaves siblings alone', () => {
    render(
      <div>
        <p>sibling</p>
        <ErrorBoundary resetKeys={[1]}>
          <Boom when />
        </ErrorBoundary>
      </div>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('kaboom');
    expect(alert.querySelector('pre')?.textContent).toContain('kaboom');
    expect(screen.getByText('sibling')).toBeTruthy();
  });

  it('retries only when a reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['a']}>
        <Boom when />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary resetKeys={['a']}>
        <Boom when={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).not.toBeNull(); // same keys: still showing the error

    rerender(
      <ErrorBoundary resetKeys={['b']}>
        <Boom when={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('fine')).toBeTruthy();
  });
});

describe('EntryView: render entries', () => {
  const entry = defineComponent({
    id: 'r',
    title: 'R',
    controls: { label: { type: 'text', default: 'x' } },
    render: (args, env) => (
      <p>
        {args.label}-{env.contexts.theme}
      </p>
    ),
  });

  it('renders into the target container and follows args and env', () => {
    const env = makeEnv();
    const { rerender } = render(
      <EntryView entry={entry} args={{ label: 'Hi' }} env={env} target={target} />,
    );
    expect(box.textContent).toBe('Hi-light');
    rerender(
      <EntryView entry={entry} args={{ label: 'Yo' }} env={makeEnv('dark')} target={target} />,
    );
    expect(box.textContent).toBe('Yo-dark');
  });

  it('allows hooks inside render()', () => {
    const hooky = defineComponent({
      id: 'hooky',
      title: 'Hooky',
      render: () => {
        const [n, setN] = useState(0);
        return <button onClick={() => setN(n + 1)}>{n}</button>;
      },
    });
    render(<EntryView entry={hooky} args={{}} env={makeEnv()} target={target} />);
    act(() => box.querySelector('button')!.click());
    expect(box.querySelector('button')!.textContent).toBe('1');
  });

  it('shows an error panel when render throws, and recovers when args change', () => {
    const bad = defineComponent({
      id: 'bad',
      title: 'Bad',
      controls: { bad: { type: 'boolean', default: true } },
      render: (args) => {
        if (args.bad) throw new Error('render failed');
        return <p>recovered</p>;
      },
    });
    const env = makeEnv();
    const { rerender } = render(<EntryView entry={bad} args={{ bad: true }} env={env} target={target} />);
    expect(screen.getByRole('alert').textContent).toContain('render failed');

    rerender(<EntryView entry={bad} args={{ bad: false }} env={env} target={target} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(box.textContent).toBe('recovered');
  });
});

describe('EntryView: mount entries', () => {
  const makeUpdatable = () => {
    const calls = { mount: 0, update: 0, destroy: 0 };
    const entry = defineComponent({
      id: 'm',
      title: 'M',
      controls: { n: { type: 'number', default: 1 } },
      mount(el, args) {
        calls.mount++;
        el.textContent = `n=${args.n}`;
        return {
          update(a) {
            calls.update++;
            el.textContent = `n=${a.n}`;
          },
          destroy() {
            calls.destroy++;
          },
        };
      },
    });
    return { entry, calls };
  };

  it('mounts, updates through the handle, and destroys on unmount', () => {
    const { entry, calls } = makeUpdatable();
    const env = makeEnv();
    const { rerender, unmount } = render(
      <EntryView entry={entry} args={{ n: 1 }} env={env} target={target} />,
    );
    expect(box.textContent).toBe('n=1');

    rerender(<EntryView entry={entry} args={{ n: 2 }} env={env} target={target} />);
    expect(box.textContent).toBe('n=2');
    expect(calls).toEqual({ mount: 1, update: 1, destroy: 0 });

    unmount();
    expect(calls.destroy).toBe(1);
  });

  it('treats a context change (new env) like an args change', () => {
    const { entry, calls } = makeUpdatable();
    const args = { n: 1 };
    const { rerender } = render(<EntryView entry={entry} args={args} env={makeEnv()} target={target} />);
    rerender(<EntryView entry={entry} args={args} env={makeEnv('dark')} target={target} />);
    expect(calls).toEqual({ mount: 1, update: 1, destroy: 0 });
  });

  it('does nothing when re-rendered with the same args and env objects', () => {
    const { entry, calls } = makeUpdatable();
    const args = { n: 1 };
    const env = makeEnv();
    const { rerender } = render(<EntryView entry={entry} args={args} env={env} target={target} />);
    rerender(<EntryView entry={entry} args={args} env={env} target={target} />);
    expect(calls).toEqual({ mount: 1, update: 0, destroy: 0 });
  });

  it('cleans up then remounts when the entry has only a cleanup function', () => {
    const calls = { mount: 0, cleanup: 0 };
    const entry = defineComponent({
      id: 'c',
      title: 'C',
      controls: { n: { type: 'number', default: 1 } },
      mount(el, args) {
        calls.mount++;
        el.textContent = `n=${args.n}`;
        return () => {
          calls.cleanup++;
        };
      },
    });
    const env = makeEnv();
    const { rerender } = render(<EntryView entry={entry} args={{ n: 1 }} env={env} target={target} />);
    rerender(<EntryView entry={entry} args={{ n: 2 }} env={env} target={target} />);
    expect(calls).toEqual({ mount: 2, cleanup: 1 });
    expect(box.textContent).toBe('n=2');
  });

  it('destroys the old entry and mounts the new one when the entry changes', () => {
    const a = makeUpdatable();
    const b = defineComponent({
      id: 'other',
      title: 'Other',
      mount(el) {
        el.textContent = 'other';
      },
    });
    const env = makeEnv();
    const { rerender } = render(<EntryView entry={a.entry} args={{ n: 1 }} env={env} target={target} />);
    rerender(<EntryView entry={b} args={{}} env={env} target={target} />);
    expect(a.calls.destroy).toBe(1);
    expect(box.textContent).toBe('other');
  });

  it('shows an error panel when mount throws, and recovers when args change', () => {
    const bad = defineComponent({
      id: 'badm',
      title: 'BadM',
      controls: { bad: { type: 'boolean', default: true } },
      mount(el, args) {
        if (args.bad) throw new Error('mount failed');
        el.textContent = 'ok';
      },
    });
    const env = makeEnv();
    const { rerender } = render(<EntryView entry={bad} args={{ bad: true }} env={env} target={target} />);
    expect(screen.getByRole('alert').textContent).toContain('mount failed');

    rerender(<EntryView entry={bad} args={{ bad: false }} env={env} target={target} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(box.textContent).toBe('ok');
  });
});