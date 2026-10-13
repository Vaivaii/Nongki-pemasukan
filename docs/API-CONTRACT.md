# Kontrak API backend Nongki PWA

Dokumen ini menetapkan kontrak sebelum server dibuat. Aplikasi PWA **tidak boleh** menyimpan token rahasia di JavaScript publik.

## Endpoint yang dibutuhkan

### POST /api/sync-events
Mengirim satu event antrean. Body:
~~~json
{
  "eventId": "UUID-stabil-dari-klien",
  "eventType": "transaction.created",
  "entityId": "UUID-transaksi",
  "payload": {}
}
~~~
Server harus menerapkan idempotensi berdasarkan eventId. Event yang sama boleh dikirim ulang tanpa membuat transaksi ganda. Respons sukses:
~~~json
{ "ok": true, "accepted": true }
~~~
Jika event yang sama sudah diterapkan:
~~~json
{ "ok": true, "accepted": false, "duplicate": true }
~~~
Jangan membalas sukses sebelum event tersimpan secara persisten.

### Autentikasi
- POST /api/auth/login: user ID + PIN; server memverifikasi hash PIN, status akun, dan role.
- POST /api/auth/logout: menutup sesi server.
- GET /api/session: status sesi dan role.
- PIN tidak boleh disimpan plaintext di database maupun localStorage/IndexedDB.
- Login offline tidak boleh pura-pura tervalidasi oleh server. Jika dukungan offline-login dibutuhkan, tetapkan kebijakan khusus setelah threat model disepakati.

### Data yang dibutuhkan aplikasi
- GET /api/products: daftar produk aktif dan harga terkini.
- POST /api/products dan PATCH /api/products/:id: owner saja.
- GET /api/reports/daily?date=YYYY-MM-DD: ringkasan pemasukan bersih dan item.
- GET /api/reports/monthly?month=YYYY-MM: ringkasan bulanan.
- GET /api/sessions: owner saja, daftar sesi aktif dan last-seen.

## Aturan transaksi
1. Transaksi mempunyai ID UUID yang stabil dan menyimpan snapshot nama produk, harga satuan, kuantitas, dan subtotal saat transaksi.
2. Pembatalan adalah event terpisah; transaksi awal tidak dihapus.
3. Pendapatan bersih dan jumlah produk terjual mengecualikan transaksi berstatus batal.
4. Server menjadi sumber kebenaran lintas perangkat. IndexedDB adalah penyimpanan lokal/antrean sementara.
5. Setiap event disimpan beserta actor, waktu server, device/session bila tersedia, dan status.
6. Jam perangkat dapat salah; server menyimpan receivedAt dan kebijakan tanggal bisnis harus jelas (zona waktu Asia/Jakarta).
7. Integrasi Google Sheets berjalan dari backend dengan kredensial server-side, bukan token rahasia di PWA publik. Sheet menjadi laporan/ekspor, bukan satu-satunya mekanisme deduplikasi.

## Deployment dan rahasia
- GitHub Pages hanya untuk frontend statis; tidak dapat menyimpan kredensial rahasia atau menjalankan API privat.
- Backend perlu layanan server terpisah dengan database dan HTTPS.
- Rahasia Apps Script/token yang pernah tertanam di frontend harus dirotasi/dicabut sebelum rilis publik.
- Jangan menghubungkan UI produksi ke endpoint baru sampai endpoint dan uji idempotensi tersedia.
