// Settings shared by index.html and plans.html
window.LOGCFT = {
  // Your Cloudflare Worker address, e.g. https://logcft-api.yourname.workers.dev  (no slash at the end)
  workerUrl: 'https://logcft-api.greencheckinc.workers.dev',
  // Premium = subscription id (Play Console > Monetize > Subscriptions). AI packs = ONE-TIME product ids (Monetize > One-time products). Must be the same in Play Console and in the Worker.
  products: { prem: 'premium_monthly', aiBasic: 'ai_basic_pack', aiStandard: 'ai_standard_pack', aiPremium: 'ai_premium_pack' },
  // AdMob. While testing keep testing:true and the Google test banner id.
  // For release: testing:false and your own banner Ad unit id (ca-app-pub-XXXX/YYYY)
  admob: { testing: true, bannerId: 'ca-app-pub-5053565897318981/3486515443', interstitialId: 'ca-app-pub-5053565897318981/2461208384' },
  // Firebase Web API key (Project settings > General > Web API key). Used for email + password login.
  firebaseApiKey: 'AIzaSyC_6GxQsqvOv4KhUx8rD3Ept7zvSKzv9oA',
  // Optional "Continue with Google" button. Firebase > Authentication > Sign-in method > Google > Web SDK configuration > Web client ID.
  // Leave as is to hide the Google button.
  googleWebClientId: '879555635458-somhlskr2428iunm6avtcfpds1s4p2pf.apps.googleusercontent.com'
};
