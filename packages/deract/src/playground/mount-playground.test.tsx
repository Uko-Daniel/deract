import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { defineComponent } from '../define-component';
import { createRegistry } from '../registry';
import { mountPlayground } from './mount-playground';
import type { Cleanup } from '../types';

afterEach(cleanup);

describe('mountPlayground', () => {
  it('renders the playground into a plain element and unmounts cleanly', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const registry = createRegistry([
      defineComponent({ id: 'x', title: 'X', render: () => <span>hello</span> }),
    ]);

    let dispose: Cleanup | undefined;
    act(() => {
      dispose = mountPlayground(host, { registry });
    });
    expect(host.querySelector('.dct-playground')).toBeTruthy();

    act(() => {
      dispose!();
    });
    expect(host.querySelector('.dct-playground')).toBeNull();
    document.body.removeChild(host);
  });
});