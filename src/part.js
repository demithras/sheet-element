/**
 * Base class of the elements that make up a sheet. A part is a plain declaration while the sheet is
 * closed; the overlay calls `mount` when it opens, `render` whenever the state changes, and
 * `unmount` when it closes, so a closed sheet leaves no class names or state attributes behind.
 */

const STATE_ATTRIBUTES = [
  'data-position',
  'data-swipe-direction',
  'data-stack-index',
  'data-has-descendants',
  'data-expanded',
  'data-entering',
  'data-exiting',
];

/**
 * Sets or removes a boolean data attribute (`"true"` when set, as in the reference).
 * @param {HTMLElement} element
 * @param {string} name
 * @param {boolean} on
 */
function setFlag(element, name, on) {
  if (on) {
    element.setAttribute(name, 'true');
  } else {
    element.removeAttribute(name);
  }
}

/** A part of a sheet (a plain element) with a default class name and the sheet state attributes. */
export class SheetPart {
  /** @param {HTMLElement} element The plain element this part drives. */
  constructor(element) {
    this.element = element;
  }

  /** Class name applied while open, unless the page gave the element a class of its own. */
  static defaultClass = '';

  #addedDefaultClass = false;

  /**
   * Applies the default class name.
   * @param {import('./sheet.js').SheetState} _state
   */
  mount(_state) {
    if (!this.element.classList.length) {
      this.element.classList.add(this.constructor.defaultClass);
      this.#addedDefaultClass = true;
    }
  }

  /** Reflects the sheet state as data attributes. */
  render(state) {
    const { element } = this;
    element.dataset.position = state.position;
    element.dataset.swipeDirection = state.swipeDirection;
    element.dataset.stackIndex = state.stackIndex;
    setFlag(element, 'data-has-descendants', state.descendants.length > 0);
    setFlag(element, 'data-expanded', state.expanded);
    setFlag(element, 'data-entering', state.entering);
    setFlag(element, 'data-exiting', state.exiting);
  }

  /** Removes everything `mount` and `render` added. */
  unmount() {
    const { element } = this;
    if (this.#addedDefaultClass) {
      element.classList.remove(this.constructor.defaultClass);
      this.#addedDefaultClass = false;
    }
    if (!element.classList.length) {
      element.removeAttribute('class');
    }
    STATE_ATTRIBUTES.forEach((name) => element.removeAttribute(name));
  }
}
