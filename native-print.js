(function () {
  'use strict';

  function isCapacitorNative() {
    return !!(window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform());
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function money(value) {
    return 'Rp' + Math.round(Number(value) || 0).toLocaleString('id-ID');
  }

  function txItems(tx) {
    if (Array.isArray(tx.items) && tx.items.length) {
      return tx.items.map(function (item) {
        var qty = Number(item.quantity == null ? item.qty : item.quantity) || 1;
        var price = Number(item.unitPrice) || 0;
        return {
          name: item.productName || item.name || 'Produk',
          qty: qty,
          price: price,
          total: Number(item.lineTotal) || price * qty
        };
      });
    }
    var total = Number(tx.total) || Number(tx.unitPrice) || 0;
    return [{ name: tx.name || tx.productName || 'Transaksi', qty: Number(tx.qty) || 1, price: Number(tx.unitPrice) || total, total: total }];
  }

  function totalOf(tx, items) {
    var explicit = Number(tx.total);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return items.reduce(function (sum, item) { return sum + item.total; }, 0);
  }

  function createdAt(tx) {
    var date = new Date(tx.createdAt || tx.timestamp || tx.date || '');
    return isNaN(date.getTime())
      ? [tx.date || '', tx.time || ''].filter(Boolean).join(' ')
      : date.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function buildReceipt(tx, width) {
    var items = txItems(tx);
    var total = totalOf(tx, items);
    var cash = tx.uangDiterima == null ? (tx.uang_diterima == null ? total : tx.uang_diterima) : tx.uangDiterima;
    var method = tx.metode_pembayaran || tx.metodePembayaran || '-';
    var rows = items.map(function (item) {
      return '<div class="item"><div class="name">' + esc(item.name) + '</div>' +
        '<div class="pair"><span>' + item.qty + ' x ' + esc(money(item.price)) + '</span><b>' + esc(money(item.total)) + '</b></div></div>';
    }).join('');
    var canceled = tx.status === 'canceled' || tx.status === 'cancelled';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Struk Nongki</title><style>' +
      '@page{size:' + (width === 80 ? '80mm' : '58mm') + ' auto;margin:0}' +
      '*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:11px}' +
      'body{padding:2mm}.receipt{width:100%;overflow-wrap:anywhere}.center{text-align:center;line-height:1.5}.brand{font-size:19px;font-weight:800;letter-spacing:2px;margin-bottom:2px}' +
      'hr{border:0;border-top:1px dashed #000;margin:7px 0}.item{margin:6px 0}.name{font-weight:600}.pair,.sum{display:flex;justify-content:space-between;gap:6px;margin-top:3px}.pair b{text-align:right}.sum{font-size:14px;font-weight:800;margin:8px 0}.footer{text-align:center;line-height:1.5;margin-top:8px}' +
      '</style></head><body><main class="receipt"><div class="center"><div class="brand">NONGKI</div>ICE AND COFFEE</div><hr>' +
      '<div class="center"><b>STRUK PEMBELIAN</b><br>' + esc(createdAt(tx)) + '<br>No: ' + esc(String(tx.id || tx.id_transaksi || '-')) + '</div><hr>' +
      '<div>Kasir: ' + esc(tx.userId || tx.profileName || 'Nongki') + '</div>' + rows + '<hr>' +
      '<div class="sum"><span>TOTAL</span><b>' + esc(money(total)) + '</b></div>' +
      '<div class="pair"><span>Metode</span><b>' + esc(method) + '</b></div>' +
      '<div class="pair"><span>Uang diterima</span><b>' + esc(money(cash)) + '</b></div>' +
      '<div class="pair"><span>Kembalian</span><b>' + esc(money(tx.kembalian || 0)) + '</b></div>' +
      (canceled ? '<p class="center"><b>TRANSAKSI DIBATALKAN</b></p>' : '') +
      '<hr><div class="footer">Terima kasih<br>Selamat menikmati!</div></main></body></html>';
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open('nongki-pwa-final', 1);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Database transaksi tidak dapat dibuka.')); };
    });
  }

  async function loadTransactions() {
    var db = await openDb();
    try {
      if (!db.objectStoreNames.contains('transactions')) return [];
      return await new Promise(function (resolve, reject) {
        var request = db.transaction('transactions', 'readonly').objectStore('transactions').getAll();
        request.onsuccess = function () {
          resolve((request.result || []).sort(function (a, b) {
            return String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''));
          }));
        };
        request.onerror = function () { reject(request.error || new Error('Riwayat lokal tidak dapat dibaca.')); };
      });
    } finally { db.close(); }
  }

  function addNativeButton() {
    if (!isCapacitorNative() || document.getElementById('nativeCapacitorPrint')) return;
    var actions = document.querySelector('#thermalPrintView .tp-actions');
    var picker = document.getElementById('thermalPrintTransaction');
    var widthInput = document.getElementById('thermalPrintWidth');
    var status = document.getElementById('thermalPrintStatus');
    if (!actions || !picker || !status) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'nativeCapacitorPrint';
    button.className = 'tp-btn primary';
    button.textContent = '▤ Cetak Native (Capacitor)';
    button.style.gridColumn = '1 / -1';
    button.addEventListener('click', async function () {
      button.disabled = true;
      try {
        var selectedId = picker.value;
        if (!selectedId) throw new Error('Pilih transaksi terlebih dahulu.');
        status.textContent = 'Menyiapkan struk untuk dialog cetak Android…';
        var txs = await loadTransactions();
        var tx = txs.find(function (item) { return String(item.id || item.id_transaksi || '') === selectedId; });
        if (!tx) throw new Error('Transaksi tidak ditemukan di riwayat lokal.');
        var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePrinter;
        if (!plugin || typeof plugin.printHtml !== 'function') {
          throw new Error('Plugin NativePrinter belum terpasang di APK ini. Build ulang APK dari branch native-clean.');
        }
        var width = Number(widthInput && widthInput.value) === 80 ? 80 : 58;
        await plugin.printHtml({ name: 'Struk Nongki', html: buildReceipt(tx, width) });
        status.textContent = 'Dialog cetak native Android sudah dibuka. Pilih printer yang tersedia.';
      } catch (error) {
        status.textContent = 'Cetak native gagal: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui');
      } finally {
        button.disabled = false;
      }
    });
    actions.appendChild(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNativeButton, { once: true });
  else addNativeButton();
  document.addEventListener('click', function (event) {
    if (event.target.closest('.tabs [data-view="thermalPrintView"]')) setTimeout(addNativeButton, 0);
  });
})();
