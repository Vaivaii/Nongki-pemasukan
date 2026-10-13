# Menyiapkan Google Sheets API untuk Nongki

Integrasi ini memakai Google OAuth dan Google Sheets API langsung dari GitHub Pages. Tidak memakai Apps Script Web App dan tidak menaruh client secret/token permanen di repositori.

## Yang perlu disiapkan

1. Di Google Cloud Console, pilih project Nongki dan aktifkan **Google Sheets API**.
2. Konfigurasikan OAuth consent screen. Untuk penggunaan pribadi, tambahkan akun Google pemilik sebagai test user bila aplikasi masih berstatus Testing.
3. Buat OAuth Client ID bertipe **Web application**.
4. Tambahkan origin GitHub Pages aplikasi ke **Authorized JavaScript origins**, misalnya `https://vaivaii.github.io`. Tambahkan juga `http://localhost:8000` hanya jika perlu pengujian lokal.
5. Siapkan spreadsheet yang akan digunakan dan pastikan akun Google pemilik punya akses edit.
6. Catat OAuth Client ID, alamat email akun pemilik, dan Spreadsheet ID. Spreadsheet ID adalah bagian URL di antara `/d/` dan `/edit`.

## Format tab INCOME LOG

Sesuai keputusan sebelumnya, gunakan spreadsheet Nongki yang sudah ada—jangan membuat spreadsheet duplikat. Modul `src/google-sheets.js` mengasumsikan baris 1 adalah header, kolom A berisi tanggal, dan kolom B berisi total penjualan harian (angka rupiah). Satu baris per tanggal. Jika tanggal sudah ada, modul memperbarui kolom A:B pada baris itu; jika belum ada, modul menambahkan baris. Kolom lain dan tab lain tidak disentuh. Sebelum mengaktifkan sinkronisasi, cocokkan asumsi ini dengan susunan aktual tab `INCOME LOG`.

## Catatan keamanan

- OAuth Client ID bukan client secret. Jangan pernah menaruh OAuth **Client Secret**, refresh token, atau service-account key dalam frontend.
- Modul meminta akses Google Sheets dan memeriksa email akun yang terautentikasi terhadap allowlist email pemilik. Pemeriksaan allowlist di browser membantu UX, tetapi kontrol akses data tetap bergantung pada izin Google Sheets.
- Token akses hanya disimpan dalam memori halaman dan hilang saat halaman ditutup/refresh.
- Sinkronisasi harus mengirim ulang antrean ketika offline dan hanya menghapus item antrean setelah API mengonfirmasi sukses.
- Jangan menaruh transaksi pribadi di spreadsheet yang dibagikan secara publik.

## Status

Modul ini adalah fondasi integrasi dan belum dihubungkan ke tombol/UI Nongki. Sebelum mengaktifkan, konfigurasi ID/email, periksa header tab `INCOME LOG`, lalu uji update dan append pada spreadsheet salinan.
