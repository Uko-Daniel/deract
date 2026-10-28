import { defineComponent } from '@atlis/deract';

export const button = defineComponent({
  id: 'button',
  title: 'Button',
  group: 'Primitives',
  description: 'A button with variants and sizes. Pure React.',
  controls: {
    label: { type: 'text', default: 'Click me', label: 'Label' },
    variant: {
      type: 'select',
      default: 'primary',
      options: ['primary', 'secondary', 'ghost'],
      label: 'Variant',
    },
    size: {
      type: 'select',
      default: 'md',
      options: ['sm', 'md', 'lg'],
      label: 'Size',
    },
    disabled: { type: 'boolean', default: false, label: 'Disabled' },
  },
  variants: {
    primary: { variant: 'primary', size: 'md', label: 'Click me' },
    secondary: { variant: 'secondary', size: 'md', label: 'Click me' },
    ghost: { variant: 'ghost', size: 'md', label: 'Click me' },
    largePrimary: { variant: 'primary', size: 'lg', label: 'Save' },
  },
  render: (args) => (
    <button
      type="button"
      className={`ex-btn ex-btn-${args.variant} ex-btn-${args.size}`}
      disabled={args.disabled}
    >
      {args.label}
    </button>
  ),
});