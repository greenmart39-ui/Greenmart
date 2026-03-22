// ══════════════════════════════════════════
// DB — shared with admin/customer (same DB name + version)
// ══════════════════════════════════════════
let db;
const DB_NAME='MartSuperDB2', DB_VER=7;
function idb(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VER);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      ['products','orders','customers','offers','bulkoffers','cashoffers','complaints','zones','reminders','notifications','tiers','settings','routes','branches','branchStock'].forEach(s=>{
        if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,s==='settings'?{keyPath:'key'}:{keyPath:'id',autoIncrement:true})
      });
    };
    r.onsuccess=e=>{db=e.target.result;res(db)};
    r.onerror=e=>rej(e);
  });
}
const ga=s=>new Promise((res,rej)=>{const t=db.transaction(s,'readonly');const r=t.objectStore(s).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const pa=async(s,d)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');const r=t.objectStore(s).add(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const pu=async(s,d)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');const r=t.objectStore(s).put(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
let S={products:[],orders:[],customers:[],tiers:[],settings:{},branches:[],branchStock:[]};
let cart=[], payMethod='cash', discType='pct', activeMember=null;
let activeTab='retail', rtSub='walkin', wsSub='walkin', wsPay='cash';
let billNum=1, heldBills=[], searchQ='', catFilter='all';
let currentBranch=null; // set on login

async function loadAll(){
  for(const k of['products','orders','customers','tiers','branches','branchStock']) S[k]=await ga(k);
  const sets=await ga('settings'); sets.forEach(s=>S.settings[s.key]=s.value);
}

// Branch stock helpers
function getBranchStock(pid){
  if(!currentBranch) return S.products.find(x=>x.id===pid)?.stock||0;
  const rec=S.branchStock.find(b=>b.branchId===currentBranch.id&&b.productId===pid);
  return rec?rec.stock:0;
}
async function deductBranchStock(pid,qty){
  if(!currentBranch){
    const p=S.products.find(x=>x.id===pid);if(p){p.stock=Math.max(0,p.stock-qty);await pu('products',p);}
    return;
  }
  const rec=S.branchStock.find(b=>b.branchId===currentBranch.id&&b.productId===pid);
  if(rec){rec.stock=Math.max(0,rec.stock-qty);await pu('branchStock',rec);}
  else{await pa('branchStock',{branchId:currentBranch.id,productId:pid,stock:0});}
}

// ══════════════════════════════════════════
// FLOATING CUSTOMER PANEL
// ══════════════════════════════════════════
let custPanelOpen=false;

function openCustPanel(){
  custPanelOpen=true;
  const p=document.getElementById('cust-float-panel');
  if(p){p.style.transform='translateY(0) scale(1)';p.style.opacity='1';p.style.pointerEvents='all';}
  const a=document.getElementById('cust-float-arrow');if(a)a.textContent='▼';
  const q=document.getElementById('cust-float-q');if(q){q.value='';q.focus();}
  document.getElementById('cust-float-results').style.display='none';
}
function closeCustPanel(){
  custPanelOpen=false;
  const p=document.getElementById('cust-float-panel');
  if(p){p.style.transform='translateY(12px) scale(.97)';p.style.opacity='0';p.style.pointerEvents='none';}
  const a=document.getElementById('cust-float-arrow');if(a)a.textContent='▲';
}
function toggleCustPanel(){custPanelOpen?closeCustPanel():openCustPanel();}

function custFloatSearch(q){
  const res=document.getElementById('cust-float-results');
  const clr=document.getElementById('cust-float-q-clear');
  if(clr)clr.style.display=q?'block':'none';
  if(!q.trim()){res.style.display='none';return;}
  const matches=S.customers.filter(c=>c.type==='retail'&&(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,8);
  if(!matches.length){res.innerHTML=`<div style="padding:12px;text-align:center;color:var(--text3);font-size:13px">ගනුදෙනුකරු නොමැත</div>`;res.style.display='block';return;}
  res.style.display='block';
  res.innerHTML=matches.map(c=>`<div onclick="inlineCustSelect(${c.id})" style="padding:9px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:.1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px">${c.name}</div>
    <div style="font-size:12px;color:var(--text3)">${c.phone||'—'} · ⭐ ${c.loyaltyPoints||0} pts</div>
  </div>`).join('');
}

function updateCustFloatBtn(){
  const lbl=document.getElementById('cust-float-label');
  const chip=document.getElementById('cust-float-chip');
  const btn=document.getElementById('cust-float-btn');
  if(!lbl) return;
  if(activeMember){
    lbl.textContent=activeMember.name;
    if(chip){chip.textContent=`⭐ ${activeMember.loyaltyPoints||0}`;chip.style.display='inline';}
    if(btn)btn.style.background='var(--accent2)';
  } else {
    lbl.textContent='Walk-in Retail';
    if(chip)chip.style.display='none';
    if(btn)btn.style.background='var(--accent)';
  }
}
async function doPosLogin(){
  const pin=document.getElementById('pos-pin').value.trim();
  if(!pin){document.getElementById('login-err').textContent='PIN ඇතුල් කරන්න';return}
  await idb(); await loadAll();
  // Check branch PIN first
  const branch=S.branches.find(b=>b.pin===pin&&b.active!==false);
  if(branch){
    currentBranch=branch;
    document.getElementById('login-screen').style.display='none';
    document.getElementById('app').classList.add('show');
    document.getElementById('tb-branch-name').textContent=`🏪 ${branch.name}`;
    startPOS();return;
  }
  // Central PIN
  const stored=S.settings?.adminPass||'admin123';
  if(pin===stored){
    currentBranch=null;
    document.getElementById('login-screen').style.display='none';
    document.getElementById('app').classList.add('show');
    document.getElementById('tb-branch-name').textContent='🏢 Central';
    startPOS();
  } else {
    document.getElementById('login-err').textContent='PIN වැරදිය. නැවත උත්සාහ කරන්න.';
    setTimeout(()=>document.getElementById('login-err').textContent='',2500);
  }
}
function doPosLogout(){
  if(cart.length&&!confirm('Bill items ඇත. Exit කරන්නද?')) return;
  document.getElementById('app').classList.remove('show');
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('pos-pin').value='';
  currentBranch=null;
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
function startPOS(){
  updateStats(); renderCats(); renderGrid();
  updateBillNum();
  clearInterval(window._clock);
  window._clock=setInterval(()=>{
    const t=new Date();
    const el=document.getElementById('tb-time');
    const bt=document.getElementById('bill-time');
    if(el) el.textContent=t.toLocaleTimeString();
    if(bt) bt.textContent=t.toLocaleTimeString();
  },1000);
  // Poll for product/customer/branch stock updates every 5s (real-time sync with admin)
  clearInterval(window._poll);
  window._poll=setInterval(async()=>{await loadAll();updateStats();renderGrid();},5000);
}

// ══════════════════════════════════════════
// STATS
// ══════════════════════════════════════════
function updateStats(){
  const today=new Date().toDateString();
  // Filter by branch: if logged in as branch → show that branch's orders only
  // If central login → show central (no branchId) orders only
  let ords=S.orders.filter(o=>new Date(o.date).toDateString()===today&&o.source==='pos'&&o.status!=='cancelled'&&!o.isBranchOrder);
  if(currentBranch){
    ords=ords.filter(o=>o.branchId===currentBranch.id);
  } else {
    ords=ords.filter(o=>!o.branchId);
  }
  const cash=ords.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const card=ords.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const b2b=ords.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
  document.getElementById('stat-rev').textContent=`රු. ${Math.round(cash+card+b2b).toLocaleString()}`;
  document.getElementById('stat-cnt').textContent=ords.length;
  document.getElementById('stat-cash').textContent=`රු. ${Math.round(cash).toLocaleString()}`;
  document.getElementById('stat-card').textContent=`රු. ${Math.round(card).toLocaleString()}`;
  const b2bEl=document.getElementById('stat-b2b');if(b2bEl)b2bEl.textContent=`රු. ${Math.round(b2b).toLocaleString()}`;
  // Update topbar label to show which context
  const lbl=document.getElementById('stat-context-lbl');
  if(lbl) lbl.textContent=currentBranch?`🏪 ${currentBranch.name}`:'🏢 Central POS';
}
function updateBillNum(){
  document.getElementById('bill-num').textContent=`BILL #${String(billNum).padStart(4,'0')}`;
  document.getElementById('bill-time').textContent=new Date().toLocaleTimeString();
}

// ══════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════
function renderCats(){
  const cats=['all',...new Set(S.products.map(p=>p.category))];
  const icons={'all':'★','Grains & Rice':'🌾','Dairy':'🥛','Beverages':'🥤','Snacks':'🍿','Vegetables':'🍅','Fruits':'🍌','Meat & Fish':'🍗','Bakery':'🍞','Household':'🧴','Personal Care':'🧼'};
  document.getElementById('prod-cats').innerHTML=cats.map(c=>`<div class="prod-cat ${c===catFilter?'act':''}" onclick="setCat('${c}',this)">${icons[c]||'📦'} ${c==='all'?'All':c}</div>`).join('');
}
function setCat(c,el){catFilter=c;document.querySelectorAll('.prod-cat').forEach(x=>x.classList.remove('act'));el.classList.add('act');renderGrid();}
function filterProds(q){searchQ=q.toLowerCase();renderGrid();}

function renderGrid(){
  const isWS=activeTab==='wholesale';
  let prods=S.products;
  if(catFilter!=='all') prods=prods.filter(p=>p.category===catFilter);
  if(searchQ) prods=prods.filter(p=>p.name.toLowerCase().includes(searchQ)||(p.barcode||'').includes(searchQ));
  document.getElementById('prod-grid').innerHTML=prods.map(p=>{
    const ape=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
    const wik=p.retailPrice||ape;
    const stock=getBranchStock(p.id);
    const oos=stock<=0;
    const inCart=cart.find(i=>i.pid===p.id);
    return `<div class="prod-card ${oos?'oos':''} ${inCart?'in-cart':''}" onclick="${oos?'':'addItem('+p.id+')'}">
      ${inCart?`<div class="prod-qty-badge">${inCart.qty}</div>`:''}
      <div class="prod-img">${p.image?`<img src="${p.image}" alt="">`:(p.icon||'📦')}</div>
      <div class="prod-name">${p.name}</div>
      ${p.isScale?`<div style="font-size:13px;color:var(--teal)">⚖ Scale</div>`:''}
      <div class="prod-wik">රු. ${wik.toFixed(0)}</div>
      <div class="prod-price" style="color:${isWS?'var(--teal)':'var(--accent)'}">රු. ${ape.toFixed(0)}</div>
      ${p.barcode?`<div class="prod-stock">🔲 ${p.barcode}</div>`:''}
      <div class="prod-stock">${oos?'Out of stock':`Stk: ${stock}`}</div>
    </div>`;
  }).join('')||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">No products</div>`;
}

function scanBarcode(code){
  code=(code||'').trim();
  const inp=document.getElementById('bc-inp');
  if(!code){inp.focus();return}
  const p=S.products.find(x=>x.barcode&&x.barcode===code);
  if(!p){toast(`Barcode "${code}" — product හමු නොවිය`,'error');inp.value='';inp.focus();return}
  if(p.stock<=0){toast(`${p.name} — ගබඩාවේ නැත`,'error');inp.value='';inp.focus();return}
  addItem(p.id);
  inp.value='';inp.focus();
  const card=document.getElementById('prod-grid').querySelector(`[onclick="addItem(${p.id})"]`);
  if(card){card.style.outline='3px solid var(--teal)';setTimeout(()=>{card.style.outline=''},700);}
}

// ══════════════════════════════════════════
// CART
// ══════════════════════════════════════════
let scaleTarget=null,priceChangeIdx=null;
function addItem(pid){
  const p=S.products.find(x=>x.id===pid);if(!p) return;
  const stock=getBranchStock(pid);
  if(stock<=0){toast(`${p.name} — ගබඩාවේ නැත`,'error');return}
  if(p.isScale){openScaleModal(pid);return;}
  const isWS=activeTab==='wholesale';
  const ape=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
  const wik=p.retailPrice||ape;
  const ex=cart.find(i=>i.pid===pid);
  if(ex){if(ex.qty<stock)ex.qty++;else{toast(`Max stock: ${stock}`,'error');return;}}
  else cart.push({pid,name:p.name,icon:p.icon||'📦',image:p.image||null,price:ape,wikunumMila:wik,barcode:p.barcode||null,qty:1,isScale:false});
  renderItems(); updateBill(); renderGrid();
  const card=document.getElementById('prod-grid').querySelector(`[onclick="addItem(${pid})"]`);
  if(card){card.style.transform='scale(0.94)';setTimeout(()=>{card.style.transform=''},150);}
}
function openScaleModal(pid){
  const p=S.products.find(x=>x.id===pid);if(!p)return;
  scaleTarget=pid;
  const isWS=activeTab==='wholesale';
  const unitP=p.unitPrice||0;
  const ape=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
  const wik=p.retailPrice||ape;
  document.getElementById('scale-name').textContent=p.name;
  document.getElementById('scale-unit-lbl').textContent=unitP>0?`⚖️ Unit Price: රු. ${unitP.toFixed(2)} per kg/unit — ප්‍රමාණය enter කරන්න`:'⚖️ Quantity/weight enter කරන්න';
  document.getElementById('scale-qty').value='';
  document.getElementById('scale-ape-disp').textContent='—';
  document.getElementById('scale-wik-disp').textContent='';
  document.getElementById('scale-qty').dataset.unitPrice=unitP;
  document.getElementById('scale-qty').dataset.ape=ape;
  document.getElementById('scale-qty').dataset.wik=wik;
  openMo('scale-modal');
  setTimeout(()=>document.getElementById('scale-qty').focus(),100);
}
function scaleCalc(){
  const inp=document.getElementById('scale-qty');
  const qty=parseFloat(inp.value)||0;
  const unitP=parseFloat(inp.dataset.unitPrice)||0;
  const ape=parseFloat(inp.dataset.ape)||0;
  const wik=parseFloat(inp.dataset.wik)||0;
  if(qty>0){
    const effApe=unitP>0?unitP:ape;
    const effWik=unitP>0?(wik>0?wik:unitP):wik;
    document.getElementById('scale-ape-disp').textContent=`⭐ අපේ මිල: රු. ${(effApe*qty).toFixed(2)}`;
    document.getElementById('scale-wik-disp').textContent=`විකිණීමේ: රු. ${(effWik*qty).toFixed(2)}`;
  } else {
    document.getElementById('scale-ape-disp').textContent='—';
    document.getElementById('scale-wik-disp').textContent='';
  }
}
function scaleConfirm(){
  const pid=scaleTarget;if(!pid)return;
  const p=S.products.find(x=>x.id===pid);if(!p)return;
  const inp=document.getElementById('scale-qty');
  const qty=parseFloat(inp.value)||0;
  if(qty<=0){toast('Weight/quantity enter කරන්න','error');return;}
  const unitP=parseFloat(inp.dataset.unitPrice)||0;
  const ape=parseFloat(inp.dataset.ape)||0;
  const wik=parseFloat(inp.dataset.wik)||0;
  const effApe=unitP>0?unitP:ape;
  const effWik=unitP>0?(wik>0?wik:unitP):wik;
  const ex=cart.find(i=>i.pid===pid);
  if(ex){ex.qty=qty;ex.price=effApe;ex.wikunumMila=effWik;}
  else cart.push({pid,name:p.name,icon:p.icon||'📦',image:p.image||null,price:effApe,wikunumMila:effWik,barcode:p.barcode||null,qty,isScale:true});
  closeMo('scale-modal');scaleTarget=null;
  renderItems();updateBill();renderGrid();
  toast(`${p.name} — ${qty} kg/units ✓`,'success');
}
function openPriceChange(idx){
  const it=cart[idx];if(!it)return;
  priceChangeIdx=idx;
  document.getElementById('price-modal-name').textContent=`${it.icon} ${it.name} — Current: රු. ${it.price.toFixed(2)}`;
  document.getElementById('price-modal-val').value=it.price.toFixed(2);
  openMo('price-modal');
  setTimeout(()=>{const i=document.getElementById('price-modal-val');if(i)i.select();},100);
}
function priceConfirm(){
  const idx=priceChangeIdx;if(idx===null||idx===undefined)return;
  const it=cart[idx];if(!it)return;
  const v=parseFloat(document.getElementById('price-modal-val').value)||0;
  if(v<0){toast('නිවැරදි මිලක් ඇතුල් කරන්න','error');return}
  it.price=v;closeMo('price-modal');priceChangeIdx=null;
  renderItems();updateBill();
  toast(`✓ ${it.name} — රු. ${v.toFixed(2)}`,'success');
}

function changeQty(idx,d){
  const it=cart[idx];if(!it)return;
  const p=S.products.find(x=>x.id===it.pid);
  it.qty+=d;
  if(it.qty<=0)cart.splice(idx,1);
  else if(p&&it.qty>p.stock)it.qty=p.stock;
  renderItems(); updateBill(); renderGrid();
}
function removeItem(idx){cart.splice(idx,1);renderItems();updateBill();renderGrid();}

function renderItems(){
  const el=document.getElementById('bill-items');
  if(!cart.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:13px"><div style="font-size:40px;margin-bottom:10px;opacity:.15">🛒</div>Bill හිස්ය — දකුණු පැත්තේ product click කරන්න</div>`;
    return;
  }
  const header=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:5px;align-items:center;padding:5px 10px;background:var(--bg2);border-radius:7px;margin-bottom:5px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--text3)">
    <span>නිෂ්පාදනය</span><span style="text-align:right">විකිණීමේ</span><span style="text-align:right">⭐ අපේ</span><span style="text-align:center">ප්‍රමාණය</span><span style="text-align:right">සම්පූර්ණ</span><span></span>
  </div>`;
  el.innerHTML=header+cart.map((it,idx)=>{
    const lineApe=it.price*it.qty;
    const lineWik=(it.wikunumMila||it.price)*it.qty;
    const saving=lineWik-lineApe;
    const scaleBadge=it.isScale?`<span style="font-size:13px;background:rgba(8,145,178,.12);color:var(--teal);border:1px solid rgba(8,145,178,.3);border-radius:3px;padding:1px 4px;margin-left:3px">⚖</span>`:'';
    const qtyCell=it.isScale
      ?`<input type="number" step="0.001" value="${it.qty}" style="width:52px;font-size:13px;font-weight:700;color:var(--teal);background:var(--bg2);border:1.5px solid rgba(8,145,178,.5);border-radius:5px;padding:2px 4px;text-align:center" onchange="scaleQtyChange(${idx},this.value)" title="kg/weight"> <span style="font-size:13px;color:var(--teal)">kg</span>`
      :`<button class="qbtn" onclick="changeQty(${idx},-1)" style="width:23px;height:23px">−</button><span class="qval" style="font-size:13px;font-weight:700;min-width:22px">${it.qty}</span><button class="qbtn" onclick="changeQty(${idx},+1)" style="width:23px;height:23px">+</button>`;
    return `<div class="bill-item" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:5px;align-items:center;padding:7px 10px;border-left:${it.isScale?'3px solid var(--teal)':'3px solid transparent'}">
      <div style="min-width:0">
        <div class="bi-name" style="margin-bottom:2px">${it.image?`<img src="${it.image}" style="width:15px;height:15px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-right:3px" alt="">`:(it.icon+' ')}${it.name}${scaleBadge}</div>
        <div style="font-size:12px;color:var(--text3)">× ${it.qty}${it.isScale?' kg':''} · රු. ${it.price.toFixed(2)}${saving>0?` <span style="color:var(--green);font-weight:600">[රු. ${saving.toFixed(2)} ඉතිරිවිය]</span>`:''}</div>
      </div>
      <div style="text-align:right"><span style="font-size:13px;color:var(--text3);text-decoration:line-through">රු. ${(it.wikunumMila||it.price).toFixed(2)}</span></div>
      <div style="text-align:right">
        <input type="number" step="0.01" value="${it.price.toFixed(2)}" style="width:70px;font-size:13px;font-weight:700;color:var(--accent);background:rgba(232,255,71,.06);border:1px solid rgba(232,255,71,.3);border-radius:4px;padding:2px 4px;text-align:right" title="💱 මිල වෙනස් කරන්න" onchange="itemPriceChange(${idx},this.value)">
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:3px">${qtyCell}</div>
      <div style="text-align:right"><div class="bi-total" style="font-size:13px">රු. ${lineApe.toFixed(2)}</div></div>
      <button class="qbtn rm" onclick="removeItem(${idx})" style="font-size:13px;width:22px;height:22px">✕</button>
    </div>`;
  }).join('');
}
function itemPriceChange(idx,val){const it=cart[idx];if(!it)return;const v=parseFloat(val);if(!isNaN(v)&&v>=0)it.price=v;updateBill();}
function scaleQtyChange(idx,val){const it=cart[idx];if(!it)return;const q=parseFloat(val)||0;if(q<=0)cart.splice(idx,1);else it.qty=q;renderItems();updateBill();renderGrid();}

// ══════════════════════════════════════════
// BILL CALCULATIONS
// ══════════════════════════════════════════
function updateBill(){
  const apeSub=cart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=cart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const handSave=wikSub-apeSub;
  const dv=parseFloat(document.getElementById('disc-val').value)||0;
  let discAmt=discType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);if(dv<=0)discAmt=0;
  const total=Math.max(0,apeSub-discAmt);
  document.getElementById('s-wik').textContent=`රු. ${wikSub.toFixed(2)}`;
  document.getElementById('s-hand').textContent=`රු. ${handSave.toFixed(2)}`;
  document.getElementById('s-ape').textContent=`රු. ${apeSub.toFixed(2)}`;
  const dr=document.getElementById('s-disc-row');
  if(discAmt>0){dr.style.display='flex';document.getElementById('s-disc').textContent=`−රු. ${discAmt.toFixed(2)}`;}
  else dr.style.display='none';
  document.getElementById('s-total').textContent=`රු. ${total.toFixed(2)}`;
  document.getElementById('complete-btn').disabled=cart.length===0;
  updateB2BPanel(); calcChange();
}

function updateB2BPanel(){
  const panel=document.getElementById('b2b-panel');
  if(!panel)return;
  const isB2B=payMethod==='bill_to_bill';
  if(isB2B){
    panel.style.display='block';
    const fb=activeMember?(activeMember.forwardBalance||0):0;
    const total=parseFloat((document.getElementById('s-total').textContent||'').replace('රු. ',''))||0;
    const grand=fb+total;
    document.getElementById('b2b-existing').textContent=`රු. ${fb.toFixed(2)}`;
    document.getElementById('b2b-existing').style.color=fb>0?'var(--red)':'var(--green)';
    document.getElementById('b2b-this').textContent=`රු. ${total.toFixed(2)}`;
    document.getElementById('b2b-grand').textContent=`රු. ${grand.toFixed(2)}`;
    document.getElementById('b2b-grand').style.color=grand>0?'var(--red)':'var(--green)';
  } else panel.style.display='none';
}

// ══════════════════════════════════════════
// PAYMENT
// ══════════════════════════════════════════
function setDiscType(t){
  discType=t;
  document.getElementById('disc-pct').classList.toggle('act',t==='pct');
  document.getElementById('disc-lkr').classList.toggle('act',t==='lkr');
  updateBill();
}

function setPay(m){
  payMethod=m;
  document.getElementById('pay-cash').className='pay-btn'+(m==='cash'?' sel-cash':'');
  document.getElementById('pay-card').className='pay-btn'+(m==='card'?' sel-card':'');
  const b2bBtn=document.getElementById('pay-b2b');
  if(b2bBtn) b2bBtn.className='pay-btn'+(m==='bill_to_bill'?' sel-b2b':'');
  const isB2B=m==='bill_to_bill';
  document.getElementById('cash-row').style.display=isB2B?'none':'flex';
  if(!isB2B){
    document.getElementById('cash-summary').style.display='none';
    document.getElementById('change-disp').textContent='ඉතිරි: —';
  }
  updateB2BPanel(); calcChange();
}

function calcChange(){
  const total=parseFloat((document.getElementById('s-total').textContent||'').replace('රු. ',''))||0;
  const given=parseFloat(document.getElementById('cash-given').value)||0;
  const el=document.getElementById('change-disp');
  const sum=document.getElementById('cash-summary');
  if((payMethod==='cash'||payMethod==='card')&&given>0){
    const chg=payMethod==='cash'?given-total:0;
    el.textContent=payMethod==='card'?`ගෙවූ: රු. ${given.toFixed(2)}`:(chg>=0?`ඉතිරි: රු. ${chg.toFixed(2)}`:`අඩු: රු. ${Math.abs(chg).toFixed(2)}`);
    el.style.color=(payMethod==='card'||chg>=0)?'var(--green)':'var(--red)';
    if(payMethod==='cash'&&chg>=0&&sum){
      sum.style.display='block';
      document.getElementById('c-gewu').textContent=`රු. ${given.toFixed(2)}`;
      document.getElementById('c-ithiri').textContent=`රු. ${chg.toFixed(2)}`;
    } else if(sum) sum.style.display='none';
  } else {
    el.textContent='ඉතිරි: —';el.style.color='var(--green)';
    if(sum) sum.style.display='none';
  }
}

// ══════════════════════════════════════════
// CUSTOMER TABS
// ══════════════════════════════════════════
function switchTab(tab){
  activeTab=tab;
  // Only wholesale uses the floating panel
  if(tab==='retail'){
    // Clear wholesale member if switching to retail
    if(activeMember&&activeMember.type==='wholesale'){activeMember=null;resetBadge('ws');}
    wsSub='walkin';wsPay='cash';
    const b2bBtn=document.getElementById('pay-b2b');
    if(b2bBtn) b2bBtn.style.display='none';
    if(payMethod==='bill_to_bill') setPay('cash');
  } else {
    wsSub='walkin';wsPay='cash';
    document.getElementById('ws-walkin').classList.add('active');
    document.getElementById('ws-member').classList.remove('active');
    document.getElementById('ws-member-panel').style.display='none';
    document.getElementById('ws-pay-row').style.display='none';
    const b2bBtn=document.getElementById('pay-b2b');
    if(b2bBtn) b2bBtn.style.display='block';
  }
  resetCartPrices(); renderGrid(); renderItems(); updateBill(); updateCustFloatBtn();
}

function setSubTab(tab,sub){
  if(tab==='retail'){
    rtSub=sub;
    // Retail sub-tabs don't exist in floating panel anymore
  } else {
    wsSub=sub;
    document.getElementById('ws-walkin').classList.toggle('active',sub==='walkin');
    document.getElementById('ws-member').classList.toggle('active',sub==='member');
    document.getElementById('ws-member-panel').style.display=sub==='member'?'block':'none';
    document.getElementById('ws-pay-row').style.display=sub==='member'?'block':'none';
    if(sub==='walkin'){activeMember=null;resetBadge('ws');}
  }
  resetCartPrices(); renderGrid(); renderItems(); updateBill(); updateCustFloatBtn();
}

function resetBadge(pfx){
  const q=document.getElementById(pfx+'-q');
  const res=document.getElementById(pfx+'-results');
  const badge=document.getElementById(pfx+'-badge');
  if(q) q.value='';
  if(res) res.style.display='none';
  if(badge) badge.style.display='none';
}

function resetCartPrices(){
  // When tab changes, recalculate prices in cart
  const isWS=activeTab==='wholesale';
  cart.forEach(it=>{
    const p=S.products.find(x=>x.id===it.pid);
    if(p){it.price=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);it.wikunumMila=p.retailPrice||it.price;}
  });
}

function setWsPay(method){
  wsPay=method;
  document.getElementById('ws-cash-btn').classList.toggle('active',method==='cash');
  document.getElementById('ws-b2b-btn').classList.toggle('active',method==='bill_to_bill');
  setPay(method);
  updateWsBalInfo();
}

function updateWsBalInfo(){
  const info=document.getElementById('b2b-bal-info');
  if(!info)return;
  if(activeMember&&wsPay==='bill_to_bill'){
    const fb=activeMember.forwardBalance||0;
    if(fb>0){info.style.display='block';document.getElementById('b2b-bal-amt').textContent=`රු. ${fb.toFixed(2)}`;}
    else info.style.display='none';
  } else info.style.display='none';
  updateB2BPanel();
}

function lookupCust(q,type){
  const resEl=document.getElementById(type==='retail'?'rt-results':'ws-results');
  if(!q.trim()){resEl.style.display='none';return}
  const matches=S.customers.filter(c=>c.type===type&&(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,8);
  if(!matches.length){resEl.style.display='none';return}
  resEl.style.display='block';
  resEl.innerHTML=matches.map(c=>`<div class="cust-result-item" style="display:flex;justify-content:space-between;align-items:center">
    <div onclick="selectCust(${c.id},'${type}')" style="flex:1;cursor:pointer">
      <span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">${c.name}</span>
      ${c.businessName?`<span style="font-size:13px;color:var(--text3);margin-left:4px">${c.businessName}</span>`:''}
      ${c.route?`<span style="font-size:13px;color:var(--teal);margin-left:4px">🗺 ${c.route}</span>`:''}
      <br><span style="font-size:13px;color:var(--accent)">⭐ ${c.loyaltyPoints||0} pts</span>
      ${type==='wholesale'&&(c.forwardBalance||0)>0?`<span style="font-size:13px;color:var(--red);margin-left:6px">📋 රු. ${(c.forwardBalance||0).toFixed(0)}</span>`:''}
    </div>
    <button onclick="event.stopPropagation();openCustHistory(${c.id})" style="background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.25);color:var(--teal);border-radius:5px;padding:3px 8px;font-size:13px;cursor:pointer;flex-shrink:0">📋 History</button>
  </div>`).join('');
}

function selectCust(id,type){
  // Retail customers are handled by inlineCustSelect
  if(type==='retail'){inlineCustSelect(id);return;}
  // Wholesale
  activeMember=S.customers.find(x=>x.id===id);if(!activeMember)return;
  document.getElementById('ws-results').style.display='none';
  document.getElementById('ws-q').value=activeMember.name;
  const fb=activeMember.forwardBalance||0;
  const badge=document.getElementById('ws-badge');
  badge.style.display='flex';badge.style.justifyContent='space-between';badge.style.alignItems='center';
  badge.innerHTML=`<div>
    <span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">👤 ${activeMember.name}</span>
    ${activeMember.businessName?`<br><span style="font-size:13px;color:var(--text3)">${activeMember.businessName}</span>`:''}
    <br><span style="font-size:13px;color:var(--accent)">⭐ ${activeMember.loyaltyPoints||0} pts</span>
    ${fb>0?`<br><span style="font-size:13px;color:var(--red)">📋 Credit: රු. ${fb.toFixed(2)}</span>`:''}
  </div>
  <button onclick="clearCust('wholesale')" style="background:none;border:none;font-size:13px;color:var(--text3);cursor:pointer;padding:0 4px">✕</button>`;
  activeTab='wholesale';
  const defPay=activeMember.defaultPayment||'cash';
  wsPay=defPay;
  document.getElementById('ws-cash-btn').classList.toggle('active',defPay==='cash');
  document.getElementById('ws-b2b-btn').classList.toggle('active',defPay==='bill_to_bill');
  setPay(defPay);
  updateWsBalInfo();
  resetCartPrices(); renderGrid(); renderItems(); updateBill(); updateCustFloatBtn();
  closeCustPanel();
}

function clearCust(type){
  if(type==='retail'){inlineCustClear();return;}
  activeMember=null; resetBadge('ws');
  activeTab='retail';
  if(payMethod==='bill_to_bill') setPay('cash');
  updateWsBalInfo(); resetCartPrices(); renderGrid(); updateBill(); updateCustFloatBtn();
}

// ══════════════════════════════════════════
// INLINE CUSTOMER SELECTOR (in bill head, retail only)
// ══════════════════════════════════════════
function inlineCustLookup(q){
  const res=document.getElementById('inline-cust-results');
  if(!q.trim()){res.style.display='none';return}
  const matches=S.customers.filter(c=>c.type==='retail'&&(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,8);
  if(!matches.length){res.style.display='none';return}
  res.style.display='block';
  res.innerHTML=matches.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''" onclick="inlineCustSelect(${c.id})">
    <div>
      <span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">${c.name}</span>
      <span style="font-size:13px;color:var(--text3);margin-left:6px">${c.phone||''}</span>
    </div>
    <div style="text-align:right;font-size:13px">
      <span style="color:var(--accent)">⭐ ${c.loyaltyPoints||0} pts</span>
      <button onclick="event.stopPropagation();openCustHistory(${c.id})" style="background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.25);color:var(--teal);border-radius:4px;padding:2px 6px;font-size:13px;cursor:pointer;margin-left:5px">📋</button>
    </div>
  </div>`).join('');
}

function inlineCustSelect(id){
  activeMember=S.customers.find(x=>x.id===id);
  if(!activeMember) return;
  // Update compact head badge
  const hl=document.getElementById('cust-head-label');
  const hb=document.getElementById('cust-head-badge');
  const hc=document.getElementById('cust-head-clear');
  if(hl){
    hl.innerHTML=`<span style="width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;margin-right:6px;flex-shrink:0">${activeMember.name[0].toUpperCase()}</span><strong>${activeMember.name}</strong> · ⭐ ${activeMember.loyaltyPoints||0} pts`;
    hl.style.color='var(--text)';
  }
  if(hb){hb.style.borderColor='var(--accent)';hb.style.borderStyle='solid';}
  if(hc)hc.style.display='block';
  // Close float panel
  closeCustPanel();
  // Sync to retail tab
  if(activeTab!=='retail') switchTab('retail');
  resetCartPrices(); renderGrid(); updateBill(); updateCustFloatBtn();
  toast(`👤 ${activeMember.name} selected`,'success');
}

function inlineCustClear(){
  activeMember=null;
  const hl=document.getElementById('cust-head-label');
  const hb=document.getElementById('cust-head-badge');
  const hc=document.getElementById('cust-head-clear');
  if(hl){hl.textContent='👤 ගනුදෙනුකරු — ▲ click';hl.style.color='var(--text3)';}
  if(hb){hb.style.borderColor='var(--border)';hb.style.borderStyle='dashed';}
  if(hc)hc.style.display='none';
  updateBill(); updateCustFloatBtn();
}
function openAddCust(){
  ['ac-name','ac-phone','ac-email','ac-addr','ac-pass'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  openMo('add-cust-modal');
  setTimeout(()=>{const n=document.getElementById('ac-name');if(n)n.focus();},200);
}

async function saveNewCust(){
  const name=(document.getElementById('ac-name')?.value||'').trim();
  const phone=(document.getElementById('ac-phone')?.value||'').trim();
  const email=(document.getElementById('ac-email')?.value||'').trim().toLowerCase();
  const addr=(document.getElementById('ac-addr')?.value||'').trim();
  const pass=(document.getElementById('ac-pass')?.value||'').trim();
  if(!name){toast('නම ඇතුල් කරන්න','error');document.getElementById('ac-name')?.focus();return}
  if(!phone){toast('දුරකථන අංකය ඇතුල් කරන්න','error');document.getElementById('ac-phone')?.focus();return}
  if(email&&S.customers.find(c=>c.email===email)){toast('Email දැනටමත් ලියාපදිංචිය','error');return}
  const cust={
    name, phone,
    email:email||null,
    address:addr, location:addr,
    type:'retail',
    loyaltyPoints:0, totalLoyaltySaved:0, forwardBalance:0,
    defaultPayment:'cash',
    registeredSource:'pos',
    registeredBranch:currentBranch?currentBranch.name:'Central',
    createdAt:new Date().toISOString(),
    pwHash:pass?btoa(pass):null
  };
  const newId=await pa('customers',cust);
  cust.id=newId;
  await loadAll();
  closeMo('add-cust-modal');
  toast(`✓ ${name} ලියාපදිංචි කළා!`,'success');
  // Auto-select the new customer via inline selector
  inlineCustSelect(newId);
}

function openCustHistory(custId){
  const c=S.customers.find(x=>x.id===custId);if(!c)return;
  const ords=[...S.orders].filter(o=>o.customerId===custId&&o.status!=='cancelled').reverse();
  const totalSpent=ords.reduce((s,o)=>s+o.total,0);
  document.getElementById('hist-title').textContent=`📋 ${c.name}`;
  document.getElementById('hist-content').innerHTML=`
    <div style="background:var(--bg2);border-radius:8px;padding:12px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">${c.name}</div>
          <div style="font-size:13px;color:var(--text3)">${c.phone||'—'} ${c.email?'· '+c.email:''}</div>
          <div style="font-size:13px;color:var(--teal);margin-top:2px">
            ${c.type==='wholesale'?'🏭 Wholesale':'🛍 Retail'}
            ${c.businessName?'· '+c.businessName:''}
            · Registered via <strong>${c.registeredSource==='pos'?'🖥 POS':c.registeredSource==='admin'?'🔧 Admin':'📱 Customer App'}</strong>
            ${c.registeredBranch?'· 🏪 '+c.registeredBranch:''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${c.loyaltyPoints||0} pts</div>
          <div style="font-size:13px;color:var(--text3)">Loyalty Points</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
        <div style="background:var(--bg1);border-radius:6px;padding:8px">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${ords.length}</div>
          <div style="font-size:13px;color:var(--text3)">ඇණවුම්</div>
        </div>
        <div style="background:var(--bg1);border-radius:6px;padding:8px">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--green)">රු. ${Math.round(totalSpent).toLocaleString()}</div>
          <div style="font-size:13px;color:var(--text3)">සම්පූර්ණ</div>
        </div>
        <div style="background:var(--bg1);border-radius:6px;padding:8px">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--teal)">${ords.length?'රු. '+(totalSpent/ords.length).toFixed(0):'—'}</div>
          <div style="font-size:13px;color:var(--text3)">සාමාන්‍ය bill</div>
        </div>
      </div>
    </div>
    ${!ords.length?`<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">ඇණවුම් නොමැත</div>`:
    ords.slice(0,40).map(o=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent)">#${String(o.id).padStart(4,'0')}</span>
        <span style="font-size:13px;color:var(--text3)">${new Date(o.date).toLocaleDateString('si-LK')} ${new Date(o.date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">රු. ${o.total.toFixed(0)}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:3px">${o.items.slice(0,4).map(i=>`${i.icon||'📦'} ${i.name} ×${i.qty}`).join(' · ')}${o.items.length>4?` +${o.items.length-4} more`:''}</div>
      <div style="display:flex;gap:8px;font-size:13px;color:var(--text3)">
        <span>${o.paymentMethod==='cash'?'💵 Cash':o.paymentMethod==='card'?'💳 Card':'📄 B2B'}</span>
        ${o.branchName?`<span>🏪 ${o.branchName}</span>`:'<span>🏢 Central</span>'}
        ${o.loyaltyEarned?`<span style="color:var(--accent)">⭐ +${o.loyaltyEarned} pts</span>`:''}
        ${o.source==='pos'?'<span style="color:var(--teal)">POS</span>':'<span style="color:var(--purple)">Online</span>'}
      </div>
    </div>`).join('')}`;
  openMo('cust-history-modal');
}

// ══════════════════════════════════════════
// COMPLETE SALE
// ══════════════════════════════════════════
async function completeSale(){
  if(!cart.length){toast('Bill හිස්ය','error');return}
  // Require retail customer before completing
  if(!activeMember){
    toast('ගනුදෙනුකරු තෝරන්න — Bill complete කිරීමට customer select කරන්න','error');
    // Flash the customer input to guide the cashier
    const q=document.getElementById('inline-cust-q');
    if(q){
      q.style.borderColor='var(--red)';q.style.background='rgba(220,38,38,.06)';q.focus();
      setTimeout(()=>{q.style.borderColor='';q.style.background='';},2500);
    }
    return;
  }
  const apeSub=cart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=cart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const handSave=wikSub-apeSub;
  const dv=parseFloat(document.getElementById('disc-val').value)||0;
  let discAmt=discType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);if(dv<=0)discAmt=0;
  const total=Math.max(0,apeSub-discAmt);
  const effPay=payMethod;
  if(effPay==='cash'){
    const g=parseFloat(document.getElementById('cash-given').value)||0;
    if(g===0){toast('ගෙවූ මුදල ඇතුල් කරන්න','error');return}
    if(g<total){toast(`ප්‍රමාණවත් නැත. රු. ${total.toFixed(2)} අවශ්‍යයි`,'error');return}
  } else if(effPay==='card'){
    const g=parseFloat(document.getElementById('cash-given').value)||0;
    if(g===0){toast('Card amount ඇතුල් කරන්න','error');return}
  }
  const cashGiven=parseFloat(document.getElementById('cash-given').value)||0;
  let earnedPts=0;
  if(activeMember){
    const cust=S.customers.find(x=>x.id===activeMember.id);
    if(cust){
      const ls=getLoyaltySetting(cust.type);
      const tier=getTier(cust.loyaltyPoints||0,cust.type);
      const bm=1+(tier?.bonusEarn||0)/100;
      earnedPts=Math.floor((total/100)*ls.earnPer100*bm);
      cust.loyaltyPoints=(cust.loyaltyPoints||0)+earnedPts;
      if(effPay==='bill_to_bill') cust.forwardBalance=(cust.forwardBalance||0)+total;
      await pu('customers',cust);
    }
  }
  const custType=activeMember?activeMember.type:(activeTab==='wholesale'?'wholesale':'retail');
  const custName=activeMember?.name||(activeTab==='wholesale'?'Walk-in Wholesale':'Walk-in Retail');
  const order={
    customerId:activeMember?.id||null,customerName:custName,customerType:custType,
    branchId:currentBranch?currentBranch.id:null,
    branchName:currentBranch?currentBranch.name:'Central',
    items:[...cart],subtotal:apeSub,wikunumSubtotal:wikSub,handSavings:handSave,
    specialDiscount:0,wholesaleDiscount:0,cashDiscount:0,bulkDiscount:0,tierDiscount:0,
    priceSavings:handSave,deliveryFee:0,manualDiscount:discAmt,
    loyaltyRedeemed:0,loyaltyDiscount:0,loyaltyEarned:earnedPts,tax:0,total,
    paymentMethod:effPay,
    cashGiven:effPay==='cash'?cashGiven:(effPay==='card'?cashGiven:0),
    changeGiven:effPay==='cash'?Math.max(0,cashGiven-total):0,
    b2bPending:effPay==='bill_to_bill',
    deliveryType:'pos',deliveryAddress:'',deliveryDate:'',note:'POS Sale',
    status:'delivered',source:'pos',date:new Date().toISOString()
  };
  const oid=await pa('orders',order);order.id=oid;
  for(const it of cart){ await deductBranchStock(it.pid,it.qty); }
  await loadAll(); updateStats(); printReceipt(order);
  resetBill();
  toast(`✓ Sale රු. ${total.toFixed(2)} complete!${earnedPts?` +${earnedPts} pts`:''}`,'success');
}

function getLoyaltySetting(type){
  const def=type==='retail'?{earnPer100:5,pointValue:0.5}:{earnPer100:8,pointValue:0.75};
  return S.settings[type==='retail'?'loyaltyRetail':'loyaltyWholesale']||def;
}
function getTier(pts,type){
  const rel=S.tiers.filter(t=>t.target==='all'||t.target===type).sort((a,b)=>b.minPoints-a.minPoints);
  return rel.find(t=>pts>=t.minPoints)||null;
}

function resetBill(){
  cart=[]; activeMember=null;
  document.getElementById('disc-val').value='';
  document.getElementById('cash-given').value='';
  document.getElementById('change-disp').textContent='ඉතිරි: —';
  document.getElementById('cash-summary').style.display='none';
  // Reset compact head badge
  const hl=document.getElementById('cust-head-label');if(hl){hl.textContent='👤 ගනුදෙනුකරු — ▲ click';hl.style.color='var(--text3)';}
  const hb=document.getElementById('cust-head-badge');if(hb){hb.style.borderColor='var(--border)';hb.style.borderStyle='dashed';}
  const hc=document.getElementById('cust-head-clear');if(hc)hc.style.display='none';
  // Reset wholesale tab state
  activeTab='retail'; rtSub='walkin'; wsSub='walkin'; wsPay='cash';
  document.getElementById('ws-walkin').classList.add('active');
  document.getElementById('ws-member').classList.remove('active');
  document.getElementById('ws-member-panel').style.display='none';
  resetBadge('ws');
  document.getElementById('pay-b2b').style.display='none';
  setPay('cash'); billNum++; updateBillNum();
  renderItems(); updateBill(); renderGrid(); updateCustFloatBtn();
}

// ══════════════════════════════════════════
// HOLD / VOID / NEW
// ══════════════════════════════════════════
function holdBill(){
  if(!cart.length){toast('Bill හිස්ය','error');return}
  heldBills.push({num:billNum,cart:[...cart],tab:activeTab,member:activeMember,pay:payMethod,wsPay,disc:document.getElementById('disc-val').value,discType});
  document.getElementById('held-cnt').textContent=`(${heldBills.length})`;
  toast('Bill held ✓','info');
  resetBill();
}
function voidBill(){
  if(cart.length&&!confirm('Void this bill?'))return;
  resetBill();toast('Bill voided','info');
}
function newBill(){
  if(cart.length&&!confirm('Clear current bill?'))return;
  resetBill();
}
function renderHeld(){
  document.getElementById('held-list').innerHTML=heldBills.length?heldBills.map((h,i)=>`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;cursor:pointer" onclick="restoreHeld(${i})">
      <div><div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">Bill #${String(h.num).padStart(4,'0')}</div>
      <div style="font-size:13px;color:var(--text3)">${h.cart.length} items · ${h.tab==='wholesale'?'Wholesale':'Retail'}</div></div>
      <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${h.cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(0)}</div>
      <div style="font-size:13px;color:var(--text3)">click to restore</div></div>
    </div>`).join(''):`<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">No held bills</div>`;
}
function restoreHeld(idx){
  const h=heldBills[idx];if(!h)return;
  if(cart.length&&!confirm('Restore held bill? Current bill will be lost.'))return;
  cart=[...h.cart]; activeMember=h.member; billNum=h.num;
  discType=h.discType||'pct';
  document.getElementById('disc-val').value=h.disc||'';
  heldBills.splice(idx,1);document.getElementById('held-cnt').textContent=`(${heldBills.length})`;
  // Restore tab
  switchTab(h.tab||'retail');
  if(h.pay) setPay(h.pay);
  renderItems(); updateBill(); renderGrid(); closeMo('held-modal');
}

// ══════════════════════════════════════════
// RECEIPT
// ══════════════════════════════════════════
function buildReceiptHTML(o){
  const now=new Date(o.date);
  const handSave=o.handSavings||((o.wikunumSubtotal||o.subtotal)-o.subtotal);
  const isB2B=o.paymentMethod==='bill_to_bill';
  const isCard=o.paymentMethod==='card';
  const storeName=S.settings?.storeName||'MART';
  const storePhone=S.settings?.storePhone||'';
  const storeAddr=S.settings?.storeAddress||'';
  const branch=currentBranch?`🏪 ${currentBranch.name}`:'Central POS';
  return `<div class="receipt-wrap">
    <div class="rh">
      <div style="font-size:13px;font-weight:900;letter-spacing:2px;margin-bottom:2px">${storeName}</div>
      <div style="font-size:13px;font-weight:700">${branch}</div>
      ${storeAddr?`<div style="font-size:13px;color:#555;margin-top:2px">${storeAddr}</div>`:''}
      ${storePhone?`<div style="font-size:13px;color:#555">📞 ${storePhone}</div>`:''}
      <div style="font-size:13px;margin-top:4px;color:#333">${now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} ${now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div style="font-size:13px;font-weight:700;margin-top:2px">Bill #${String(o.id).padStart(6,'0')}</div>
    </div>
    ${o.customerId?`<div style="font-size:13px;padding:4px 0;margin-bottom:2px">
      ගනුදෙනුකරු: <strong>${o.customerName}</strong>
      ${o.loyaltyEarned?`<div style="font-size:13px;color:#0a6b3a">⭐ +${o.loyaltyEarned} ලොයල්ටි පොයින්ට් ලැබුණා</div>`:''}
      ${o.loyaltyRedeemed?`<div style="font-size:13px;color:#c2620a">⭐ −${o.loyaltyRedeemed} පොයින්ට් භාවිතා කළා</div>`:''}
    </div><div class="rd"></div>`:''}
    <div style="display:grid;grid-template-columns:1fr 62px 52px;font-size:13px;color:#333;font-weight:700;margin-bottom:2px;padding-bottom:4px;border-bottom:2px solid #555;gap:3px">
      <span>භාණ්ඩය</span>
      <span style="text-align:center;line-height:1.3">වෙළඳපල<br>මිල</span>
      <span style="text-align:center;line-height:1.3">අපේ<br>මිල</span>
    </div>
    ${o.items.map(i=>{
      const wik=(i.wikunumMila||i.price);
      const ape=i.overridePrice||i.price;
      const saved=(wik-ape)*i.qty;
      return `<div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px">
          <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:130px">${i.icon||''}${i.name}</span>
          <span style="color:#888;text-decoration:line-through;font-size:13px;min-width:58px;text-align:center">${(wik*i.qty).toFixed(2)}</span>
          <span style="font-weight:700;min-width:48px;text-align:center">${(ape*i.qty).toFixed(2)}</span>
        </div>
        <div style="font-size:13px;color:#666;padding-left:2px">× ${i.qty}${i.isScale?' kg':''} @ රු. ${ape.toFixed(2)}${saved>0?` <span style="color:#0a6b3a">[ඉතිරි ${saved.toFixed(2)}]</span>`:''}</div>
      </div>`;
    }).join('')}
    <div class="rdb"></div>
    <div class="rl"><span>වෙළඳපල මිල</span><span>රු. ${(o.wikunumSubtotal||o.subtotal).toFixed(2)}</span></div>
    <div class="rl" style="font-weight:700"><span>අපේ මිල</span><span>රු. ${o.subtotal.toFixed(2)}</span></div>
    ${o.manualDiscount>0?`<div class="rl" style="color:#c00"><span>💸 වට්ටම</span><span>−රු. ${o.manualDiscount.toFixed(2)}</span></div>`:''}
    <div class="rdb"></div>
    <div class="rl rt" style="font-size:13px"><span>සම්පූර්ණ මුදල</span><span>රු. ${o.total.toFixed(2)}</span></div>
    <div class="rd"></div>
    <div style="display:flex;justify-content:space-between;border:2px solid #0a6b3a;border-radius:3px;padding:4px 6px;margin:4px 0;font-weight:800;font-size:13px;color:#0a6b3a">
      <span>🟢 අත ඉතිරි මුදල</span><span>රු. ${handSave.toFixed(2)}</span>
    </div>
    <div class="rd"></div>
    ${isB2B
      ?`<div class="rl" style="color:#1d4ed8"><span>📄 ගිණුමට එකතු කළා</span><span>✓</span></div>
        ${(o.creditBalanceBefore||0)>0?`<div class="rl" style="font-size:13px"><span>පෙර ගිණුම් ශේෂය</span><span>රු. ${(o.creditBalanceBefore||0).toFixed(2)}</span></div>`:''}
        <div class="rl" style="font-size:13px"><span>මෙම බිල්පත</span><span>රු. ${o.total.toFixed(2)}</span></div>
        <div class="rd"></div>
        <div class="rl rt" style="color:#c2620a"><span>ගෙවිය යුතු සම්පූර්ණ</span><span>රු. ${((o.creditBalanceBefore||0)+o.total).toFixed(2)}</span></div>`
      :isCard
        ?`<div class="rl"><span>💳 කාඩ් ගෙවීම</span><span>රු. ${(o.cashGiven||o.total).toFixed(2)}</span></div>`
        :`<div class="rl"><span>💵 ලැබුණු මුදල</span><span>රු. ${(o.cashGiven||0).toFixed(2)}</span></div>
          <div class="rl" style="font-weight:700;color:#0a6b3a"><span>ඉතිරි මුදල</span><span>රු. ${(o.changeGiven||0).toFixed(2)}</span></div>`}
    <div class="rfoot">
      ස්තූතියි! 🙏 නැවත වැඩම කරන්න
      ${o.loyaltyEarned?`<br><span style="color:#0a6b3a;font-weight:700">⭐ ලොයල්ටි පොයින්ට් ${o.loyaltyEarned}ක් ලබා ගත්තා!</span>`:''}
    </div>
  </div>`;
}

function printReceipt(o){
  const html=buildReceiptHTML(o);
  // Show in preview modal
  document.getElementById('receipt-content').innerHTML=html;
  // Also pre-fill the hidden print area
  document.getElementById('print-receipt-area').innerHTML=html;
  openMo('receipt-modal');
}

function triggerPrint(){
  // Make print area visible, trigger print, then hide it again
  const area=document.getElementById('print-receipt-area');
  area.style.display='block';
  window.print();
  setTimeout(()=>{area.style.display='none';},1000);
}

// ══════════════════════════════════════════
// SHIFT REPORT
// ══════════════════════════════════════════
function openShift(){
  const today=new Date().toDateString();
  const ords=S.orders.filter(o=>new Date(o.date).toDateString()===today&&o.source==='pos'&&o.status!=='cancelled');
  const cash=ords.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const card=ords.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const b2b=ords.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
  const disc=ords.reduce((s,o)=>s+(o.manualDiscount||0),0);
  const handSaved=ords.reduce((s,o)=>s+(o.handSavings||0),0);
  document.getElementById('shift-content').innerHTML=`
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:14px;color:var(--accent)">📊 Daily Shift Report</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">📅 ${new Date().toLocaleDateString()} · Generated: ${new Date().toLocaleTimeString()}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      ${[['Total Sales',`රු. ${(cash+card+b2b).toLocaleString()}`,'var(--accent)'],
         ['Transactions',ords.length,'var(--green)'],
         ['💵 Cash',`රු. ${cash.toLocaleString()}`,'var(--green)'],
         ['💳 Card',`රු. ${card.toLocaleString()}`,'var(--blue)'],
         ['📄 B2B',`රු. ${b2b.toLocaleString()}`,'var(--purple)'],
         ['Discounts Given',`රු. ${disc.toLocaleString()}`,'var(--red)'],
         ['🟢 Total Savings',`රු. ${handSaved.toLocaleString()}`,'var(--green)'],
      ].map(([l,v,c])=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:11px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">${l}</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${c}">${v}</div>
      </div>`).join('')}
    </div>
    ${ords.length?`<div style="font-size:13px;font-family:'Syne',sans-serif;font-weight:700;margin-bottom:8px">Recent Transactions</div>
    <div style="max-height:220px;overflow-y:auto">${[...ords].reverse().slice(0,30).map(o=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--bg2);border-radius:5px;margin-bottom:3px;font-size:13px">
      <span>#${String(o.id).padStart(4,'0')} · ${o.customerName}</span>
      <span style="color:${o.paymentMethod==='cash'?'var(--green)':o.paymentMethod==='card'?'var(--blue)':'var(--purple)'}">${o.paymentMethod==='cash'?'💵':o.paymentMethod==='card'?'💳':'📄'} රු. ${o.total.toFixed(0)}</span>
    </div>`).join('')}</div>`:'<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">No POS transactions today</div>'}`;
  openMo('shift-modal');
}

// ══════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════
function openMo(id){document.getElementById(id).classList.add('open')}
function closeMo(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function toast(msg,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;document.getElementById('tc').appendChild(el);setTimeout(()=>el.remove(),4000)}

// ══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(!document.getElementById('app').classList.contains('show'))return;
  // F1 = focus barcode
  if(e.key==='F1'){e.preventDefault();document.getElementById('bc-inp')?.focus();}
  // F2 = focus product search
  if(e.key==='F2'){e.preventDefault();document.getElementById('prod-search')?.focus();}
  // F12 or numpad Enter = complete sale
  if(e.key==='F12'){e.preventDefault();document.getElementById('complete-btn')?.click();}
  // Escape = clear barcode
  if(e.key==='Escape'&&document.activeElement?.id==='bc-inp'){document.getElementById('bc-inp').value='';}
});

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
(async()=>{
  await idb();
  await loadAll();
})();

// ══ APP UPDATE ══
const APP_VERSION='2.1.0';
const APP_DATE='2026-03-16';
const APP_CHANGES=[
  '📱 Responsive layout — works on mobile, tablet, and desktop',
  '🖨 Print bill is now a single inline button',
  '📉 Branch stock usage tab with daily item-by-item breakdown',
  '📄 Branch B2B balance tracking and partial payments',
  '👤 Customer/Branch selectors moved to floating bottom-right panels',
  '🔡 Font sizes adjusted for better readability',
  '🛒 Cart drawer is now wider with more item space',
  'රු. symbol used throughout (was LKR)',
];
function openUpdateModal(){
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML=`<div style="background:var(--bg1);border-radius:14px;max-width:420px;width:95vw;padding:0;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.3)">
    <div style="background:linear-gradient(135deg,var(--accent),var(--teal));padding:18px 20px;color:#fff">
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:900">◈ MART — App Update</div>
      <div style="font-size:12px;opacity:.85;margin-top:3px">Version ${APP_VERSION} · ${APP_DATE}</div>
    </div>
    <div style="padding:16px 20px;max-height:55vh;overflow-y:auto">
      <div style="font-size:13px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">මෙම version-ේ features:</div>
      ${APP_CHANGES.map(ch=>`<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="flex-shrink:0">✓</span><span>${ch}</span></div>`).join('')}
    </div>
    <div style="padding:14px 20px;background:var(--bg2);display:flex;gap:8px">
      <button onclick="location.reload(true)" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer">🔄 Reload App</button>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:10px 16px;font-size:13px;cursor:pointer">Close</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}
// ══ GLOBAL ENTER KEY HANDLER ══
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const active = document.activeElement;
  const tag = active?.tagName;
  if(tag === 'TEXTAREA') return;
  if(tag === 'SELECT') return;

  // 1. Any open modal — click primary button
  const openModal = document.querySelector('.mo.open .modal, .mo.open > div');
  if(openModal){
    const primary = openModal.querySelector('.btn-primary:not([disabled]),.complete-btn:not([disabled])');
    if(primary){ e.preventDefault(); primary.click(); return; }
  }

  // 2. Login screen
  const loginScreen = document.getElementById('login-screen');
  if(loginScreen && loginScreen.style.display !== 'none'){
    e.preventDefault();
    doLogin();
    return;
  }

  // 3. POS app — complete sale (not when typing in an input)
  const app = document.getElementById('app');
  if(app?.classList.contains('show') && tag !== 'INPUT'){
    const btn = document.getElementById('complete-btn');
    if(btn && !btn.disabled){ e.preventDefault(); btn.click(); return; }
  }
});
