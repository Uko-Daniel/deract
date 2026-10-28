import { defineComponent } from '@atlis/deract';
import { gsap } from 'gsap';

export const gsapBox = defineComponent({
  id: 'gsap-box',
  title: 'GSAP Box',
  group: 'Adapters',
  description:
    'A GSAP tween in a mount entry. Honours env.contexts.motion: no movement when "reduce".',
  controls: {
    distance: { type: 'number', default: 240, min: 0, max: 600, label: 'Distance (px)' },
    duration: {
      type: 'number',
      default: 1.6,
      min: 0.2,
      max: 5,
      step: 0.1,
      label: 'Duration (s)',
    },
  },
  mount(el, initialArgs, initialEnv) {
    let args = initialArgs;
    let reduce = initialEnv.contexts.motion === 'reduce';

    const doc = el.ownerDocument;
    const track = doc.createElement('div');
    track.className = 'ex-gsap-track';
    const box = doc.createElement('div');
    box.className = 'ex-gsap-box';
    track.appendChild(box);
    el.appendChild(track);

    let tween: gsap.core.Tween | null = null;

    const play = () => {
      if (tween) {
        tween.kill();
        tween = null;
      }
      if (reduce) {
        gsap.set(box, { x: args.distance });
        return;
      }
      gsap.set(box, { x: 0 });
      tween = gsap.to(box, {
        x: args.distance,
        duration: args.duration,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      });
    };
    play();

    return {
      update(nextArgs, nextEnv) {
        const nextReduce = nextEnv.contexts.motion === 'reduce';
        if (nextReduce !== reduce) reduce = nextReduce;
        args = nextArgs;
        play();
      },
      destroy() {
        if (tween) tween.kill();
        tween = null;
        track.remove();
      },
    };
  },
});