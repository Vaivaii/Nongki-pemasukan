# Nongki Android APK (eksperimental)

Proyek ini adalah pembungkus Android terpisah untuk PWA Nongki stabil v97. File PWA pada `main` tidak diubah.

## Cara build dari HP Android

1. Buka tab **Actions** di repository GitHub.
2. Pilih workflow **Build Nongki Android APK**.
3. Buka run terbaru pada branch `android/capacitor-apk`.
4. Setelah selesai dengan status hijau, unduh artifact `nongki-android-debug-apk`.
5. Ekstrak ZIP, lalu instal `app-debug.apk` di HP. Android mungkin meminta izin instal aplikasi dari sumber tersebut.

Build ini menggunakan GitHub-hosted runner; Android Studio tidak perlu dipasang di HP.

## Catatan penting

- APK memuat salinan lokal `index.html`, `manifest.json`, ikon, dan service worker dari commit branch ini.
- Sinkronisasi tetap menuju endpoint Google Apps Script yang sudah dipakai aplikasi web.
- APK debug untuk instalasi pribadi, bukan rilis Play Store.
- Uji login, transaksi, antrean offline, pembatalan, riwayat, laporan, dan Master Refresh sebelum dipakai untuk transaksi nyata.
- Pembaruan pada PWA `main` tidak otomatis masuk ke APK lama; APK perlu dibangun ulang dari branch ini setelah perubahan yang memang ingin dibawa.
- Jangan menyimpan password, token rahasia, atau kredensial Google di konfigurasi Android yang dipublikasikan.
