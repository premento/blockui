# BlockUI — page or element overlay

Block user interaction with the page, or with one element on it, while something
is in flight. The browser stays responsive the whole time — nothing is frozen,
the user just can't reach what's underneath. Also good for modal dialogs.

**Version 2.80.0 runs on jQuery 3.x and jQuery 4.x.**

## Getting started

```html
<script src="https://code.jquery.com/jquery-4.1.0.min.js"
        integrity="sha384-UGSi5euAzE1p4sK41+yKs3vtdPcidmaW6fY2NUITZkjIPyMVUUYB/BV4A5Oa8uu2"
        crossorigin="anonymous"></script>
<script src="jquery.blockUI.js"></script>

<!-- optional, but recommended: see "Styling" below -->
<link rel="stylesheet" href="jquery.blockUI.css">
```

```js
$(document).on('click', '#myButton', function() {
	$.blockUI();
});
```

| Call | What it does |
| --- | --- |
| `$.blockUI()` / `$.unblockUI()` | the whole page |
| `$('#panel').block()` / `.unblock()` | one element |
| `$.growlUI(title, message)` | a corner notice, no overlay |

Open `demo/index.html` for a live demo of every option, plus a set of
compatibility checks you can run against either jQuery version.

## Upgrading from 2.70

On jQuery 4, blockUI 2.70 throws `$.isFunction is not a function` while the file
is still loading, so `$.blockUI` is never defined at all. 2.80 fixes that and the
rest of the jQuery 4 fallout.

Your existing calls keep working. Two visible changes to be aware of:

**The default look changed.** To put the 2007 styling back:

```js
$.blockUI.defaults.message    = $.blockUI.classicMessage;
$.blockUI.defaults.css        = $.blockUI.classicCSS;
$.blockUI.defaults.overlayCSS = $.blockUI.classicOverlayCSS;
```

**The iframe layer is opt-in.** It used to appear automatically in IE. If you
block content that paints over the overlay — a plugin, an embed, a PDF viewer —
set `forceIframe: true`.

### What was changed for jQuery 4

| Was | Now | Why |
| --- | --- | --- |
| `$.isFunction(...)` | `typeof x === 'function'` | removed in jQuery 4 — this is what broke the load |
| `.bind()` / `.unbind()` | `.on()` / `.off()` | deprecated since jQuery 3, due to go in 5 |
| `.mouseover()` / `.mouseout()` | `.on('mouseenter'/'mouseleave')` | shorthand event methods are deprecated; `mouseenter` also stops the growl flickering when the pointer crosses a child |
| `define.amd.jQuery` check | plain UMD (AMD, CommonJS, global) | jQuery 4 no longer sets that flag, so the AMD branch never ran |
| `setExpression`, `$.support.boxModel`, `ie6`, quirks-mode hacks | removed | IE 6/7 only; jQuery 4 supports IE 11 at the oldest |
| `e.keyCode == 9` | `e.key === 'Tab'`, with `keyCode` fallback | `keyCode` is deprecated in browsers |
| Safari 6 reflow hack on every unblock | removed | forced a layout flush on a browser from 2012 |

Two bugs were fixed along the way:

- **Clicks on the message panel's own padding were swallowed.** The handler
  tested `.parents()`, which doesn't match the element itself, so a click landing
  on the panel rather than on its contents was treated as a click on blocked
  content. Now uses `.closest()`.
- **Element blocks were centred a few pixels off.** `center()` measured the
  panel's width and wrote a pixel offset, but an absolutely positioned box is
  shrink-to-fit: setting `left` changes the space available to it, which changes
  its width, which invalidates the measurement. Now positioned with percentages
  and a translate, so it needs no measurement and survives reflow.

## Styling

Two ways, and you can mix them.

**Link `jquery.blockUI.css`.** blockUI detects it and stops applying its inline
style defaults, so the stylesheet wins without a single `!important`. You get a
spinner, dark mode, small-screen sizing, reduced-motion and forced-colours
support — none of which an inline style can express. Restyle it by overriding the
custom properties on `:root`:

```css
:root {
	--blockui-surface: #fff;
	--blockui-scrim: 27, 40, 56;   /* R, G, B */
	--blockui-scrim-opacity: .55;
	--blockui-radius: 14px;
}
```

Force a theme regardless of the OS setting with `data-blockui-theme="dark"` (or
`"light"`) on `<html>`.

**Or pass `css` / `overlayCSS`.** These always win, stylesheet or not:

```js
$.blockUI({
	css: { backgroundColor: '#16202c', color: '#fff' },
	overlayCSS: { backgroundColor: '#e8a317' }
});
```

Setting `$.blockUI.defaults.css = {}` hands all styling to your own stylesheet.

> jQuery 4 no longer appends `px` to most unitless numbers. Write
> `borderRadius: '10px'`, not `borderRadius: 10`.

## Accessibility

- The message panel gets `role="dialog"` + `aria-modal` when it contains
  something focusable, otherwise a polite `role="status"`. Override with
  `ariaRole`, or pass `null` for none.
- The blocked region is marked `aria-busy` while a progress block is up. A
  dialog is waiting on the user rather than busy, so it isn't marked.
- Focus moves into the block and returns to wherever it was on unblock
  (`restoreFocus`).
- Tab is trapped inside the block (`constrainTabKey`).
- `escapeToUnblock: true` closes on Escape. Off by default, because a "please
  wait" block usually must not be dismissable.
- Fades are skipped when the OS asks for reduced motion
  (`respectReducedMotion`).

## New and changed options

| Option | Default | |
| --- | --- | --- |
| `escapeToUnblock` | `false` | close on Escape |
| `restoreFocus` | `true` | return focus on unblock |
| `ariaRole` | `'auto'` | `'dialog'`, `'status'`, or `null` |
| `respectReducedMotion` | `true` | skip fades when asked to |
| `autoDetectCSS` | `true` | step aside when the stylesheet is present |
| `injectCSS` | `true` | add the spinner keyframes; turn off under a strict `style-src` policy |
| `forceIframe` | `false` | *was auto-enabled in IE* |
| `message`, `css`, `overlayCSS`, `growlCSS` | — | *restyled; `classicMessage` / `classicCSS` / `classicOverlayCSS` restore the originals* |
| `allowBodyStretch`, `quirksmodeOffsetHack` | — | *no-ops now; kept so existing config objects don't break* |

`$.blockUI.usingStylesheet()` reports whether `jquery.blockUI.css` was found.

All other 2.70 options are unchanged.

## Content Security Policy

blockUI styles elements inline, which needs `style-src 'unsafe-inline'`. To avoid
that, link `jquery.blockUI.css`, set `injectCSS: false`, and don't pass `css` or
`overlayCSS`.

## Tests

`test/index.html` runs 28 assertions in the browser. Serve the repo over HTTP and
open it with each combination:

```
test/index.html?jq=4          test/index.html?jq=4&css=1
test/index.html?jq=3          test/index.html?jq=3&css=1
```

It shims `requestAnimationFrame` onto timers so the fade paths are exercised even
in a background tab, where jQuery's animations would otherwise never complete.

## Browser support

jQuery 4's baseline: IE 11, and current/current-1 of Chrome, Edge, Firefox and
Safari. The stylesheet's spinner, dark mode and `:has()`-based growl positioning
need a modern browser; everything degrades to a plain panel without them.

## Documentation and FAQ

[http://jquery.malsup.com/block/](http://jquery.malsup.com/block/)

## Copyright and license

Copyright &copy; 2007-2013 M. Alsup.

The BlockUI plugin is dual licensed under the
[MIT](http://malsup.github.com/mit-license.txt) and
[GPL](http://malsup.github.com/gpl-license-v2.txt) licenses. You may use either
license. The MIT license is recommended for most projects because it is simple
and easy to understand and it places almost no restrictions on what you can do
with the plugin.

If the GPL suits your project better you are also free to use the plugin under
that license. You do not have to do anything special to choose one license or the
other and you don't have to notify anyone which license you are using. You are
free to use the BlockUI plugin in commercial projects as long as the copyright
header is left intact.
