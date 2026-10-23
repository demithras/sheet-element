/**
 * Defines the sheet custom elements. Import this module once.
 *
 * ```html
 * <sheet-trigger>
 *   <button>Open</button>
 *   <sheet-overlay>
 *     <sheet-backdrop></sheet-backdrop>
 *     <sheet-panel>
 *       <sheet-content>…</sheet-content>
 *     </sheet-panel>
 *   </sheet-overlay>
 * </sheet-trigger>
 * ```
 */
import { SheetBackdrop } from './sheet-backdrop.js';
import { SheetContent } from './sheet-content.js';
import { SheetOverlay } from './sheet-overlay.js';
import { SheetPanel } from './sheet-panel.js';
import { SheetTrigger } from './sheet-trigger.js';

// The overlay goes last: upgrading an overlay that is open moves it out of its trigger and mounts its
// parts, which must already be defined.
customElements.define('sheet-trigger', SheetTrigger);
customElements.define('sheet-backdrop', SheetBackdrop);
customElements.define('sheet-content', SheetContent);
customElements.define('sheet-panel', SheetPanel);
customElements.define('sheet-overlay', SheetOverlay);

export { SheetBackdrop, SheetContent, SheetOverlay, SheetPanel, SheetTrigger };
