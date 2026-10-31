// Google Play subscriptions in the Android app (cordova-plugin-purchase).
// Used by plans.html (buy / restore) and ads.js (quiet re-check of renewals).
(function () {
  var C = window.LOGCFT || {}, P = C.products || { prem: 'premium_monthly', ai: 'ai_yearly' };
  var W = (C.workerUrl || '').replace(/\/+$/, '');
  var S = { ready: false, store: null, plat: null, price: {}, err: '', onChange: null };

  function dev() { try { return localStorage.getItem('logcft_dev_v1') || ''; } catch (e) { return ''; } }
  async function api(path, body) {
    var r = await fetch(W + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || ('Server said ' + r.status));
    return j;
  }
  function tokenOf(t) { try { return (t.nativePurchase && t.nativePurchase.purchaseToken) || ''; } catch (e) { return ''; } }
  function whenReady() {
    return new Promise(function (res) {
      if (window.CdvPurchase) return res();
      var done = false, f = function () { if (!done) { done = true; res(); } };
      document.addEventListener('deviceready', f, { once: true });
      var n = 0, iv = setInterval(function () { if (window.CdvPurchase || ++n > 40) { clearInterval(iv); f(); } }, 250);
    });
  }
  async function verifyTx(t) {
    var tok = tokenOf(t); if (!tok || !W || !dev()) return false;
    await api('/verify', { deviceId: dev(), purchaseToken: tok });
    try { if (t.finish) await t.finish(); } catch (e) {}
    return true;
  }
  var initP = null;
  function init() {
    if (initP) return initP;
    initP = (async function () {
      if (!window.NATIVE) { S.err = 'Purchases work only in the Android app from Google Play.'; return S; }
      await whenReady();
      if (!window.CdvPurchase) { S.err = 'Google Play billing is not available in this build.'; return S; }
      var cp = CdvPurchase, store = cp.store; S.store = store; S.plat = cp.Platform.GOOGLE_PLAY;
      try {
        store.register([
          { id: P.prem, type: cp.ProductType.PAID_SUBSCRIPTION, platform: S.plat },
          { id: P.ai, type: cp.ProductType.PAID_SUBSCRIPTION, platform: S.plat }
        ]);
        store.when().approved(function (t) {
          verifyTx(t).then(function () { if (S.onChange) S.onChange('Done. Your plan is active.'); })
            .catch(function (e) { if (S.onChange) S.onChange('Purchase not completed: ' + (e.message || e)); });
        });
        await store.initialize([S.plat]);
        [P.prem, P.ai].forEach(function (id) {
          try {
            var p = store.get(id, S.plat), o = p && p.offers && p.offers[0];
            var ph = o && o.pricingPhases && o.pricingPhases[o.pricingPhases.length - 1];
            if (ph && ph.price) S.price[id] = ph.price;
          } catch (e) {}
        });
        S.ready = true;
      } catch (e) { S.err = 'Billing setup failed: ' + (e && e.message || e); }
      return S;
    })();
    return initP;
  }
  async function buy(id) {
    await init(); if (!S.ready) throw new Error(S.err || 'Billing not ready');
    var p = S.store.get(id, S.plat); if (!p) throw new Error('Product ' + id + ' not found in Google Play');
    var offer = p.getOffer ? p.getOffer() : (p.offers && p.offers[0]);
    if (!offer) throw new Error('No offer for ' + id);
    var err = await S.store.order(offer);
    if (err && err.code) {
      if (err.code === cp().ErrorCode.PAYMENT_CANCELLED) { var c = new Error('Purchase cancelled.'); c.cancelled = true; throw c; }
      throw new Error(err.message || ('Purchase failed (' + err.code + ')'));
    }
  }
  function cp() { return window.CdvPurchase; }
  // verify everything the Google account already owns (restore / renewals)
  async function syncOwned() {
    await init(); if (!S.ready) return 0;
    var n = 0, list = [];
    try { list = S.store.localTransactions || []; } catch (e) {}
    if (!list.length) { try { await S.store.restorePurchases(); list = S.store.localTransactions || []; } catch (e) {} }
    for (var i = 0; i < list.length; i++) { try { if (await verifyTx(list[i])) n++; } catch (e) {} }
    return n;
  }
  window.LogBilling = { init: init, buy: buy, syncOwned: syncOwned, state: S, products: P };
})();
