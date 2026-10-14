/*
NONGKI — PATCH SINKRONISASI MENU BERSAMA
File ini adalah patch pendamping, BUKAN pengganti seluruh Apps Script.
JANGAN salin API_TOKEN ke GitHub atau JavaScript publik.

1) Di doGet(e), SEBELUM pemeriksaan token:
   const p = (e && e.parameter) || {};
   if (p.action === 'getMenu') return getSharedMenuResponse_();
   Setelah itu lanjutkan pemeriksaan token yang sudah ada.

2) Di doPost(e), setelah JSON.parse dan pemeriksaan body.token yang sudah ada,
   SEBELUM aksi transaksi:
   if (body.action === 'saveMenu') return saveSharedMenu_(body.products);

3) Tambahkan fungsi-fungsi di bawah ke proyek Apps Script yang sama.
4) Buat tab MENU MASTER dengan header:
   Kode Produk | Nama Produk | Kategori | Harga Jual (Rp) | Status Produk |
   Terakhir Diubah | Catatan | Ikon
   Fungsi akan membuat tab dan header jika belum ada.

Keamanan:
- getMenu sengaja tidak meminta token supaya perangkat pegawai bisa membaca menu.
- saveMenu tetap menggunakan API_TOKEN yang sudah diperiksa doPost.
- Transaksi tetap melewati validasi token lama dan tidak diubah oleh patch ini.
*/

function getSharedMenuResponse_() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_LOG_ID);
    let sheet = ss.getSheetByName('MENU MASTER');
    if (!sheet) {
      sheet = ss.insertSheet('MENU MASTER');
      sheet.getRange(1, 1, 1, 8).setValues([[
        'Kode Produk', 'Nama Produk', 'Kategori', 'Harga Jual (Rp)',
        'Status Produk', 'Terakhir Diubah', 'Catatan', 'Ikon'
      ]]);
      return jsonResponse({ success: true, data: [] });
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ success: true, data: [] });
    const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const data = values
      .filter(row => String(row[1] || '').trim() !== '')
      .map(row => ({
        id: String(row[0] || ''),
        name: String(row[1] || ''),
        category: String(row[2] || 'Lainnya'),
        price: Math.max(0, Number(row[3]) || 0),
        active: String(row[4] || 'Aktif').toLowerCase() !== 'nonaktif',
        icon: String(row[7] || '🥤')
      }));
    return jsonResponse({ success: true, data: data });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function saveSharedMenu_(products) {
  if (!Array.isArray(products) || products.length < 1) {
    return jsonResponse({ success: false, error: 'Daftar menu kosong atau tidak valid' });
  }
  if (products.length > 300) {
    return jsonResponse({ success: false, error: 'Jumlah produk melebihi batas' });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_LOG_ID);
  let sheet = ss.getSheetByName('MENU MASTER');
  if (!sheet) sheet = ss.insertSheet('MENU MASTER');

  const headers = [
    'Kode Produk', 'Nama Produk', 'Kategori', 'Harga Jual (Rp)',
    'Status Produk', 'Terakhir Diubah', 'Catatan', 'Ikon'
  ];
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(8, sheet.getLastColumn())).getDisplayValues()[0];
    if (String(currentHeaders[0]).trim() !== 'Kode Produk' ||
        String(currentHeaders[1]).trim() !== 'Nama Produk') {
      return jsonResponse({
        success: false,
        error: 'Header MENU MASTER tidak sesuai. Gunakan delapan header yang ditentukan.'
      });
    }
  }

  const lastRow = sheet.getLastRow();
  const oldRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 8).getValues() : [];
  const oldByName = new Map();
  const oldByCode = new Map();
  oldRows.forEach(row => {
    const code = String(row[0] || '').trim();
    const name = String(row[1] || '').trim().toLowerCase();
    if (code) oldByCode.set(code, row);
    if (name) oldByName.set(name, row);
  });

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const usedCodes = new Set();
  const rows = products.map((p, index) => {
    const name = String(p && p.name || '').trim().slice(0, 120);
    if (!name) throw new Error('Nama produk pada urutan ' + (index + 1) + ' kosong');
    const incomingId = String(p.id || '').trim();
    const previous = oldByCode.get(incomingId) || oldByName.get(name.toLowerCase());
    let code = previous ? String(previous[0] || '') : '';
    if (!code && /^PRD-\d+$/.test(incomingId)) code = incomingId;
    if (!code || usedCodes.has(code)) {
      let n = 1;
      while (usedCodes.has('PRD-' + String(n).padStart(3, '0')) || oldByCode.has('PRD-' + String(n).padStart(3, '0'))) n++;
      code = 'PRD-' + String(n).padStart(3, '0');
    }
    usedCodes.add(code);
    const category = String(p.category || 'Lainnya').trim().slice(0, 80);
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < 0 || price > 100000000) {
      throw new Error('Harga tidak valid untuk produk: ' + name);
    }
    return [
      code, name, category, Math.round(price),
      p.active === false ? 'Nonaktif' : 'Aktif',
      now, 'Sinkronisasi PWA', String(p.icon || '🥤').slice(0, 12)
    ];
  });

  // Mengganti hanya MENU MASTER. Sheet PRODUK dan seluruh log transaksi tidak disentuh.
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(8, sheet.getLastColumn())).clearContent();
  sheet.getRange(1, 1, 1, 8).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  return jsonResponse({ success: true, message: 'Menu bersama disimpan', count: rows.length });
}
