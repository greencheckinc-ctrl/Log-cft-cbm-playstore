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
  // Interstitial: shown once when the person taps Print, then the preview opens (Free plan only, at most once a minute)
  var intReady = false, intLoading = false, lastInt = 0, INT_GAP = 60000;
  async function prepInt() {
    var p = plug(); if (!p || !A.interstitialId || intReady || intLoading || window.NOADS || premiumNow()) return;
    intLoading = true;
    try {
      if (!(await init())) return;
      await p.prepareInterstitial({ adId: A.interstitialId, isTesting: !!A.testing });
      intReady = true;
    } catch (e) {} finally { intLoading = false; }
  }
  function showInterstitial() {
    return new Promise(function (resolve) {
      var p = plug();
      if (!p || window.NOADS || premiumNow() || !intReady || Date.now() - lastInt < INT_GAP) { prepInt(); return resolve(false); }
      var done = false, hs = [], timer = null;
      function fin(ok) {
        if (done) return; done = true; clearTimeout(timer);
        hs.forEach(function (h) { try { h.remove(); } catch (e) {} });
        intReady = false; if (ok) lastInt = Date.now();
        setTimeout(prepInt, 800); resolve(ok);
      }
      ['interstitialAdDismissed', 'interstitialAdFailedToShow'].forEach(function (ev, i) {
        try { Promise.resolve(p.addListener(ev, function () { fin(i === 0); })).then(function (h) { hs.push(h); }); } catch (e) {}
      });
      timer = setTimeout(function () { fin(false); }, 30000);
      Promise.resolve(p.showInterstitial()).catch(function () { fin(false); });
    });
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
    update(); prepInt();
  }
  window.LogAds = {
    isPremium: premiumNow,
    planText: function () { return premiumNow() ? '✓ Premium' : 'Free (ads)'; },
    refresh: refreshStatus, update: update, interstitial: showInterstitial
  };
  // react to dialogs and keypad opening / closing
  try {
    new MutationObserver(function () { update(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
  } catch (e) {}
  window.addEventListener('pagehide', function () { var p = plug(); if (p && visible) { try { p.removeBanner(); } catch (e) {} } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshStatus(); });
  // sync purchases from Google Play quietly (renewals), then update ads
  function start() {
    update(); prepInt();
    if (window.LogBilling) { LogBilling.syncOwned().then(refreshStatus, refreshStatus); } else { refreshStatus(); }
  }
  if (document.readyState === 'complete') setTimeout(start, 500); else window.addEventListener('load', function () { setTimeout(start, 500); });
})();
