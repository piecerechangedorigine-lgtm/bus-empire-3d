# Traffic Command

A mobile-first, Arabic-friendly 3D traffic puzzle game built with Three.js and Capacitor for Android.

## Features

- 30 campaign stages with a traffic-grid puzzle.
- Touch-drag vehicle movement, collision checks, undo, restart, and a stage map.
- Stars, coins, one-time stage rewards, hint and skip options.
- Local persistence for campaign progress, current board state, sound and vibration preferences.
- Miniature city scenery and Arabic UI.
- Automated campaign solvability validation and Android debug APK build.

## Run locally

```sh
npm install
npm run test:campaign
npm run start
```

## Android build

GitHub Actions validates all 30 generated stages, builds the web app, packages it with Capacitor, and uploads a debug APK artifact.

Open the repository's **Actions** tab, select the latest successful **Traffic Command Android APK** run, and download its artifact.

**Important:** the debug APK is intended for installation and testing. It is not a release-signed Google Play package. Real-money coin purchases are intentionally disabled until Google Play Billing is implemented and tested.

## Verification status

The automated campaign solver checks that every generated stage has a legal solution. A successful cloud build verifies web compilation and APK packaging. Hands-on testing on a physical Android device is still required before calling the game fully production-ready.
