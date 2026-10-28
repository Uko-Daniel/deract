import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineComponent } from './define-component';

describe('defineComponent types', () => {
  it('infers args from controls', () => {
    defineComponent({
      id: 'types-demo',
      title: 'Types demo',
      controls: {
        label: { type: 'text', default: 'Hi' },
        size: { type: 'select', default: 'sm', options: ['sm', 'lg'] },
        count: { type: 'range', default: 1, min: 0, max: 5 },
        on: { type: 'boolean', default: false },
      },
      render: (args) => {
        expectTypeOf(args.label).toEqualTypeOf<string>();
        expectTypeOf(args.size).toEqualTypeOf<'sm' | 'lg'>();
        expectTypeOf(args.count).toEqualTypeOf<number>();
        expectTypeOf(args.on).toEqualTypeOf<boolean>();
        return null;
      },
    });
  });
});

describe('defineComponent validation', () => {
  const ok = { id: 'ok', title: 'Ok', render: () => null };

  it('returns the same entry when valid', () => {
    expect(defineComponent(ok)).toBe(ok);
  });

  it('rejects non kebab-case ids', () => {
    expect(() => defineComponent({ ...ok, id: 'Bad_Id' })).toThrow(/kebab-case/);
  });

  it('requires exactly one of render or mount', () => {
    expect(() => defineComponent({ id: 'a', title: 'A' } as never)).toThrow(/either render or mount/);
    expect(() =>
      defineComponent({ id: 'a', title: 'A', render: () => null, mount: () => {} } as never),
    ).toThrow(/both render and mount/);
  });

  it('rejects a select default that is not in options', () => {
    expect(() =>
      defineComponent({
        ...ok,
        controls: { size: { type: 'select', default: 'xl', options: ['sm', 'lg'] } },
      }),
    ).toThrow(/must be one of/);
  });

  it('rejects numbers outside min/max', () => {
    expect(() =>
      defineComponent({ ...ok, controls: { n: { type: 'range', default: 9, min: 0, max: 5 } } }),
    ).toThrow(/<= 5/);
  });

  it('rejects variants with unknown controls or bad values', () => {
    const controls = { size: { type: 'select', default: 'sm', options: ['sm', 'lg'] } } as const;
    expect(() =>
      defineComponent({ ...ok, controls, variants: { v: { nope: 1 } as never } }),
    ).toThrow(/unknown control/);
    expect(() =>
      defineComponent({
        ...ok,
        controls,
        // @ts-expect-error 'xl' is not a valid size
        variants: { v: { size: 'xl' } },
      }),
    ).toThrow(/must be one of/);
  });
});