import { applyAnimationLayers, swipeAnimationLayers } from './animation.js';
import { SheetPart } from './part.js';

/** The dimming layer behind a sheet. Its `data-sheet-swipe-animation` follows the swipe. */
export class SheetBackdrop extends SheetPart {
  static defaultClass = 'react-aria-SheetBackdrop';

  render(state) {
    super.render(state);
    applyAnimationLayers(this.element, swipeAnimationLayers(this.element, state));
  }

  unmount() {
    super.unmount();
    applyAnimationLayers(this.element, []);
  }
}
