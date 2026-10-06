# EventSnap Camera (Android) — Camera Auto Upload

Automatically uploads new photos from a connected camera to a chosen EventSnap
**Create Event**, including in the background.

> **Status:** source only — not yet built or tested on a device. Build and test
> it in Android Studio before giving it to photographers.

## How it works

1. The photographer connects the camera to the phone with the camera maker's
   app, which saves photos into the phone's gallery:
   - **Camera Wi-Fi / Bluetooth:** Canon Camera Connect, Nikon SnapBridge,
     Sony Imaging Edge Mobile / Creators' App, Fujifilm XApp, OM Image Share…
     (turn on their *auto transfer*). Bluetooth-only transfer usually sends
     reduced-size photos — that is a camera limitation.
   - **USB (OTG cable):** import with the maker's app or Android's photo
     import, which saves into the gallery.
2. In **EventSnap Camera**: sign in with the normal EventSnap account, choose
   the event, tap **Start auto upload**.
3. The app runs a background service (shown as an ongoing notification). It
   is notified of every new gallery photo (and re-checks every 10 s) and
   uploads each one with the existing EventSnap API
   (`POST /api/create-events/:id/photos`). Photos are stored in the same
   `createEventPhotos` GridFS storage as dashboard uploads.

**No duplicates:** each gallery photo is remembered once uploaded; photos with
the same name + size as one already in the event are skipped; a photo is only
sent when Android marks it complete and its size has stopped changing.

**Formats:** JPG, PNG, WebP, HEIC. RAW is skipped — shoot RAW+JPEG.

Options: *Only from album* (e.g. `Camera Connect`) limits uploads to that
gallery album; *Also upload photos already on the phone from today* includes
today's earlier photos (otherwise only photos added after Start).

## Build

Requirements: Android Studio (Ladybug or newer), JDK 17, Android SDK 35.

1. **File → Open** this `eventsnap-camera-android` folder; let Gradle sync
   (Gradle 8.9 / Android Gradle Plugin 8.7, no third-party libraries).
2. Run on a phone (Android 8.0+). For command-line builds run `gradle wrapper`
   once to create `gradlew`, then `./gradlew assembleDebug`.

Server address: the backend URL (e.g. `https://…onrender.com`). For a local
backend use the computer's LAN IP, e.g. `http://192.168.1.20:8000`
(`usesCleartextTraffic` is on for this; turn it off for https-only release).

## Platform limits (by design of Android / iOS)

- **Background:** uploads continue while the notification is shown. Android
  15+ limits this kind of service to about 6 hours a day; the app then shows a
  message and the photographer taps **Start** again. Exclude the app from
  battery optimisation for long shoots.
- **Keeps the chosen event:** the event stays the target until changed in the
  app. Reopening the app resumes auto upload; after a phone restart it resumes
  by itself (Android 14 and older) or after one tap on the "Resume"
  notification (Android 15+). Photos taken while it was off are uploaded then;
  nothing is uploaded twice.
- **Photo access:** allow access to **all** photos. With "selected photos
  only" (Android 14+), new photos aren't visible to the app.
- **iPhone:** not covered by this app. iOS only allows short, system-scheduled
  background work; iPhone users use the dashboard's **Upload new photos** on
  the event (Camera Auto Upload panel).
- The password is stored only encrypted with an Android Keystore key, so the
  app can sign in again when the 1-day session expires.
