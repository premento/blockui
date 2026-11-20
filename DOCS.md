# blockUI reference

Complete documentation for jquery.blockUI 2.80.0. For a quick start see
[README.md](README.md); for a live, clickable version of everything here open
[`demo/index.html`](demo/index.html).

Most samples on this page are executed by [`test/samples.html`](test/samples.html)
— 38 checks, run against jQuery 3 and 4, with and without the stylesheet — so
they are known to work rather than merely to look plausible. The exceptions are
the install snippets and the pure-CSS examples, which nothing can assert for you.

---

## Contents

- [Installing](#installing)
- [The API](#the-api)
- [Blocking the page](#blocking-the-page)
- [Blocking an element](#blocking-an-element)
- [Growl notices](#growl-notices)
- [Options reference](#options-reference)
- [Callbacks and lifecycle](#callbacks-and-lifecycle)
- [Styling](#styling)
- [Accessibility](#accessibility)
- [Recipes](#recipes)
- [Content Security Policy](#content-security-policy)
- [Gotchas](#gotchas)
- [Upgrading from 2.70](#upgrading-from-270)

---

## Installing

Requires jQuery 3.0 or later. Tested against 3.8.x and 4.x.

### Script tag

```html
<script src="https://code.jquery.com/jquery-4.1.0.min.js"
        integrity="sha384-UGSi5euAzE1p4sK41+yKs3vtdPcidmaW6fY2NUITZkjIPyMVUUYB/BV4A5Oa8uu2"
        crossorigin="anonymous"></script>
<script src="jquery.blockUI.js"></script>
<link rel="stylesheet" href="jquery.blockUI.css">
```

The stylesheet is optional but recommended — see [Styling](#styling).

### Bundlers and AMD

The file is UMD, so all three load paths work:

```js
// CommonJS / bundlers
require('jquery.blockUI');

// ES module interop (the plugin attaches itself to the jQuery you give it)
import $ from 'jquery';
import 'jquery.blockUI';

// AMD
define(['jquery', 'jquery.blockUI'], function($) { /* ... */ });
```

blockUI is a jQuery plugin, not a module with its own exports. It attaches
`$.blockUI`, `$.unblockUI`, `$.growlUI`, `$.fn.block` and `$.fn.unblock` to the
jQuery instance it is handed, so import it for the side effect and keep using
`$`.

---

## The API

| | Signature | Returns |
| --- | --- | --- |
| Page | `$.blockUI([options])` | `undefined` |
| Page | `$.unblockUI([options])` | `undefined` |
| Element | `$(sel).block([options])` | the jQuery set (chainable) |
| Element | `$(sel).unblock([options])` | the jQuery set (chainable) |
| Notice | `$.growlUI([title], [message], [timeout], [onClose])` | `undefined` |
| Introspection | `$.blockUI.usingStylesheet()` | `Boolean` |
| Introspection | `$.blockUI.version` | `2.80` |

`$(window).block()` and `$(window).unblock()` are accepted and forwarded to
`$.blockUI` / `$.unblockUI`.

Defaults for every option live on `$.blockUI.defaults` and can be set globally:

```js
$.blockUI.defaults.fadeIn = 0;
$.blockUI.defaults.message = '<p class="blockUI-text">Working…</p>';
```

---

## Blocking the page

```js
$.blockUI();                                    // default spinner + "Please wait…"
$.blockUI({ message: '<h3>Uploading</h3>' });   // your own markup
$.blockUI({ message: null });                   // overlay only, no panel
$.unblockUI();
```

An overlay covers the viewport and swallows mouse and key events. The browser is
never frozen — scrolling, timers, ajax and CSS animations all keep running. Only
*reaching* the content underneath is prevented.

Blocking while already blocked replaces the existing block rather than stacking:

```js
$.blockUI({ message: 'First' });
$.blockUI({ message: 'Second' });   // one block, showing "Second"
$.unblockUI();                      // page is clear
```

Pass `ignoreIfBlocked: true` to make the second call a no-op instead.

### Auto-unblocking

```js
$.blockUI({ message: 'Saved', timeout: 2000 });   // clears itself
```

---

## Blocking an element

```js
$('#panel').block({ message: 'Saving…' });
$('#panel').unblock();
```

The overlay is sized to the element and positioned absolutely inside it. If the
element is `position: static`, blockUI temporarily makes it `relative` and puts
it back to `static` on unblock.

The call operates on every element in the set, so this blocks three panels
independently:

```js
$('.panel').block({ message: 'Loading…' });
$('.panel').unblock();
```

Element blocks are independent of the page block and of each other — blocking one
panel does not disturb another, and `$.unblockUI()` does not clear element
blocks.

### Centring

`centerX` and `centerY` (both `true`) centre the panel inside the element. Turn
them off to place the panel yourself:

```js
$('#panel').block({
	message: 'Top left',
	centerX: false,
	centerY: false,
	css: { top: '8px', left: '8px', transform: 'none' }
});
```

---

## Growl notices

A small panel in the corner with no overlay. The page stays fully usable.

```js
$.growlUI('Deployed', 'build 4821 is live');
$.growlUI('Saved', 'Your changes are live', 5000);
$.growlUI('Done', 'Import finished', 3000, function() {
	console.log('notice closed');
});
```

Hovering a notice extends its life to 30 seconds and makes it fully opaque;
moving away fades it out.

> **`title` and `message` are inserted as text, not HTML.** This changed in
> 2.80 — 2.70 interpreted markup in them, which made a growl built from a server
> message an injection vector. If you need markup, use `$.blockUI` with
> `showOverlay: false` and your own content instead.

---

## Options reference

Pass to any call, or set on `$.blockUI.defaults`.

### Content

| Option | Default | |
| --- | --- | --- |
| `message` | spinner + "Please wait…" | String of HTML, a DOM node, or a jQuery object. `null` for an overlay with no panel. |
| `title` | `null` | Title bar text. Only used when `theme: true`. Inserted as **text**, not HTML — put markup in `message`. |
| `blockMsgClass` | `'blockMsg'` | Class on the message layer. |

A DOM node or jQuery object is **moved** into the block, not copied, and moved
back where it came from on unblock. Its original `display` and `position` are
restored too — see [Borrowing an element](#borrowing-an-element-from-the-page).

### Layout and layering

| Option | Default | |
| --- | --- | --- |
| `baseZ` | `1000` | z-index of the bottom layer. The panel sits at `baseZ + 10`. |
| `centerX` | `true` | Centre the panel horizontally. Element blocks only. |
| `centerY` | `true` | Centre the panel vertically. Element blocks only. |
| `forceIframe` | `false` | Add an iframe layer beneath the overlay. |
| `iframeSrc` | `'about:blank'` | Source for that iframe. |

Turn on `forceIframe` when something paints over the overlay regardless of
z-index — a plugin, a PDF viewer, some `<embed>` and `<object>` content.

### Timing

| Option | Default | |
| --- | --- | --- |
| `fadeIn` | `200` | ms. `0` disables. |
| `fadeOut` | `400` | ms. `0` disables. |
| `timeout` | `0` | ms before auto-unblock. `0` disables. |
| `respectReducedMotion` | `true` | Force both fades to `0` when the OS asks for reduced motion. |

### Interaction

| Option | Default | |
| --- | --- | --- |
| `showOverlay` | `true` | Draw the dimming layer. |
| `bindEvents` | `true` | Suppress mouse and key events on blocked content. |
| `constrainTabKey` | `true` | Trap Tab inside the block. |
| `escapeToUnblock` | `false` | Close on Escape. |
| `focusInput` | `true` | Focus the first focusable thing in the block. |
| `restoreFocus` | `true` | Return focus where it was, on unblock. |
| `focusableElements` | `':input:enabled:visible'` | What counts as focusable. |
| `ignoreIfBlocked` | `false` | Do nothing if already blocked. |
| `cursorReset` | `'default'` | Cursor applied just before unblocking, so a `wait` cursor doesn't linger. |

### Styling

| Option | Default | |
| --- | --- | --- |
| `css` | see source | Inline styles for the panel. |
| `overlayCSS` | see source | Inline styles for the overlay. |
| `growlCSS` | see source | Panel styles used by `$.growlUI`. |
| `themedCSS` | `{width,top,left}` | Panel styles when `theme: true`. |
| `theme` | `false` | Use jQuery UI dialog markup and classes. |
| `draggable` | `true` | Make a themed panel draggable. Needs jQuery UI. |
| `autoDetectCSS` | `true` | Skip the inline *defaults* when `jquery.blockUI.css` is present. |
| `injectCSS` | `true` | Inject the spinner keyframes. |

### Accessibility

| Option | Default | |
| --- | --- | --- |
| `ariaRole` | `'auto'` | `'auto'`, `'dialog'`, `'status'`, or `null` for none. |

### Callbacks

| Option | Default | |
| --- | --- | --- |
| `onBlock` | `null` | Fires once the block is visible. |
| `onUnblock` | `null` | Fires once unblocking is complete. |
| `onOverlayClick` | `null` | Fires when the overlay is clicked. |

### Deprecated no-ops

`allowBodyStretch` and `quirksmodeOffsetHack` do nothing. They only ever applied
to IE 6/7 quirks mode and are kept so existing configuration objects don't throw.

---

## Callbacks and lifecycle

```js
$.blockUI({
	message: 'Working…',

	// `this` is the message layer's DOM element.
	// The first argument is the same layer, jQuery-wrapped.
	onBlock: function($layer) {
		$layer.find('.blockUI-text').text('Still working…');
	},

	// Receives the blocked element and the merged options.
	// For a page block, `element` is `window`.
	onUnblock: function(element, options) {
		console.log('unblocked', element === window ? 'the page' : element);
	},

	// Receives the jQuery event.
	onOverlayClick: function(e) {
		$.unblockUI();
	}
});
```

`onBlock` fires **after** the fade-in finishes, so `fadeIn: 200` means a 200ms
delay before it runs. With `fadeIn: 0` it fires synchronously.

Setting `onOverlayClick` also changes the overlay cursor to `pointer`, since the
overlay has become clickable.

`onUnblock` can be supplied at block time or at unblock time. One given at
unblock time wins:

```js
$.blockUI({ onUnblock: function() { console.log('A'); } });
$.unblockUI({ onUnblock: function() { console.log('B'); } });  // logs B only
```

### Order of events

1. `install()` builds three layers and appends them.
2. The layers fade in (or appear instantly).
3. `onBlock` fires.
4. `timeout` elapses, or you call unblock.
5. Event handlers are unbound, `aria-busy` is cleared.
6. The layers fade out.
7. Layers are removed, a borrowed message node is put back, `position` is
   restored, focus is returned.
8. `onUnblock` fires.

---

## Styling

### Three layers

Every block builds the same stack:

| Element | Class | Purpose |
| --- | --- | --- |
| Layer 1 | `.blockUI` | iframe shim. Hidden unless `forceIframe`. |
| Layer 2 | `.blockUI.blockOverlay` | the dimming sheet |
| Layer 3 | `.blockUI.blockMsg` | your content |

Layer 3 also carries `.blockPage` (page block) or `.blockElement` (element
block), so you can style the two differently:

```css
.blockUI.blockMsg.blockElement { border-radius: 8px; padding: 16px; }
```

### Option A — link the stylesheet

`jquery.blockUI.css` sets `--blockui-stylesheet: 1` on `:root`. blockUI detects
that and stops applying its inline style defaults, so the stylesheet wins
without `!important`. You get things an inline style cannot express: the spinner
animation, dark mode, small-screen sizing, reduced motion and forced colours.

Retheme by overriding the custom properties:

```css
:root {
	--blockui-surface: #fffdf7;        /* panel background */
	--blockui-text: #2b2118;           /* panel text */
	--blockui-scrim: 43, 33, 24;       /* overlay colour, as R, G, B */
	--blockui-scrim-opacity: .5;
	--blockui-scrim-blur: 3px;
	--blockui-radius: 4px;
	--blockui-pad: 20px 24px;
	--blockui-shadow: 0 10px 30px -10px rgba(43, 33, 24, .5);
	--blockui-track: rgba(43, 33, 24, .15);   /* spinner track */
	--blockui-indicator: #c2410c;             /* spinner arc */
	--blockui-font: 15px/1.5 Georgia, serif;
}
```

Force a theme regardless of the OS setting:

```html
<html data-blockui-theme="dark">
```

```js
$('html').attr('data-blockui-theme', 'dark');
```

### Option B — pass `css` and `overlayCSS`

These always apply, stylesheet or not. Explicit beats implicit:

```js
$.blockUI({
	css: {
		backgroundColor: '#16202c',
		color: '#fff',
		borderRadius: '8px',
		padding: '20px 24px'
	},
	overlayCSS: {
		backgroundColor: '#e8a317',
		opacity: 0.45
	}
});
```

To hand *all* styling to your own stylesheet:

```js
$.blockUI.defaults.css = {};
$.blockUI.defaults.overlayCSS = {};
```

> jQuery 4 no longer appends `px` to most unitless numbers. Write
> `borderRadius: '10px'`, not `borderRadius: 10`. Genuinely unitless properties
> (`opacity`, `zIndex`, `fontWeight`, `lineHeight`) still take bare numbers.

### Restoring the 2007 look

```js
$.blockUI.defaults.message    = $.blockUI.classicMessage;
$.blockUI.defaults.css        = $.blockUI.classicCSS;
$.blockUI.defaults.overlayCSS = $.blockUI.classicOverlayCSS;
```

Or for one call:

```js
$.blockUI({
	message: $.blockUI.classicMessage,
	css: $.blockUI.classicCSS,
	overlayCSS: $.blockUI.classicOverlayCSS
});
```

### jQuery UI themes

```js
$.blockUI({
	theme: true,
	title: 'Please wait',
	message: 'Contacting the server…',
	draggable: true          // needs jquery-ui.js
});
```

The panel is built with `ui-dialog` / `ui-widget` markup and styled by your
jQuery UI theme. `themedCSS` supplies the geometry; `css` is ignored.

---

## Accessibility

blockUI does a reasonable amount for you, but it is not a complete dialog
implementation — see [Gotchas](#gotchas).

### Roles

`ariaRole: 'auto'` (the default) inspects the message for focusable content:

- contains a link, button or form control → `role="dialog"` + `aria-modal="true"`
- otherwise → `role="status"` + `aria-live="polite"`

Override it when the guess is wrong:

```js
$.blockUI({ message: 'Uploading…', ariaRole: 'status' });
$.blockUI({ message: $('#confirmDialog'), ariaRole: 'dialog' });
$.blockUI({ message: 'Decorative', ariaRole: null });
```

With `theme: true` and a `title`, the title is also used as `aria-label`.

### aria-busy

The blocked region (`document.body` for a page block, the element otherwise) is
marked `aria-busy="true"` while a progress block is up, and the attribute is
removed on unblock. A `role="dialog"` block does **not** set it — a dialog is
waiting on the user, not busy.

### Focus

```js
$.blockUI({
	message: $('#myDialog'),
	focusInput: true,        // move focus into the block (default)
	restoreFocus: true,      // hand it back on unblock (default)
	constrainTabKey: true,   // trap Tab inside (default)
	escapeToUnblock: true    // Escape closes — opt in
});
```

`escapeToUnblock` is off by default on purpose: a "please wait" block usually
must not be dismissable, and making Escape work by default would let users
dismiss a block the application still depends on.

`focusableElements` controls what counts for focusing and for the Tab trap.
Widen it if your dialog contains focusable things that `:input` misses:

```js
$.blockUI.defaults.focusableElements =
	'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
```

### Motion

Fades are skipped when the OS asks for reduced motion. The stylesheet also slows
the spinner rather than removing it, so "working" is still conveyed. Opt out
with `respectReducedMotion: false`.

---

## Recipes

### Block during any ajax request

```js
$(document).ajaxStart(function() { $.blockUI(); })
           .ajaxStop(function()  { $.unblockUI(); });
```

`ajaxStart` fires when the first request begins and `ajaxStop` when the last one
finishes, so overlapping requests produce one block. Both still exist in
jQuery 4.

### Block for one request only

```js
$.ajax({
	url: '/api/save',
	method: 'POST',
	data: payload,
	beforeSend: function() {
		$('#form').block({ message: 'Saving…' });
	},
	complete: function() {
		$('#form').unblock();
	}
});
```

`complete` runs on success *and* failure, which is what you want — `success`
alone leaves the panel stuck on an error.

### Wrap any promise

```js
function blockWhile(promise, opts) {
	$.blockUI(opts);
	return Promise.resolve(promise).then(
		function(value)  { $.unblockUI(); return value; },
		function(reason) { $.unblockUI(); throw reason; }
	);
}

blockWhile(fetch('/api/report').then(function(r) { return r.json(); }),
           { message: 'Building the report…' })
	.then(render)
	.catch(showError);
```

Written with `then(onFulfilled, onRejected)` rather than `finally` so it works on
jQuery 4's full browser baseline, IE 11 included.

### A confirm dialog that returns a promise

```html
<div id="confirmBox" style="display:none">
	<p id="confirmText"></p>
	<button type="button" data-answer="no">Cancel</button>
	<button type="button" data-answer="yes">Delete</button>
</div>
```

```js
function confirmBox(text) {
	return new Promise(function(resolve) {
		$('#confirmText').text(text);

		$('#confirmBox').on('click.confirm', '[data-answer]', function() {
			var answer = $(this).data('answer') === 'yes';
			$('#confirmBox').off('.confirm');
			$.unblockUI();
			resolve(answer);
		});

		$.blockUI({
			message: $('#confirmBox'),
			ariaRole: 'dialog',
			escapeToUnblock: true,
			onUnblock: function() {
				$('#confirmBox').off('.confirm');
				resolve(false);          // dismissed without answering
			}
		});
	});
}

confirmBox('Delete this project?').then(function(ok) {
	if (ok) deleteProject();
});
```

A promise ignores every `resolve` after the first, so the Escape path and the
button path can both call it safely.

### Update the message while blocked

The panel is an ordinary element, so change it in place rather than re-blocking:

```js
$.blockUI({ message: '<p class="blockUI-text">Uploading 0%</p>' });

function progress(pct) {
	$('.blockMsg .blockUI-text').text('Uploading ' + pct + '%');
}
```

Re-blocking would tear the panel down and build a new one, restarting the fade.

### Show an error, then clear it

```js
$.ajax('/api/save').fail(function() {
	$.blockUI({
		message: '<p class="blockUI-text">Couldn’t save. Try again.</p>',
		css: { backgroundColor: '#fff1f0', color: '#7a1c12' },
		timeout: 3000,
		escapeToUnblock: true
	});
});
```

### Block a table while it reloads

```js
function reloadTable() {
	var $table = $('#results');
	$table.block({ message: null });              // overlay only
	return $.getJSON('/api/results')
		.done(function(rows) { render($table, rows); })
		.always(function()   { $table.unblock(); });
}
```

`message: null` gives a bare overlay, which reads better than a spinner on a
region that is already visibly a table.

### Borrowing an element from the page

```js
$.blockUI({ message: $('#myPanel') });
```

The node is **moved** into the block — not cloned — and moved back to its
original parent on unblock, with its original `display` and `position` restored.
So event handlers bound to it survive, and a `style="display:none"` panel goes
back to being hidden.

Because it is moved, don't block two things with the same node at once.

If the selector matches nothing, you get an empty panel rather than an error —
`$.blockUI({ message: $('#typo') })` used to throw, because an empty jQuery set
is still truthy.

### Block the page except for a progress bar

```js
$.blockUI({
	message: $('#uploadProgress'),
	css: { width: '320px', padding: '20px' },
	overlayCSS: { cursor: 'default' },
	bindEvents: true,
	escapeToUnblock: false
});
```

### Only block if not already blocked

```js
$('#panel').block({ message: 'Loading…', ignoreIfBlocked: true });
```

Without this, a second `block()` on the same element unblocks and re-blocks it,
restarting the fade.

### Detect whether the stylesheet is in play

```js
if ($.blockUI.usingStylesheet()) {
	// theme via CSS custom properties
} else {
	$.blockUI.defaults.css.backgroundColor = '#111';
}
```

---

## Content Security Policy

blockUI styles elements inline, which needs `style-src 'unsafe-inline'`. To
avoid that:

```html
<link rel="stylesheet" href="jquery.blockUI.css">
```

```js
$.blockUI.defaults.injectCSS = false;   // don't inject the spinner keyframes
```

…and don't pass `css` or `overlayCSS` to individual calls. With the stylesheet
detected, blockUI applies no style defaults of its own.

Three inline attributes remain on the layer elements (`z-index`, `display`,
`position`), written into the markup blockUI builds. If your policy forbids even
those, you'll need to patch `install()`.

---

## Security notes

**`message` is HTML by design.** It is the one option that parses markup, and
jQuery runs scripts in a parsed fragment. Escape anything that came from a
server, a URL or a user before putting it in there:

```js
// unsafe if `err` came from an API response
$.blockUI({ message: '<p>' + err + '</p>' });

// safe — build the node and set its text
$.blockUI({ message: $('<p class="blockUI-text"></p>').text(err) });
```

**Everything else is text or an attribute.** `title` and both `$.growlUI`
arguments are inserted with `.text()`. `blockMsgClass`, `baseZ` and `iframeSrc`
are set with `.attr()` / `.css()`. No option other than `message` is
concatenated into markup, so a stray quote or angle bracket in one of them can't
introduce an element or an attribute.

**blockUI is not a security boundary.** The overlay stops ordinary pointer and
key interaction, nothing more. `click` isn't in the suppressed event list,
`preventDefault()` on `mousedown` doesn't stop the subsequent `click`, capture-
phase listeners are unaffected, and devtools or a programmatic `.click()` bypass
it entirely. Never rely on a block to prevent an action — enforce that on the
server.

## Gotchas

**blockUI is not a full modal dialog implementation.** It traps Tab and sets
`aria-modal`, but it does not mark the rest of the page `inert` or
`aria-hidden`. A screen reader user can still navigate out of the block with
virtual-cursor commands. For a genuinely modal dialog, consider the native
`<dialog>` element with `showModal()`.

**`bindEvents` works at the document level.** blockUI binds one handler to
`document` and suppresses events whose target isn't inside the message. Handlers
already bound with `stopPropagation()` at a lower level can still fire.

**Element blocks and `overflow`.** The overlay is `width: 100%; height: 100%` of
the element's padding box. If the element scrolls, the overlay covers the
visible area, not the full scroll height.

**`position: static` is restored, not remembered.** If the element had an
explicit `position: static` in a stylesheet, unblock sets it inline. Harmless,
but it does leave an inline style behind.

**Don't block inside `onUnblock`.** It fires during teardown; re-blocking there
can race with the layer removal. Use `setTimeout(fn, 0)` if you must chain.

**The page block does not clear element blocks.** `$.unblockUI()` only removes
`body > .blockUI`. Track element blocks yourself.

**Animations don't finish in a background tab.** jQuery drives fades with
`requestAnimationFrame`, which browsers pause when the tab isn't visible. A
block started and unblocked while hidden can leave its layers up until the tab is
shown again. If that matters, use `fadeIn: 0, fadeOut: 0`, which skips animation
entirely and tears down synchronously.

---

## Upgrading from 2.70

On jQuery 4, blockUI 2.70 throws `$.isFunction is not a function` while the file
is still parsing, so `$.blockUI` is never defined. 2.80 fixes that along with the
rest of the jQuery 4 fallout.

Existing calls keep working. Four behaviour changes to know about:

**1. The default look changed.** See
[Restoring the 2007 look](#restoring-the-2007-look).

**2. The iframe layer is opt-in.** It used to appear automatically in IE. Set
`forceIframe: true` if you block content that paints over the overlay.

**3. `$.growlUI` escapes its title and message.** They are inserted as text now.
Markup passed to them will be shown literally instead of being parsed.

**4. `title` is inserted as text, not HTML.** With `theme: true`, `title` used to
be concatenated straight into the layer markup, so a title built from server data
executed as HTML. It is escaped now, matching `$.growlUI` and matching what the
option name implies. Markup belongs in `message`, which is documented to take it.

**5. `iframeSrc` defaults to `about:blank` everywhere.** It used to be
`javascript:false` over HTTPS, to dodge a mixed-content warning in IE 6/7. That
warning is long gone and a `javascript:` URL trips a strict `script-src` policy
for no benefit.

**6. `onBlock`'s `this` is consistent.** It used to be a DOM element when
`fadeIn > 0` and a jQuery object when `fadeIn: 0`. It is now always the message
layer's DOM element, with the jQuery wrapper passed as the first argument:

```js
// before 2.80 — only correct when fadeIn was 0
onBlock: function() { this.find('.spinner').hide(); }

// 2.80
onBlock: function($layer) { $layer.find('.spinner').hide(); }
```

### What changed for jQuery 4

| Was | Now | Why |
| --- | --- | --- |
| `$.isFunction(...)` | `typeof x === 'function'` | removed in jQuery 4 — this is what broke the load |
| `.bind()` / `.unbind()` | `.on()` / `.off()` | deprecated since jQuery 3, due to go in 5 |
| `.mouseover()` / `.mouseout()` | `.on('mouseenter'/'mouseleave')` | shorthand event methods are deprecated |
| `define.amd.jQuery` check | plain UMD | jQuery 4 no longer sets that flag |
| `setExpression`, `$.support.boxModel`, quirks hacks | removed | IE 6/7 only |
| `e.keyCode == 9` | `e.key === 'Tab'` with fallback | `keyCode` is deprecated |
| Safari 6 reflow hack | removed | forced a layout flush on every unblock |

### Bugs fixed in 2.80

- Clicks landing on the message panel's own padding were treated as clicks on
  blocked content and swallowed (`.parents()` → `.closest()`).
- Element blocks were centred several pixels off, because `center()` measured a
  shrink-to-fit width that changed as soon as `left` was written. Now positioned
  with percentages and a translate.
- `onBlock`'s `this` changed type depending on `fadeIn`.
- `message: $('#selector-that-matches-nothing')` threw a `TypeError`, because an
  empty jQuery set is truthy and still carries `.jquery`.
- **A borrowed message node could be destroyed.** `remove()` clears its
  `pageBlock` reference when unblocking *starts*, not when it finishes, so
  blocking again during the fade-out stranded the outgoing block's cleanup: its
  borrowed node was swept away with the stale layers and never returned to the
  document. A double-clicked button or two overlapping requests was enough to
  permanently delete the element you passed as `message`.
- **`title` executed HTML**, and **`blockMsgClass` could break out of its class
  attribute**. The layer elements are built with DOM calls now, so no option is
  concatenated into markup.

---

## Testing

`test/index.html` runs 37 assertions against the plugin itself.
`test/samples.html` runs 38 more, each one a sample from this page. Serve the
repo over HTTP and open both with all four combinations:

```
test/index.html?jq=4            test/index.html?jq=4&css=1
test/index.html?jq=3            test/index.html?jq=3&css=1

test/samples.html?jq=4          test/samples.html?jq=4&css=1
test/samples.html?jq=3          test/samples.html?jq=3&css=1
```

Any static file server will do — the pages need HTTP rather than `file://`,
because one assertion fetches the plugin source and CORS blocks that on
`file://`. `demo/index.html` has no such constraint and opens fine from the
filesystem.

Both shim `requestAnimationFrame` onto timers, so the fade paths are exercised
even in a background tab where jQuery's animations would otherwise never
complete.
