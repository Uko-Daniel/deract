import { useState } from 'react';
import { createPortal } from 'react-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Canvas, type CanvasSize, type CanvasTarget } from './canvas';

afterEach(cleanup);

const holder = () => ({
  target: null as CanvasTarget | null,
  size: null as CanvasSize | null,
});

function Counter({ onPress }: { onPress: () => void }) {
  const [n, setN] = useState(0);
  return (
    <button
      onClick={() => {
        setN(n + 1);
        onPress();
      }}
    >
      {n}
    </button>
  );
}

describe('Canvas (iframe)', () => {
  it('gives children the iframe document, not the host document', async () => {
    const h = holder();
    const { container } = render(
      <Canvas>
        {(t, s) => {
          h.target = t;
          h.size = s;
          return null;
        }}
      </Canvas>,
    );
    await waitFor(() => expect(h.target).not.toBeNull());

    const frame = container.querySelector('iframe')!;
    const t = h.target!;
    expect(t.document).toBe(frame.contentDocument);
    expect(t.document).not.toBe(document);
    expect(t.window).toBe(frame.contentWindow);
    expect(t.root).toBe(frame.contentDocument!.documentElement);
    expect(t.document.body.contains(t.container)).toBe(true);
    expect(h.size?.width).toBe(t.window.innerWidth);
  });

  it('delivers React onClick and state updates inside the iframe portal', async () => {
    const h = holder();
    const onPress = vi.fn();
    render(
      <Canvas>
        {(t) => {
          h.target = t;
          return createPortal(<Counter onPress={onPress} />, t.container);
        }}
      </Canvas>,
    );
    await waitFor(() => expect(h.target?.container.querySelector('button')).not.toBeNull());

    const button = () => h.target!.container.querySelector('button')!;
    expect(button().ownerDocument).toBe(h.target!.document); // really in the iframe

    act(() => button().click());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(button().textContent).toBe('1');
  });

  it('mirrors host styles into the iframe', async () => {
    const style = document.createElement('style');
    style.textContent = '.dct-test{color:red}';
    document.head.append(style);
    const h = holder();
    render(
      <Canvas>
        {(t) => {
          h.target = t;
          return null;
        }}
      </Canvas>,
    );
    await waitFor(() => expect(h.target).not.toBeNull());
    expect(h.target!.document.head.textContent).toContain('.dct-test{color:red}');
    style.remove();
  });

  it('removes its container and stops mirroring on unmount', async () => {
    const h = holder();
    const { unmount } = render(
      <Canvas>
        {(t) => {
          h.target = t;
          return null;
        }}
      </Canvas>,
    );
    await waitFor(() => expect(h.target).not.toBeNull());
    const { container, document: frameDoc } = h.target!;
    unmount();
    expect(container.parentNode).toBeNull();
    expect(frameDoc.head.querySelector('[data-dct-mirror]')).toBeNull();
  });
});

describe('Canvas (isolation none)', () => {
  it('renders in a plain div of the host document', async () => {
    const h = holder();
    const { container } = render(
      <Canvas isolation="none" width={360}>
        {(t, s) => {
          h.target = t;
          h.size = s;
          return null;
        }}
      </Canvas>,
    );
    await waitFor(() => expect(h.target).not.toBeNull());

    expect(container.querySelector('iframe')).toBeNull();
    expect(h.target!.document).toBe(document);
    expect(h.target!.root).toBe(h.target!.container);
    expect(document.body.contains(h.target!.container)).toBe(true);
    expect(h.size?.width).toBe(360);
  });
});