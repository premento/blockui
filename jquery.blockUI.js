/*!
 * jQuery blockUI plugin
 * Version 2.80.0
 * Requires jQuery v3.0 or later (tested against 3.8.x and 4.x)
 *
 * Examples at: http://malsup.com/jquery/block/
 * Copyright (c) 2007-2013 M. Alsup
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Thanks to Amir-Hossein Sobhi for some excellent contributions!
 */

( function( factory ) {
	"use strict";

	if ( typeof define === "function" && define.amd ) {

		// AMD. jQuery 4 no longer sets define.amd.jQuery, so don't test for it.
		define( [ "jquery" ], factory );
	} else if ( typeof module === "object" && module.exports ) {

		// CommonJS / bundlers.
		module.exports = function( root, jQuery ) {
			if ( !jQuery ) {
				jQuery = typeof window !== "undefined" ?
					require( "jquery" ) :
					require( "jquery" )( root );
			}
			factory( jQuery );
			return jQuery;
		};
	} else {

		// Browser global.
		factory( jQuery );
	}
} )( function( $ ) {
/* jshint eqeqeq:false curly:false latedef:false */
"use strict";

	$.fn._fadeIn = $.fn.fadeIn;

	var noOp = $.noop || function() {};

	// Document-level flags resolved lazily, after the DOM and stylesheets exist.
	var externalCSS = null;
	var baseCSSInjected = false;

	// global $ methods for blocking/unblocking the entire page
	$.blockUI   = function( opts ) { install( window, opts ); };
	$.unblockUI = function( opts ) { remove( window, opts ); };

	// convenience method for quick growl-like notifications  (http://www.google.com/search?q=growl)
	$.growlUI = function( title, message, timeout, onClose ) {
		var $m = $( '<div class="growlUI" role="status" aria-live="polite"></div>' );
		if ( title ) $m.append( $( "<h1></h1>" ).text( title ) );
		if ( message ) $m.append( $( "<h2></h2>" ).text( message ) );
		if ( timeout === undefined ) timeout = 3000;

		// Added by konapun: Set timeout to 30 seconds if this growl is moused over,
		// like normal toast notifications
		var callBlock = function( opts ) {
			opts = opts || {};

			$.blockUI( {
				message: $m,
				fadeIn : typeof opts.fadeIn  !== "undefined" ? opts.fadeIn  : 700,
				fadeOut: typeof opts.fadeOut !== "undefined" ? opts.fadeOut : 1000,
				timeout: typeof opts.timeout !== "undefined" ? opts.timeout : timeout,
				centerY: false,
				showOverlay: false,
				focusInput: false,
				ariaRole: null,
				onUnblock: onClose,

				// with the stylesheet loaded, .growlUI is themed in CSS instead
				css: hasExternalCSS() ? {} : $.blockUI.defaults.growlCSS
			} );
		};

		callBlock();

		// mouseenter/mouseleave rather than mouseover/mouseout: no flicker when the
		// pointer crosses a child element.
		$m.on( "mouseenter", function() {
			callBlock( {
				fadeIn: 0,
				timeout: 30000
			} );

			var displayBlock = $( "." + $.blockUI.defaults.blockMsgClass );
			displayBlock.stop(); // cancel fadeout if it has started
			displayBlock.fadeTo( 300, 1 ); // easier to read without the transparency
		} ).on( "mouseleave", function() {
			$( "." + $.blockUI.defaults.blockMsgClass ).fadeOut( 1000 );
		} );
		// End konapun additions
	};

	// plugin method for blocking element content
	$.fn.block = function( opts ) {
		if ( this[ 0 ] === window ) {
			$.blockUI( opts );
			return this;
		}
		var fullOpts = $.extend( {}, $.blockUI.defaults, opts || {} );
		this.each( function() {
			var $el = $( this );
			if ( fullOpts.ignoreIfBlocked && $el.data( "blockUI.isBlocked" ) )
				return;
			$el.unblock( { fadeOut: 0 } );
		} );

		return this.each( function() {
			if ( $.css( this, "position" ) == "static" ) {
				this.style.position = "relative";
				$( this ).data( "blockUI.static", true );
			}
			install( this, opts );
		} );
	};

	// plugin method for unblocking element content
	$.fn.unblock = function( opts ) {
		if ( this[ 0 ] === window ) {
			$.unblockUI( opts );
			return this;
		}
		return this.each( function() {
			remove( this, opts );
		} );
	};

	$.blockUI.version = 2.80; // 2nd generation blocking at no extra cost!

	// True when jquery.blockUI.css was found on the page, in which case the inline
	// style defaults step aside. The answer is cached after the first call.
	$.blockUI.usingStylesheet = function() { return hasExternalCSS(); };

	// override these in your code to change the default behavior and style
	$.blockUI.defaults = {

		// message displayed when blocking (use null for no message)
		message: '<div class="blockUI-spinner" aria-hidden="true"></div>' +
			'<p class="blockUI-text">Please wait…</p>',

		title: null,		// title string; only used when theme == true
		draggable: true,	// only used when theme == true (requires jquery-ui.js to be loaded)

		theme: false, // set to true to use with jQuery UI themes

		// styles for the message when blocking; if you wish to disable
		// these and use an external stylesheet then do this in your code:
		// $.blockUI.defaults.css = {};
		//
		// These are skipped automatically when jquery.blockUI.css is linked on the
		// page (see autoDetectCSS below), because the stylesheet does a better job:
		// it can do dark mode, media queries and the spinner animation.
		css: {
			padding:         "28px 32px",
			margin:          0,
			width:           "auto",
			maxWidth:        "min(420px, calc(100vw - 32px))",
			top:             "50%",
			left:            "50%",
			transform:       "translate(-50%, -50%)",
			textAlign:       "center",
			color:           "#16202c",
			border:          "none",
			borderRadius:    "14px",
			backgroundColor: "#fff",
			boxShadow:       "0 1px 2px rgba(16, 24, 40, .08), 0 12px 32px -8px rgba(16, 24, 40, .25)",
			font:            "15px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
			cursor:          "default"
		},

		// minimal style set used when themes are used
		themedCSS: {
			width: "30%",
			top:   "40%",
			left:  "35%"
		},

		// styles for the overlay
		overlayCSS: {
			backgroundColor: "#1b2838",
			opacity:         0.55,
			backdropFilter:  "blur(2px)",
			cursor:          "wait"
		},

		// style to replace wait cursor before unblocking to correct issue
		// of lingering wait cursor
		cursorReset: "default",

		// styles applied when using $.growlUI
		growlCSS: {
			width:           "auto",
			maxWidth:        "min(360px, calc(100vw - 24px))",
			top:             "16px",
			left:            "",
			right:           "16px",
			transform:       "none",
			border:          "none",
			padding:         "14px 18px",
			textAlign:       "left",
			opacity:         0.95,
			cursor:          "default",
			color:           "#f8fafc",
			backgroundColor: "#16202c",
			borderRadius:    "12px",
			boxShadow:       "0 8px 24px -6px rgba(16, 24, 40, .45)",
			font:            "14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
		},

		// IE issues: 'about:blank' fails on HTTPS and javascript:false is s-l-o-w
		// (hat tip to Jorge H. N. de Vasconcelos)
		/* jshint scripturl:true */
		iframeSrc: /^https/i.test( window.location.href || "" ) ? "javascript:false" : "about:blank",

		// use an iframe layer under the overlay; handy for blocking plugins/embeds
		// that would otherwise paint over it
		forceIframe: false,

		// z-index for the blocking overlay
		baseZ: 1000,

		// set these to true to have the message automatically centered
		centerX: true, // <-- only effects element blocking (page block controlled via css above)
		centerY: true,

		// enable if you want key and mouse events to be disabled for content that is blocked
		bindEvents: true,

		// be default blockUI will supress tab navigation from leaving blocking content
		// (if bindEvents is true)
		constrainTabKey: true,

		// unblock when the user presses Escape. Off by default: a "please wait" block
		// usually must not be dismissable. Turn it on for modal dialogs.
		escapeToUnblock: false,

		// fadeIn time in millis; set to 0 to disable fadeIn on block
		fadeIn: 200,

		// fadeOut time in millis; set to 0 to disable fadeOut on unblock
		fadeOut: 400,

		// honour the OS "reduce motion" setting by skipping fades
		respectReducedMotion: true,

		// time in millis to wait before auto-unblocking; set to 0 to disable auto-unblock
		timeout: 0,

		// disable if you don't want to show the overlay
		showOverlay: true,

		// if true, focus will be placed in the first available input field when
		// page blocking
		focusInput: true,

		// return focus to whatever was focused before blocking, once unblocked
		restoreFocus: true,

		// elements that can receive focus
		focusableElements: ":input:enabled:visible",

		// ARIA role for the message layer.
		// 'auto'   - 'dialog' when the message contains something focusable, else 'status'
		// 'dialog' - a modal dialog
		// 'status' - a polite live region (progress messages)
		// null     - add no role at all
		ariaRole: "auto",

		// skip the inline `css`/`overlayCSS` defaults when jquery.blockUI.css is
		// detected on the page, so the stylesheet wins without !important
		autoDetectCSS: true,

		// inject the handful of rules inline styles cannot express (the spinner and
		// its keyframes). Ignored when the stylesheet is detected. Set to false under
		// a strict style-src Content Security Policy.
		injectCSS: true,

		// callback method invoked when fadeIn has completed and blocking message is visible
		onBlock: null,

		// callback method invoked when unblocking has completed; the callback is
		// passed the element that has been unblocked (which is the window object for page
		// blocks) and the options that were passed to the unblock call:
		//	onUnblock(element, options)
		onUnblock: null,

		// callback method invoked when the overlay area is clicked.
		// setting this will turn the cursor to a pointer, otherwise cursor defined in overlayCss will be used.
		onOverlayClick: null,

		// class name of the message block
		blockMsgClass: "blockMsg",

		// if it is already blocked, then ignore it (don't unblock and reblock)
		ignoreIfBlocked: false,

		// Deprecated no-ops, kept so existing configuration objects keep working.
		// They only ever applied to IE 6/7 quirks mode.
		allowBodyStretch: true,
		quirksmodeOffsetHack: 4
	};

	// The classic pre-2.80 look, for anyone who wants it back:
	//   $.blockUI.defaults.css = $.blockUI.classicCSS;
	//   $.blockUI.defaults.overlayCSS = $.blockUI.classicOverlayCSS;
	//   $.blockUI.defaults.message = $.blockUI.classicMessage;
	$.blockUI.classicMessage = "<h1>Please wait...</h1>";

	$.blockUI.classicCSS = {
		padding:         0,
		margin:          0,
		width:           "30%",
		top:             "40%",
		left:            "35%",
		textAlign:       "center",
		color:           "#000",
		border:          "3px solid #aaa",
		backgroundColor: "#fff",
		cursor:          "wait"
	};

	$.blockUI.classicOverlayCSS = {
		backgroundColor: "#000",
		opacity:         0.6,
		cursor:          "wait"
	};

	// private data and functions follow...

	var pageBlock = null;
	var pageBlockEls = [];
	var lastFocused = null;

	// Is jquery.blockUI.css on the page? It sets --blockui-stylesheet: 1 on :root.
	function hasExternalCSS() {
		if ( externalCSS !== null )
			return externalCSS;
		externalCSS = false;
		try {
			var probe = window.getComputedStyle( document.documentElement )
				.getPropertyValue( "--blockui-stylesheet" );
			externalCSS = String( probe ).trim() === "1";
		} catch ( e ) {}
		return externalCSS;
	}

	function prefersReducedMotion() {
		try {
			return !!( window.matchMedia &&
				window.matchMedia( "(prefers-reduced-motion: reduce)" ).matches );
		} catch ( e ) {
			return false;
		}
	}

	// The spinner animation cannot be expressed as an inline style, so when the
	// stylesheet isn't present we inject just those rules, once.
	function injectBaseCSS() {
		if ( baseCSSInjected || hasExternalCSS() )
			return;
		baseCSSInjected = true;
		var css =
			"@keyframes blockUI-spin{to{transform:rotate(360deg)}}" +
			".blockUI .blockUI-spinner{box-sizing:border-box;width:28px;height:28px;" +
			"margin:0 auto 14px;border-radius:50%;border:3px solid rgba(22,32,44,.15);" +
			"border-top-color:#16202c;animation:blockUI-spin .7s linear infinite}" +
			".blockUI .blockUI-text{margin:0;font-weight:500}" +
			".blockUI .growlUI h1{margin:0;font-size:15px;font-weight:600;line-height:1.3}" +
			".blockUI .growlUI h2{margin:2px 0 0;font-size:14px;font-weight:400;" +
			"line-height:1.45;opacity:.8}" +
			"@media (prefers-reduced-motion:reduce){" +
			".blockUI .blockUI-spinner{animation-duration:2.4s}}";
		try {
			var style = document.createElement( "style" );
			style.setAttribute( "data-blockui", "" );
			style.appendChild( document.createTextNode( css ) );
			( document.head || document.getElementsByTagName( "head" )[ 0 ] )
				.appendChild( style );
		} catch ( e ) {
			baseCSSInjected = false;
		}
	}

	// Decide which ARIA role the message layer should carry. This runs while the
	// layer is still display:none, so it must not lean on :visible.
	function resolveRole( lyr3, opts ) {
		var role = opts.ariaRole;
		if ( !role )
			return null;
		if ( role !== "auto" )
			return role;
		var focusable = lyr3.find(
			"a[href],button,input,select,textarea,[tabindex]"
		).not( "[disabled],[tabindex='-1']" ).length;
		return focusable > 0 ? "dialog" : "status";
	}

	function applyAria( lyr3, opts ) {
		var role = resolveRole( lyr3, opts );
		if ( !role )
			return null;
		lyr3.attr( "role", role );
		if ( role === "dialog" ) {
			lyr3.attr( "aria-modal", "true" );
			if ( opts.title )
				lyr3.attr( "aria-label", opts.title );
		} else if ( role === "status" ) {
			lyr3.attr( "aria-live", "polite" );
		}
		return role;
	}

	function install( el, opts ) {
		var css, themedCSS;
		var full = ( el == window );
		var msg = ( opts && opts.message !== undefined ? opts.message : undefined );

		// Capture what the *caller* passed before merging in the defaults - after
		// the merge, opts.css is the defaults and the two can't be told apart.
		var rawCSS = opts && opts.css;
		var rawOverlayCSS = opts && opts.overlayCSS;

		opts = $.extend( {}, $.blockUI.defaults, opts || {} );

		if ( opts.ignoreIfBlocked && $( el ).data( "blockUI.isBlocked" ) )
			return;

		var skipInlineCSS = opts.autoDetectCSS && hasExternalCSS();

		if ( opts.injectCSS )
			injectBaseCSS();

		// When the stylesheet is present it replaces our *default* inline styles,
		// but styles passed to this call still win - explicit beats implicit.
		opts.overlayCSS = skipInlineCSS ?
			$.extend( {}, rawOverlayCSS || {} ) :
			$.extend( {}, $.blockUI.defaults.overlayCSS, rawOverlayCSS || {} );
		css = skipInlineCSS ?
			$.extend( {}, rawCSS || {} ) :
			$.extend( {}, $.blockUI.defaults.css, rawCSS || {} );
		if ( opts.onOverlayClick )
			opts.overlayCSS.cursor = "pointer";

		// The default css centres a page block with a transform. An element block is
		// centred by center() below, which measures offsets - a transform would
		// double-shift it. Likewise cap the width against the element, not the viewport.
		if ( !full && !skipInlineCSS ) {
			if ( !rawCSS || !( "transform" in rawCSS ) )
				css.transform = "none";
			if ( !rawCSS || !( "maxWidth" in rawCSS ) )
				css.maxWidth = "calc(100% - 24px)";
		}

		if ( opts.respectReducedMotion && prefersReducedMotion() ) {
			opts.fadeIn = 0;
			opts.fadeOut = 0;
		}

		themedCSS = $.extend( {}, $.blockUI.defaults.themedCSS, opts.themedCSS || {} );
		msg = msg === undefined ? opts.message : msg;

		// remove the current block (if there is one)
		if ( full && pageBlock )
			remove( window, { fadeOut: 0 } );

		// remember where focus was, so it can be handed back on unblock
		if ( full && opts.restoreFocus )
			lastFocused = document.activeElement;

		// if an existing element is being used as the blocking content then we capture
		// its current place in the DOM (and current display style) so we can restore
		// it when we unblock
		if ( msg && typeof msg != "string" && ( msg.parentNode || msg.jquery ) ) {
			var node = msg.jquery ? msg[ 0 ] : msg;
			var data = {};
			$( el ).data( "blockUI.history", data );
			data.el = node;
			data.parent = node.parentNode;
			data.display = node.style.display;
			data.position = node.style.position;
			if ( data.parent )
				data.parent.removeChild( node );
		}

		$( el ).data( "blockUI.onUnblock", opts.onUnblock );
		var z = opts.baseZ;

		// blockUI uses 3 layers for blocking, for simplicity they are all used on every platform;
		// layer1 is the iframe layer which is used to supress bleed through of underlying content
		// layer2 is the overlay layer which has opacity and a wait cursor (by default)
		// layer3 is the message content that is displayed while blocking
		var lyr1, lyr2, lyr3, s;
		if ( opts.forceIframe )
			lyr1 = $( '<iframe class="blockUI" style="z-index:' + ( z++ ) +
				';display:none;border:none;margin:0;padding:0;position:absolute;width:100%;' +
				'height:100%;top:0;left:0" src="' + opts.iframeSrc +
				'" aria-hidden="true" tabindex="-1"></iframe>' );
		else
			lyr1 = $( '<div class="blockUI" style="display:none"></div>' );

		if ( opts.theme )
			lyr2 = $( '<div class="blockUI blockOverlay ui-widget-overlay" style="z-index:' +
				( z++ ) + ';display:none"></div>' );
		else
			lyr2 = $( '<div class="blockUI blockOverlay" style="z-index:' + ( z++ ) +
				';display:none;border:none;margin:0;padding:0;width:100%;height:100%;' +
				'top:0;left:0"></div>' );

		if ( opts.theme && full ) {
			s = '<div class="blockUI ' + opts.blockMsgClass +
				' blockPage ui-dialog ui-widget ui-corner-all" style="z-index:' + ( z + 10 ) +
				';display:none;position:fixed">';
			if ( opts.title ) {
				s += '<div class="ui-widget-header ui-dialog-titlebar ui-corner-all blockTitle">' +
					( opts.title || "&nbsp;" ) + "</div>";
			}
			s += '<div class="ui-widget-content ui-dialog-content"></div>';
			s += "</div>";
		}
		else if ( opts.theme ) {
			s = '<div class="blockUI ' + opts.blockMsgClass +
				' blockElement ui-dialog ui-widget ui-corner-all" style="z-index:' + ( z + 10 ) +
				';display:none;position:absolute">';
			if ( opts.title ) {
				s += '<div class="ui-widget-header ui-dialog-titlebar ui-corner-all blockTitle">' +
					( opts.title || "&nbsp;" ) + "</div>";
			}
			s += '<div class="ui-widget-content ui-dialog-content"></div>';
			s += "</div>";
		}
		else if ( full ) {
			s = '<div class="blockUI ' + opts.blockMsgClass +
				' blockPage" style="z-index:' + ( z + 10 ) + ';display:none;position:fixed"></div>';
		}
		else {
			s = '<div class="blockUI ' + opts.blockMsgClass +
				' blockElement" style="z-index:' + ( z + 10 ) +
				';display:none;position:absolute"></div>';
		}
		lyr3 = $( s );

		// if we have a message, style it
		if ( msg ) {
			if ( opts.theme ) {
				lyr3.css( themedCSS );
				lyr3.addClass( "ui-widget-content" );
			}
			else
				lyr3.css( css );
		}

		// style the overlay
		if ( !opts.theme )
			lyr2.css( opts.overlayCSS );
		lyr2.css( "position", full ? "fixed" : "absolute" );

		// make iframe layer transparent
		if ( opts.forceIframe )
			lyr1.css( "opacity", 0.0 );

		var layers = [ lyr1, lyr2, lyr3 ], $par = full ? $( "body" ) : $( el );
		$.each( layers, function() {
			this.appendTo( $par );
		} );

		if ( opts.theme && opts.draggable && $.fn.draggable ) {
			lyr3.draggable( {
				handle: ".ui-dialog-titlebar",
				cancel: "li"
			} );
		}

		// show the message
		if ( msg ) {
			if ( opts.theme )
				lyr3.find( ".ui-widget-content" ).append( msg );
			else
				lyr3.append( msg );
			if ( msg.jquery || msg.nodeType )
				$( msg ).show();
		}

		// tell assistive technology what this is, and that the region is busy.
		// A dialog isn't "busy" - it's waiting on the user - so only progress-style
		// blocks get aria-busy.
		var role = msg ? applyAria( lyr3, opts ) : null;
		if ( role !== "dialog" )
			$( full ? document.body : el ).attr( "aria-busy", "true" );

		if ( opts.forceIframe && opts.showOverlay )
			lyr1.show(); // opacity is zero
		if ( opts.fadeIn ) {
			var cb = opts.onBlock ? opts.onBlock : noOp;
			var cb1 = ( opts.showOverlay && !msg ) ? cb : noOp;
			var cb2 = msg ? cb : noOp;
			if ( opts.showOverlay )
				lyr2._fadeIn( opts.fadeIn, cb1 );
			if ( msg )
				lyr3._fadeIn( opts.fadeIn, cb2 );
		}
		else {
			if ( opts.showOverlay )
				lyr2.show();
			if ( msg )
				lyr3.show();
			if ( opts.onBlock )
				opts.onBlock.bind( lyr3 )();
		}

		// bind key and mouse events
		bind( 1, el, opts );

		if ( full ) {
			pageBlock = lyr3[ 0 ];
			pageBlockEls = $( opts.focusableElements, pageBlock );
			if ( opts.focusInput )
				setTimeout( focus, 20 );
		}
		else
			center( lyr3[ 0 ], opts.centerX, opts.centerY );

		if ( opts.timeout ) {

			// auto-unblock
			var to = setTimeout( function() {
				if ( full )
					$.unblockUI( opts );
				else
					$( el ).unblock( opts );
			}, opts.timeout );
			$( el ).data( "blockUI.timeout", to );
		}
	}

	// remove the block
	function remove( el, opts ) {
		var count;
		var full = ( el == window );
		var $el = $( el );
		var data = $el.data( "blockUI.history" );
		var to = $el.data( "blockUI.timeout" );
		if ( to ) {
			clearTimeout( to );
			$el.removeData( "blockUI.timeout" );
		}
		opts = $.extend( {}, $.blockUI.defaults, opts || {} );

		if ( opts.respectReducedMotion && prefersReducedMotion() )
			opts.fadeOut = 0;

		bind( 0, el, opts ); // unbind events

		if ( opts.onUnblock === null ) {
			opts.onUnblock = $el.data( "blockUI.onUnblock" );
			$el.removeData( "blockUI.onUnblock" );
		}

		var els;
		if ( full )
			els = $( "body" ).children().filter( ".blockUI" ).add( "body > .blockUI" );
		else
			els = $el.find( ">.blockUI" );

		// fix cursor issue
		if ( opts.cursorReset ) {
			if ( els.length > 1 )
				els[ 1 ].style.cursor = opts.cursorReset;
			if ( els.length > 2 )
				els[ 2 ].style.cursor = opts.cursorReset;
		}

		if ( full )
			pageBlock = pageBlockEls = null;

		$( full ? document.body : el ).removeAttr( "aria-busy" );

		if ( opts.fadeOut ) {
			count = els.length;
			els.stop().fadeOut( opts.fadeOut, function() {
				if ( --count === 0 )
					reset( els, data, opts, el );
			} );
		}
		else
			reset( els, data, opts, el );
	}

	// move blocking element back into the DOM where it started
	function reset( els, data, opts, el ) {
		var $el = $( el );
		if ( $el.data( "blockUI.isBlocked" ) )
			return;

		els.each( function() {

			// remove via DOM calls so we don't lose event handlers
			if ( this.parentNode )
				this.parentNode.removeChild( this );
		} );

		if ( data && data.el ) {
			data.el.style.display = data.display;
			data.el.style.position = data.position;
			data.el.style.cursor = "default"; // #59
			if ( data.parent )
				data.parent.appendChild( data.el );
			$el.removeData( "blockUI.history" );
		}

		if ( $el.data( "blockUI.static" ) ) {
			$el.css( "position", "static" ); // #22
		}

		// hand focus back to whatever had it before the page was blocked
		if ( el == window && opts.restoreFocus && lastFocused ) {
			try {
				if ( lastFocused.isConnected !== false && lastFocused.focus )
					lastFocused.focus();
			} catch ( e ) {}
			lastFocused = null;
		}

		if ( typeof opts.onUnblock == "function" )
			opts.onUnblock( el, opts );
	}

	// bind/unbind the handler
	function bind( b, el, opts ) {
		var full = el == window, $el = $( el );

		// don't bother unbinding if there is nothing to unbind
		if ( !b && ( full && !pageBlock || !full && !$el.data( "blockUI.isBlocked" ) ) )
			return;

		$el.data( "blockUI.isBlocked", b );

		// don't bind events when overlay is not in use or if bindEvents is false
		if ( !full || !opts.bindEvents || ( b && !opts.showOverlay ) )
			return;

		// bind anchors and inputs for mouse and key events
		var events = "mousedown mouseup keydown keypress keyup touchstart touchend touchmove";
		if ( b )
			$( document ).on( events, opts, handler );
		else
			$( document ).off( events, handler );
	}

	// event handler to suppress keyboard/mouse events when blocking
	function handler( e ) {
		var opts = e.data;

		// allow tab navigation (conditionally)
		if ( e.type === "keydown" && ( e.key === "Tab" || e.keyCode == 9 ) ) {
			if ( pageBlock && opts.constrainTabKey ) {
				var els = pageBlockEls;
				var fwd = !e.shiftKey && e.target === els[ els.length - 1 ];
				var back = e.shiftKey && e.target === els[ 0 ];
				if ( fwd || back ) {
					setTimeout( function() { focus( back ); }, 10 );
					return false;
				}
			}
		}

		// Escape closes the block when the caller opted in
		if ( e.type === "keydown" && opts.escapeToUnblock &&
				( e.key === "Escape" || e.keyCode == 27 ) ) {
			$.unblockUI( opts );
			return false;
		}

		var target = $( e.target );
		if ( target.hasClass( "blockOverlay" ) && opts.onOverlayClick )
			opts.onOverlayClick( e );

		// allow events within the message content (closest, so the message
		// container itself counts too, not just its descendants)
		if ( target.closest( "div." + opts.blockMsgClass ).length > 0 )
			return true;

		// allow events for content that is not being blocked
		return target.parents().children().filter( "div.blockUI" ).length === 0;
	}

	function focus( back ) {
		if ( !pageBlockEls )
			return;
		var e = pageBlockEls[ back === true ? pageBlockEls.length - 1 : 0 ];
		if ( e )
			e.focus();
	}

	// Centre an element block's message inside its parent.
	//
	// This used to measure offsetWidth and write a pixel offset, but an absolutely
	// positioned box is shrink-to-fit: setting `left` changes the space available
	// to it, which changes its width, which invalidates the measurement that
	// produced the offset. Percentage positioning plus a translate needs no
	// measurement and stays correct when the content reflows.
	function center( el, x, y ) {
		var s = el.style;
		if ( !x && !y )
			return;
		if ( x )
			s.left = "50%";
		if ( y )
			s.top = "50%";
		s.transform = "translate(" + ( x ? "-50%" : "0" ) + ", " +
			( y ? "-50%" : "0" ) + ")";
	}

	return $;
} );
