/**
 * The scroll container that moves a sheet. The sheet sits on a viewport-sized "stage" inside an
 * oversized container, so scrolling slides the stage on and off screen and the browser handles the
 * swipe, momentum and snapping. Snap markers at the extremes are the exited positions, and markers
 * inside the sheet (`[data-sheet-detent]`) are its snap points.
 */

/** Names of the properties that differ between the two scroll axes. */
const AXES = {
  y: {
    viewport: '100dvh',
    start: 'top',
    scrollPosition: 'scrollTop',
    clientSize: 'clientHeight',
    offset: 'offsetTop',
    size: 'offsetHeight',
    scrollSize: 'scrollHeight',
    marginStart: 'scrollMarginTop',
    marginEnd: 'scrollMarginBottom',
  },
  x: {
    viewport: '100dvw',
    start: 'left',
    scrollPosition: 'scrollLeft',
    clientSize: 'clientWidth',
    offset: 'offsetLeft',
    size: 'offsetWidth',
    scrollSize: 'scrollWidth',
    marginStart: 'scrollMarginLeft',
    marginEnd: 'scrollMarginRight',
  },
};

/**
 * Distance from the start of `ancestor` to the start of `element`, from layout offsets so that
 * animation transforms do not affect it.
 * @param {HTMLElement} element
 * @param {HTMLElement} ancestor An offset ancestor of `element`.
 * @param {string} offset `offsetTop` or `offsetLeft`.
 * @returns {number}
 */
function offsetWithin(element, ancestor, offset) {
  let total = 0;
  for (let node = element; node && node !== ancestor; node = node.offsetParent) {
    total += node[offset];
  }
  return total;
}

/**
 * @param {string} axis
 * @returns {HTMLDivElement} An absolutely positioned snap target along the axis.
 */
function createSnapMarker(axis) {
  const marker = document.createElement('div');
  marker.dataset.sheetSnap = axis;
  marker.inert = true;
  return marker;
}

/** Owns the scroll container, the stage and the snap markers of one open sheet. */
export class SheetScroller {
  /** The scroll container; the overlay inserts it where the panel was. */
  element = document.createElement('div');

  #axis;
  #before;
  #after;
  #preventDismissal;
  #hasSnapPoints;
  #stage = document.createElement('div');
  #startMarker = createSnapMarker('start');
  #centerMarker = createSnapMarker('center');
  #endMarker = createSnapMarker('end');
  #panel;
  #settled = false;
  #clamped = false;
  #travel = 0;
  #observer = new ResizeObserver(() => this.#measureTravel());

  /**
   * Wraps the panel in the scroll container, in place.
   * @param {HTMLElement} panel The sheet panel.
   * @param {import('./geometry.js').SwipeConfig} config
   * @param {{preventDismissal: boolean, snapPoints: string[]}} options
   */
  constructor(panel, config, { preventDismissal, snapPoints }) {
    this.#axis = config.axis;
    this.#before = config.before;
    this.#after = config.after;
    this.#preventDismissal = preventDismissal;
    this.#hasSnapPoints = snapPoints.length > 0 && config.before !== config.after;
    this.#panel = panel;

    this.element.dataset.sheetScroll = config.axis;
    this.element.dataset.restsAtStart = config.before && !config.after;
    this.#stage.dataset.sheetStage = '';
    panel.replaceWith(this.element);
    this.#stage.append(panel);
    this.element.append(this.#startMarker, this.#stage, this.#endMarker);
    if (config.before && config.after) {
      this.#startMarker.after(this.#centerMarker);
    }
    this.#layout();
  }

  /**
   * Starts measuring the snap points of a non-dismissible sheet. Call once the element is in the
   * document.
   */
  observe() {
    if (this.#preventDismissal && this.#hasSnapPoints) {
      this.#observer.observe(this.#stage);
      this.#observer.observe(this.#panel);
      this.#measureTravel();
    }
  }

  /** Stops measuring. */
  disconnect() {
    this.#observer.disconnect();
  }

  /**
   * Switches a non-dismissible sheet between free travel (entering, exiting) and travel limited to
   * its snap points (settled). Dismissible sheets are not affected.
   * @param {boolean} settled
   */
  settle(settled) {
    this.#settled = settled;
    this.#layout();
  }

  /**
   * How far the stage is pushed beyond the viewport edge it leaves through (the iOS toolbar area).
   * @returns {number} Pixels.
   */
  get viewportPadding() {
    const { offset, size } = AXES[this.#axis];
    return this.#after && this.#axis === 'y' ? this.#stage[offset] - this.#stage[size] : 0;
  }

  /**
   * Scrolls the sheet in to its resting position: the first snap point, or fully revealed. Call
   * in the task that starts observing visibility, so the observer never sees the jump to the exit.
   * @returns {Promise<void>} Resolves when the scroll has ended.
   */
  async enter() {
    if (this.#before && !this.#after) {
      // The resting position is scroll 0, so the sheet mounts already entered. Jump to the exit
      // first and animate back in on the next frame; doing both in one task can leave the browser
      // at the jumped-to position instead of running the smooth scroll.
      this.#scrollTo(this.#exitPosition(), false);
      await new Promise(requestAnimationFrame);
    }
    await this.#scrollTo(this.#restPosition(), true);
  }

  /** @returns {boolean} Whether the scroll container is at a position the sheet exits at. */
  isAtExit() {
    const { scrollPosition, scrollSize, clientSize } = AXES[this.#axis];
    const position = this.element[scrollPosition];
    const far = this.element[scrollSize] - this.element[clientSize];
    const atStart = position < 1;
    const atEnd = position > far - 1;
    if (this.#after && !this.#before) {
      return atStart;
    }
    return this.#before && !this.#after ? atEnd : atStart || atEnd;
  }

  /** Scrolls the sheet out through the nearest edge it may leave by. */
  exit() {
    this.#scrollTo(this.#exitPosition(), true);
  }

  #restPosition() {
    const detent = this.#panel.querySelector('[data-sheet-initial]');
    if (detent) {
      return this.#detentPosition(detent);
    }
    return this.#before && !this.#after ? 0 : this.#stage[AXES[this.#axis].offset];
  }

  // The scroll position that rests a detent marker at the edge of the viewport: its own offset less
  // (after) or plus (before) the scroll-margin of one viewport that the CSS gives it.
  #detentPosition(marker) {
    const { offset, size, clientSize, marginStart, marginEnd } = AXES[this.#axis];
    const start = offsetWithin(marker, this.element, offset);
    const margins = getComputedStyle(marker);
    return this.#after
      ? start - parseFloat(margins[marginStart])
      : start + marker[size] + parseFloat(margins[marginEnd]) - this.element[clientSize];
  }

  #exitPosition() {
    const { scrollPosition, scrollSize, clientSize, offset } = AXES[this.#axis];
    const far = this.element[scrollSize] - this.element[clientSize];
    if (this.#after && !this.#before) {
      return 0;
    }
    if (this.#before && !this.#after) {
      return far;
    }
    return this.element[scrollPosition] > this.#stage[offset] ? far : 0;
  }

  #scrollTo(position, smooth) {
    const { start, scrollPosition } = AXES[this.#axis];
    // No scroll means no `scrollend`, so do not wait for one.
    if (Math.abs(this.element[scrollPosition] - position) < 1) {
      return Promise.resolve();
    }
    const ended = new Promise((resolve) =>
      this.element.addEventListener('scrollend', resolve, { once: true }),
    );
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.element.scrollTo({
      [start]: position,
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    });
    return ended;
  }

  // A non-dismissible sheet can be swiped between its snap points but not past the smallest one.
  // Once settled, the stage moves so that scroll 0 rests at the smallest snap point (sheets leaving
  // through the end edge), or the end marker moves in (sheets leaving through the start edge). Dual
  // direction sheets get 1px of travel either side. Snapping is off while the geometry changes
  // during enter and exit, because browsers re-snap differently when it does.
  #layout() {
    const { viewport, start, scrollPosition, offset } = AXES[this.#axis];
    const clamped = this.#preventDismissal && this.#settled;
    const padding = this.#after && this.#axis === 'y' ? 'var(--sheet-viewport-padding)' : '0px';
    const clampedTravel = `${this.#hasSnapPoints ? Math.max(1, this.#travel) : 1}px`;
    const stageStart = clamped && this.#after ? clampedTravel : `calc(${viewport} + ${padding})`;
    let endMarker = `calc(${stageStart} + ${viewport}${this.#before && this.#after ? ` + ${viewport}` : ''})`;
    if (clamped && this.#before && this.#after) {
      endMarker = `calc(${stageStart} + ${viewport} + 1px)`;
    } else if (clamped && this.#before) {
      endMarker = `calc(${clampedTravel} + ${viewport})`;
    }

    const stageOffset = this.#stage[offset];
    this.#stage.style[start] = stageStart;
    this.#startMarker.style.scrollSnapAlign = clamped && this.#after ? 'none' : 'start';
    this.#centerMarker.style[start] = stageStart;
    this.#endMarker.style[start] = endMarker;
    this.#endMarker.style.scrollSnapAlign = clamped && this.#before ? 'none' : 'end';
    this.element.style.scrollSnapType = this.#preventDismissal && !this.#settled ? 'none' : '';

    // Keep the sheet visually in place when the geometry changes under it.
    if (clamped !== this.#clamped) {
      this.element[scrollPosition] += this.#stage[offset] - stageOffset;
      this.#clamped = clamped;
    }
  }

  // The travel between the smallest snap point and the fully revealed sheet, measured from the
  // rendered markers so that snap points can be any CSS length, including a percentage.
  #measureTravel() {
    const { clientSize, offset, size } = AXES[this.#axis];
    let travel = 0;
    for (const marker of this.#panel.querySelectorAll('[data-sheet-detent]')) {
      const position = offsetWithin(marker, this.#stage, offset);
      travel = Math.max(
        travel,
        this.#after ? this.#stage[clientSize] - position : position + marker[size],
      );
    }
    if (travel !== this.#travel) {
      this.#travel = travel;
      this.#layout();
    }
  }
}
