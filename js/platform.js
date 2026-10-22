// Everything that talks to the site hosting the game lives here. On CrazyGames
// it uses their SDK (cloud saves, video ads, gameplay events). Anywhere else,
// or if the SDK can't load, it falls back to localStorage and has no ads, and
// the game plays exactly the same.

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const TIMEOUT_MS = 5000;

let sdk = null;
let playing = false;
const settingsListeners = new Set();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.append(script);
  });
}

function timeout(promise) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS))]);
}

// SDK event calls are fire-and-forget: a platform hiccup must never break play.
function call(fn) {
  try {
    fn()?.catch?.(() => {});
  } catch {
    // ignore
  }
}

export const platform = {
  // 'crazygames' on the site, 'local' for the SDK's test mode on localhost, 'web' otherwise.
  name: 'web',

  get ads() {
    return sdk !== null;
  },

  // CrazyGames can mute every game from its own page controls.
  get muted() {
    return Boolean(sdk?.game?.settings?.muteAudio);
  },

  async init() {
    try {
      await timeout(loadScript(SDK_URL));
      const candidate = window.CrazyGames?.SDK;
      if (!candidate) throw new Error('SDK missing after load');
      await timeout(candidate.init());
      // Off CrazyGames (e.g. GitHub Pages) the SDK reports itself disabled.
      if (candidate.environment === 'disabled') return;
      sdk = candidate;
      this.name = candidate.environment ?? 'crazygames';
      sdk.game.addSettingsChangeListener(() => settingsListeners.forEach((fn) => fn()));
    } catch (err) {
      sdk = null;
      console.info(`Pawzzle: playing without the CrazyGames SDK (${err.message}).`);
    }
  },

  // Saved progress. CrazyGames' data module syncs it to the player's account.
  getItem(key) {
    try {
      return sdk ? sdk.data.getItem(key) : localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    try {
      if (sdk) sdk.data.setItem(key, value);
      else localStorage.setItem(key, value);
    } catch {
      // Private mode or storage disabled: progress just isn't kept.
    }
  },

  // Tell the platform when the player is actually playing (no menus, no ads).
  setPlaying(on) {
    if (!sdk || on === playing) return;
    playing = on;
    call(() => (on ? sdk.game.gameplayStart() : sdk.game.gameplayStop()));
  },

  loading(on) {
    if (sdk) call(() => (on ? sdk.game.loadingStart() : sdk.game.loadingStop()));
  },

  // A celebration moment, such as finishing a level.
  happytime() {
    if (sdk) call(() => sdk.game.happytime());
  },

  onSettingsChange(fn) {
    settingsListeners.add(fn);
  },

  // Resolves true only when the player watched the video to the end.
  rewardedAd() {
    if (!sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        sdk.ad.requestAd('rewarded', {
          adStarted: () => {}, // the caller mutes for the whole request
          adFinished: () => resolve(true),
          adError: () => resolve(false),
        });
      } catch {
        resolve(false);
      }
    });
  },
};
