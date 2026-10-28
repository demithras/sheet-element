// Derived from React Aria (packages/react-aria/src/overlays/usePreventScroll.ts), Copyright Adobe,
// Apache License 2.0. Modified: rewritten as plain JavaScript.
/**
 * The page scroll lock of React Aria's `usePreventScroll` for Safari on iOS. Even with
 * `overflow: hidden` on the root, Safari scrolls the page under touch, when the keyboard is open,
 * and when a field is focused. So touch moves outside a scrollable region are cancelled, nested
 * scrollers do not chain into the page, and programmatic focus scrolls only the field's scrollers.
 */
import { runAfterKeyboard, willOpenKeyboard } from './keyboard.js';

/** @returns {boolean} Whether this is a WebKit browser on an iPhone or iPad. */
export function isIOSWebKit() {
  const { platform, userAgent, maxTouchPoints } = navigator;
  const iOS = /^iP(hone|ad)/.test(platform) || (platform.startsWith('Mac') && maxTouchPoints > 1);
  return iOS && /AppleWebKit/.test(userAgent);
}

// The nearest ancestor (or the element itself) that scrolls; with `overflowing`, one that has
// something to scroll. The root counts when it is not locked.
function scrollParent(element, overflowing, includeSelf = true) {
  const root = document.scrollingElement;
  for (let node = includeSelf ? element : element.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    let scrolls = /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
    scrolls ||= node === root && style.overflow !== 'hidden';
    if (
      scrolls &&
      (!overflowing ||
        node.scrollHeight !== node.clientHeight ||
        node.scrollWidth !== node.clientWidth)
    ) {
      return node;
    }
  }
  return root;
}

// Scrolls the nearest scrollers of `target`, never the page, so the field is centred in the part of
// the visual viewport that is not covered by the keyboard.
function scrollIntoView(target) {
  const root = document.scrollingElement;
  for (let node = target; node && node !== root && node.isConnected; ) {
    const scroller = scrollParent(node, false, node !== target);
    if (scroller !== root && scroller !== document.body && scroller !== node) {
      const area = scroller.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      if (box.top < area.top || box.bottom > area.top + node.clientHeight) {
        const bottom = Math.min(area.bottom, visualViewport.offsetTop + visualViewport.height);
        const adjustment = box.top - area.top - ((bottom - area.top) / 2 - box.height / 2);
        scroller.scrollTo({
          top: Math.max(
            0,
            Math.min(
              scroller.scrollHeight - scroller.clientHeight,
              scroller.scrollTop + adjustment,
            ),
          ),
          behavior: 'smooth',
        });
      }
    }
    node = scroller.parentElement;
  }
}

// Programmatic focus scrolls the page on iOS. Focus without scrolling, then scroll the field into
// view inside its own scrollers once the keyboard has settled.
function overrideFocus() {
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (options) {
    focus.call(this, { ...options, preventScroll: true });
    if (!options?.preventScroll) {
      runAfterKeyboard(() => {
        if (document.activeElement === this) {
          scrollIntoView(this);
        }
      });
    }
  };
  return () => {
    HTMLElement.prototype.focus = focus;
  };
}

// Focus moving to another field is redone through the override above so that it scrolls the right
// thing. Focus dropping to nothing (the keyboard's Done button) goes to the dialog instead of
// leaving the page to scroll when the same field is tapped again.
function handleBlur(signal) {
  document.addEventListener(
    'blur',
    (event) => {
      const next = event.relatedTarget;
      if (next && willOpenKeyboard(next)) {
        next.focus();
      } else if (!next) {
        event.target.parentElement?.closest('[tabindex]')?.focus({ preventScroll: true });
      }
    },
    { capture: true, signal },
  );
}

/**
 * Locks the page against scrolling on iOS.
 * @returns {() => void} Releases the lock.
 */
export function lockIOSScroll() {
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.documentElement;
  const previousOverflow = root.style.overflow;
  root.style.overflow = 'hidden';

  let scroller = null;
  let allowMove = false;
  document.addEventListener(
    'touchstart',
    (event) => {
      const target = event.target;
      scroller = scrollParent(target, true);
      const selection = getSelection();
      allowMove =
        (!selection.isCollapsed && selection.containsNode(target, true)) ||
        event
          .composedPath()
          .some((node) => node instanceof HTMLInputElement && node.type === 'range') ||
        ('selectionStart' in target &&
          target.selectionStart < target.selectionEnd &&
          document.activeElement === target);
    },
    { passive: false, capture: true, signal },
  );
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length === 2 || allowMove) {
        return;
      }
      const page = !scroller || scroller === document.documentElement || scroller === document.body;
      // overscroll-behavior does not stop chaining from an element that does not overflow
      // (WebKit bug 243452).
      const flat =
        !page &&
        scroller.scrollHeight === scroller.clientHeight &&
        scroller.scrollWidth === scroller.clientWidth;
      if (page || flat) {
        event.preventDefault();
      }
    },
    { passive: false, capture: true, signal },
  );

  // Before the first touch, which iOS 26 needs.
  const style = document.createElement('style');
  style.textContent = '@layer { * { overscroll-behavior: contain } }';
  document.head.prepend(style);

  const restoreFocus = overrideFocus();
  handleBlur(signal);

  return () => {
    controller.abort();
    root.style.overflow = previousOverflow;
    style.remove();
    restoreFocus();
  };
}
