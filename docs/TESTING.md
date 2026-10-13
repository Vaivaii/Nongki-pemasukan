# Cara menguji prototipe PWA Nongki

## Status
Prototipe ada di branch `rebuild/pwa-foundation`; belum menggantikan `main` dan belum terhubung ke backend atau Google Sheets.

## Menjalankan di komputer
Jangan membuka HTML dengan alamat `file://`, karena browser membatasi ES module dan service worker. Jalankan server lokal dari folder repo, misalnya dengan Python:
```bash
python -m http.server 8000
```
Kemudian buka `http://localhost:8000/app-v2.html`. Untuk menguji antrean dan penyimpanan, gunakan tab Riwayat dan Sinkron. Uji ini menggunakan database lokal browser bernama `nongki-pwa`; jangan gunakan untuk penjualan nyata.

## Tes manual minimum
1. Catat satu Es Kopi Susu Gula Aren. Ringkasan hari ini harus bertambah Rp10.000.
2. Refresh halaman. Transaksi masih terlihat.
3. Batalkan transaksi. Riwayat harus menampilkan status Dibatalkan dan pemasukan bersih turun Rp10.000.
4. Catat transaksi lain saat browser offline. Transaksi tetap tercatat lokal dan antrean bertambah.
5. Aktifkan koneksi lagi. Antrean masih menunggu karena endpoint backend belum dikonfigurasi. Ini disengaja—tidak boleh mengklaim sinkron sebelum ada konfirmasi server.
6. Buka tab baru pada origin yang sama untuk memastikan data IndexedDB berbagi pada origin yang sama.

## Catatan teknis sebelum uji lapangan
- PWA ini adalah prototipe lokal dan menggunakan label pengguna uji; autentikasi belum dibuat.
- Hindari menginput transaksi sungguhan.
- Jangan menggabungkan branch ini ke `main` sebelum review, pengujian browser, backend, dan rotasi token lama.
- Modul service worker sekarang memasukkan `app-v2.html`, `src/db.js`, dan `src/sync.js` ke cache inti. Untuk menguji pembaruan cache, pastikan service worker versi terbaru sudah aktif.
