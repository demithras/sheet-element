# sheet-native

A vanilla custom-elements clone of the [React Aria Sheet](https://react-aria.adobe.com/Sheet). It uses the same mechanism as the original: native scrolling, scroll-snap and scroll-driven animations (`view-timeline`), with no gesture code (no touch or pointer handlers move the sheet). Zero runtime dependencies, no build step: ES modules and CSS that the browser loads directly.

## Demo

Try every option in the [playground](https://demithras.github.io/sheet-element/example/playground.html), or open the [basic examples](https://demithras.github.io/sheet-element/example/).

## Install

Copy `src/` and `styles/` into your project, then:

```html
<link rel="stylesheet" href="styles/theme.css" />
<link rel="stylesheet" href="styles/Sheet.css" />
<link rel="stylesheet" href="src/sheet.css" />
<script type="module" src="src/index.js"></script>
```

`index.js` defines all five elements. `theme.css` and `Sheet.css` are the unchanged React Aria starter styles (the look); `src/sheet.css` is the structure and must be loaded after them. Serve over HTTP (ES modules do not load from `file://`). `example/index.html` shows five working sheets; run `python3 -m http.server` in this folder and open `/example/`.

### Single-file option

`dist/` holds the same component as one minified file each for JavaScript and CSS (about 7 kB + 3 kB gzip, against about 21 kB + 4 kB gzip for the separate files). Copy `dist/` into your project, then:

```html
<link rel="stylesheet" href="dist/sheet-element.min.css" />
<script type="module" src="dist/sheet-element.min.js"></script>
```

`sheet-element.min.css` already contains `theme.css`, `Sheet.css` and `src/sheet.css`, in that order; do not load them again. To use your own look instead of the React Aria starter styles, use the separate files above and leave out `theme.css` and `Sheet.css`. The bundle passes the same checks as `src/` (the 33 behaviour scenarios in Chromium and WebKit, and the look check). `scripts/build-dist.sh` rebuilds `dist/` from `src/` and `styles/` (needs Node.js; the component itself needs no build).

## Anatomy

```html
<sheet-trigger>
  <button>Open</button>
  <sheet-overlay position="bottom" snap-points="180px, 50%">
    <sheet-backdrop swipe-animation="sheet-backdrop" swipe-animation-range="1"></sheet-backdrop>
    <sheet-panel overscroll-padding stack-animation="sheet-scale-back">
      <div class="sheet-handle"></div>
      <sheet-content>
        <h2 slot="title">Title</h2>
        <p slot="description">Text</p>
        <button slot="close">Close</button>
      </sheet-content>
    </sheet-panel>
  </sheet-overlay>
</sheet-trigger>
```

`<sheet-overlay>` may also stand alone, without a trigger. A nested sheet is opened by a `<sheet-trigger>` inside the parent's `<sheet-content>`.

## Attributes

`sheet-overlay`

| Attribute | Meaning |
|---|---|
| `position` | `bottom` (default), `top`, `left`, `right`, `start`, `end`, `center` |
| `swipe-direction` | defaults to the position; also `horizontal` / `vertical` |
| `snap-points` | comma list; a number or `NNpx` is pixels, `NN%` is a share of the sheet; each is the visible amount; the sheet opens at the first one |
| `prevent-dismissal` | blocks swipe, Escape and outside press |
| `open` | reflects the open state |
| `default-open` | initial open state |
| `controlled` | the component never changes `open` itself; it only asks (see below) |

`sheet-panel` and `sheet-backdrop`

| Attribute | Meaning |
|---|---|
| `swipe-animation` | name of a `@keyframes` rule driven by the swipe |
| `swipe-animation-range` | `start end` as snap-point indices; either may be empty |

`sheet-panel` only

| Attribute | Meaning |
|---|---|
| `stack-animation` | `@keyframes` name applied while a sheet is stacked in front of this one |
| `overscroll-padding` | extends the sheet edge so overscroll looks like stretching |

The starter CSS defines the keyframes `sheet-backdrop` and `sheet-scale-back`.

## Events and control

`sheet-overlay` and `sheet-trigger` dispatch `openchange` (`CustomEvent`, `detail.open`) when the user or the component asks for a change. Without `controlled`, the component opens and closes itself. With `controlled`, you set or remove `open` in the handler:

```js
overlay.addEventListener('openchange', e => { overlay.open = e.detail.open; });
```

A `slot="close"` button closes the sheet. When open, the dialog gets `role="dialog"` labelled by the title and described by the description; focus is contained and restored, Escape closes the top sheet, an outside press closes it, and the page behind is inert and does not scroll. State attributes on the parts: `data-position`, `data-swipe-direction`, `data-expanded`, `data-stack-index`, `data-has-descendants`, `data-entering`, `data-exiting`.

## Browser support

Every check below compares the clone with the React Aria original on the same browser or device.

- Chromium (desktop): verified.
- WebKit (desktop): verified, except swipes (the test tool has no trusted touch drag in WebKit).
- Safari on iPhone 16 / iOS 27: verified, see the limits under "Not verified / known gaps".
- Firefox (desktop): behaves like the original, including the original's gaps. Firefox has no scroll-driven animations (`view-timeline`), so animations linked to the swipe position (for example the backdrop fade while dragging) and the stacked-sheet animation do not follow the finger. The React Aria original has the same gaps in Firefox.
- Android: not verified.

## Verified equal to React Aria Sheet

- Look: 0 differences in computed styles at 390x844 and 1280x800 in Chromium, WebKit and Firefox. The `start` / `end` positions in left-to-right and right-to-left (`dir="rtl"`) pages also show 0 differences in Chromium and WebKit.
- Behaviour: the 33 scenarios pass (Chromium 33 of 33; WebKit 28, 5 not run there), 3 runs each. In Firefox the clone passes exactly the 21 scenarios the original passes.
- `start` / `end` positions and RTL, and reduced motion (`prefers-reduced-motion`): same as the original in Chromium and WebKit (swipes in Chromium only).
- Removing a `<sheet-trigger>` while its sheet is open removes the sheet and releases the page, with no `openchange`: same as the original in Chromium.
- iPhone motion: resting positions after flicks, swipe events, `data-expanded`, animation progress, the middle snap position, controlled and uncontrolled closing (one `openchange` per close), and 60 open/close cycles (60 of 60 close, as in the original).

## Not verified / known gaps

- Software keyboard (iPhone): the original's keyboard handling is ported (the visual-viewport height variable, keeping a focused field above the keyboard, waiting for the keyboard before an auto-focused sheet opens). On the iPhone every measured value of the clone lies inside the original's run-to-run range, but the original itself varies by more than 8 px between runs, so a strict equality check cannot decide.
- Page scroll lock on iOS: the original's iOS-specific scroll lock (`usePreventScroll`) is ported. On iOS 27 the page behind an open sheet stays still even without it, so its effect could not be shown on that version.
- Firefox: the gaps of the original listed under "Browser support".
- Inherited from the original on iPhone: a long, fast drag closes a sheet with `prevent-dismissal` (the rubber-band overscroll carries it off screen). This clone behaves the same.

## Licence

Apache License 2.0, see `LICENSE`. This is a port of React Aria Sheet from [adobe/react-spectrum](https://github.com/adobe/react-spectrum), Copyright Adobe, Apache-2.0. `styles/theme.css` and `styles/Sheet.css` are the unchanged React Aria starter styles. `src/ios-scroll-lock.js`, `src/keyboard.js` and the visual-viewport handling in `src/sheet-overlay.js` are derived from React Aria source and modified (rewritten as plain JavaScript); the rest of `src/` reimplements the original's behaviour in plain JavaScript. See `NOTICE`.
