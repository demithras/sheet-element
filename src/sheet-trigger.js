/**
 * Opens its sheet overlay when the button inside it is pressed, and owns the open state of an
 * overlay that has no state of its own: it dispatches that overlay's `openchange` events.
 */
export class SheetTrigger extends HTMLElement {
  #overlay = null;

  constructor() {
    super();
    this.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (button) {
        // Safari does not focus a button on click, and focus returns here when the sheet closes.
        button.focus();
        this.#overlay.requestOpen(!this.#overlay.open);
      }
    });
  }

  /**
   * Reflects the open state on the trigger button. Called by the overlay as it opens and closes.
   * @param {string | null} dialogId The id of the open dialog, or null when closed.
   */
  setControlled(dialogId) {
    const button = this.querySelector(':scope > button');
    button.setAttribute('aria-expanded', dialogId !== null);
    if (dialogId) {
      button.setAttribute('aria-controls', dialogId);
    } else {
      button.removeAttribute('aria-controls');
    }
  }

  connectedCallback() {
    // Looked up here because an open overlay is moved out of the trigger.
    this.#overlay ??= this.querySelector(':scope > sheet-overlay');
  }

  disconnectedCallback() {
    // An open overlay lives in the body, so removing the trigger must unmount it explicitly. The
    // overlay is never moved by the trigger, so a trigger still detached after a microtask is gone.
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.#overlay?.remove();
      }
    });
  }
}
