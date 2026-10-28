import { describe, it, expect } from 'vitest';
import { formatHash, parseHash, type HashState } from './hash';

describe('parseHash', () => {
  it('parses a full hash', () => {
    const state = parseHash(
      '#/button?variant=primary&ctx.theme=dark&ctx.motion=reduce&vp=phone&args=%7B%22label%22%3A%22Hi%22%7D',
    );
    expect(state).toEqual({
      id: 'button',
      variant: 'primary',
      contexts: { theme: 'dark', motion: 'reduce' },
      viewport: 'phone',
      args: { label: 'Hi' },
    });
  });

  it('accepts a hash without the leading slash', () => {
    expect(parseHash('#button?variant=x').id).toBe('button');
  });

  it('returns an empty state for an empty hash', () => {
    expect(parseHash('')).toEqual({ contexts: {}, args: {} });
    expect(parseHash('#/')).toEqual({ contexts: {}, args: {} });
  });

  it('never throws on garbage', () => {
    expect(() => parseHash('#/%E0%A4%A?args=%7Bbad&ctx.=x&vp=')).not.toThrow();
    const state = parseHash('#/%E0%A4%A?args=%7Bbad&ctx.=x&vp=');
    expect(state.id).toBe('%E0%A4%A');
    expect(state.args).toEqual({});
    expect(state.contexts).toEqual({});
    expect(state.viewport).toBeUndefined();
  });

  it('only accepts an object for args', () => {
    expect(parseHash('#/a?args=%5B1%5D').args).toEqual({}); // [1]
    expect(parseHash('#/a?args=42').args).toEqual({});
  });
});

describe('formatHash', () => {
  it('produces a deterministic string, contexts sorted by id', () => {
    const state: HashState = {
      id: 'button',
      variant: 'primary',
      contexts: { theme: 'dark', motion: 'reduce' },
      viewport: 'phone',
      args: { label: 'Hi' },
    };
    expect(formatHash(state)).toBe(
      '#/button?variant=primary&ctx.motion=reduce&ctx.theme=dark&vp=phone&args=%7B%22label%22%3A%22Hi%22%7D',
    );
  });

  it('formats an empty state as #/', () => {
    expect(formatHash({ contexts: {}, args: {} })).toBe('#/');
  });
});

describe('round trip', () => {
  it('restores tricky values exactly', () => {
    const state: HashState = {
      id: 'my-button',
      variant: 'a b&c=d',
      contexts: { theme: 'dark', locale: 'yo' },
      viewport: 'tablet',
      args: { label: 'Ọ̀dún & co "x"', n: 3, on: true, nested: { list: [1, 2] } },
    };
    expect(parseHash(formatHash(state))).toEqual(state);
  });
});