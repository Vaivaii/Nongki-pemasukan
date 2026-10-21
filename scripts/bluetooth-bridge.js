import { BluetoothPrinter } from '@kduma-autoid/capacitor-bluetooth-printer';

export async function listPairedBluetoothPrinters() {
  if (!window.Capacitor?.isNativePlatform?.()) {
    throw new Error('Cetak Bluetooth langsung hanya tersedia di APK Android.');
  }
  try {
    const result = await BluetoothPrinter.list();
    return Array.isArray(result?.devices) ? result.devices : [];
  } catch (error) {
    throw new Error('Tidak bisa membaca perangkat Bluetooth. Pastikan izin Bluetooth Android sudah diberikan.');
  }
}

export async function printBluetoothReceipt58(address, receiptText) {
  if (!address) throw new Error('Pilih printer Bluetooth yang sudah dipasangkan.');
  const text = String(receiptText ?? '')
    .replace(/[•·]/g, '-')
    .replace(/[×✕]/g, 'x')
    .replace(/[—–]/g, '-')
    .replace(/\u00a0/g, ' ');
  try {
    await BluetoothPrinter.connectAndPrint({ address, data: text });
  } catch (error) {
    throw new Error('Gagal mencetak melalui Bluetooth. Pastikan printer thermal sudah dipasangkan, aktif, dan mendukung Bluetooth Classic SPP.');
  } finally {
    try { await BluetoothPrinter.disconnect(); } catch (_) {}
  }
}
