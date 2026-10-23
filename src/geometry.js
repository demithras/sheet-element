/**
 * Pure helpers that translate the sheet's options (position, swipe direction, snap points)
 * into the numbers and keywords the scroll geometry and the scroll-driven animations need.
 */

/** @typedef {'bottom' | 'top' | 'left' | 'right' | 'center'} SheetPosition */
/** @typedef {'bottom' | 'top' | 'vertical' | 'left' | 'right' | 'horizontal'} SwipeDirection */

/**
 * @typedef {object} SwipeConfig
 * @property {'x' | 'y'} axis Scroll axis of the swipe.
 * @property {boolean} before Whether the sheet may leave through the start edge (top/left).
 * @property {boolean} after Whether the sheet may leave through the end edge (bottom/right).
 * @property {string} viewRange View-timeline range that covers the sheet crossing its exit edge.
 * @property {string} viewDirection `animation-direction` that maps progress 0 to "exited".
 * @property {number} viewIterations `animation-iteration-count` for the same purpose.
 */

/**
 * Resolves the logical `start` and `end` values to physical sides for a text direction.
 * @param {string} value A position or swipe direction attribute value.
 * @param {string} direction `ltr` or `rtl`.
 * @returns {string} The value with `start`/`end` replaced by `left`/`right`.
 */
export function resolveDirection(value, direction) {
  if (value === 'start') {
    return direction === 'rtl' ? 'right' : 'left';
  }
  if (value === 'end') {
    return direction === 'rtl' ? 'left' : 'right';
  }
  return value;
}

/**
 * Describes the scroll geometry and animation range of a swipe direction.
 * @param {SwipeDirection} swipeDirection
 * @returns {SwipeConfig}
 */
export function getSwipeConfig(swipeDirection) {
  const axis = ['top', 'bottom', 'vertical'].includes(swipeDirection) ? 'y' : 'x';
  const before = ['top', 'left', 'vertical', 'horizontal'].includes(swipeDirection);
  const after = ['bottom', 'right', 'vertical', 'horizontal'].includes(swipeDirection);
  const both = before && after;

  // The sheet crosses one viewport edge, so the animation maps to that crossing: `entry` runs
  // exited -> entered, `exit` runs entered -> exited and is reversed. A sheet that can leave both
  // ways plays the same keyframes twice over `cover`, forwards then backwards.
  return {
    axis,
    before,
    after,
    viewRange: both ? 'cover' : before ? 'exit' : 'entry',
    viewDirection: both ? 'alternate' : before ? 'reverse' : 'normal',
    viewIterations: both ? 2 : 1,
  };
}

/**
 * Converts a snap point to a CSS length: bare numbers are pixels.
 * @param {string | number} point
 * @returns {string}
 */
export function toLength(point) {
  return /^[\d.]+$/.test(String(point)) ? `${point}px` : String(point);
}

/**
 * Parses the `snap-points` attribute, a comma separated list such as `180px, 50, 50%`.
 * @param {string | null} attribute
 * @returns {string[]} CSS lengths, empty when the attribute is missing.
 */
export function parseSnapPoints(attribute) {
  return (attribute ?? '')
    .split(',')
    .map((point) => point.trim())
    .filter(Boolean)
    .map(toLength);
}
