# Push Notifications Setup Guide

Complete guide for setting up Expo push notifications with Firebase Cloud Messaging (FCM V1) for Android and Apple Push Notification service (APNs) for iOS.

## Overview

Push notifications require connecting different systems per platform:

```
Android: Your Server → Expo Push API → Firebase FCM → Android Device
iOS:     Your Server → Expo Push API → Apple APNs  → iOS Device
```

**Key files by platform:**
| Platform | File | Purpose | Where it goes |
|----------|------|---------|---------------|
| Android | `google-services.json` | Configures app to receive notifications | Project root |
| Android | `*-firebase-adminsdk-*.json` | Allows Expo to send via FCM | Uploaded to EAS |
| iOS | `AuthKey_XXXXXX.p8` | Allows Expo to send via APNs | Uploaded to EAS |

---

## Prerequisites

- Expo project with `expo-notifications` installed
- EAS CLI installed: `npm install -g eas-cli`
- Logged into EAS: `eas login`

**For Android:**
- Firebase project created

**For iOS:**
- Apple Developer Account ($99/year)
- App ID registered in Apple Developer Portal

---

# ANDROID SETUP

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Add an Android app with your package name (e.g., `com.eventinel.app`)

### 1.2 Download google-services.json
1. Firebase Console → Project Settings → General
2. Under "Your apps" → Android app → Download `google-services.json`
3. Place it in your project root

### 1.3 Enable FCM V1
1. Firebase Console → Project Settings → Cloud Messaging
2. Ensure "Firebase Cloud Messaging API (V1)" shows **Enabled**

### 1.4 Create Service Account Key
1. In Cloud Messaging tab, click **"Manage Service Accounts"**
2. Find `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`
3. Click the **3 dots menu** → **Manage keys**
4. Click **Add Key** → **Create new key**
5. Select **JSON** → **Create**
6. Save the downloaded file (e.g., `your-project-firebase-adminsdk-xxxxx.json`)

---

## Step 2: EAS Android Configuration

### 2.1 Initialize EAS (if not done)

Create `eas.json` in project root:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### 2.2 Upload FCM Credentials via CLI

```bash
npx eas credentials --platform android
```

Follow the interactive prompts:

1. Select build profile: **production**
2. Select: **Google Service Account**
3. Select: **Upload a Google Service Account Key**
4. Choose your `*-firebase-adminsdk-*.json` file
5. After upload, select: **Manage your Google Service Account Key for Push Notifications (FCM V1)**
6. Select: **Set up a Google Service Account Key for Push Notifications (FCM V1)**
7. Select: **[Choose an existing key]**
8. Select the key you just uploaded
9. Exit the credentials menu

**IMPORTANT**: Uploading the key is NOT enough - you must also ASSIGN it to FCM V1 Push Notifications!

### 2.3 Verify Android Setup

```bash
npx eas credentials --platform android
```

You should see:
```
Push Notifications (FCM V1): Google Service Account Key For FCM V1
  Project ID      your-project-id
  Client Email    firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

# iOS SETUP

## Step 3: Apple Developer Setup

### 3.1 Prerequisites
- Apple Developer Account ($99/year): [developer.apple.com](https://developer.apple.com)
- Your Apple Team ID (found at Developer Portal → Membership → Team ID)

### 3.2 Create APNs Key
1. Go to [Apple Developer Portal - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** (Create a Key)
3. Enter a name (e.g., "YourApp Push Key")
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **IMPORTANT**: Click **Download** to get the `.p8` file
   - You can only download this ONCE - save it securely!
7. Note the **Key ID** displayed (e.g., `XFNK3XC75G`)

### 3.3 Upload APNs Key to EAS

```bash
npx eas credentials --platform ios
```

Follow the interactive prompts:

1. Select: **Push Notifications: Manage your Apple Push Notifications Key**
2. Select: **Set up your project to use Push Notifications**
3. When asked "Generate a new Apple Push Notifications service key?" → **No**
4. Enter path to your `.p8` file (e.g., `./AuthKey_XFNK3XC75G.p8`)
5. Enter your **Key ID** (e.g., `XFNK3XC75G`)
6. Enter your **Apple Team ID** (e.g., `2EP46PAMN6`)
7. Exit the credentials menu

### 3.4 Verify iOS Setup

```bash
npx eas credentials --platform ios
```

You should see:
```
Push Key
  Developer Portal ID  XFNK3XC75G
  Apple Team           2EP46PAMN6 (Your Name)
```

---

# APP CONFIGURATION (Both Platforms)

## Step 4: App Configuration

### 4.1 Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### 4.2 Configure app.json/app.config.js

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    }
  }
}
```

### 4.3 Get Push Token in Your App

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data; // ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
}
```

**Note**: The same `ExponentPushToken` format works for both Android and iOS. Expo automatically routes to FCM or APNs based on the token.

---

# TESTING

## Step 5: Test Push Notifications

### Option A: Using curl (CLI)

```bash
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" -d '{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "Test Notification",
  "body": "Hello from your app!",
  "sound": "default"
}'
```

### Option B: Using Expo Push Tool (Web)

1. Go to [Expo Push Notifications Tool](https://expo.dev/notifications)
2. Fill in:
   - **Recipient**: Your ExponentPushToken
   - **Access Token**: Your Expo access token (if push security enabled)
   - **Message title**: Your title
   - **Message body**: Your message
   - **Sound name**: `default`
3. Click "Send a Notification"

### Option C: PowerShell Script

```powershell
$body = @{
    to = "ExponentPushToken[YOUR_TOKEN_HERE]"
    title = "Test Alert"
    body = "Push notifications are working!"
    sound = "default"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://exp.host/--/api/v2/push/send" -Method Post -ContentType "application/json" -Body $body
```

---

# PRODUCTION BUILD SETUP

## Step 6: Android Keystore (For Production Builds)

### 6.1 Generate Keystore

```bash
keytool -genkeypair -v -keystore your-app-upload.jks -alias your-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD -dname "CN=Your Name, OU=Your Unit, O=Your Org, L=City, ST=State, C=US"
```

On Windows with Android Studio:
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore your-app-upload.jks -alias your-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD -dname "CN=Your Name, OU=Your Unit, O=Your Org, L=City, ST=State, C=US"
```

### 6.2 Upload Keystore to EAS

```bash
npx eas credentials --platform android
```

1. Select: **Keystore: Manage everything needed to build your project**
2. Select: **Set up a new keystore**
3. Select: **I want to upload my own keystore**
4. Provide:
   - Keystore path: `./your-app-upload.jks`
   - Keystore password
   - Key alias
   - Key password

---

## Step 7: iOS Certificates (For Production Builds)

When you run your first iOS build, EAS can auto-generate the required certificates:

```bash
eas build --profile production --platform ios
```

EAS will prompt you to log in to your Apple Developer account and will automatically:
- Create a Distribution Certificate
- Create a Provisioning Profile
- Configure everything for you

**Or manually set up:**

```bash
npx eas credentials --platform ios
```

1. Select: **App Credentials: Manage everything needed to build your project**
2. Follow prompts to set up Distribution Certificate and Provisioning Profile

---

# TROUBLESHOOTING

## Android Errors

### Error: "Unable to retrieve the FCM server key"
- The service account key is not uploaded OR not assigned to FCM V1
- Run `eas credentials --platform android` and ensure you've completed BOTH:
  1. Upload the key
  2. Assign it to FCM V1 Push Notifications

### Error: "InvalidCredentials"
- Service account key doesn't match your Firebase project
- Re-download the key from Firebase and re-upload

### Error: "MismatchSenderId"
- The `google-services.json` and service account key are from different Firebase projects
- Ensure both are from the same project

## iOS Errors

### Error: "InvalidProviderToken"
- APNs key is invalid or revoked
- Create a new APNs key in Apple Developer Portal and re-upload

### Error: "BadDeviceToken"
- The push token is invalid (wrong environment or expired)
- Get a fresh token from the device

## General Errors

### Error: "DeviceNotRegistered"
- The push token is invalid or the app was uninstalled
- Get a fresh token from the device

### Notifications not appearing
1. Check device is not in Do Not Disturb mode
2. Check app notification permissions in device settings
3. Ensure you're testing on a physical device (not emulator/simulator)
4. Verify the token starts with `ExponentPushToken[`
5. For iOS: Ensure you're using a development build, not Expo Go

---

# SECURITY BEST PRACTICES

1. **Never commit sensitive files to git:**
   ```gitignore
   # Android
   *.jks
   *-firebase-adminsdk-*.json
   google-services.json

   # iOS
   *.p8
   *.p12
   *.mobileprovision
   ```

2. **Store passwords securely** - Use a password manager

3. **Rotate keys periodically** - Delete old service account keys in Firebase and old APNs keys in Apple Developer Portal

4. **Enable push security** in Expo dashboard for production apps

5. **APNs keys can only be downloaded once** - Store the `.p8` file securely immediately after download

---

# QUICK REFERENCE COMMANDS

```bash
# Login to EAS
eas login

# View Android credentials
npx eas credentials --platform android

# View iOS credentials
npx eas credentials --platform ios

# Build development client (Android)
eas build --profile development --platform android

# Build development client (iOS)
eas build --profile development --platform ios

# Build production (Android)
eas build --profile production --platform android

# Build production (iOS)
eas build --profile production --platform ios

# Build both platforms
eas build --profile production --platform all
```

---

# FILE CHECKLIST

Before deploying, ensure you have:

**Android:**
- [ ] `google-services.json` in project root
- [ ] FCM V1 Service Account Key uploaded to EAS
- [ ] FCM V1 key **assigned** for Push Notifications in EAS
- [ ] Keystore uploaded to EAS (for production builds)

**iOS:**
- [ ] APNs Key (`.p8` file) uploaded to EAS
- [ ] APNs Key assigned with correct Key ID and Team ID
- [ ] Distribution Certificate configured (for production builds)
- [ ] Provisioning Profile configured (for production builds)

**Both:**
- [ ] `eas.json` configured
- [ ] Sensitive files in `.gitignore`
- [ ] `expo-notifications` plugin configured in app.json

---

# EVENTINEL-SPECIFIC VALUES

| Item | Value |
|------|-------|
| **General** | |
| Package/Bundle ID | `com.eventinel.app` |
| EAS Project | `eventinel-zu26kq3j5yws6enmbulrx` |
| **Android** | |
| Firebase Project | `eventinel-e82d0` |
| Keystore File | `eventinel-upload.jks` |
| Keystore Alias | `eventinel` |
| Keystore Password | `admin0000` |
| **iOS** | |
| Apple Team ID | `2EP46PAMN6` |
| APNs Key ID | `XFNK3XC75G` |
| APNs Key File | `AuthKey_XFNK3XC75G.p8` |
