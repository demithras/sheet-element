import { getSwipeConfig, parseSnapPoints, resolveDirection } from './geometry.js';
import { ModalLayer } from './modal.js';
import { SheetPart } from './part.js';
import { SheetScroller } from './scroller.js';
import { descendantsOf, isTopmost, registerSheet, stackIndexOf, subscribeStack } from './stack.js';

/**
 * @typedef {object} SheetState Everything the parts of an open sheet render from.
 * @property {string} direction Text direction of the page, `ltr` or `rtl`.
 * @property {import('./geometry.js').SheetPosition} position
 * @property {import('./geometry.js').SwipeDirection} swipeDirection
 * @property {import('./geometry.js').SwipeConfig} config
 * @property {string[]} snapPoints CSS lengths.
 * @property {boolean} dismissable
 * @property {number} stackIndex
 * @property {SheetOverlay[]} descendants Sheets open above this one.
 * @property {boolean} expanded Whether the sheet is entirely visible.
 * @property {boolean} entering
 * @property {boolean} exiting
 */

/** Custom properties the overlay writes inline while open. */
const PAGE_PROPERTIES = [
  '--page-width',
  '--page-height',
  '--sheet-scroll-x',
  '--sheet-scroll-y',
  '--visual-viewport-width',
  '--visual-viewport-height',
];

/**
 * The container of a sheet: `<sheet-backdrop>` and `<sheet-panel>`. Closed, it is only markup. Open,
 * it is moved to the end of the body (out of any clipped or transformed ancestor, so stacked
 * sheets can overlap) and the panel is put on a scroll container that moves it.
 *
 * Attributes: `open`, `default-open`, `controlled`, `position`, `swipe-direction`, `snap-points`,
 * `prevent-dismissal`. Dispatches `openchange` (`detail.open`) when a change is requested.
 */
export class SheetOverlay extends SheetPart {
  static defaultClass = 'react-aria-SheetOverlay';
  static observedAttributes = ['open'];

  #initialized = false;
  #home = null;
  #trigger = null;
  #abort = null;
  #moving = false;

  #state = null;
  #panel = null;
  #parts = [];
  #scroller = null;
  #visible = false;
  #resolveHidden = null;

  get open() {
    return this.hasAttribute('open');
  }

  set open(value) {
    this.toggleAttribute('open', value);
  }

  /** @returns {import('./geometry.js').SwipeConfig} The swipe geometry, while open. */
  get config() {
    return this.#state.config;
  }

  connectedCallback() {
    if (this.#moving) {
      return;
    }
    this.#trigger ??= this.closest('sheet-trigger');
    if (!this.#initialized) {
      this.#initialized = true;
      this.open ||= this.hasAttribute('default-open');
    }
    this.#syncWithOpenAttribute();
  }

  disconnectedCallback() {
    if (!this.#moving && this.#abort) {
      this.#unmount();
    }
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.#syncWithOpenAttribute();
    }
  }

  /**
   * Asks for the sheet to open or close. The state owner (this overlay when it is controlled, has
   * `default-open` or has no trigger, otherwise the trigger) is notified with an `openchange`
   * event; unless the overlay is `controlled`, it then updates `open` itself.
   * @param {boolean} open
   */
  requestOpen(open) {
    if (open === this.open) {
      return;
    }
    const ownsState =
      this.hasAttribute('controlled') || this.hasAttribute('default-open') || !this.#trigger;
    (ownsState ? this : this.#trigger).dispatchEvent(
      new CustomEvent('openchange', { detail: { open } }),
    );
    if (!this.hasAttribute('controlled')) {
      this.open = open;
    }
  }

  #syncWithOpenAttribute() {
    if (this.open && !this.#abort) {
      this.#mount();
    } else if (!this.open && this.#abort && !this.#state.exiting) {
      this.#exit();
    }
  }

  #mount() {
    // Children are upgraded after their parent when the overlay is inserted with its parts.
    customElements.upgrade(this);
    const abort = (this.#abort = new AbortController());
    const { signal } = abort;

    const direction = getComputedStyle(this).direction;
    const position = resolveDirection(this.getAttribute('position') ?? 'bottom', direction);
    const swipeDirection = this.hasAttribute('swipe-direction')
      ? resolveDirection(this.getAttribute('swipe-direction'), direction)
      : position === 'center'
        ? 'vertical'
        : position;
    const config = getSwipeConfig(swipeDirection);
    const preventDismissal = this.hasAttribute('prevent-dismissal');
    const snapPoints = parseSnapPoints(this.getAttribute('snap-points'));
    this.#state = {
      direction,
      position,
      swipeDirection,
      config,
      snapPoints,
      dismissable: !preventDismissal,
      stackIndex: 0,
      descendants: [],
      expanded: false,
      entering: true,
      exiting: false,
    };

    const backdrop = this.querySelector(':scope > sheet-backdrop');
    const panel = (this.#panel = this.querySelector(':scope > sheet-panel'));
    const content = panel.querySelector(':scope > sheet-content');
    this.#parts = [this, backdrop, panel, content].filter(Boolean);
    this.#writePageGeometry();

    this.#parts.forEach((part) => part.mount(this.#state));
    const unsubscribe = subscribeStack(() => this.#render());
    const unregister = registerSheet(this);
    this.#scroller = new SheetScroller(panel, config, { preventDismissal, snapPoints });

    this.#home = document.createComment('sheet-overlay');
    this.before(this.#home);
    this.#relocate(() => document.body.append(this));
    this.#scroller.observe();
    this.#trigger?.setControlled(content.id);

    const layer = new ModalLayer(this, {
      panel,
      dialog: content,
      canDismiss: () => isTopmost(this) && this.#state.dismissable,
      dismiss: () => this.requestOpen(false),
      signal,
    });
    this.addEventListener('click', (event) => this.#onClick(event), { signal });
    this.#observeVisibility(content, signal);
    this.#observeViewport(signal);

    signal.addEventListener('abort', () => {
      unsubscribe();
      unregister();
      this.#scroller.disconnect();
    });
    this.#enter(layer, signal);
  }

  // Positions the overlay over the page as it currently is, and sizes it to cover a page that is
  // larger than the viewport.
  #writePageGeometry() {
    const page = document.scrollingElement;
    const values = {
      '--page-width': page.scrollWidth,
      '--page-height': page.scrollHeight,
      '--sheet-scroll-x': page.scrollLeft,
      '--sheet-scroll-y': page.scrollTop,
      '--visual-viewport-width': visualViewport.width,
      '--visual-viewport-height': visualViewport.height,
    };
    for (const [name, pixels] of Object.entries(values)) {
      this.style.setProperty(name, `${pixels}px`);
    }
  }

  // The visual viewport shrinks when the software keyboard opens; the starter styles use the
  // difference to keep the content above it.
  #observeViewport(signal) {
    visualViewport.addEventListener(
      'resize',
      () => {
        this.style.setProperty('--visual-viewport-width', `${visualViewport.width}px`);
        this.style.setProperty('--visual-viewport-height', `${visualViewport.height}px`);
      },
      { signal },
    );
  }

  // A swipe that moves the sheet entirely out of view closes it; a sheet entirely in view is expanded.
  #observeVisibility(content, signal) {
    let hasEntered = false;
    const rootMargin = `0px 0px ${this.#scroller.viewportPadding}px 0px`;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        this.#visible = entry.intersectionRatio > 0;
        hasEntered ||= this.#visible;
        this.#state.expanded = entry.intersectionRatio >= 1;
        this.#render();
        if (hasEntered && !this.#visible) {
          this.#resolveHidden?.();
          this.requestOpen(false);
        }
      },
      { threshold: [0, 1], rootMargin },
    );
    observer.observe(content);
    signal.addEventListener('abort', () => observer.disconnect());
  }

  // Scrolls the sheet in. Focus moves into it and the page behind is hidden only once it has entered,
  // because moving focus or hiding content scrolls on iOS, which would interrupt the entry.
  async #enter(layer, signal) {
    await this.#scroller.enter();
    if (signal.aborted || this.#state.exiting) {
      return;
    }
    this.#state.entering = false;
    this.#scroller.settle(true);
    this.#render();
    layer.engage();
  }

  async #exit() {
    Object.assign(this.#state, { entering: false, exiting: true });
    this.#scroller.settle(false);
    this.#render();
    if (this.#visible) {
      const hidden = new Promise((resolve) => (this.#resolveHidden = resolve));
      this.#scroller.exit();
      await hidden;
    }
    this.#unmount();
  }

  #unmount() {
    this.#abort.abort();
    this.#abort = null;
    this.#resolveHidden = null;
    this.#visible = false;
    this.#trigger?.setControlled(null);
    this.#scroller.element.replaceWith(this.#panel);
    this.#parts.forEach((part) => part.unmount());
    PAGE_PROPERTIES.forEach((name) => this.style.removeProperty(name));
    if (this.isConnected) {
      this.#relocate(() => this.#home.replaceWith(this));
    } else {
      this.#home.remove();
    }
    this.#home = null;
    this.#scroller = null;
  }

  // Moves the overlay without treating the move as the element being added or removed.
  #relocate(move) {
    this.#moving = true;
    move();
    this.#moving = false;
  }

  #render() {
    this.#state.stackIndex = stackIndexOf(this);
    this.#state.descendants = descendantsOf(this);
    this.#parts.forEach((part) => part.render(this.#state));
  }

  #onClick(event) {
    if (event.target.closest('[slot="close"], [data-sheet-dismiss]')) {
      this.requestOpen(false);
    }
  }
}
