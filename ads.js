// AdMob banner for the Free plan (Android app only). Premium users see no ads.
(function () {
  if (!window.NATIVE) return;
  var C = window.LOGCFT || {}, A = C.admob || {}, PREMKEY = 'logcft_prem_until';
  var plug = function () { return window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob; };
  var inited = false, visible = false, busy = false, hid = false;

  function premiumNow() { try { return (+localStorage.getItem(PREMKEY) || 0) > Date.now(); } catch (e) { return false; } }
  function overlayOpen() {
    var kp = document.getElementById('kp');
    return !!document.querySelector('dialog[open]') || !!(kp && !kp.hidden);
  }
  function pad(on) { try { document.body.style.paddingBottom = on ? '64px' : ''; } catch (e) {} }

  async function init() {
    var p = plug(); if (!p) return false; if (inited) return true;
    try { await p.initialize({ initializeForTesting: !!A.testing }); inited = true; } catch (e) { return false; }
    return true;
  }
  async function show() {
    var p = plug(); if (!p || busy) return; busy = true;
    try {
      if (!(await init())) return;
      if (!visible) {
        await p.showBanner({ adId: A.bannerId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: !!A.testing });
        visible = true; hid = false; pad(true);
      } else if (hid) { await p.resumeBanner(); hid = false; pad(true); }
    } catch (e) {} finally { busy = false; }
  }
  async function hide(remove) {
    var p = plug(); if (!p || !visible || busy) return; busy = true;
    try {
      if (remove) { await p.removeBanner(); visible = false; } else { await p.hideBanner(); }
      hid = true; pad(false);
    } catch (e) {} finally { busy = false; }
  }
  // decide what to do now
  function update() {
    try { var b = document.getElementById('daysbadge'); if (b && window.updateDaysBadge) updateDaysBadge(); } catch (e) {}
    if (window.NOADS || premiumNow()) { hide(true); return; }
    if (overlayOpen()) { hide(false); return; }
    show();
  }
  async function refreshStatus() {
    var w = (C.workerUrl || '').replace(/\/+$/, ''), id = '';
    try { id = localStorage.getItem('logcft_dev_v1') || ''; } catch (e) {}
    if (w && id) {
      try {
        var r = await fetch(w + '/status?deviceId=' + encodeURIComponent(id));
        if (r.ok) { var j = await r.json(); localStorage.setItem(PREMKEY, String(j.premiumUntil || 0)); }
      } catch (e) {}
    }
    update();
  }
  window.LogAds = {
    isPremium: premiumNow,
    planText: function () { return premiumNow() ? '✓ Premium' : 'Free (ads)'; },
    refresh: refreshStatus, update: update
  };
  // react to dialogs and keypad opening / closing
  try {
    new MutationObserver(function () { update(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
  } catch (e) {}
  window.addEventListener('pagehide', function () { var p = plug(); if (p && visible) { try { p.removeBanner(); } catch (e) {} } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshStatus(); });
  // sync purchases from Google Play quietly (renewals), then update ads
  function start() {
    update();
    if (window.LogBilling) { LogBilling.syncOwned().then(refreshStatus, refreshStatus); } else { refreshStatus(); }
  }
  if (document.readyState === 'complete') setTimeout(start, 500); else window.addEventListener('load', function () { setTimeout(start, 500); });
})();
