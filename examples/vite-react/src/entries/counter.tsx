import { defineComponent } from '@atlis/deract';

export const counter = defineComponent({
  id: 'counter',
  title: 'Counter',
  group: 'Adapters',
  description: 'Plain-DOM counter mounted into the canvas. Proves the mount() path.',
  controls: {
    start: { type: 'number', default: 0, label: 'Start at' },
    step: { type: 'number', default: 1, label: 'Step' },
  },
  mount(el, initialArgs) {
    let args = initialArgs;
    let count = args.start;

    const doc = el.ownerDocument;
    const wrap = doc.createElement('div');
    wrap.className = 'ex-counter';

    const value = doc.createElement('span');
    const inc = doc.createElement('button');
    inc.type = 'button';
    inc.textContent = '+';
    const reset = doc.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset';

    const render = () => {
      value.textContent = String(count);
    };
    const onClick = () => {
      count += args.step;
      render();
    };
    const onReset = () => {
      count = args.start;
      render();
    };

    inc.addEventListener('click', onClick);
    reset.addEventListener('click', onReset);
    wrap.append(value, inc, reset);
    el.appendChild(wrap);
    render();

    return {
      update(nextArgs) {
        if (nextArgs.start !== args.start) count = nextArgs.start;
        args = nextArgs;
        render();
      },
      destroy() {
        inc.removeEventListener('click', onClick);
        reset.removeEventListener('click', onReset);
        wrap.remove();
      },
    };
  },
});