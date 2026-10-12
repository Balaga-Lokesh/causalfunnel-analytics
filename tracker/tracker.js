/**
 * CausalFunnel-style analytics tracker.
 *
 * Usage:
 *   <script src="https://<api-host>/tracker.js" defer></script>
 *
 * Optional attributes on the <script> tag:
 *   data-endpoint="https://<api-host>/api/events"  where to send events
 *                                                 (default: /api/events on the host serving this script)
 *   data-debug                                    log every event to the console
 *
 * Tracks `page_view` and `click` events and sends them to the backend.
 * No dependencies, no build step, no cookies.
 */
(function () {
  'use strict';

  if (window.__cfTrackerLoaded) return; // guard against double inclusion
  window.__cfTrackerLoaded = true;

  var script = document.currentScript;
  var ENDPOINT = resolveEndpoint();
  var DEBUG = !!(script && script.hasAttribute('data-debug'));

  var SESSION_KEY = 'cf_session_id';
  var LAST_ACTIVITY_KEY = 'cf_last_activity';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // new session after 30 min of inactivity

  // Used when localStorage is unavailable (privacy mode, blocked storage).
  var memorySessionId = null;
  var lastTrackedPage = null;

  function resolveEndpoint() {
    try {
      var attr = script && script.getAttribute('data-endpoint');
      if (attr) return new URL(attr, location.href).href;
      if (script && script.src) return new URL('/api/events', script.src).href;
    } catch (e) {
      /* fall through */
    }
    return '/api/events';
  }

  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Fallback for non-secure contexts (crypto.randomUUID requires HTTPS or localhost).
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Returns the current session id, creating or rotating it as needed. */
  function getSessionId() {
    var now = Date.now();
    var id = storageGet(SESSION_KEY) || memorySessionId;
    var lastActivity = Number(storageGet(LAST_ACTIVITY_KEY)) || 0;

    if (!id || (lastActivity && now - lastActivity > SESSION_TIMEOUT_MS)) {
      id = uuid();
    }

    memorySessionId = id;
    storageSet(SESSION_KEY, id);
    storageSet(LAST_ACTIVITY_KEY, String(now));
    return id;
  }

  // ---------------------------------------------------------------------------
  // Event building
  // ---------------------------------------------------------------------------

  function positiveInt(n) {
    n = Math.round(n);
    return n > 0 ? n : undefined;
  }

  function documentSize() {
    var doc = document.documentElement;
    var body = document.body || doc;
    return {
      width: Math.max(doc.scrollWidth, body.scrollWidth, doc.clientWidth),
      height: Math.max(doc.scrollHeight, body.scrollHeight, doc.clientHeight),
    };
  }

  /** Fields every event carries. */
  function baseEvent(type) {
    var size = documentSize();
    return {
      session_id: getSessionId(),
      event_type: type,
      page_url: location.href,
      timestamp: new Date().toISOString(),
      viewport_width: positiveInt(window.innerWidth),
      viewport_height: positiveInt(window.innerHeight),
      page_width: positiveInt(size.width),
      page_height: positiveInt(size.height),
    };
  }

  /** Short description of the clicked element, e.g. `button.btn "Add to cart"`. */
  function describeTarget(el) {
    if (!el || el.nodeType !== 1) return undefined;
    var interactive = el.closest ? el.closest('a, button, [role="button"], input, select, textarea, label') : null;
    el = interactive || el;

    var desc = el.tagName.toLowerCase();
    if (el.id) desc += '#' + el.id;
    if (typeof el.className === 'string' && el.className.trim()) {
      desc += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    }
    // Only label buttons/links: never read values typed into form fields.
    if (/^(a|button|label)$/.test(el.tagName.toLowerCase()) || el.getAttribute('role') === 'button') {
      var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) desc += ' "' + text.slice(0, 40) + (text.length > 40 ? '…' : '') + '"';
    }
    return desc.slice(0, 200);
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------

  /**
   * Sends one event. sendBeacon survives page unloads (e.g. clicking a link),
   * and posting as text/plain keeps it a "simple" CORS request with no preflight.
   */
  function send(event) {
    var body = JSON.stringify(event);
    if (DEBUG) console.log('[cf-tracker]', event.event_type, event);

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
    } catch (e) {
      /* fall back to fetch */
    }

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (e) {
      /* analytics must never break the host page */
    }
  }

  // ---------------------------------------------------------------------------
  // Trackers
  // ---------------------------------------------------------------------------

  function trackPageView() {
    var page = location.pathname + location.search;
    if (page === lastTrackedPage) return; // ignore replaceState/hash changes on the same page
    lastTrackedPage = page;

    var event = baseEvent('page_view');
    if (document.referrer) event.referrer = document.referrer;
    send(event);
  }

  function trackClick(e) {
    var x = e.pageX;
    var y = e.pageY;

    // Keyboard-activated clicks (Enter/Space) report 0,0; use the element's center instead.
    if (e.detail === 0 && e.target && e.target.getBoundingClientRect) {
      var rect = e.target.getBoundingClientRect();
      x = rect.left + rect.width / 2 + window.scrollX;
      y = rect.top + rect.height / 2 + window.scrollY;
    }

    var event = baseEvent('click');
    event.x = Math.max(0, Math.round(x));
    event.y = Math.max(0, Math.round(y));
    event.target = describeTarget(e.target);
    send(event);
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------

  // Capture phase so clicks are seen even if page code calls stopPropagation().
  document.addEventListener('click', trackClick, true);

  // Single-page apps: count client-side navigations as page views.
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      trackPageView();
      return result;
    };
  });
  window.addEventListener('popstate', trackPageView);

  // Restored from the back/forward cache: the script doesn't re-run, so count it here.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      lastTrackedPage = null;
      trackPageView();
    }
  });

  trackPageView();

  // Small debugging handle, e.g. CFTracker.sessionId() in the console.
  window.CFTracker = {
    endpoint: ENDPOINT,
    sessionId: getSessionId,
  };
})();
