import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Cleanup } from '../types';
import { Playground, type PlaygroundProps } from './playground';

/** Mount the playground into a plain DOM element. Returns a Cleanup that unmounts. */
export function mountPlayground(el: HTMLElement, props: PlaygroundProps): Cleanup {
  const root = createRoot(el);
  root.render(createElement(Playground, props));
  return () => {
    root.unmount();
  };
}