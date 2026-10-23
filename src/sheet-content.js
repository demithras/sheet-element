import { timelineName } from './animation.js';
import { SheetPart } from './part.js';

let nextId = 0;

/**
 * @param {Element} element
 * @returns {string} The element's id, assigned if it has none.
 */
function ensureId(element) {
  element.id ||= `sheet-${nextId++}`;
  return element.id;
}

/**
 * The dialog of a sheet. It is the subject of the view timeline that drives every sheet
 * animation, and a visibility observer on it decides when the sheet has been swiped away.
 */
export class SheetContent extends SheetPart {
  static defaultClass = 'react-aria-SheetContent';

  /**
   * @param {import('./sheet-overlay.js').SheetState} state
   */
  mount(state) {
    super.mount(state);
    ensureId(this);
    this.dataset.sheetContent = '';
    this.setAttribute('role', 'dialog');
    this.tabIndex = -1;
    this.#label('slot="title"', 'aria-labelledby');
    this.#label('slot="description"', 'aria-describedby');
  }

  // The dialog carries no state attributes, only the timeline named after the sheet's stack index.
  render(state) {
    const { axis, before, after } = state.config;
    const viewport = axis === 'y' ? '100dvh' : '100dvw';
    this.style.setProperty('view-timeline-name', timelineName(state.stackIndex));
    this.style.setProperty('view-timeline-axis', axis);
    // The inset crops the scroll container's scrollport down to the visible viewport.
    this.style.setProperty(
      'view-timeline-inset',
      before && !after ? `${viewport} 0` : `0 ${viewport}`,
    );
  }

  unmount() {
    super.unmount();
    this.removeAttribute('data-sheet-content');
    for (const name of ['role', 'tabindex', 'aria-labelledby', 'aria-describedby']) {
      this.removeAttribute(name);
    }
    for (const name of ['view-timeline-name', 'view-timeline-axis', 'view-timeline-inset']) {
      this.style.removeProperty(name);
    }
  }

  #label(slot, attribute) {
    const element = this.querySelector(`[${slot}]`);
    if (element) {
      this.setAttribute(attribute, ensureId(element));
    }
  }
}
