import { EscPosPrinter, BluetoothPrinter } from '@fedejm/capacitor-esc-pos-printer';

function bytesFromText(text) {
  // Thermal printers commonly use a legacy code page; replace unsupported glyphs safely.
  const normalized = String(text ?? '')
    .replace(/[•·]/g, '-')
    .replace(/[×✕]/g, 'x')
    .replace(/[—–]/g, '-')
    .replace(/\u00a0/g, ' ');
  return Array.from(new TextEncoder().encode(normalized));
}

export async function listPairedBluetoothPrinters() {
  if (!window.Capacitor?.isNativePlatform?.()) {
    throw new Error('Cetak Bluetooth langsung hanya tersedia di APK Android.');
  }
  try { await EscPosPrinter.requestBluetoothEnable(); } catch (error) {
    // Some Android versions return a rejection when Bluetooth is disabled or permission is denied.
    throw new Error('Bluetooth belum aktif atau izin Bluetooth belum diberikan. Aktifkan Bluetooth lalu coba lagi.');
  }
  const result = await EscPosPrinter.getBluetoothPrinterDevices();
  return Array.isArray(result?.devices) ? result.devices : [];
}

function wrapLine(value, width = 32) {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    if (word.length > width) {
      if (line) { lines.push(line); line = ''; }
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
    } else if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function printBluetoothReceipt58(address, receiptText) {
  if (!address) throw new Error('Pilih printer Bluetooth yang sudah dipasangkan.');
  const printer = new BluetoothPrinter(address);
  let connected = false;
  try {
    await printer.link();
    await printer.connect();
    connected = true;
    await printer.send([0x1B, 0x40]);        // ESC @: initialize
    await printer.send([0x1B, 0x61, 0x01]); // center
    await printer.send(bytesFromText('NONGKI\n'));
    await printer.send(bytesFromText('ICE - SNACK - COFFEE\n'));
    await printer.send([0x1B, 0x61, 0x00]); // left
    await printer.send(bytesFromText('--------------------------------\n'));
    const lines = String(receiptText ?? '').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line) {
        await printer.send([0x0A]);
        continue;
      }
      for (const wrapped of wrapLine(line, 32)) {
        await printer.send(bytesFromText(wrapped + '\n'));
      }
    }
    await printer.send([0x0A, 0x0A, 0x0A]); // feed before tear-off
  } finally {
    if (connected) {
      try { await printer.disconnect(); } catch (_) {}
    }
    try { await printer.dispose(); } catch (_) {}
  }
}
