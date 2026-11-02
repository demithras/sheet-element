/**
 * Makes sheets from plain markup. No custom elements are registered.
 *
 * ```html
 * <div data-sheet-part="trigger">
 *   <button>Open</button>
 *   <div data-sheet-part="overlay">
 *     <div data-sheet-part="backdrop"></div>
 *     <div data-sheet-part="panel">
 *       <div data-sheet-part="content">…</div>
 *     </div>
 *   </div>
 * </div>
 * <script type="module">
 *   import { Sheet } from './src/index.js';
 *   const sheet = new Sheet(document.querySelector('[data-sheet-part="trigger"]'));
 * </script>
 * ```
 */
export { Sheet } from './sheet.js';
