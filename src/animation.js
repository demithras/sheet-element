/**
 * Scroll-driven CSS animations. Every layer is one `animation-*` entry; a sheet part may stack
 * several (its own swipe animation plus one per sheet above it).
 */
import { toLength } from './geometry.js';

/**
 * @typedef {object} AnimationLayer
 * @property {string} name `@keyframes` name.
 * @property {string} timeline Named view timeline that drives the layer.
 * @property {string} direction
 * @property {number} iterations
 * @property {string} range
 * @property {'replace' | 'accumulate'} composition
 */

const LAYER_PROPERTIES = {
  'animation-name': 'name',
  'animation-timeline': 'timeline',
  'animation-direction': 'direction',
  'animation-iteration-count': 'iterations',
  'animation-range': 'range',
  'animation-composition': 'composition',
  'animation-fill-mode': () => 'both',
  'animation-timing-function': () => 'linear',
};

/**
 * Names the view timeline of the sheet at a stack index.
 * @param {number} stackIndex
 * @returns {string}
 */
export function timelineName(stackIndex) {
  return `--sheet-timeline-${stackIndex}`;
}

/**
 * Writes the layers to the element's inline `animation-*` properties, replacing earlier ones.
 * @param {HTMLElement} element
 * @param {AnimationLayer[]} layers
 */
export function applyAnimationLayers(element, layers) {
  for (const [property, source] of Object.entries(LAYER_PROPERTIES)) {
    const read = typeof source === 'function' ? source : (layer) => layer[source];
    element.style.setProperty(property, layers.map(read).join(', '));
  }
}

/**
 * Builds the layer that plays the element's `swipe-animation` while the sheet is swiped.
 * @param {HTMLElement} element Carries the `swipe-animation` and `swipe-animation-range` attributes.
 * @param {import('./sheet-overlay.js').SheetState} state
 * @returns {AnimationLayer[]} One layer, or none when the element has no swipe animation.
 */
export function swipeAnimationLayers(element, state) {
  const name = element.getAttribute('swipe-animation');
  if (!name) {
    return [];
  }
  const { viewRange, viewDirection, viewIterations } = state.config;

  // The range is "start end" as snap point indices; either may be empty.
  const [startIndex, endIndex] = (element.getAttribute('swipe-animation-range') ?? '').split(' ');
  const lengthAt = (index, fallback) =>
    index ? toLength(state.snapPoints[Number(index)] ?? fallback) : fallback;
  let start = lengthAt(startIndex, '0%');
  let end = lengthAt(endIndex, '100%');
  if (['top', 'left'].includes(state.swipeDirection)) {
    [start, end] = [`calc(100% - ${end})`, `calc(100% - ${start})`];
  }

  return [
    {
      name,
      timeline: timelineName(state.stackIndex),
      direction: viewDirection,
      iterations: viewIterations,
      range: `${viewRange} ${start} ${viewRange} ${end}`,
      composition: 'replace',
    },
  ];
}

/**
 * Builds one layer per sheet above this one, each driven by that sheet's timeline.
 * @param {string | null} name The `@keyframes` name of the `stack-animation`.
 * @param {import('./sheet-overlay.js').SheetState} state
 * @returns {AnimationLayer[]}
 */
export function stackAnimationLayers(name, state) {
  if (!name) {
    return [];
  }
  return state.descendants.map((descendant, offset) => ({
    name,
    timeline: timelineName(state.stackIndex + 1 + offset),
    direction: descendant.config.viewDirection,
    iterations: descendant.config.viewIterations,
    range: descendant.config.viewRange,
    composition: 'accumulate',
  }));
}
