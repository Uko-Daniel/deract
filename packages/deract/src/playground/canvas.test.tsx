import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ContextDef } from '../contexts';
import { Canvas, type CanvasProps } from './canvas';

afterEach(cleanup);

const baseProps = (over: Partial<CanvasProps> = {}): CanvasProps => ({
  contexts: [],
  contextValues: {},
  viewport: undefined,
  isolation: 'iframe',
  onSize: () => {},
  children: () => null,
  ...over,
});

function getIframe(): HTMLIFrameElement {
  const iframe = document.querySelector('iframe');
  if (!iframe) throw new Error('no iframe rendered');
  return iframe as HTMLIFrameElement;
}

describe('Canvas: iframe rendering', () => {
  it('renders an iframe and portals the entry into its body', () => {
    render(<Canvas {...baseProps()}>{() => <button>Click me</button>}</Canvas>);
    const iframe = getIframe();
    fireEvent.load(iframe);
    const button = iframe.contentDocument!.querySelector('button');
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe('Click me');
  });

  it('fires onClick from a React entry rendered inside the iframe portal', () => {
    const onClick = vi.fn();
    render(<Canvas {...baseProps()}>{() => <button onClick={onClick}>Go</button>}</Canvas>);
    const iframe = getIframe();
    fireEvent.load(iframe);

    const button = iframe.contentDocument!.querySelector('button')!;
    const win = iframe.contentDocument!.defaultView!;
    button.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('mirrors host <style> tags into the iframe head, and picks up new ones', async () => {
    const style = document.createElement('style');
    style.textContent = '.mirrored { color: red; }';
    document.head.appendChild(style);
    try {
      render(<Canvas {...baseProps()}>{() => <div className="mirrored">hi</div>}</Canvas>);
      const iframe = getIframe();
      fireEvent.load(iframe);
      const mirrored = iframe.contentDocument!.head.querySelector('style[data-dct-mirrored]');
      expect(mirrored).toBeTruthy();
      expect(mirrored!.textContent).toContain('.mirrored { color: red; }');

      const second = document.createElement('style');
      second.textContent = '.later { color: blue; }';
      document.head.appendChild(second);
      // MutationObserver callbacks are microtasks; wait for them.
      await new Promise((r) => setTimeout(r, 0));
      const all = Array.from(
        iframe.contentDocument!.head.querySelectorAll('style[data-dct-mirrored]'),
      );
      expect(all.some((n) => n.textContent?.includes('.later { color: blue; }'))).toBe(true);
      second.remove();
    } finally {
      style.remove();
    }
  });
});

describe('Canvas: contexts', () => {
  const theme: ContextDef = {
    id: 'theme',
    label: 'Theme',
    default: 'light',
    options: [
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark' },
    ],
  };

  it('sets data-<id> on the canvas root when no apply is given', () => {
    render(
      <Canvas {...baseProps({ contexts: [theme], contextValues: { theme: 'dark' } })}>
        {() => null}
      </Canvas>,
    );
    const iframe = getIframe();
    fireEvent.load(iframe);
    const root = iframe.contentDocument!.getElementById('dct-canvas-root')!;
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('calls a custom apply and runs its cleanup on unmount', () => {
    const cleanupFn = vi.fn();
    const apply = vi.fn(() => cleanupFn);
    const custom: ContextDef = {
      id: 'x',
      label: 'X',
      default: 'a',
      options: [{ id: 'a', label: 'A' }],
      apply,
    };
    const { unmount } = render(
      <Canvas {...baseProps({ contexts: [custom], contextValues: { x: 'a' } })}>
        {() => null}
      </Canvas>,
    );
    const iframe = getIframe();
    fireEvent.load(iframe);
    expect(apply).toHaveBeenCalledTimes(1);
    unmount();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('does not crash when a custom apply throws', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad: ContextDef = {
      id: 'bad',
      label: 'Bad',
      default: 'a',
      options: [{ id: 'a', label: 'A' }],
      apply: () => {
        throw new Error('boom');
      },
    };
    render(
      <Canvas {...baseProps({ contexts: [bad], contextValues: { bad: 'a' } })}>
        {() => null}
      </Canvas>,
    );
    const iframe = getIframe();
    fireEvent.load(iframe);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('Canvas: isolation "none"', () => {
  it('renders in a plain div with no iframe', () => {
    render(
      <Canvas {...baseProps({ isolation: 'none' })}>
        {() => <span>inline child</span>}
      </Canvas>,
    );
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByText('inline child')).toBeTruthy();
  });
});