/*
NONGKI — PATCH SINKRONISASI MASTER MENU
Skema harus sama dengan tab MASTER MENU pada file Log_Status_Nongki_PWA_Master_Menu.xlsx:
ID Produk | Nama Produk | Kategori | Harga Jual (Rp) | Ikon | Status Produk |
Terakhir Diubah | Diperbarui Oleh | Catatan

Jangan menaruh API_TOKEN di index.html/GitHub publik.
Tempelkan helper di bawah ke Code.gs, lalu tambahkan dua cabang sesuai petunjuk.
GET getMenu sengaja publik hanya untuk katalog menu (nama/kategori/harga/ikon/status);
semua aksi tulis tetap melewati pemeriksaan body.token yang sudah ada.
*/

// 1) Di doGet(e), setelah membuat p dan SEBELUM pemeriksaan token:
// if (p.action === 'getMenu') return getMasterMenuResponse_();

// 2) Di doPost(e), setelah JSON.parse dan pemeriksaan body.token,
// sebelum aksi transaksi:
// if (body.action === 'saveMenu') return saveMasterMenu_(body.products, body.updatedBy || 'Owner/Istri');

function getMasterMenuResponse_() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_LOG_ID);
    const sheet = ss.getSheetByName('MASTER MENU');
    if (!sheet || sheet.getLastRow() < 2) return jsonResponse({success:true,data:[]});
    const rows = sheet.getRange(2,1,sheet.getLastRow()-1,9).getValues();
    const data = rows.filter(r => String(r[1] || '').trim()).map(r => ({
      id:String(r[0] || ''), name:String(r[1] || '').trim(),
      category:String(r[2] || 'Lainnya'), price:Math.max(0,Number(r[3]) || 0),
      icon:String(r[4] || '🥤'),
      active:!/^(nonaktif|non-aktif|0|false)$/i.test(String(r[5] || 'AKTIF').trim())
    }));
    return jsonResponse({success:true,data:data});
  } catch (err) {
    return jsonResponse({success:false,error:String(err && err.message || err)});
  }
}

function saveMasterMenu_(products, updatedBy) {
  if (!Array.isArray(products) || products.length < 1 || products.length > 300) {
    throw new Error('Daftar menu kosong atau jumlah produk tidak valid');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_LOG_ID);
  const sheet = ss.getSheetByName('MASTER MENU');
  if (!sheet) throw new Error('Tab MASTER MENU belum ada. Gunakan spreadsheet terbaru yang memiliki tab MASTER MENU.');
  const headers = ['ID Produk','Nama Produk','Kategori','Harga Jual (Rp)','Ikon','Status Produk','Terakhir Diubah','Diperbarui Oleh','Catatan'];
  const actual = sheet.getRange(1,1,1,headers.length).getDisplayValues()[0].map(v => String(v).trim());
  if (headers.some((h,i) => actual[i] !== h)) throw new Error('Header MASTER MENU tidak sesuai dengan template terbaru');
  const oldLast = sheet.getLastRow();
  const oldRows = oldLast > 1 ? sheet.getRange(2,1,oldLast-1,headers.length).getValues() : [];
  const oldById = new Map(), oldByName = new Map();
  oldRows.forEach(r => {
    const id=String(r[0]||'').trim(), name=String(r[1]||'').trim().toLowerCase();
    if(id) oldById.set(id,r); if(name) oldByName.set(name,r);
  });
  const now=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');
  const ids=new Set(), names=new Set();
  const values=products.map((p,i) => {
    const name=String(p && p.name || '').trim().slice(0,120);
    if(!name) throw new Error('Nama produk urutan '+(i+1)+' kosong');
    const nk=name.toLowerCase(); if(names.has(nk)) throw new Error('Nama produk duplikat: '+name); names.add(nk);
    let id=String(p.id||'').trim(); const prev=oldById.get(id)||oldByName.get(nk);
    if(prev) id=String(prev[0]||id); if(!id) id='p'+(i+1);
    if(ids.has(id)) throw new Error('ID produk duplikat: '+id); ids.add(id);
    const price=Number(p.price);
    if(!Number.isFinite(price)||price<0||price>100000000) throw new Error('Harga tidak valid untuk '+name);
    return [id,name,String(p.category||'Lainnya').trim().slice(0,80),Math.round(price),
      String(p.icon||'🥤').slice(0,12),p.active===false?'NONAKTIF':'AKTIF',now,
      String(updatedBy||'Owner/Istri').slice(0,80),'Sinkronisasi PWA'];
  });
  // Hanya mengganti isi MASTER MENU. Sheet transaksi dan laporan tidak disentuh.
  if(oldLast>1) sheet.getRange(2,1,oldLast-1,headers.length).clearContent();
  sheet.getRange(2,1,values.length,headers.length).setValues(values);
  return jsonResponse({success:true,message:'Master menu tersimpan',count:values.length});
}
