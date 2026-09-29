# Release — PXO

All release APKs are built exclusively by **GitHub Actions**. No local APK builds.

---

## Keystore

- File: `pxo-release.jks` (never committed to the repository)
- Alias: `pxo`
- Algorithm: RSA 2048, validity 30 years
- Distinguished name: `CN=Mohammad Sijan, O=SpritexAI, L=Faridpur, ST=Dhaka, C=BD`

Generate once with:

```sh
keytool -genkeypair -v \
  -keystore pxo-release.jks \
  -alias pxo \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -dname "CN=Mohammad Sijan, O=SpritexAI, L=Faridpur, ST=Dhaka, C=BD"
```

> If no local JDK is available, generate the keystore with a one-off
> `workflow_dispatch` workflow instead (no OU field needed).

**Keep the keystore file and both passwords backed up in a safe private location.**
If the keystore or passwords are lost, it is impossible to publish updates to devices
that already have the APK installed.

---

## GitHub Secrets

Set these in the repository → Settings → Secrets → Actions. **Never hard-code or log them.**

| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | `base64 pxo-release.jks` output |
| `KEYSTORE_PASSWORD` | store password chosen at keytool time |
| `KEY_ALIAS` | `pxo` |
| `KEY_PASSWORD` | key password chosen at keytool time |
| `TELEGRAM_BOT_TOKEN` | bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | chat/channel ID to receive the APK |

Ask the owner for all values. Never guess or generate them.

---

## Workflow: `.github/workflows/release.yml`

Trigger: push of a version tag (`v*`) or manual `workflow_dispatch`.

Steps:
1. Check out the repository.
2. Set up Node.js and pnpm with caching.
3. `pnpm install --frozen-lockfile`
4. `pnpm --filter core test` — must pass before building.
5. Decode `KEYSTORE_BASE64` → `pxo-release.jks` in the runner.
6. `expo prebuild --platform android` in `apps/mobile`.
7. `./gradlew assembleRelease` with signing config injected via environment variables.
8. Upload the APK as a GitHub Actions artifact.
9. Send the APK to Telegram via `sendDocument` (multipart POST to the Bot API).
10. Remove the keystore file from the runner.

---

## App identity

- **Package name:** `pta.pxo.fp`  (set in `app.json` → `android.package`)
- **App name:** `PXO`
- **Version code:** auto-incremented from the git tag (e.g. `v1.0.0` → `10000`)
- **Min SDK:** 24 (Android 7.0), **Target SDK:** latest stable

---

## Recovery PIN hash

The recovery PIN must **not** be hard-coded in plain form. Agreed approach:

1. The owner provides the raw PIN as the GitHub secret `RECOVERY_PIN_HASH` (pre-hashed
   with a salt before storing, or the agent derives and stores the hash at build time).
2. The hash is baked into the app bundle at build time (e.g. embedded as a build
   config constant by the Gradle build or via `expo-constants`).
3. The raw PIN value is never written to source, logs, or the backup JSON.
4. **Security note (communicated to owner):** a hashed 4-digit PIN can be brute-forced
   offline by anyone with the APK. This provides convenience-grade, not bank-grade,
   security. The owner accepts this trade-off.

---

## Testing

- **Dev:** Expo Go on the owner's Android phone, dev server on local PC.
- **Release verification:** animated splash and launcher icon only render correctly in the
  signed release APK (not in Expo Go). Verify these after each first release on a new
  device.
