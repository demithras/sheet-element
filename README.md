# sheet-native

A vanilla custom-elements clone of the [React Aria Sheet](https://react-aria.adobe.com/Sheet). It uses the same mechanism as the original: native scrolling, scroll-snap and scroll-driven animations (`view-timeline`), with no gesture code (no touch or pointer handlers move the sheet). Zero runtime dependencies, no build step: ES modules and CSS that the browser loads directly.

## Install

Copy `src/` and `styles/` into your project, then:

```html
<link rel="stylesheet" href="styles/theme.css" />
<link rel="stylesheet" href="styles/Sheet.css" />
<link rel="stylesheet" href="src/sheet.css" />
<script type="module" src="src/index.js"></script>
```

`index.js` defines all five elements. `theme.css` and `Sheet.css` are the unchanged React Aria starter styles (the look); `src/sheet.css` is the structure and must be loaded after them. Serve over HTTP (ES modules do not load from `file://`). `example/index.html` shows five working sheets; run `python3 -m http.server` in this folder and open `/example/`.

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

- Verified: Chromium (desktop); Safari on iPhone 16 / iOS 27.
- Desktop WebKit: verified except swipes (WebKit has no trusted touch drag in the test tool).
- Firefox: not verified. There is no fallback for missing scroll-driven animations (`view-timeline`).

## Verified equal to React Aria Sheet

- Look: 0 differences in computed styles at 390x844 and 1280x800 (Chromium and WebKit).
- Behaviour: the 33 scenarios pass (Chromium 33 of 33; WebKit 28, 5 not run there), 3 runs each.
- iPhone motion: resting positions after flicks, swipe events, `data-expanded`, animation progress and the middle snap position, checked against the original on the device.

## Not verified / known gaps

- Software keyboard: content above the keyboard is not verified; the wait until the keyboard has settled before opening is not ported.
- iOS Safari page scroll-lock touch handling is not ported.
- `start` / `end` positions and RTL are not verified.
- Reduced motion is not verified.
- No Firefox fallback.
- If the page removes a trigger while its sheet is open, the sheet stays until it is closed.
- Inherited from the original on iPhone: a long, fast drag closes a sheet with `prevent-dismissal` (the rubber-band overscroll carries it off screen). This clone behaves the same.

## Licence

Apache License 2.0, see `LICENSE`. `styles/theme.css` and `styles/Sheet.css` are the unchanged React Aria starter styles from [adobe/react-spectrum](https://github.com/adobe/react-spectrum), Copyright Adobe, Apache-2.0; see `NOTICE`.
