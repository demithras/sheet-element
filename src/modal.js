/**
 * Modal behaviour of an open sheet: the page behind does not scroll and is inert, focus moves into
 * the dialog and stays there, Escape and presses outside dismiss the topmost sheet, and focus
 * returns to where it was when the sheet closes.
 */

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';

let scrollLocks = 0;
let restoreScroll = () => {};

// Counted, because stacked sheets share one lock.
function lockPageScroll() {
  if (scrollLocks++ === 0) {
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    // Keep the layout from shifting when the scrollbar disappears.
    if (window.innerWidth > root.clientWidth) {
      root.style.scrollbarGutter = 'stable';
    }
    root.style.overflow = 'hidden';
    restoreScroll = () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
    };
  }
  return () => {
    if (--scrollLocks === 0) {
      restoreScroll();
    }
  };
}

// Makes everything in the body except `keep` inert, which also hides it from assistive technology.
function hideOutside(keep) {
  const hidden = [...document.body.children].filter((child) => child !== keep && !child.inert);
  hidden.forEach((child) => (child.inert = true));
  return () => hidden.forEach((child) => (child.inert = false));
}

/** The modal behaviour of one open sheet, active until its signal aborts. */
export class ModalLayer {
  #root;
  #dialog;
  #returnFocus = document.activeElement;
  #restoreInert = () => {};

  /**
   * @param {HTMLElement} root The sheet overlay; everything else in the body is hidden once engaged.
   * @param {object} options
   * @param {HTMLElement} options.panel The visible sheet; presses outside it dismiss the sheet.
   * @param {HTMLElement} options.dialog The dialog element that receives focus.
   * @param {() => boolean} options.canDismiss Whether this sheet may be dismissed right now.
   * @param {() => void} options.dismiss Asks for the sheet to close.
   * @param {AbortSignal} options.signal Ends the behaviour and restores the page.
   */
  constructor(root, { panel, dialog, canDismiss, dismiss, signal }) {
    this.#root = root;
    this.#dialog = dialog;

    const unlockScroll = lockPageScroll();
    let pressStartedOutside = false;
    const isOutside = (event) => !panel.contains(event.target);
    document.addEventListener('keydown', (event) => this.#onKeyDown(event, canDismiss, dismiss), {
      signal,
    });
    // Dismiss on release, and only if the press began outside: a swipe that starts on the backdrop
    // is cancelled by the browser when it takes over for scrolling, so it never dismisses.
    document.addEventListener('pointerdown', (event) => (pressStartedOutside = isOutside(event)), {
      signal,
    });
    document.addEventListener(
      'pointerup',
      (event) => {
        if (pressStartedOutside && isOutside(event) && canDismiss()) {
          dismiss();
        }
        pressStartedOutside = false;
      },
      { signal },
    );
    signal.addEventListener(
      'abort',
      () => {
        unlockScroll();
        this.#restoreInert();
        this.#returnFocus?.focus({ preventScroll: true });
      },
      { once: true },
    );
  }

  /** Hides the rest of the page and moves focus into the dialog. */
  engage() {
    this.#restoreInert = hideOutside(this.#root);
    this.#dialog.focus({ preventScroll: true });
  }

  #onKeyDown(event, canDismiss, dismiss) {
    if (event.key === 'Escape' && canDismiss()) {
      dismiss();
    } else if (event.key === 'Tab') {
      this.#containTab(event);
    }
  }

  // Wraps Tab and Shift+Tab around the dialog's tabbable elements.
  #containTab(event) {
    const tabbables = [...this.#dialog.querySelectorAll(TABBABLE)].filter(
      (element) => element.tabIndex >= 0 && !element.disabled && element.checkVisibility(),
    );
    const [first, last] = [tabbables[0], tabbables.at(-1)];
    const active = document.activeElement;
    const leaving = event.shiftKey ? active === first || active === this.#dialog : active === last;
    if (!tabbables.length || leaving) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }
}
