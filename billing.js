// Google Play purchases in the Android app (cordova-plugin-purchase): Premium = subscription, AI packs = one-time products that can be bought again.
// Used by plans.html (buy / restore) and ads.js (quiet re-check of renewals).
(function () {
  var C = window.LOGCFT || {}, P = C.products || {};
  P.prem = P.prem || 'premium_monthly'; P.aiBasic = P.aiBasic || 'ai_basic_pack'; P.aiStandard = P.aiStandard || 'ai_standard_pack'; P.aiPremium = P.aiPremium || 'ai_premium_pack';
  var AI_IDS = [P.aiBasic, P.aiStandard, P.aiPremium];
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
    var em = ''; try { em = localStorage.getItem('logcft_email_v1') || ''; } catch (e) {}
    var pid = ''; try { pid = (t.products && t.products[0] && t.products[0].id) || (t.nativePurchase && (t.nativePurchase.productId || (t.nativePurchase.productIds || [])[0])) || ''; } catch (e) {}
    await api('/verify', { deviceId: dev(), purchaseToken: tok, productId: pid, email: em });
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
      var cp = window.CdvPurchase || {}, store = cp.store;
      var PL = cp.Platform || {}, PT = cp.ProductType || {};
      if (!store) { S.err = 'Billing plugin loaded but store missing (' + Object.keys(cp).join(',') + ')'; initP = null; return S; }
      S.store = store; S.plat = PL.GOOGLE_PLAY || 'android-playstore';
      PT = { PAID_SUBSCRIPTION: PT.PAID_SUBSCRIPTION || 'paid subscription', CONSUMABLE: PT.CONSUMABLE || 'consumable' };
      cp = { ProductType: PT, store: store };
      try {
        store.register([
          { id: P.prem, type: cp.ProductType.PAID_SUBSCRIPTION, platform: S.plat },
          { id: P.aiBasic, type: cp.ProductType.CONSUMABLE, platform: S.plat },
          { id: P.aiStandard, type: cp.ProductType.CONSUMABLE, platform: S.plat },
          { id: P.aiPremium, type: cp.ProductType.CONSUMABLE, platform: S.plat }
        ]);
        store.when().approved(function (t) {
          verifyTx(t).then(function () { if (S.onChange) S.onChange('Done. Your purchase is added.'); })
            .catch(function (e) { if (S.onChange) S.onChange('Purchase not completed: ' + (e.message || e)); });
        });
        await store.initialize([S.plat]);
        [P.prem].concat(AI_IDS).forEach(function (id) {
          try {
            var p = store.get(id, S.plat), o = p && p.offers && p.offers[0];
            var ph = o && o.pricingPhases && o.pricingPhases[o.pricingPhases.length - 1];
            if (ph && ph.price) S.price[id] = ph.price;
          } catch (e) {}
        });
        S.ready = true;
      } catch (e) { S.err = 'Billing setup failed: ' + (e && e.message || e); initP = null; }
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
      if ((err.code === ((cp().ErrorCode || {}).PAYMENT_CANCELLED || 6777003))) { var c = new Error('Purchase cancelled.'); c.cancelled = true; throw c; }
      throw new Error(err.message || ('Purchase failed (' + err.code + ')'));
    }
  }
  function cp() { return window.CdvPurchase || {}; }
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
