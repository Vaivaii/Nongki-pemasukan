import { Print } from '@capacitor-community/print';
import { Share } from '@capacitor/share';

export async function printReceiptHtml(content, name = 'Struk Nongki') {
  return Print.print({ name, content });
}

export async function shareReceiptToThermal(text, title = 'Struk Nongki') {
  return Share.share({ title, text, dialogTitle: 'Pilih aplikasi printer thermal' });
}
