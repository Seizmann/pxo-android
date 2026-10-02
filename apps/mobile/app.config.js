// app.config.js — dynamic config that reads CI env vars at build time.
// The static app.json is the fallback for Expo Go development.

/** @type {import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // In CI: RECOVERY_PIN_HASH is injected from the GitHub secret before expo prebuild.
    // In Expo Go dev: set this in .env.local (git-ignored).
    recoveryPinHash: process.env.RECOVERY_PIN_HASH ?? config.extra?.recoveryPinHash ?? '',
    router: { origin: false },
    eas: { projectId: '' },
  },
});
