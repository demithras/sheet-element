// Derived from React Aria (the keyboard handling in Sheet.tsx / Modal), Copyright Adobe,
// Apache License 2.0. Modified: rewritten as plain JavaScript.
/**
 * Software keyboard awareness, ported from React Aria's `runAfterKeyboard`. A keyboard shrinks the
 * visual viewport but not the layout viewport, and Safari on iOS reports it with one resize event
 * at the start of the animation, so callers wait for the viewport to go quiet.
 */

const KEYBOARD_HEIGHT = 100;
const QUIET_PERIOD = 200;
const TIMEOUT = 600;
const NON_TEXT_INPUTS = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
]);

/**
 * @param {Element | null} element
 * @returns {boolean} Whether focusing the element brings up a software keyboard.
 */
export function willOpenKeyboard(element) {
  return (
    (element instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(element.type)) ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

/** @returns {boolean} Whether the visual viewport is shorter than the layout viewport by a keyboard. */
export function isKeyboardOpen() {
  const { height, scale } = visualViewport;
  return document.documentElement.clientHeight - height * scale >= KEYBOARD_HEIGHT;
}

/**
 * Calls `callback` once the keyboard has settled. Immediately on devices without touch, where there
 * is no software keyboard. Otherwise after two frames, to see whether focus lands on a field, and
 * if the keyboard is about to open, after the visual viewport has stopped resizing.
 * @param {(isOpen: boolean) => void} callback
 * @returns {() => void} Cancels the call.
 */
export function runAfterKeyboard(callback) {
  if (!navigator.maxTouchPoints) {
    callback(false);
    return () => {};
  }
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      const opens = willOpenKeyboard(document.hasFocus() ? document.activeElement : null);
      if (isKeyboardOpen() || !opens) {
        callback(opens);
        return;
      }
      let quiet;
      const finish = () => {
        cancel();
        callback(isKeyboardOpen());
      };
      const onResize = () => {
        clearTimeout(quiet);
        quiet = setTimeout(finish, QUIET_PERIOD);
      };
      const limit = setTimeout(finish, TIMEOUT);
      visualViewport.addEventListener('resize', onResize);
      cancel = () => {
        clearTimeout(quiet);
        clearTimeout(limit);
        visualViewport.removeEventListener('resize', onResize);
      };
    });
  });
  let cancel = () => cancelAnimationFrame(frame);
  return () => cancel();
}
