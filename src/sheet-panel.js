import { applyAnimationLayers, stackAnimationLayers, swipeAnimationLayers } from './animation.js';
import { SheetPart } from './part.js';

/** The visible sheet. It carries the snap point markers and the swipe and stack animations. */
export class SheetPanel extends SheetPart {
  static defaultClass = 'react-aria-Sheet';

  #insertedNodes = [];
  #ownStyles = [];

  /**
   * @param {import('./sheet-overlay.js').SheetState} state
   */
  mount(state) {
    super.mount(state);
    this.#setStyle('direction', state.direction);
    const overscroll = this.#extendBeyondEdge(state);

    // Lets assistive technology users dismiss the sheet, as swiping or pressing outside would.
    if (state.dismissable) {
      const wrapper = document.createElement('div');
      wrapper.dataset.sheetDismiss = '';
      const button = document.createElement('button');
      button.ariaLabel = 'Dismiss';
      button.tabIndex = -1;
      wrapper.append(button);
      this.#insert(wrapper);
    }
    if (state.snapPoints.length) {
      this.#insert(this.#createDetents(state, overscroll));
    }
  }

  render(state) {
    super.render(state);
    const stack = stackAnimationLayers(this.getAttribute('stack-animation'), state);
    applyAnimationLayers(this, [...swipeAnimationLayers(this, state), ...stack]);
  }

  unmount() {
    super.unmount();
    applyAnimationLayers(this, []);
    this.#insertedNodes.forEach((node) => node.remove());
    this.#insertedNodes = [];
    this.#ownStyles.forEach((name) => this.style.removeProperty(name));
    this.#ownStyles = [];
  }

  #setStyle(name, value) {
    this.style.setProperty(name, value);
    this.#ownStyles.push(name);
  }

  #insert(node) {
    this.prepend(node);
    this.#insertedNodes.push(node);
  }

  // With `overscroll-padding` the sheet's surface continues one viewport beyond the edge it is
  // swiped toward, so overscrolling past it never reveals the page behind. A negative margin keeps
  // the padding from affecting the layout.
  // Returns the extension as `{side, extent}`, or null when there is none.
  #extendBeyondEdge({ position, swipeDirection, config }) {
    if (!this.hasAttribute('overscroll-padding') || position !== swipeDirection) {
      return null;
    }
    const extent = config.axis === 'y' ? '100vh' : '100vw';
    this.#setStyle(`padding-${position}`, extent);
    this.#setStyle(`margin-${position}`, `-${extent}`);
    return { side: position, extent };
  }

  // One marker per snap point, inset from the sheet's leading edge. A marker moves with the sheet
  // and has a scroll-margin of one viewport, so snapping it rests the marker at the viewport edge
  // and leaves exactly `point` of the sheet visible. The container excludes the overscroll padding
  // so that percentages are relative to the visible sheet.
  #createDetents({ snapPoints, config: { axis, after } }, overscroll) {
    const container = document.createElement('div');
    container.dataset.sheetDetents = '';
    if (overscroll) {
      container.style.setProperty(overscroll.side, overscroll.extent);
    }
    const side = axis === 'y' ? (after ? 'top' : 'bottom') : after ? 'left' : 'right';
    const viewport = axis === 'y' ? '100dvh' : '100dvw';
    snapPoints.forEach((point, index) => {
      const marker = document.createElement('div');
      marker.dataset.sheetDetent = '';
      marker.toggleAttribute('data-sheet-initial', index === 0);
      marker.style.cssText = `${side}: ${point}; scroll-margin-${side}: ${viewport}; scroll-snap-align: ${after ? 'start' : 'end'}`;
      container.append(marker);
    });
    return container;
  }
}
