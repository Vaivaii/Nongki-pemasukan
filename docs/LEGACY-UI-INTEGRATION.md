# Integrasi UI Nongki yang disetujui

## Status saat ini

- File desain asli dari pengguna belum dimasukkan ke repository branch ini.
- `app-v2.html` adalah prototipe teknis sederhana dan **bukan** pengganti desain yang disetujui.
- `src/legacy-adapter.js` adalah jembatan kompatibilitas untuk migrasi data lokal dan mirror ke IndexedDB/outbox. Modul ini belum dipanggil oleh halaman UI, sehingga belum mengubah perilaku UI dengan sendirinya.
- Sinkronisasi server belum aktif. Jangan menampilkan status tersinkron hanya karena browser kembali online.

## Integrasi yang wajib dilakukan sebelum uji operasional

1. Masukkan HTML desain yang disetujui tanpa mengubah struktur visual, ikon, spacing, warna, kartu, header, navigasi, atau dialog login.
2. Hapus URL/token Apps Script dari JavaScript publik. Token yang pernah ada di preview harus dirotasi/dicabut sebelum rilis.
3. Ubah fungsi simpan produk agar menggunakan `putProduct`; fungsi catat penjualan harus menunggu `recordTransaction`; fungsi pembatalan harus menunggu `cancelTransaction`.
4. Saat startup, migrasikan data localStorage lama satu kali dan verifikasi jumlah data. Jangan hapus localStorage sebelum verifikasi hasil migrasi.
5. Gunakan event outbox yang hanya dihapus setelah backend mengonfirmasi penerimaan idempoten.
6. Riwayat cloud harus berasal dari API server. Jangan menyalin transaksi lokal ke tampilan “cloud” sebagai simulasi tersinkron.
7. Uji: transaksi aktif, pembatalan, refresh, data offline, migrasi berulang, dua tab, tanggal lokal Asia/Jakarta, dan respons backend gagal/duplikat.

## Catatan API

Backend menjadi sumber kebenaran lintas perangkat. Google Sheets harus diakses dari backend menggunakan kredensial server-side; GitHub Pages dan JavaScript browser tidak boleh memegang rahasia.
