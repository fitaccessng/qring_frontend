# iOS Signing And Archive

Current project signing defaults:

- Team ID: `G4V5Y6229L`
- Bundle ID: `com.kelvin.qringapp`
- Signing style: Automatic
- Xcode project: `ios/App/App.xcodeproj`
- Scheme: `App`

## Before archive

Make sure this Mac has:

- a valid Apple Developer login in Xcode
- an Apple Distribution certificate for team `G4V5Y6229L`
- a matching distribution provisioning profile for `com.kelvin.qringapp`

You can verify identities with:

```bash
security find-identity -v -p codesigning
```

## 1. Build the latest web bundle

```bash
cd /Users/macbookpro/Documents/qring.io/qring_frontend
npm run build
npx cap sync ios
```

## 2. Archive for a real iPhone

```bash
xcodebuild \
  -project /Users/macbookpro/Documents/qring.io/qring_frontend/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath /Users/macbookpro/Documents/qring.io/qring_frontend/ios/build/App.xcarchive \
  DEVELOPMENT_TEAM=G4V5Y6229L \
  PRODUCT_BUNDLE_IDENTIFIER=com.kelvin.qringapp \
  CODE_SIGN_STYLE=Automatic \
  archive
```

## 3. Export IPA

TestFlight / App Store Connect:

```bash
xcodebuild \
  -exportArchive \
  -archivePath /Users/macbookpro/Documents/qring.io/qring_frontend/ios/build/App.xcarchive \
  -exportOptionsPlist /Users/macbookpro/Documents/qring.io/qring_frontend/ios/exportOptions.plist.template \
  -exportPath /Users/macbookpro/Documents/qring.io/qring_frontend/ios/build/export
```

The resulting IPA should be at:

```bash
/Users/macbookpro/Documents/qring.io/qring_frontend/ios/build/export/App.ipa
```

## 4. For TestFlight / App Store

Edit [exportOptions.plist.template](/Users/macbookpro/Documents/qring.io/qring_frontend/ios/exportOptions.plist.template) and change:

```xml
<key>method</key>
<string>app-store</string>
```

Then export again with the same `xcodebuild -exportArchive` command.

## 5. Common fixes

- If archive fails on signing:
  - open Xcode
  - open `ios/App/App.xcodeproj`
  - select target `App`
  - confirm team `G4V5Y6229L`
  - confirm bundle id `com.kelvin.qringapp`
  - enable `Automatically manage signing`
  - confirm the `Release` signing certificate resolves to `Apple Distribution`
- If export fails:
  - confirm the archive was built with the same team and bundle id
  - confirm the selected export method matches the installed provisioning profile
