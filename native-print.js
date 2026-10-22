(function () {
  'use strict';

  function isCapacitorNative() {
    return !!(window.Capacitor && (
      (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
      (window.Capacitor.Plugins && window.Capacitor.Plugins.NativePrinter)
    ));
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

  var DEFAULT_NONGKI_LOGO = "./assets/nongki-receipt-logo.png";
  function buildReceipt(tx, width) {
    var items = txItems(tx);
    var total = totalOf(tx, items);
    var cash = tx.uangDiterima == null ? (tx.uang_diterima == null ? total : tx.uang_diterima) : tx.uangDiterima;
    var method = tx.metode_pembayaran || tx.metodePembayaran || '-';
    var logo = localStorage.getItem('nongki_thermal_logo') || DEFAULT_NONGKI_LOGO;
    var logoSize = Math.max(20, Math.min(100, Number(localStorage.getItem('nongki_thermal_logo_size') || 65)));
    var logoWidthMm = ((width - 4) * logoSize / 100).toFixed(2);
    var rows = items.map(function (item) {
      return '<div class="item"><div class="name">' + esc(item.name) + '</div>' +
        '<div class="pair"><span>' + item.qty + ' x ' + esc(money(item.price)) + '</span><b>' + esc(money(item.total)) + '</b></div></div>';
    }).join('');
    var canceled = tx.status === 'canceled' || tx.status === 'cancelled';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Struk Nongki</title><style>' +
      '@page{size:' + (width === 80 ? '80mm' : '58mm') + ' auto;margin:0}' +
      '*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:11px}' +
      'body{padding:2mm}.receipt{width:100%;overflow-wrap:anywhere}.center{text-align:center;line-height:1.5}.brand-logo{display:block;width:'+logoWidthMm+'mm;max-width:100%;max-height:30mm;position:static;object-fit:contain;object-position:center;margin:0 auto 4px;transform:none;float:none}' +
      'hr{border:0;border-top:1px dashed #000;margin:7px 0}.item{margin:6px 0}.name{font-weight:600}.pair,.sum{display:flex;justify-content:space-between;gap:6px;margin-top:3px}.pair b{text-align:right}.sum{font-size:14px;font-weight:800;margin:8px 0}.footer{text-align:center;line-height:1.5;margin-top:8px}' +
      '</style></head><body><main class="receipt"><div class="brand-logo-wrap" style="display:flex;justify-content:center;align-items:center;width:100%;text-align:center"><img class="brand-logo" src="' + esc(logo) + '" alt="Logo Nongki"></div><hr>' +
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
    if (!isCapacitorNative()) return;
    var printButton = document.getElementById('thermalPrintNow');
    var picker = document.getElementById('thermalPrintTransaction');
    var widthInput = document.getElementById('thermalPrintWidth');
    var status = document.getElementById('thermalPrintStatus');
    if (!printButton || !picker || !status || printButton.dataset.nativePrintBound === '1') return;

    // Keep the original "Cetak struk" button as the single direct Bluetooth print entry point.
    printButton.dataset.nativePrintBound = '1';
    printButton.addEventListener('click', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (printButton.disabled) return;
      printButton.disabled = true;
      try {
        var selectedId = picker.value;
        if (!selectedId) throw new Error('Pilih transaksi terlebih dahulu.');
        var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePrinter;
        if (!plugin || typeof plugin.getPairedBluetoothPrinters !== 'function' || typeof plugin.printBluetoothReceipt !== 'function') {
          throw new Error('Fitur Bluetooth langsung belum tersedia di APK ini. Pasang APK terbaru.');
        }
        status.textContent = 'Mencari printer Bluetooth yang sudah dipasangkan…';
        var result = await plugin.getPairedBluetoothPrinters();
        var devices = result && Array.isArray(result.devices) ? result.devices : [];
        if (!devices.length) throw new Error('Tidak ada perangkat terpasang. Pasangkan printer thermal melalui pengaturan Bluetooth Android terlebih dahulu.');
        var selected = await selectBluetoothPrinter(devices, false);
        if (!selected) {
          status.textContent = 'Pemilihan printer dibatalkan.';
          return;
        }
        var txs = await loadTransactions();
        var tx = txs.find(function (item) { return String(item.id || item.id_transaksi || '') === selectedId; });
        if (!tx) throw new Error('Transaksi tidak ditemukan di riwayat lokal.');
        var width = Number(widthInput && widthInput.value) === 80 ? 80 : 58;
        status.textContent = 'Mengirim struk ke ' + (selected.name || selected.address) + '…';
        var logoBase64 = await receiptLogoBase64();
        await plugin.printBluetoothReceipt({
          address: selected.address,
          text: buildBluetoothText(tx),
          logoBase64: logoBase64,
          width: width
        });
        status.textContent = 'Struk berhasil dikirim ke printer Bluetooth.';
      } catch (error) {
        status.textContent = 'Cetak struk gagal: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui');
      } finally {
        printButton.disabled = false;
      }
    }, true);
  }

  function receiptLogoBase64() {
    var source = localStorage.getItem('nongki_thermal_logo') || DEFAULT_NONGKI_LOGO;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var originalWidth = img.naturalWidth || img.width || 384;
        var originalHeight = img.naturalHeight || img.height || 1;
        var width = Math.min(384, originalWidth);
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.max(1, Math.round(originalHeight * width / originalWidth));
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < data.data.length; i += 4) {
          var lum = (data.data[i] * 299 + data.data[i + 1] * 587 + data.data[i + 2] * 114) / 1000;
          if (data.data[i + 3] < 80 || lum > 190) data.data[i + 3] = 0;
          else { data.data[i] = 0; data.data[i + 1] = 0; data.data[i + 2] = 0; data.data[i + 3] = 255; }
        }
        ctx.putImageData(data, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = function () { reject(new Error('Logo struk tidak dapat dibaca untuk printer Bluetooth.')); };
      img.src = source;
    });
  }

  function buildBluetoothText(tx) {
    var items = txItems(tx);
    var total = totalOf(tx, items);
    var cash = tx.uangDiterima == null ? (tx.uang_diterima == null ? total : tx.uang_diterima) : tx.uangDiterima;
    var method = tx.metode_pembayaran || tx.metodePembayaran || '-';
    var lines = [
      'STRUK PEMBELIAN',
      createdAt(tx),
      'No: ' + String(tx.id || tx.id_transaksi || '-').slice(0, 24),
      'Kasir: ' + String(tx.userId || tx.profileName || 'Nongki'),
      '--------------------------------'
    ];
    items.forEach(function (item) {
      lines.push(String(item.name).slice(0, 32));
      lines.push(item.qty + ' x ' + money(item.price));
      lines.push('Subtotal: ' + money(item.total));
    });
    lines.push(
      '--------------------------------',
      'TOTAL: ' + money(total),
      'Metode: ' + method,
      'Diterima: ' + money(cash),
      'Kembalian: ' + money(tx.kembalian || 0)
    );
    if (tx.status === 'canceled' || tx.status === 'cancelled') lines.push('TRANSAKSI DIBATALKAN');
    lines.push('--------------------------------', 'Terima kasih', 'Selamat menikmati!');
    return lines.join('\n') + '\n';
  }


  var BT_PRINTER_KEY = 'nongki_bluetooth_printer_mac';

  function ensureBluetoothModal() {
    if (document.getElementById('btPrinterModal')) return;
    var style = document.createElement('style');
    style.id = 'btPrinterModalStyles';
    style.textContent = `
      .bt-modal{display:none;position:fixed;inset:0;z-index:10050;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
      .bt-modal.is-open{display:flex}
      .bt-modal-backdrop{position:absolute;inset:0;background:rgba(8,20,14,.62);backdrop-filter:blur(3px)}
      .bt-modal-card{position:relative;width:100%;max-width:440px;max-height:82dvh;display:flex;flex-direction:column;overflow:hidden;background:#fffdf8;color:#173d2c;border:1px solid #e2e7df;border-radius:20px;box-shadow:0 18px 55px rgba(0,0,0,.24)}
      .bt-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 18px 14px;border-bottom:1px solid #e7ebe4}
      .bt-modal-header h3{margin:0;font-size:18px;line-height:1.3}.bt-modal-header p{margin:6px 0 0;color:#758078;font-size:12px;line-height:1.5}
      .bt-icon-button{flex:0 0 36px;width:36px;height:36px;border:0;border-radius:50%;background:#edf1eb;color:#173d2c;font-size:24px}
      .bt-printer-list{overflow-y:auto;padding:12px;overscroll-behavior:contain}
      .bt-printer-option{display:flex;align-items:center;width:100%;gap:12px;padding:14px 12px;margin:0 0 8px;text-align:left;color:#173d2c;background:#fff;border:1px solid #e1e7df;border-radius:13px;cursor:pointer}
      .bt-printer-option:active{background:#edf4ee}.bt-printer-option:focus-visible{outline:2px solid #397b5a;outline-offset:2px}
      .bt-printer-icon{display:flex;flex:0 0 42px;width:42px;height:42px;align-items:center;justify-content:center;border-radius:12px;background:#eaf1e9;font-size:21px}
      .bt-printer-info{flex:1;min-width:0}.bt-printer-name{display:block;font-size:14px;font-weight:700;overflow-wrap:anywhere}
      .bt-printer-address{display:block;margin-top:4px;color:#7a847d;font-size:11px;overflow-wrap:anywhere}
      .bt-printer-check{font-size:18px;font-weight:700}.bt-printer-message{padding:14px 8px;color:#758078;font-size:13px;line-height:1.6}
      .bt-modal-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-top:1px solid #e7ebe4;font-size:11px;color:#758078}
      .bt-secondary{padding:10px 16px;border:1px solid #dfe5dc;border-radius:10px;background:#fff;color:#173d2c;font-weight:700}
      /* Fluid modal entrance for both Print > Cetak struk and Ganti Printer Bluetooth. */
      .bt-modal{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;visibility:hidden;pointer-events:none;opacity:0;transition:opacity .22s ease,visibility 0s linear .24s}
      .bt-modal.is-open{visibility:visible;pointer-events:auto;opacity:1;transition:opacity .22s ease}
      .bt-modal-backdrop{position:absolute;inset:0;background:rgba(8,24,16,.68);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);opacity:0;transition:opacity .24s ease}
      .bt-modal.is-open .bt-modal-backdrop{opacity:1}
      .bt-modal-card{position:relative;z-index:1;width:min(100%,420px);max-height:min(78dvh,620px);overflow:auto;border:1px solid #e1e8df;border-radius:23px;background:#fffdf8;color:#23352c;box-shadow:0 20px 60px rgba(0,0,0,.28);transform:translateY(18px) scale(.96);opacity:0;transform-origin:center center;transition:transform .34s cubic-bezier(.2,.85,.25,1.12),opacity .22s ease}
      .bt-modal.is-open .bt-modal-card{transform:translateY(0) scale(1);opacity:1}
      .bt-printer-option{transform:translateY(8px);opacity:0;animation:btPrinterOptionIn .32s cubic-bezier(.22,1,.36,1) both}
      .bt-printer-option:active{transform:scale(.985)}
      @keyframes btPrinterOptionIn{to{transform:translateY(0);opacity:1}}
      @media(prefers-reduced-motion:reduce){.bt-modal,.bt-modal-backdrop,.bt-modal-card,.bt-printer-option{transition:none!important;animation:none!important;transform:none!important}.bt-printer-option{opacity:1}}
    `;
    document.head.appendChild(style);
    var modal = document.createElement('div');
    modal.id = 'btPrinterModal';
    modal.className = 'bt-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '<div class="bt-modal-backdrop" data-bt-close></div><section class="bt-modal-card" role="dialog" aria-modal="true" aria-labelledby="btPrinterTitle"><div class="bt-modal-header"><div><h3 id="btPrinterTitle">Pilih Printer Bluetooth</h3><p>Pilih printer yang akan digunakan untuk mencetak struk.</p></div><button type="button" id="btPrinterClose" class="bt-icon-button" aria-label="Tutup">×</button></div><div id="btPrinterList" class="bt-printer-list"></div><div class="bt-modal-footer"><span id="btPrinterSavedLabel">Printer belum dipilih</span><button type="button" id="btPrinterCancel" class="bt-secondary">Batal</button></div></section>';
    document.body.appendChild(modal);
  }

  function openBluetoothModal(devices) {
    ensureBluetoothModal();
    return new Promise(function (resolve) {
      var modal = document.getElementById('btPrinterModal');
      var list = document.getElementById('btPrinterList');
      var savedLabel = document.getElementById('btPrinterSavedLabel');
      var savedMac = localStorage.getItem(BT_PRINTER_KEY) || '';
      list.replaceChildren();
      savedLabel.textContent = savedMac ? 'Tersimpan: ' + savedMac : 'Pilih printer untuk menyimpan perangkat';

      devices.forEach(function (device) {
        var address = String(device.address || '').trim();
        if (!address) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'bt-printer-option';
        button.style.animationDelay = Math.min(list.children.length * 45, 225) + 'ms';
        var icon = document.createElement('span');
        icon.className = 'bt-printer-icon';
        icon.textContent = '🖨️';
        var info = document.createElement('span');
        info.className = 'bt-printer-info';
        var name = document.createElement('span');
        name.className = 'bt-printer-name';
        name.textContent = device.name || 'Printer Bluetooth';
        var mac = document.createElement('span');
        mac.className = 'bt-printer-address';
        mac.textContent = address;
        info.appendChild(name);
        info.appendChild(mac);
        button.appendChild(icon);
        button.appendChild(info);
        if (address.toUpperCase() === savedMac.toUpperCase()) {
          var check = document.createElement('span');
          check.className = 'bt-printer-check';
          check.textContent = '✓';
          button.appendChild(check);
        }
        button.addEventListener('click', function () {
          localStorage.setItem(BT_PRINTER_KEY, address);
          finish(address);
        });
        list.appendChild(button);
      });

      if (!list.children.length) {
        var message = document.createElement('p');
        message.className = 'bt-printer-message';
        message.textContent = 'Tidak ada printer Bluetooth yang bisa dipilih. Pasangkan printer di Pengaturan Bluetooth Android terlebih dahulu.';
        list.appendChild(message);
      }

      function finish(value) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.getElementById('btPrinterClose').removeEventListener('click', cancel);
        document.getElementById('btPrinterCancel').removeEventListener('click', cancel);
        modal.querySelector('[data-bt-close]').removeEventListener('click', cancel);
        modal.removeEventListener('keydown', onKey);
        resolve(value || null);
      }
      function cancel() { finish(null); }
      function onKey(event) { if (event.key === 'Escape') cancel(); }
      document.getElementById('btPrinterClose').addEventListener('click', cancel);
      document.getElementById('btPrinterCancel').addEventListener('click', cancel);
      modal.querySelector('[data-bt-close]').addEventListener('click', cancel);
      modal.addEventListener('keydown', onKey);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    });
  }

  async function selectBluetoothPrinter(devices, forcePicker) {
    var savedMac = localStorage.getItem(BT_PRINTER_KEY) || '';
    var selected = !forcePicker && savedMac
      ? devices.find(function (device) {
          return String(device.address || '').toUpperCase() === savedMac.toUpperCase();
        })
      : null;
    if (selected) return selected;
    var chosenMac = await openBluetoothModal(devices);
    if (!chosenMac) return null;
    selected = devices.find(function (device) { return device.address === chosenMac; });
    if (!selected) throw new Error('Printer yang dipilih tidak ditemukan.');
    return selected;
  }

  function addChangePrinterButton() {
    if (!isCapacitorNative()) return;
    if (document.getElementById('changeBluetoothPrinter')) return;
    var status = document.getElementById('thermalPrintStatus');
    var printButton = document.getElementById('thermalPrintNow');
    if (!status || !printButton) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'changeBluetoothPrinter';
    button.className = 'tp-btn';
    button.textContent = 'Ganti Printer Bluetooth';
    button.style.setProperty('width', '100%', 'important');
    button.style.setProperty('height', '42px', 'important');
    button.style.setProperty('min-height', '42px', 'important');
    button.style.setProperty('max-height', '42px', 'important');
    button.style.setProperty('flex', '0 0 42px', 'important');
    button.style.boxSizing = 'border-box';
    button.style.padding = '12px 8px';
    button.style.margin = '0';
    button.style.alignSelf = 'stretch';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.addEventListener('click', async function () {
      var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePrinter;
      if (!plugin || typeof plugin.getPairedBluetoothPrinters !== 'function') {
        status.textContent = 'Fitur Bluetooth tidak tersedia di APK ini.';
        return;
      }
      button.disabled = true;
      try {
        status.textContent = 'Memuat daftar printer Bluetooth…';
        var result = await plugin.getPairedBluetoothPrinters();
        var devices = result && Array.isArray(result.devices) ? result.devices : [];
        if (!devices.length) throw new Error('Tidak ada printer terpasang. Pasangkan printer di Pengaturan Bluetooth Android.');
        var chosen = await selectBluetoothPrinter(devices, true);
        status.textContent = chosen
          ? 'Printer tersimpan: ' + (chosen.name || chosen.address)
          : 'Pergantian printer dibatalkan.';
      } catch (error) {
        status.textContent = 'Gagal memilih printer: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui');
      } finally {
        button.disabled = false;
      }
    });
    var row = document.getElementById('thermalPrintExtraActions');
    if (!row) {
      row = document.createElement('div');
      row.id = 'thermalPrintExtraActions';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr)';
      row.style.gap = '9px';
      row.style.marginTop = '10px';
      row.style.alignItems = 'stretch';
      row.style.setProperty('display', 'grid', 'important');
      row.style.setProperty('grid-template-columns', 'minmax(0,1fr) minmax(0,1fr)', 'important');
      row.style.setProperty('grid-auto-rows', '42px', 'important');
      row.style.setProperty('height', '42px', 'important');
      row.style.setProperty('max-height', '42px', 'important');
      row.style.setProperty('box-sizing', 'border-box', 'important');
      printButton.parentNode.insertAdjacentElement('afterend', row);
    }
    row.appendChild(button);
    button.style.setProperty('height', '42px', 'important');
    button.style.setProperty('min-height', '42px', 'important');
    button.style.setProperty('max-height', '42px', 'important');
    button.style.setProperty('box-sizing', 'border-box', 'important');
    button.style.setProperty('padding', '12px 8px', 'important');
    button.style.setProperty('margin', '0', 'important');
    button.style.setProperty('display', 'flex', 'important');
    button.style.setProperty('align-items', 'center', 'important');
    button.style.setProperty('justify-content', 'center', 'important');
    button.style.setProperty('flex', 'none', 'important');
  }



  // Reusable print entry point for the post-payment print dialog.
  // It reads the already-saved transaction from IndexedDB and never creates a transaction.
  async function printTransactionById(transactionId) {
    if (!isCapacitorNative()) throw new Error('Cetak langsung hanya tersedia di APK Android Nongki.');
    var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePrinter;
    if (!plugin || typeof plugin.getPairedBluetoothPrinters !== 'function' || typeof plugin.printBluetoothReceipt !== 'function') {
      throw new Error('Fitur Bluetooth tidak tersedia di APK ini. Perbarui APK Nongki terlebih dahulu.');
    }
    var result = await plugin.getPairedBluetoothPrinters();
    var devices = result && Array.isArray(result.devices) ? result.devices : [];
    if (!devices.length) throw new Error('Tidak ada printer terpasang. Pasangkan printer thermal melalui Pengaturan Bluetooth Android.');
    var selected = await selectBluetoothPrinter(devices, false);
    if (!selected) throw new Error('Pemilihan printer dibatalkan.');
    var txs = await loadTransactions();
    var tx = txs.find(function (item) {
      return String(item.id || item.id_transaksi || '') === String(transactionId || '');
    });
    if (!tx) throw new Error('Transaksi tidak ditemukan di riwayat lokal.');
    var widthInput = document.getElementById('thermalPrintWidth');
    var copiesInput = document.getElementById('thermalPrintCopies');
    var width = Number(widthInput && widthInput.value || localStorage.getItem('nongki_thermal_width')) === 80 ? 80 : 58;
    var copies = Math.max(1, Math.min(2, Number(copiesInput && copiesInput.value || localStorage.getItem('nongki_thermal_copies')) || 1));
    var receipt = Array.from({ length: copies }, function () { return buildBluetoothText(tx); }).join('\n');
    var logoBase64 = await receiptLogoBase64();
    await plugin.printBluetoothReceipt({
      address: selected.address,
      text: receipt,
      logoBase64: logoBase64,
      width: width
    });
    return { success: true, printerName: selected.name || selected.address, message: 'Struk berhasil dikirim ke printer ' + (selected.name || selected.address) + '.' };
  }

  window.NongkiNativePrint = window.NongkiNativePrint || {};
  window.NongkiNativePrint.printTransactionById = printTransactionById;

  function addNativeFeatures() {
    addNativeButton();
    addChangePrinterButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNativeFeatures, { once: true });
  else addNativeFeatures();
  document.addEventListener('click', function (event) {
    if (event.target.closest('.tabs [data-view="thermalPrintView"]')) setTimeout(addNativeFeatures, 0);
  });
})();
