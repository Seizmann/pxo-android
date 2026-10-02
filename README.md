# PXO

Fully offline Android app (Expo, React Native, TypeScript) for managing the PTA card
trading business. Tracks stock, seller dispatches, payments, discounts, bonuses,
wallet balances, and expenses — all stored locally in SQLite. No server, no login,
no network required.

- **Android package:** `pta.pxo.fp`
- **GitHub repo:** <https://github.com/Seizmann/pxo-android.git>
- **Full requirements:** [`REQUIREMENT.md`](REQUIREMENT.md)
- **Data model:** [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)
- **Screens:** [`docs/SCREENS.md`](docs/SCREENS.md)
- **Release pipeline:** [`docs/RELEASE.md`](docs/RELEASE.md)

## Development

```sh
# 1. Install all workspace packages (pnpm workspace)
pnpm install

# 2. Start the Expo dev server and open on your phone with Expo Go
pnpm --filter mobile start

# 3. Run core logic tests
pnpm --filter core test
```

> **No local APK builds.** All release APKs are produced by GitHub Actions; download
> the APK from the workflow run's artifacts.

## Workspace layout

```
pxo-android/
├─ apps/mobile/        Expo React Native app (UI, SQLite, expo-router)
├─ packages/core/      Pure TypeScript — allocation, discount, stock, backup logic
└─ docs/               Data model, screens, release notes
```

## Build phases

| Phase | Description |
|-------|-------------|
| 0 | Docs and folder structure (done) |
| 1 | Figma UI/UX design via Figma MCP |
| 2 | pnpm workspace setup, core package, mobile app |
| 3 | GitHub Actions release pipeline |
| 4 | Testing on device (Expo Go) and release APK verification |
