/**
 * The stack of open sheets. Its order gives each sheet its stack index and its descendants, and it
 * publishes the `timeline-scope` that lets a sheet's animations refer to the timeline of a sheet
 * opened above it.
 */

/** @type {object[]} */
let sheets = [];
const listeners = new Set();

function emitChange() {
  // Hoist every open sheet's timeline name to the root so a parent can resolve its child's timeline.
  const names = sheets.map((_, index) => `--sheet-timeline-${index}`).join(', ');
  document.documentElement.style.setProperty('timeline-scope', names);
  listeners.forEach((listener) => listener());
}

/**
 * Pushes a sheet on top of the stack.
 * @param {object} sheet
 * @returns {() => void} Removes the sheet from the stack.
 */
export function registerSheet(sheet) {
  sheets = [...sheets, sheet];
  emitChange();
  return () => {
    sheets = sheets.filter((entry) => entry !== sheet);
    emitChange();
  };
}

/**
 * Calls `listener` whenever a sheet is added to or removed from the stack.
 * @param {() => void} listener
 * @returns {() => void} Unsubscribes the listener.
 */
export function subscribeStack(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {object} sheet
 * @returns {number} Position of the sheet in the stack, 0 for the bottom-most.
 */
export function stackIndexOf(sheet) {
  return Math.max(0, sheets.indexOf(sheet));
}

/**
 * @param {object} sheet
 * @returns {object[]} The sheets opened after, hence above, the given one.
 */
export function descendantsOf(sheet) {
  return sheets.slice(stackIndexOf(sheet) + 1);
}

/**
 * @param {object} sheet
 * @returns {boolean} Whether no other sheet is open above the given one.
 */
export function isTopmost(sheet) {
  return sheets.at(-1) === sheet;
}
