import '../src/index.js';
// Playground: builds a sheet from the form options, shows its code, logs openchange events.
// Component code lives in ../src; this file only drives it through documented attributes.

const $ = (id) => document.getElementById(id);

const SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
  'Vivamus lacinia odio vitae vestibulum vestibulum, cras venenatis euismod malesuada nisi.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
  'Integer posuere erat a ante venenatis dapibus posuere velit aliquet, donec ullamcorper nulla.',
  'Maecenas faucibus mollis interdum, nullam quis risus eget urna mollis ornare vel eu leo.',
  'Curabitur blandit tempus porttitor, etiam porta sem malesuada magna mollis euismod sed posuere.',
  'Aenean eu leo quam, pellentesque ornare sem lacinia quam venenatis vestibulum fusce dapibus.',
  'Duis mollis est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.',
  'Sed posuere consectetur est at lobortis, morbi leo risus, porta ac consectetur ac vestibulum.',
];
// Eight paragraphs of eight sentences each, rotated so that no two paragraphs are identical.
const LOREM = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => SENTENCES[(i + j) % SENTENCES.length]).join(' '));

const CONTENT = {
  short: `<p slot="description">A short sheet. Swipe, press Escape or use the button.</p>`,
  list: `<p slot="description">A long list. It scrolls once the sheet is fully expanded.</p>
<ul>${Array.from({ length: 30 }, (_, i) => `<li>Item ${i + 1}</li>`).join('')}</ul>`,
  form: `<p slot="description">Focus the field to test the software keyboard.</p>
<label>Name <input type="text" name="name" /></label>`,
  longText: `<p slot="description">Long text. Expand the sheet fully, then scroll the text.</p>
${LOREM.map((p) => `<p>${p}</p>`).join('\n')}`,
  formFields: `<p slot="description">Tap a field to test the software keyboard; move between fields with the keyboard open.</p>
<div class="fields">
  <label>Name <input type="text" name="name" autocomplete="off" /></label>
  <label>Email <input type="email" name="email" /></label>
  <label>Phone <input type="tel" name="phone" /></label>
  <label>Address <input type="text" name="address" /></label>
  <label>Comment <textarea name="comment" rows="4"></textarea></label>
  <button type="button" slot="close" class="react-aria-Button">Submit</button>
</div>`,
  nested: `<p slot="description">Open a second sheet on top of this one.</p>
<sheet-trigger>
  <button class="react-aria-Button">Open nested sheet</button>
  <sheet-overlay>
    <sheet-backdrop swipe-animation="sheet-backdrop"></sheet-backdrop>
    <sheet-panel overscroll-padding stack-animation="sheet-scale-back">
      <div class="sheet-handle"></div>
      <sheet-content>
        <h2 slot="title" class="react-aria-Heading">Nested sheet</h2>
        <button slot="close" class="react-aria-Button">Close</button>
      </sheet-content>
    </sheet-panel>
  </sheet-overlay>
</sheet-trigger>`,
};

/** @returns {object} The current form values. */
function readOptions() {
  return {
    position: $('position').value,
    swipeDirection: $('swipe-direction').value,
    snapPoints: $('snap-points').value.trim(),
    preventDismissal: $('prevent-dismissal').checked,
    overscrollPadding: $('overscroll-padding').checked,
    backdropAnimation: $('backdrop-animation').checked,
    stackAnimation: $('stack-animation').checked,
    dir: $('dir').value,
    controlled: $('controlled').checked,
    content: $('content').value,
  };
}

/**
 * Builds the HTML of the sheet for the given options. Used both for the code block and the DOM.
 * @param {object} o Options from readOptions().
 * @returns {string}
 */
function buildHtml(o) {
  const overlayAttrs = [
    o.position !== 'bottom' && `position="${o.position}"`,
    o.swipeDirection && `swipe-direction="${o.swipeDirection}"`,
    o.snapPoints && `snap-points="${o.snapPoints}"`,
    o.preventDismissal && 'prevent-dismissal',
    o.controlled && 'controlled',
  ].filter(Boolean);
  const points = o.snapPoints ? o.snapPoints.split(',').length : 0;
  const backdropAttrs = [
    o.backdropAnimation && 'swipe-animation="sheet-backdrop"',
    o.backdropAnimation && points > 0 && `swipe-animation-range="${points - 1}"`,
  ].filter(Boolean);
  const panelAttrs = [
    o.overscrollPadding && 'overscroll-padding',
    o.stackAnimation && 'stack-animation="sheet-scale-back"',
  ].filter(Boolean);
  const attrs = (list) => (list.length ? ' ' + list.join(' ') : '');
  const html = `<sheet-trigger${o.dir === 'rtl' ? ' dir="rtl"' : ''}>
  <button class="react-aria-Button">Open</button>
  <sheet-overlay${attrs(overlayAttrs)}>
    <sheet-backdrop${attrs(backdropAttrs)}></sheet-backdrop>
    <sheet-panel${attrs(panelAttrs)}>
      <div class="sheet-handle"></div>
      <sheet-content>
        <h2 slot="title" class="react-aria-Heading">Playground sheet</h2>
        <button slot="close" class="react-aria-Button">Close</button>
        ${CONTENT[o.content]}
      </sheet-content>
    </sheet-panel>
  </sheet-overlay>
</sheet-trigger>`;
  return o.controlled
    ? `${html}\n<script>\n  overlay.addEventListener('openchange', (e) => { overlay.open = e.detail.open; });\n</script>`
    : html;
}

/** Shows the code of the sheet the button will open. */
function renderCode() {
  $('code').textContent = buildHtml(readOptions());
}

/** Appends a line to the event log, keeping the last 10. */
function logEvent(detail) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()}  openchange  open: ${detail.open}`;
  const log = $('log');
  log.prepend(li);
  while (log.children.length > 10) {
    log.lastElementChild.remove();
  }
}

/** Builds a fresh sheet tree from the current options and opens it. */
async function openSheet() {
  // The button can be pressed before the component module has loaded.
  await customElements.whenDefined('sheet-overlay');
  const o = readOptions();
  const stage = $('stage');
  stage.replaceChildren();
  stage.insertAdjacentHTML('beforeend', buildHtml(o).replace(/<script>[\s\S]*<\/script>/, ''));
  const trigger = stage.querySelector('sheet-trigger');
  trigger.classList.add('hidden-trigger');
  const overlay = trigger.querySelector(':scope > sheet-overlay');
  // openchange does not bubble: the trigger reports for uncontrolled sheets, the overlay for controlled ones.
  trigger.addEventListener('openchange', (e) => logEvent(e.detail));
  overlay.addEventListener('openchange', (e) => {
    logEvent(e.detail);
    if (o.controlled) {
      overlay.open = e.detail.open;
    }
  });
  overlay.requestOpen(true);
}

/** Cart: item list with plus/minus buttons and totals. */
function setupCart() {
  const items = [
    { name: 'Pork Bao', qty: 2, price: 4.5 },
    { name: 'Spicy Ramen', qty: 1, price: 13 },
    { name: 'Mango Boba', qty: 1, price: 5.75 },
  ];
  const money = (n) => `$${n.toFixed(2)}`;
  const render = () => {
    const live = items.filter((i) => i.qty > 0);
    const count = live.reduce((n, i) => n + i.qty, 0);
    const subtotal = live.reduce((n, i) => n + i.qty * i.price, 0);
    const delivery = live.length ? 2.99 : 0;
    $('cart-open').textContent = `Cart (${count})`;
    $('cart-items').replaceChildren(
      ...live.map((item) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span>${item.name}</span><span class="qty">
          <button type="button" class="react-aria-Button" aria-label="Remove one ${item.name}" data-d="-1">-</button>
          <span>${item.qty}</span>
          <button type="button" class="react-aria-Button" aria-label="Add one ${item.name}" data-d="1">+</button>
          <span>${money(item.qty * item.price)}</span></span>`;
        row.addEventListener('click', (e) => {
          const b = e.target.closest('button');
          if (b) {
            item.qty += Number(b.dataset.d);
            render();
          }
        });
        return row;
      }),
    );
    $('cart-subtotal').textContent = money(subtotal);
    $('cart-delivery').textContent = money(delivery);
    $('cart-total').textContent = money(subtotal + delivery);
  };
  render();
}

for (const id of ['position', 'swipe-direction', 'snap-points', 'prevent-dismissal', 'overscroll-padding', 'backdrop-animation', 'stack-animation', 'dir', 'controlled', 'content']) {
  $(id).addEventListener('input', renderCode);
}
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    $('snap-points').value = button.dataset.preset;
    renderCode();
  });
}
$('open-sheet').addEventListener('click', openSheet);
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('code').textContent);
    $('copy').textContent = 'Copied';
  } catch {
    $('copy').textContent = 'Copy failed';
  }
  setTimeout(() => ($('copy').textContent = 'Copy'), 1500);
});
setupCart();
renderCode();
