# Mobile release setup

This project is configured for:

- iOS bundle ID: `com.kelvin.qringapp`
- Android application ID: `com.kelvin.qringapp`
- iOS Release signing: automatic signing with `Apple Distribution`
- Android release signing: local `android/keystore.properties`

## iOS: TestFlight / App Store archive

Prerequisites:

- Apple Developer account with access to team `G4V5Y6229L`
- An App Store Connect app created for `com.kelvin.qringapp`
- A distribution certificate and matching App Store provisioning profile available in Xcode

Steps:

1. Build the web app:
   `npm run build`
2. Sync Capacitor assets into native projects:
   `npx cap sync ios`
3. Open the iOS project:
   `npx cap open ios`
4. In Xcode, select the `App` target and confirm:
   - Bundle Identifier is `com.kelvin.qringapp`
   - Team is `G4V5Y6229L`
   - Signing for `Release` is `Automatically manage signing`
   - Signing certificate for `Release` resolves to `Apple Distribution`
5. Select `Any iOS Device (arm64)` or a generic iPhone device.
6. Use `Product` -> `Archive`.
7. When Organizer opens, choose `Distribute App`.
8. Choose `App Store Connect` -> `Upload`.
9. Complete the upload and finish processing in App Store Connect.
10. In App Store Connect, add the build to TestFlight or your App Store release.

## Android: signed APK / AAB for Play Store

Google Play requires an Android App Bundle (`.aab`) for new app uploads. A signed APK is still useful for device testing.

### 1. Create a keystore

From `qring_frontend/android`:

```bash
keytool -genkeypair -v \
  -keystore ../signing/qringapp-release.jks \
  -alias qringapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 2. Add signing properties

Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in the real values:

```properties
storeFile=../signing/qringapp-release.jks
storePassword=your-store-password
keyAlias=qringapp
keyPassword=your-key-password
```

Do not commit the real `keystore.properties` or the keystore file.

### 3. Build the web app and sync Capacitor

From `qring_frontend`:

```bash
npm run build
npx cap sync android
```

### 4. Build signed release artifacts

From `qring_frontend/android`:

Signed APK:

```bash
./gradlew assembleRelease
```

Output:
`app/build/outputs/apk/release/app-release.apk`

Signed App Bundle for Play Store:

```bash
./gradlew bundleRelease
```

Output:
`app/build/outputs/bundle/release/app-release.aab`

### 5. Upload to Play Console

1. Create the app in Google Play Console with package name `com.kelvin.qringapp`.
2. Go to `Release` -> `Production` or `Testing`.
3. Create a new release.
4. Upload `app-release.aab`.
5. Fill in release notes, complete required store listing/content rating/data safety items, and roll out the release.

## Notes

- Keep `versionCode` increasing on every Play Store upload.
- Keep `versionName`, `MARKETING_VERSION`, and `CURRENT_PROJECT_VERSION` aligned with each public release.
- If signing fails on Android, verify the `storeFile` path in `android/keystore.properties` is correct relative to `qring_frontend/android`.
