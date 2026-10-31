// Settings shared by index.html and plans.html
window.LOGCFT = {
  // Your Cloudflare Worker address, e.g. https://logcft-api.yourname.workers.dev  (no slash at the end)
  workerUrl: 'https://logcft-api.greencheckinc.workers.dev',
  // Subscription IDs: must be the same as in Play Console > Monetize > Subscriptions
  products: { prem: 'premium_monthly', ai: 'ai_yearly' },
  // AdMob. While testing keep testing:true and the Google test banner id.
  // For release: testing:false and your own banner Ad unit id (ca-app-pub-XXXX/YYYY)
  admob: { testing: true, bannerId: 'ca-app-pub-3940256099942544/6300978111' },
  // Firebase Web API key (Project settings > General > Web API key). Used for email + password login.
  firebaseApiKey: 'AIzaSyC_6GxQsqvOv4KhUx8rD3Ept7zvSKzv9oA',
  // Optional "Continue with Google" button. Firebase > Authentication > Sign-in method > Google > Web SDK configuration > Web client ID.
  // Leave as is to hide the Google button.
  googleWebClientId: '847192787553-8v83hpdfumohfbura2knlpva6uq9uvc1.apps.googleusercontent.com'
};
