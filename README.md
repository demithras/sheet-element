# sheet-native (plain markup variant)

> This branch (`plain`) is the variant **without custom elements**: plain `<div>`s marked with `data-sheet-part`, and a `Sheet` class you call yourself. The `main` branch keeps the custom elements (`<sheet-trigger>` and friends); see the [main README](https://github.com/demithras/sheet-element/blob/main/README.md).

A vanilla clone of the [React Aria Sheet](https://react-aria.adobe.com/Sheet) for plain markup. It uses the same mechanism as the original: native scrolling, scroll-snap and scroll-driven animations (`view-timeline`), with no gesture code (no touch or pointer handlers move the sheet). Zero runtime dependencies, no build step: ES modules and CSS that the browser loads directly.

## Demo

Try every option in the [playground](https://demithras.github.io/sheet-element/example/playground.html), or open the [basic examples](https://demithras.github.io/sheet-element/example/).

## Install

Copy `src/` and `styles/` into your project, then:

```html
<link rel="stylesheet" href="styles/theme.css" />
<link rel="stylesheet" href="styles/Sheet.css" />
<link rel="stylesheet" href="src/sheet.css" />
<script type="module">
  import { Sheet } from './src/index.js';
  new Sheet(document.querySelector('[data-sheet-part="trigger"]'));
</script>
```

`index.js` exports the `Sheet` class and registers nothing. `theme.css` and `Sheet.css` are the unchanged React Aria starter styles (the look); `src/sheet.css` is the structure and must be loaded after them. Serve over HTTP (ES modules do not load from `file://`). `example/index.html` shows five working sheets; run `python3 -m http.server` in this folder and open `/example/`.

### Single-file option

`dist/` holds the same component as one minified file each for JavaScript and CSS (about 7 kB + 3 kB gzip, against about 21 kB + 4 kB gzip for the separate files). Copy `dist/` into your project, then:

```html
<link rel="stylesheet" href="dist/sheet-element.min.css" />
<script type="module">
  import { Sheet } from "./dist/sheet-element.min.js";
  new Sheet(document.querySelector('[data-sheet-part="trigger"]'));
</script>
```

`sheet-element.min.css` already contains `theme.css`, `Sheet.css` and `src/sheet.css`, in that order; do not load them again. To use your own look instead of the React Aria starter styles, use the separate files above and leave out `theme.css` and `Sheet.css`. The bundle passes the same checks as `src/` (the 33 behaviour scenarios in Chromium and WebKit, and the look check). `scripts/build-dist.sh` rebuilds `dist/` from `src/` and `styles/` (needs Node.js; the component itself needs no build).

## Anatomy

```html
<div data-sheet-part="trigger">
  <button>Open</button>
  <div data-sheet-part="overlay" data-sheet-position="bottom" data-sheet-snap-points="180px, 50%">
    <div data-sheet-part="backdrop" data-sheet-swipe-animation="sheet-backdrop" data-sheet-swipe-animation-range="1"></div>
    <div data-sheet-part="panel" data-sheet-overscroll-padding data-sheet-stack-animation="sheet-scale-back">
      <div class="sheet-handle"></div>
      <div data-sheet-part="content">
        <h2 slot="title">Title</h2>
        <p slot="description">Text</p>
        <button slot="close">Close</button>
      </div>
    </div>
  </div>
</div>
<script type="module">
  import { Sheet } from './src/index.js';
  const sheet = new Sheet(document.querySelector('[data-sheet-part="trigger"]'));
</script>
```

Parts are plain elements (any tag) marked with `data-sheet-part="trigger|overlay|backdrop|panel|content"`. `slot="title"`, `slot="description"` and `slot="close"` keep their meaning as plain attributes.

Call `new Sheet(root)` once per sheet, **after the markup is in the page**. `root` is the trigger part, or an overlay part that stands alone, without a trigger. A nested sheet is opened by a trigger part inside the parent's content part; create the outer `Sheet` first, then the nested one (document order from `querySelectorAll` does this):

```js
import { Sheet } from './src/index.js';
const sheets = [...document.querySelectorAll('[data-sheet-part="trigger"]')].map((root) => new Sheet(root));
```

## Removing a sheet: call destroy()

Removing the markup of an open sheet does not clean it up by itself. An open sheet has moved its overlay to the end of the body and made the page behind it inert, and the `Sheet` holds listeners. Call `sheet.destroy()` **before** you remove the markup: it closes the sheet at once, removes the listeners and removes an open overlay from the page. Without it, the overlay can stay on screen and the page can stay locked. (The custom-elements variant on `main` cleans up when the trigger element is removed; this variant has no such hook.)

React:

```jsx
useEffect(() => {
  const sheet = new Sheet(triggerRef.current);
  return () => sheet.destroy();
}, []);
```

Vue:

```js
let sheet;
onMounted(() => { sheet = new Sheet(triggerRef.value); });
onBeforeUnmount(() => sheet.destroy());
```

## Opening and closing from code

`data-sheet-open` (and `data-sheet-default-open`) are read once, when `new Sheet(root)` runs. Changing the attribute later does nothing. After start-up, open or close the sheet with `sheet.open = true` / `sheet.open = false`, or with `sheet.requestOpen(open)`, and listen to `openchange` for changes. This differs from `main`, where changing the `open` attribute opens and closes the sheet.

React (keep the `Sheet` instance in a ref and follow `isOpen`):

```jsx
const sheetRef = useRef(null);
useEffect(() => {
  sheetRef.current = new Sheet(triggerRef.current);
  return () => sheetRef.current.destroy();
}, []);
useEffect(() => {
  sheetRef.current.open = isOpen;
}, [isOpen]);
```

## Options

Options are `data-sheet-*` attributes, read when the `Sheet` is created (the open state is then kept on the instance, see below).

`overlay` part

| Attribute | Meaning |
|---|---|
| `data-sheet-position` | `bottom` (default), `top`, `left`, `right`, `start`, `end`, `center` |
| `data-sheet-swipe-direction` | defaults to the position; also `horizontal` / `vertical` |
| `data-sheet-snap-points` | comma list; a number or `NNpx` is pixels, `NN%` is a share of the sheet; each is the visible amount; the sheet opens at the first one |
| `data-sheet-prevent-dismissal` | blocks swipe, Escape and outside press |
| `data-sheet-open` | initial open state, read once |
| `data-sheet-default-open` | initial open state, read once |
| `data-sheet-controlled` | the component never changes `open` itself; it only asks (see below) |

`panel` and `backdrop` parts

| Attribute | Meaning |
|---|---|
| `data-sheet-swipe-animation` | name of a `@keyframes` rule driven by the swipe |
| `data-sheet-swipe-animation-range` | `start end` as snap-point indices; either may be empty |

`panel` part only

| Attribute | Meaning |
|---|---|
| `data-sheet-stack-animation` | `@keyframes` name applied while a sheet is stacked in front of this one |
| `data-sheet-overscroll-padding` | extends the sheet edge so overscroll looks like stretching |

The starter CSS defines the keyframes `sheet-backdrop` and `sheet-scale-back`.

As in React Aria, the sheet below shows a strip above the sheet on top only when the sheet on top is not taller. Give stacked sheets one fixed height (the React Aria blog demo uses 550px) to keep the strip.

## Events and control

A `Sheet` has `open` (get and set), `requestOpen(open)` and `destroy()`. It dispatches `openchange` (`CustomEvent`, `detail.open`) when the user or the component asks for a change: on the trigger part for an uncontrolled sheet, on the overlay part for a controlled one, a `default-open` one or one without a trigger. Without `data-sheet-controlled`, the component opens and closes itself. With it, you set `open` in the handler:

```js
overlay.addEventListener('openchange', (e) => { sheet.open = e.detail.open; });
```

The `open` attribute is no longer reflected: the open state lives on the `Sheet` instance.

A `slot="close"` button closes the sheet. When open, the dialog gets `role="dialog"` labelled by the title and described by the description; focus is contained and restored, Escape closes the top sheet, an outside press closes it, and the page behind is inert and does not scroll. State attributes on the parts: `data-position`, `data-swipe-direction`, `data-expanded`, `data-stack-index`, `data-has-descendants`, `data-entering`, `data-exiting`.

## Browser support

Every check below compares the clone with the React Aria original on the same browser or device.

- Chromium (desktop): verified.
- WebKit (desktop): verified, except swipes (the test tool has no trusted touch drag in WebKit).
- Safari on iPhone 16 / iOS 27: verified, see the limits under "Not verified / known gaps".
- Firefox (desktop): behaves like the original, including the original's gaps. Firefox has no scroll-driven animations (`view-timeline`), so animations linked to the swipe position (for example the backdrop fade while dragging) and the stacked-sheet animation do not follow the finger. The React Aria original has the same gaps in Firefox.
- Android: not verified.

## Verified equal to React Aria Sheet

This plain variant passed the same desktop parity gate as `main`, against the same React Aria oracle: Chromium 33 passed / 0 failed / 0 not run, WebKit 28 / 0 / 5 not run (swipes), look check 0 differences. The iPhone motion check has **not** been run on this variant yet; the iPhone results are those of the custom-elements variant on `main` (see its README).

- Look: 0 differences in computed styles (desktop gate, as above).
- Behaviour: the 33 scenarios (Chromium 33 of 33; WebKit 28, 5 not run there).
- `main` only, not repeated here: Firefox, the `start` / `end` and RTL checks, reduced motion, 3-run repeats, the trigger-removal check (not applicable here, see "Removing a sheet") and the iPhone motion results (resting positions, swipe events, `data-expanded`, animation progress, 60 open/close cycles).

## Not verified / known gaps

- iPhone motion check of this plain variant: pending.
- Software keyboard (iPhone): the original's keyboard handling is ported (the visual-viewport height variable, keeping a focused field above the keyboard, waiting for the keyboard before an auto-focused sheet opens). On the iPhone every measured value of the clone lies inside the original's run-to-run range, but the original itself varies by more than 8 px between runs, so a strict equality check cannot decide.
- Page scroll lock on iOS: the original's iOS-specific scroll lock (`usePreventScroll`) is ported. On iOS 27 the page behind an open sheet stays still even without it, so its effect could not be shown on that version.
- Firefox: the gaps of the original listed under "Browser support".
- Inherited from the original on iPhone: a long, fast drag closes a sheet with `data-sheet-prevent-dismissal` (the rubber-band overscroll carries it off screen). This clone behaves the same.

## Licence

Apache License 2.0, see `LICENSE`. This is a port of React Aria Sheet from [adobe/react-spectrum](https://github.com/adobe/react-spectrum), Copyright Adobe, Apache-2.0. `styles/theme.css` and `styles/Sheet.css` are the unchanged React Aria starter styles. `src/ios-scroll-lock.js`, `src/keyboard.js` and the visual-viewport handling in `src/sheet.js` are derived from React Aria source and modified (rewritten as plain JavaScript); the rest of `src/` reimplements the original's behaviour in plain JavaScript. See `NOTICE`.
