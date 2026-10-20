/* Isolated receipt-print UI. Does not modify or replace login handlers. */
(() => {
  const $p = id => document.getElementById(id);
  let selectedPrintTransaction = null, bridgePromise = null;
  const originalRenderRecent = window.renderRecent;
  const originalRenderHistory = window.renderHistory;
  const originalRenderServerHistory = window.renderServerHistory;
  function loadBridge(){if(!bridgePromise)bridgePromise=import('./print-bridge.js');return bridgePromise;}
  function money(v){return 'Rp'+Math.round(Number(v)||0).toLocaleString('id-ID');}
  function escText(v){return String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
  function getTx(id){
    const local=typeof data!=='undefined'&&Array.isArray(data.transactions)?data.transactions.find(t=>String(t.id)===String(id)):null;
    if(local)return local;
    return typeof serverHistoryTransactions!=='undefined'&&Array.isArray(serverHistoryTransactions)?serverHistoryTransactions.find(t=>String(t.id)===String(id)):null;
  }
  function decorateRows(root){
    if(!root)return;
    root.querySelectorAll('.history-row[data-transaction-id]').forEach(row=>{
      if(row.querySelector('[data-print-transaction]'))return;
      const tx=getTx(row.dataset.transactionId);
      if(!tx||tx.status==='draft'||tx.status==='cancelled'||tx.status==='canceled')return;
      const b=document.createElement('button');b.type='button';b.className='btn tx-print-btn';b.textContent='Cetak';
      b.setAttribute('data-print-transaction',String(tx.id));b.setAttribute('aria-label','Cetak struk '+(tx.name||'transaksi'));row.appendChild(b);
    });
  }
  if(typeof originalRenderRecent==='function')window.renderRecent=function(){const r=originalRenderRecent.apply(this,arguments);decorateRows($p('recentList'));return r;};
  if(typeof originalRenderHistory==='function')window.renderHistory=function(){const r=originalRenderHistory.apply(this,arguments);decorateRows($p('historyList'));return r;};
  if(typeof originalRenderServerHistory==='function')window.renderServerHistory=function(){const r=originalRenderServerHistory.apply(this,arguments);decorateRows($p('historyList'));return r;};
  function itemsFor(tx){
    if(Array.isArray(tx.items)&&tx.items.length)return tx.items.map(i=>{const q=Number(i.quantity||i.qty||1),p=Number(i.unitPrice??i.price??0);return{name:i.productName||i.name||tx.name||'Produk',quantity:q,price:p,total:Number(i.lineTotal??i.total??p*q)};});
    const q=Math.max(1,Number(tx.qty||1)),total=Number(tx.total||0);return[{name:tx.name||tx.productName||'Transaksi Nongki',quantity:q,price:Number(tx.unitPrice||total/q),total}];
  }
  function receiptFor(tx){
    const items=itemsFor(tx),total=Number(tx.total??items.reduce((s,i)=>s+i.total,0));
    const width=$p('printReceiptWidth')?.value==='80'?'80mm':'58mm',contentWidth=width==='58mm'?'54mm':'76mm';
    const footer=$p('printReceiptFooter')?.value?.trim()||'Terima kasih, sampai jumpa!',date=tx.date||new Date().toLocaleDateString('id-ID'),time=tx.time||'',payment=tx.metodePembayaran||tx.paymentMethod||tx.payment_method||'';
    const text=['NONGKI','ICE • SNACK • COFFEE','--------------------------------','Tanggal: '+date,'Jam: '+time,'--------------------------------',...items.flatMap(i=>[i.name+' x'+i.quantity,money(i.price)+'    '+money(i.total)]),'--------------------------------','TOTAL: '+money(total),payment?'Bayar: '+payment:'','--------------------------------',footer].filter(Boolean).join('\n');
    const rows=items.map(i=>'<div class="item"><div>'+escText(i.name)+' × '+i.quantity+'</div><div class="amount"><span>'+money(i.price)+'</span><b>'+money(i.total)+'</b></div></div>').join('');
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@page{size:'+width+' auto;margin:2mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0 auto;padding:2mm;width:'+contentWidth+';font-size:10px;line-height:1.35}.center{text-align:center}.brand{font-weight:900;font-size:21px;letter-spacing:2px}.tag{font-size:9px;letter-spacing:1px;margin-bottom:10px}.dash{border-top:1px dashed #222;margin:7px 0}.meta{display:flex;justify-content:space-between;gap:6px}.item{padding:4px 0}.amount{display:flex;justify-content:space-between;gap:8px}.total{font-weight:800;font-size:13px;display:flex;justify-content:space-between;margin:8px 0}.footer{white-space:pre-wrap;text-align:center;margin-top:10px;font-size:9px}</style></head><body><div class="center"><div class="brand">NONGKI</div><div class="tag">ICE • SNACK • COFFEE</div></div><div class="dash"></div><div class="meta"><span>Tanggal</span><span>'+escText(date)+'</span></div><div class="meta"><span>Jam</span><span>'+escText(time)+'</span></div><div class="dash"></div>'+rows+'<div class="dash"></div><div class="total"><span>TOTAL</span><span>'+money(total)+'</span></div>'+(payment?'<div>Bayar: '+escText(payment)+'</div>':'')+'<div class="dash"></div><div class="footer">'+escText(footer)+'</div></body></html>';
    return{text,html};
  }
  function openModal(id){const tx=getTx(id);if(!tx){if(typeof window.toast==='function')window.toast('Transaksi tidak ditemukan untuk dicetak.');return;}if(tx.status==='draft'||tx.status==='cancelled'||tx.status==='canceled'){if(typeof window.toast==='function')window.toast('Keranjang atau transaksi batal tidak dapat dicetak sebagai struk penjualan.');return;}selectedPrintTransaction=tx;$p('printReceiptTitle').textContent='Cetak '+(tx.name||'transaksi');$p('printReceiptModal').hidden=false;renderPreview();}
  function renderPreview(){if(selectedPrintTransaction)$p('printReceiptPreview').textContent=receiptFor(selectedPrintTransaction).text;}
  function closeModal(){$p('printReceiptModal').hidden=true;selectedPrintTransaction=null;}
  document.addEventListener('click',async e=>{
    const trigger=e.target.closest('[data-print-transaction]');if(trigger){e.preventDefault();e.stopPropagation();openModal(trigger.dataset.printTransaction);return;}
    if(e.target.closest('#closePrintReceipt')){closeModal();return;}
    if(e.target.closest('#printReceiptCapacitor')){if(!selectedPrintTransaction)return;try{const b=await loadBridge();await b.printReceiptHtml(receiptFor(selectedPrintTransaction).html,'Struk Nongki');}catch(err){console.error('Capacitor Print gagal:',err);if(typeof window.toast==='function')window.toast('Cetak Capacitor gagal. Pastikan APK terbaru sudah terpasang.');}return;}
    if(e.target.closest('#printReceiptThermal')){if(!selectedPrintTransaction)return;try{const b=await loadBridge();await b.shareReceiptToThermal(receiptFor(selectedPrintTransaction).text,'Struk Nongki — Printer Thermal');}catch(err){console.error('Integrasi aplikasi thermal gagal:',err);if(typeof window.toast==='function')window.toast('Tidak dapat membuka pilihan aplikasi thermal.');}return;}
    if(e.target===$p('printReceiptModal'))closeModal();
  });
  $p('printReceiptWidth')?.addEventListener('change',renderPreview);$p('printReceiptFooter')?.addEventListener('input',renderPreview);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$p('printReceiptModal').hidden)closeModal();});
  decorateRows($p('recentList'));decorateRows($p('historyList'));
})();
