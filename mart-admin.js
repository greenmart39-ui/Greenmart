// ═══════════ DB ═══════════
let db;
const DB='MartSuperDB2',DV=7;
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,DV);r.onupgradeneeded=e=>{const d=e.target.result;['products','orders','customers','offers','bulkoffers','cashoffers','complaints','zones','reminders','notifications','tiers','settings','routes','branches','branchStock'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,s==='settings'?{keyPath:'key'}:{keyPath:'id',autoIncrement:true})})};r.onsuccess=e=>{db=e.target.result;res(db)};r.onerror=e=>rej(e)})}
const ga=s=>new Promise((res,rej)=>{const t=db.transaction(s,'readonly');const r=t.objectStore(s).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const gk=(s,k)=>new Promise((res,rej)=>{const t=db.transaction(s,'readonly');const r=t.objectStore(s).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const pa=async(s,d)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');const r=t.objectStore(s).add(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const pu=async(s,d)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');const r=t.objectStore(s).put(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const de=async(s,k)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');const r=t.objectStore(s).delete(k);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});

// ═══════════ STATE ═══════════
let S={products:[],orders:[],customers:[],offers:[],bulkoffers:[],cashoffers:[],complaints:[],zones:[],reminders:[],notifications:[],tiers:[],settings:{},routes:[],branches:[],branchStock:[]};
let custTabState='retail';
let imgData=null;

async function loadAll(){
  for(const k of['products','orders','customers','offers','bulkoffers','cashoffers','complaints','zones','reminders','notifications','tiers','routes','branches','branchStock']) S[k]=await ga(k);
  const sets=await ga('settings');
  sets.forEach(s=>S.settings[s.key]=s.value);
  updateBadges();
}

// ═══════════ AUTH ═══════════
function aLogin(){
  const p=document.getElementById('ap').value;
  const stored=S.settings?.adminPass||'admin123';
  if(p===stored){document.getElementById('login-screen').style.display='none';document.getElementById('app').style.display='block';initApp()}
  else toast('මුරපදය වැරදිය','error');
}
function aLogout(){document.getElementById('app').style.display='none';document.getElementById('login-screen').style.display='flex';document.getElementById('ap').value=''}

// ═══════════ NAV ═══════════
const PT={dash:['ප්‍රධාන පිටුව','ව්‍යාපාර දළ සටහන'],pos:['🖥 Point of Sale','දෛනික විකිණීම් ද්වාරය'],'branch-order':['🏪 Branch Order','Branch Supermarket ඇණවුම්'],orders:['ඇණවුම්','ඇණවුම් කළමනාකරණය'],products:['නිෂ්පාදන','Catalog & මිල ගණන්'],offers:['විශේෂ දීමනා','විශේෂ ප්‍රවර්ධන'],bulk:['ප්‍රමාණ දීමනා','ප්‍රමාණ-ශ්‍රේණි වට්ටම'],'cash-offers':['Cash දීමනා','Cash ගෙවීම් discount'],loyalty:['⭐ ලොයල්ටි Points','ත්‍යාග පද්ධතිය'],customers:['ගනුදෙනුකරුවන්','ගිණුම් කළමනාකරණය'],routes:['🗺 Routes','Wholesale Route සැකසීම'],complaints:['පැමිණිලි','ප්‍රතිපෝෂණ & සහාය'],delivery:['බෙදා හැරීම් කලාප','කලාප සැකසීම'],reminders:['මතක් කිරීම්','නිත්‍ය දැනුම්දීම්'],branches:['🏪 Branch Supermarkets','Branch stock · sales · orders · customers']};
function nav(p,el){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('act'));
  document.querySelectorAll('.ni').forEach(x=>x.classList.remove('act'));
  document.getElementById('page-'+p).classList.add('act');
  if(el)el.classList.add('act');
  const t=PT[p]||['',''];
  document.getElementById('ptitle').textContent=t[0];
  document.getElementById('psub').textContent=t[1];
  // Show/hide floating buttons based on page
  posCustFloatVisibility(p==='pos');
  // Branch float button: show on branch-order page only
  const bfb=document.getElementById('bo-branch-float-btn');
  const bfp=document.getElementById('bo-branch-float-panel');
  if(p==='branch-order'){
    if(bfb)bfb.classList.add('bo-visible');
    if(bfp)bfp.classList.add('bo-visible');
  } else {
    if(bfb)bfb.classList.remove('bo-visible');
    if(bfp){bfp.classList.remove('bo-visible');bfp.classList.remove('bo-open');}
    boBranchFloatOpen=false;
  }
  const rnd={dash:renderDash,pos:renderPOS,'branch-order':renderBranchOrder,orders:renderOrders,products:renderProds,offers:renderOffers,bulk:renderBulk,'cash-offers':renderCashOffers,loyalty:renderLoyalty,customers:renderCustomers,routes:renderRoutes,complaints:renderComplaints,delivery:renderZones,reminders:renderRems,branches:renderBranches};
  if(rnd[p]) rnd[p]();
}

function updateBadges(){
  const nb=S.orders.filter(o=>o.status==='pending').length;
  const el=document.getElementById('ob');
  el.textContent=nb; el.style.display=nb?'':'none';
  const cb=S.complaints.filter(c=>!c.read).length;
  const ce=document.getElementById('cb');
  ce.textContent=cb; ce.style.display=cb?'':'none';
  const un=S.notifications.filter(n=>!n.read&&n.target==='admin').length;
  document.getElementById('ndot').style.display=un?'block':'none';
}

// ═══════════ SEED ═══════════
async function seed(){
  if((await ga('products')).length) return;
  const ps=[
    {name:'Basmati Rice 1kg',category:'Grains & Rice',icon:'🌾',retailPrice:320,wholesalePrice:280,stock:150,lowStock:20,image:null},
    {name:'Full Cream Milk 1L',category:'Dairy',icon:'🥛',retailPrice:180,wholesalePrice:155,stock:80,lowStock:15,image:null},
    {name:'Coca-Cola 1.5L',category:'Beverages',icon:'🥤',retailPrice:250,wholesalePrice:210,stock:120,lowStock:20,image:null},
    {name:"Lay's Chips",category:'Snacks',icon:'🍿',retailPrice:150,wholesalePrice:125,stock:200,lowStock:30,image:null},
    {name:'Tomatoes 500g',category:'Vegetables',icon:'🍅',retailPrice:120,wholesalePrice:95,stock:45,lowStock:10,image:null},
    {name:'Bananas (bunch)',category:'Fruits',icon:'🍌',retailPrice:90,wholesalePrice:70,stock:50,lowStock:10,image:null},
    {name:'Chicken Breast 500g',category:'Meat & Fish',icon:'🍗',retailPrice:480,wholesalePrice:420,stock:30,lowStock:5,image:null},
    {name:'White Bread',category:'Bakery',icon:'🍞',retailPrice:95,wholesalePrice:78,stock:40,lowStock:5,image:null},
    {name:'Coconut Oil 1L',category:'Grains & Rice',icon:'🫙',retailPrice:380,wholesalePrice:340,stock:55,lowStock:10,image:null},
  ];
  for(const p of ps) await pa('products',p);
  const zones=[{name:'Colombo Zone',areas:['Colombo 1','Colombo 7','Wellawatte'],days:['Monday','Thursday'],leadDays:1,deliveryFee:0},{name:'Suburbs Zone',areas:['Nugegoda','Maharagama','Dehiwala'],days:['Tuesday','Friday'],leadDays:2,deliveryFee:150},{name:'Outskirts Zone',areas:['Homagama','Kaduwela','Malabe'],days:['Wednesday','Saturday'],leadDays:3,deliveryFee:250}];
  for(const z of zones) await pa('zones',z);
  const defaultTiers=[
    {name:'Bronze',style:'lt-bronze',minPoints:0,bonusEarn:0,discountPct:0,target:'all'},
    {name:'Silver',style:'lt-silver',minPoints:500,bonusEarn:5,discountPct:2,target:'all'},
    {name:'Gold',style:'lt-gold',minPoints:1500,bonusEarn:10,discountPct:5,target:'all'},
    {name:'Platinum',style:'lt-platinum',minPoints:5000,bonusEarn:20,discountPct:10,target:'all'},
  ];
  for(const t of defaultTiers) await pa('tiers',t);
  await pu('settings',{key:'adminPass',value:'admin123'});
  await pu('settings',{key:'loyaltyRetail',value:{earnPer100:5,pointValue:0.5,minRedeem:100,maxRedeemPct:20}});
  await pu('settings',{key:'loyaltyWholesale',value:{earnPer100:8,pointValue:0.75,minRedeem:200,maxRedeemPct:15}});
}

// ═══════════ DASHBOARD ═══════════
function renderDash(){
  const rev=S.orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
  document.getElementById('d-rev').textContent=`රු. ${Math.round(rev).toLocaleString()}`;
  document.getElementById('d-ord').textContent=S.orders.length;
  document.getElementById('d-cust').textContent=S.customers.length;
  const totalPts=S.customers.reduce((s,c)=>s+(c.loyaltyPoints||0),0);
  document.getElementById('d-pts').textContent=totalPts.toLocaleString();

  const recent=[...S.orders].reverse().slice(0,5);
  document.getElementById('d-orders').innerHTML=recent.map(o=>`<tr>
    <td style="color:var(--accent);font-family:'Syne',sans-serif">#${String(o.id).padStart(4,'0')}</td>
    <td>${o.customerName||'—'}</td>
    <td style="color:var(--text)">රු. ${o.total.toFixed(0)}</td>
    <td>${sBadge(o.status)}</td>
  </tr>`).join('');

  const lItems=S.customers.slice(0,5).map(c=>{
    const ls=getLoyaltySetting(c.type);
    const pts=c.loyaltyPoints||0;
    const val=(pts*ls.pointValue).toFixed(2);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <div><div style="color:var(--text)">${c.name}</div><div style="color:var(--text3)">${c.type}</div></div>
      <div style="text-align:right"><div style="color:var(--accent);font-family:'Syne',sans-serif;font-weight:700">${pts} pts</div><div style="color:var(--text3)">රු. ${val}</div></div>
    </div>`;
  }).join('');
  document.getElementById('d-loyalty-sum').innerHTML=lItems||`<div style="color:var(--text3);text-align:center;padding:20px;font-size:13px">No customers yet</div>`;
}

// ═══════════ ORDERS ═══════════
function renderOrders(){
  const sf=document.getElementById('of').value;
  const tf=document.getElementById('otf').value;
  let orders=[...S.orders].reverse();
  if(sf!=='all') orders=orders.filter(o=>o.status===sf);
  if(tf!=='all') orders=orders.filter(o=>o.customerType===tf);
  document.getElementById('oc-label').textContent=`${orders.length} orders`;
  document.getElementById('orders-list').innerHTML=orders.map(o=>orderCard(o)).join('')
    ||`<div style="text-align:center;padding:60px;color:var(--text3)">No orders</div>`;
}

function orderCard(o){
  return `<div class="oc">
    <div class="oc-hd">
      <span class="oc-id">#${String(o.id).padStart(4,'0')}</span>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${sBadge(o.status)}
        <span class="badge badge-${o.customerType==='wholesale'?'blue':'yellow'}">${o.customerType}</span>
        <span class="badge badge-${o.deliveryType==='delivery'?'purple':'green'}">${o.deliveryType==='delivery'?'🚚':'🏪'} ${o.deliveryType}</span>
        ${o.paymentMethod==='cash'||o.paymentMethod==='Cash'?`<span class="badge badge-green">💵 Cash</span>`:(o.paymentMethod==='bill_to_bill'?`<span class="badge badge-blue">📄 Bill-to-Bill`:'')}</span>
      </div>
    </div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:6px">👤 ${o.customerName||'—'} · 📅 ${new Date(o.date).toLocaleString()}</div>
    <div style="font-size:13px;color:var(--text2)">${o.items.map(i=>`${i.icon||'📦'} ${i.name} ×${i.qty}`).join(' · ')}</div>
    ${o.loyaltyEarned?`<div style="font-size:13px;color:var(--accent);margin-top:4px">⭐ +${o.loyaltyEarned} ලොයල්ටි පොයින්ට් ලැබුණා</div>`:''}
    ${o.loyaltyRedeemed?`<div style="font-size:13px;color:var(--green);margin-top:2px">⭐ −${o.loyaltyRedeemed} පොයින්ට් භාවිතා කළා (රු. ${o.loyaltyDiscount?.toFixed(2)||0} ඉතිරි)</div>`:''}
    <div class="oc-foot">
      <div style="font-size:13px;color:var(--text3)">💳 ${o.paymentMethod}</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent)">රු. ${o.total.toFixed(2)}</div>
      <div style="display:flex;gap:5px">
        ${o.status==='pending'?`<button class="btn btn-green btn-sm" onclick="updStatus(${o.id},'confirmed')">✓ තහවුරු කරන්න</button><button class="btn btn-danger btn-sm" onclick="updStatus(${o.id},'cancelled')">✗ අවලංගු</button>`:''}
        ${o.status==='confirmed'?`<button class="btn btn-blue btn-sm" onclick="updStatus(${o.id},'delivered')">Delivered</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="viewOrder(${o.id})">Detail</button>
      </div>
    </div>
  </div>`;
}

async function updStatus(id,status){
  const o=S.orders.find(x=>x.id===id);
  if(!o) return;
  o.status=status;
  await pu('orders',o);
  await pa('notifications',{type:'order_status',message:`ඔබේ ඇණවුම #${String(id).padStart(4,'0')} දැන් ${status === 'confirmed' ? 'තහවුරු කර ඇත' : status === 'delivered' ? 'ලබා දී ඇත' : 'අවලංගු කර ඇත'}.`,date:new Date().toISOString(),read:false,target:'customer',customerId:o.customerId});
  await loadAll();renderOrders();
  toast(`Order ${status}`,'success');
}

function viewOrder(id){
  const o=S.orders.find(x=>x.id===id);if(!o)return;
  document.getElementById('odm-t').textContent=`Order #${String(o.id).padStart(4,'0')}`;
  document.getElementById('odm-b').innerHTML=`
    <div style="margin-bottom:12px">${sBadge(o.status)} <span class="badge badge-${o.customerType==='wholesale'?'blue':'yellow'}" style="margin-left:6px">${o.customerType}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:12px">
      <div><span style="color:var(--text3)">Customer:</span><br><span>${o.customerName}</span></div>
      <div><span style="color:var(--text3)">Date:</span><br><span>${new Date(o.date).toLocaleString()}</span></div>
      <div><span style="color:var(--text3)">Payment:</span><br><span>${o.paymentMethod}</span></div>
      <div><span style="color:var(--text3)">බෙදා හැරීම:</span><br><span>${o.deliveryType==='pickup'?'🏪 Store Pickup':'🚚 ගෙදර දොරා'}</span></div>
    </div>
    <div class="tw"><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Discount</th><th>Total</th></tr></thead>
    <tbody>${o.items.map(i=>`<tr><td>${i.icon||'📦'} ${i.name}</td><td>${i.qty}</td><td>රු. ${i.price.toFixed(2)}</td><td>${i.discountPct?`${i.discountPct}%`:'—'}</td><td>රු. ${(i.price*i.qty*(1-(i.discountPct||0)/100)).toFixed(2)}</td></tr>`).join('')}</tbody>
    </table></div>
    <div style="text-align:right;margin-top:10px;font-size:13px">
      ${o.wholesaleDiscount?`<div style="color:var(--green)">Wholesale discount: −රු. ${o.wholesaleDiscount.toFixed(2)}</div>`:''}
      ${o.cashDiscount?`<div style="color:var(--green)">Cash offer savings: −රු. ${o.cashDiscount.toFixed(2)}</div>`:''}
      ${o.loyaltyDiscount?`<div style="color:var(--accent)">⭐ Loyalty redeem: −රු. ${o.loyaltyDiscount.toFixed(2)}</div>`:''}
      <div style="color:var(--text3)">Order #${o.id} · ${o.paymentMethod||'cash'}</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent);margin-top:6px">Total: රු. ${o.total.toFixed(2)}</div>
    </div>
    ${o.loyaltyEarned?`<div style="background:var(--accent-dim);border:1px solid rgba(232,255,71,.2);border-radius:8px;padding:10px;margin-top:10px;font-size:13px;color:var(--accent)">⭐ ${o.loyaltyEarned} points earned this order</div>`:''}`;
  om('odm');
}

function sBadge(s){const m={pending:'badge-orange',confirmed:'badge-blue',delivered:'badge-green',cancelled:'badge-red'};const l={pending:'⏳ බලා සිටිනවා',confirmed:'✓ තහවුරු කළා',delivered:'✅ ලබා දුන්නා',cancelled:'✗ අවලංගු'};return `<span class="badge ${m[s]||'badge-orange'}">${l[s]||s}</span>`}

// ═══════════ PRODUCTS ═══════════
let prodTab='nonscale';
function prodTabSwitch(tab,el){
  prodTab=tab;
  document.querySelectorAll('.tab[id^="prod-tab"]').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');
  document.getElementById('prods-col-header-nonscale').style.display=tab==='nonscale'?'grid':'none';
  document.getElementById('prods-col-header-scale').style.display=tab==='scale'?'grid':'none';
  renderProds();
}
function renderProds(){
  const nameQ=(document.getElementById('prod-search-name')?.value||'').toLowerCase();
  const bcQ=(document.getElementById('prod-search-barcode')?.value||'').trim();
  const catQ=(document.getElementById('prod-cat-filter')?.value)||'all';
  let prods=S.products.filter(p=>{
    const isScale=p.isScale===true;
    if(prodTab==='scale'&&!isScale) return false;
    if(prodTab==='nonscale'&&isScale) return false;
    if(nameQ&&!p.name.toLowerCase().includes(nameQ)) return false;
    if(bcQ&&!(p.barcode||'').includes(bcQ)) return false;
    if(catQ!=='all'&&p.category!==catQ) return false;
    return true;
  });
  document.getElementById('prod-cnt').textContent=`(${S.products.length})`;
  document.getElementById('prods-list').innerHTML=prods.map(p=>{
    if(prodTab==='scale'){
      return `<div class="pr" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr 100px;border-left:3px solid var(--teal)">
        <div class="pr-name">
          ${p.image?`<img src="${p.image}" class="pr-thumb" alt="">`:`<div class="pr-emoji">${p.icon||'📦'}</div>`}
          <div><div style="font-family:'Syne',sans-serif;font-size:13px">${p.name}</div><div style="font-size:13px;color:var(--teal)">Scale · ${p.category} · Stock: ${p.stock}</div></div>
        </div>
        <div><input class="pe-inp" value="${p.barcode||''}" type="text" id="bc-${p.id}" placeholder="— barcode —" onchange="updBarcode(${p.id})" style="font-size:13px;letter-spacing:1px"></div>
        <div><input class="pe-inp" value="${(p.unitPrice||0).toFixed(2)}" type="number" step="0.01" id="up-${p.id}" onchange="updPrice(${p.id})" title="Unit Price per kg" style="border-color:rgba(8,145,178,.4);font-weight:700"></div>
        <div><input class="pe-inp" value="${(p.retailPrice||0).toFixed(2)}" type="number" step="0.01" id="rp-${p.id}" onchange="updPrice(${p.id})" title="Market Price"></div>
        <div><input class="pe-inp" value="${(p.costPrice||0).toFixed(2)}" type="number" step="0.01" id="cp-${p.id}" onchange="updPrice(${p.id})" style="border-color:rgba(232,255,71,.25)"></div>
        <div><input class="pe-inp" value="${(p.wholesalePrice||0).toFixed(2)}" type="number" step="0.01" id="wp-${p.id}" onchange="updPrice(${p.id})"></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="editProd(${p.id})">&#9998;</button>
          <button class="btn btn-danger btn-sm" onclick="delProd(${p.id})">&#10005;</button>
        </div>
      </div>`;
    }
    return `<div class="pr">
      <div class="pr-name">
        ${p.image?`<img src="${p.image}" class="pr-thumb" alt="">`:`<div class="pr-emoji">${p.icon||'&#128230;'}</div>`}
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px">${p.name}</div>
          <div style="font-size:13px;color:var(--text3)">${p.category}</div>
          <div style="display:flex;gap:6px;margin-top:2px;flex-wrap:wrap">
            <span style="font-size:13px;background:var(--accent-dim);color:var(--accent);border-radius:3px;padding:1px 5px">🏢 ${p.stock}</span>
            ${S.branches.map(b=>{const bs=getBranchStock(b.id,p.id);return bs>0?`<span style="font-size:13px;background:rgba(8,145,178,.1);color:var(--teal);border-radius:3px;padding:1px 5px">🏪${b.name.split(' ')[0]}: ${bs}</span>`:''}).join('')}
            <span style="font-size:13px;background:rgba(21,128,61,.1);color:var(--green);border-radius:3px;padding:1px 5px">∑ ${p.stock+getAllBranchStock(p.id)}</span>
          </div>
        </div>
      </div>
      <div><input class="pe-inp" value="${p.barcode||''}" type="text" id="bc-${p.id}" placeholder="— barcode —" onchange="updBarcode(${p.id})" style="font-size:13px;letter-spacing:1px"></div>
      <div><input class="pe-inp" value="${(p.retailPrice||0).toFixed(2)}" type="number" step="0.01" id="rp-${p.id}" onchange="updPrice(${p.id})"></div>
      <div><input class="pe-inp" value="${(p.costPrice||0).toFixed(2)}" type="number" step="0.01" id="cp-${p.id}" onchange="updPrice(${p.id})" style="border-color:rgba(232,255,71,.25)"></div>
      <div><input class="pe-inp" value="${(p.wholesalePrice||0).toFixed(2)}" type="number" step="0.01" id="wp-${p.id}" onchange="updPrice(${p.id})"></div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="editProd(${p.id})">&#9998;</button>
        <button class="btn btn-danger btn-sm" onclick="delProd(${p.id})">&#10005;</button>
      </div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No products found</div>`;
}

function handleImg(inp){
  const f=inp.files[0];if(!f)return;
  if(f.size>2*1024*1024){toast('Image too large (max 2MB)','error');return}
  const r=new FileReader();r.onload=e=>{
    imgData=e.target.result;
    const prev=document.getElementById('pm-prev');
    prev.src=imgData;prev.style.display='block';
    document.getElementById('pm-ip').style.display='none';
    document.getElementById('pm-rm').style.display='flex';
    document.getElementById('pm-iz').classList.add('has-img');
  };r.readAsDataURL(f);
}
function rmImg(e){e.stopPropagation();imgData=null;document.getElementById('pm-prev').style.display='none';document.getElementById('pm-prev').src='';document.getElementById('pm-ip').style.display='block';document.getElementById('pm-rm').style.display='none';document.getElementById('pm-iz').classList.remove('has-img');document.getElementById('pm-fi').value=''}
function resetImg(){imgData=null;const prev=document.getElementById('pm-prev');prev.style.display='none';prev.src='';document.getElementById('pm-ip').style.display='block';document.getElementById('pm-rm').style.display='none';document.getElementById('pm-iz').classList.remove('has-img')}

async function updBarcode(id){
  const p=S.products.find(x=>x.id===id);if(!p)return;
  const v=document.getElementById('bc-'+id).value.trim();
  if(v&&S.products.some(x=>x.id!==id&&x.barcode===v)){toast('Barcode already used by another product','error');return}
  p.barcode=v;await pu('products',p);toast('Barcode saved ✓','success');
}

async function updPrice(id){
  const p=S.products.find(x=>x.id===id);if(!p)return;
  p.retailPrice=parseFloat(document.getElementById('rp-'+id)?.value)||p.retailPrice;
  p.costPrice=parseFloat(document.getElementById('cp-'+id)?.value)||p.costPrice||0;
  p.wholesalePrice=parseFloat(document.getElementById('wp-'+id)?.value)||p.wholesalePrice;
  if(p.isScale){const up=document.getElementById('up-'+id);if(up)p.unitPrice=parseFloat(up.value)||p.unitPrice||0;}
  await pu('products',p);toast('Price updated ✓','success');
}

function pmTypeChange(){
  const isScale=document.getElementById('pm-type-scale').checked;
  document.getElementById('pm-unit-price-row').style.display=isScale?'block':'none';
}
function openProdModal(){
  document.getElementById('pm-title').textContent='නිෂ්පාදනය එකතු කරන්න';
  document.getElementById('pm-id').value='';
  ['pm-name','pm-barcode','pm-icon','pm-r','pm-c','pm-w','pm-s','pm-ls','pm-unit-price'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('pm-type-nonscale').checked=true;
  document.getElementById('pm-unit-price-row').style.display='none';
  resetImg();om('prod-modal');
}
function editProd(id){
  const p=S.products.find(x=>x.id===id);if(!p)return;
  document.getElementById('pm-title').textContent='නිෂ්පාදනය සංස්කරණය';
  document.getElementById('pm-id').value=id;
  document.getElementById('pm-name').value=p.name;
  document.getElementById('pm-barcode').value=p.barcode||'';
  document.getElementById('pm-cat').value=p.category;
  document.getElementById('pm-icon').value=p.icon||'';
  document.getElementById('pm-r').value=p.retailPrice;
  document.getElementById('pm-c').value=p.costPrice||'';
  document.getElementById('pm-w').value=p.wholesalePrice;
  document.getElementById('pm-s').value=p.stock;
  document.getElementById('pm-ls').value=p.lowStock||10;
  const isScale=p.isScale===true;
  document.getElementById('pm-type-scale').checked=isScale;
  document.getElementById('pm-type-nonscale').checked=!isScale;
  document.getElementById('pm-unit-price-row').style.display=isScale?'block':'none';
  if(isScale) document.getElementById('pm-unit-price').value=p.unitPrice||'';
  if(p.image){imgData=p.image;const prev=document.getElementById('pm-prev');prev.src=p.image;prev.style.display='block';document.getElementById('pm-ip').style.display='none';document.getElementById('pm-rm').style.display='flex';document.getElementById('pm-iz').classList.add('has-img')}
  else resetImg();
  om('prod-modal');
}
async function saveProd(){
  const name=document.getElementById('pm-name').value.trim();
  const rp=parseFloat(document.getElementById('pm-r').value);
  const cp=parseFloat(document.getElementById('pm-c').value)||0;
  const wp=parseFloat(document.getElementById('pm-w').value);
  const bc=document.getElementById('pm-barcode').value.trim();
  const eid=document.getElementById('pm-id').value;
  const isScale=document.getElementById('pm-type-scale').checked;
  const unitPrice=isScale?parseFloat(document.getElementById('pm-unit-price').value)||0:null;
  if(!name){toast('Product name required','error');return}
  if(bc&&S.products.some(x=>x.id!==(parseInt(eid)||0)&&x.barcode===bc)){toast('Barcode already used','error');return}
  const obj={name,barcode:bc||null,category:document.getElementById('pm-cat').value,icon:document.getElementById('pm-icon').value||'&#128230;',retailPrice:rp||0,costPrice:cp,wholesalePrice:wp||0,stock:parseInt(document.getElementById('pm-s').value)||0,lowStock:parseInt(document.getElementById('pm-ls').value)||10,image:imgData,isScale,unitPrice:isScale?unitPrice:null};
  if(eid){const p=S.products.find(x=>x.id===parseInt(eid));if(p){Object.assign(p,obj);await pu('products',p)}}
  else await pa('products',obj);
  await loadAll();renderProds();cm('prod-modal');toast(eid?'Product updated ✓':'Product added ✓','success');
}
async function delProd(id){if(!confirm('Delete product?'))return;await de('products',id);await loadAll();renderProds();toast('Deleted','info')}

// ═══════════ OFFERS ═══════════
function renderOffers(){
  document.getElementById('offers-list').innerHTML=S.offers.map(o=>{
    const prodNames=Array.isArray(o.productIds)&&o.productIds.length
      ?o.productIds.map(pid=>{const p=S.products.find(x=>x.id===pid);return p?`${p.icon||'📦'} ${p.name}`:''}).filter(Boolean).join(', ')
      :'සියලු නිෂ්පාදන';
    return `<div class="offer-card">
      <span class="offer-type-tag badge-${o.target==='all'?'green':o.target==='retail'?'yellow':'blue'}">${o.target==='all'?'සියල්ල':o.target==='retail'?'Retail':'Wholesale'}</span>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:4px">${o.title}</div><div style="font-size:13px;color:var(--text2);margin-bottom:8px">${o.description}</div></div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent);flex-shrink:0;margin-left:12px">${o.discount}%</div>
      </div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:8px;background:var(--bg3);border-radius:5px;padding:6px 8px">📦 ${prodNames}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        ${o.validUntil?`<span class="badge badge-teal">Until ${o.validUntil}</span>`:''}
        <span class="badge badge-${o.active?'green':'red'}">${o.active?'✓ සක්‍රීය':'✗ නවතා ඇත'}</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="editOffer(${o.id})">✏ සංස්කරණය</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleOffer(${o.id})">${o.active?'නවත්වන්න':'සක්‍රීය කරන්න'}</button>
        <button class="btn btn-danger btn-sm" onclick="delOffer(${o.id})">✕ මකන්න</button>
      </div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:60px;color:var(--text3)">දීමනා නොමැත</div>`;
}

function populateOfferProdSelect(selectedIds=[]){
  const sel=document.getElementById('om-prods');
  sel.innerHTML=S.products.map(p=>`<option value="${p.id}" ${selectedIds.includes(p.id)?'selected':''}>${p.icon||'📦'} ${p.name} (${p.category})</option>`).join('');
  sel.onchange=()=>{
    const n=Array.from(sel.selectedOptions).length;
    document.getElementById('om-sel-count').textContent=n===0?`0 selected (all products)`:`${n} product${n>1?'s':''} selected`;
  };
  sel.onchange();
}

function openOfferModal(){
  document.getElementById('om-title').textContent='නව විශේෂ දීමනා';
  document.getElementById('om-id').value='';
  ['om-t','om-d','om-p','om-u'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('om-tg').value='all';
  populateOfferProdSelect([]);
  om('offer-modal');
}

function editOffer(id){
  const o=S.offers.find(x=>x.id===id);if(!o)return;
  document.getElementById('om-title').textContent='දීමනා සංස්කරණය';
  document.getElementById('om-id').value=id;
  document.getElementById('om-t').value=o.title;
  document.getElementById('om-d').value=o.description;
  document.getElementById('om-p').value=o.discount;
  document.getElementById('om-u').value=o.validUntil||'';
  document.getElementById('om-tg').value=o.target;
  populateOfferProdSelect(Array.isArray(o.productIds)?o.productIds:[]);
  om('offer-modal');
}

async function saveOffer(){
  const title=document.getElementById('om-t').value.trim();
  const pct=parseFloat(document.getElementById('om-p').value);
  if(!title||isNaN(pct)){toast('නම සහ වට්ටම ඇතුල් කරන්න','error');return}
  const sel=document.getElementById('om-prods');
  const productIds=Array.from(sel.selectedOptions).map(o=>parseInt(o.value));
  const obj={title,description:document.getElementById('om-d').value,discount:pct,validUntil:document.getElementById('om-u').value,target:document.getElementById('om-tg').value,productIds,category:'all',active:true,createdAt:new Date().toISOString()};
  const eid=document.getElementById('om-id').value;
  if(eid){const o=S.offers.find(x=>x.id===parseInt(eid));if(o){Object.assign(o,obj);await pu('offers',o)}}
  else{await pa('offers',obj);await pa('notifications',{type:'offer',message:`🏷 නව දීමනා: ${title} — ${pct}% OFF!`,date:new Date().toISOString(),read:false,target:'customer',offerTarget:obj.target})}
  await loadAll();renderOffers();cm('offer-modal');toast('දීමනාව සුරකින ලදී ✓','success');
}
async function toggleOffer(id){const o=S.offers.find(x=>x.id===id);if(!o)return;o.active=!o.active;await pu('offers',o);await loadAll();renderOffers()}
async function delOffer(id){if(!confirm('Delete?'))return;await de('offers',id);await loadAll();renderOffers()}

// ═══════════ BULK OFFERS ═══════════
function renderBulk(){
  document.getElementById('bulk-list').innerHTML=S.bulkoffers.map(b=>{
    const p=S.products.find(x=>x.id===b.productId);
    const amt=b.discountAmt||b.discount||0;
    return `<tr>
      <td style="color:var(--text)">${p?(p.icon||'📦')+' '+p.name:'Unknown'}</td>
      <td>${b.minQty}+ ඒකක</td>
      <td style="color:var(--accent);font-weight:600">රු. ${amt.toFixed(2)} / ඒකක</td>
      <td><span class="badge badge-${b.target==='all'?'green':b.target==='retail'?'yellow':'blue'}">${b.target==='all'?'සියල්ල':b.target==='retail'?'Retail':'Wholesale'}</span></td>
      <td><span class="badge badge-${b.active?'green':'red'}">${b.active?'✓ සක්‍රීය':'✗ නවත්වා ඇත'}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="editBulk(${b.id})">සංස්කරණය</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleBulk(${b.id})">${b.active?'නවත්වන්න':'සක්‍රීය'}</button>
        <button class="btn btn-danger btn-sm" onclick="delBulk(${b.id})">✕</button>
      </td>
    </tr>`;
  }).join('')||`<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">ප්‍රමාණ දීමනා නැත</td></tr>`;
}
function openBulkModal(){
  document.getElementById('bm-id').value='';
  document.getElementById('bm-qty').value='';
  document.getElementById('bm-amt').value='';
  document.getElementById('bm-tg').value='all';
  const sel=document.getElementById('bm-prod');
  sel.innerHTML=S.products.map(p=>`<option value="${p.id}">${p.icon||'📦'} ${p.name}</option>`).join('');
  om('bulk-modal');
}
function editBulk(id){
  const b=S.bulkoffers.find(x=>x.id===id);if(!b)return;
  const sel=document.getElementById('bm-prod');
  sel.innerHTML=S.products.map(p=>`<option value="${p.id}"${p.id===b.productId?' selected':''}>${p.icon||'📦'} ${p.name}</option>`).join('');
  document.getElementById('bm-id').value=id;
  document.getElementById('bm-qty').value=b.minQty;
  document.getElementById('bm-amt').value=b.discountAmt||b.discount||'';
  document.getElementById('bm-tg').value=b.target;
  om('bulk-modal');
}
async function saveBulkOffer(){
  const productId=parseInt(document.getElementById('bm-prod').value);
  const minQty=parseInt(document.getElementById('bm-qty').value);
  const discountAmt=parseFloat(document.getElementById('bm-amt').value);
  const target=document.getElementById('bm-tg').value;
  if(!productId||isNaN(minQty)||isNaN(discountAmt)){toast('සියලු fields fill කරන්න','error');return}
  const eid=document.getElementById('bm-id').value;
  if(eid){const b=S.bulkoffers.find(x=>x.id===parseInt(eid));if(b){Object.assign(b,{productId,minQty,discountAmt,target});await pu('bulkoffers',b)}}
  else await pa('bulkoffers',{productId,minQty,discountAmt,target,active:true,createdAt:new Date().toISOString()});
  await loadAll();renderBulk();cm('bulk-modal');toast('ප්‍රමාණ දීමනාව සුරකින ලදී ✓','success');
}
async function toggleBulk(id){const b=S.bulkoffers.find(x=>x.id===id);if(!b)return;b.active=!b.active;await pu('bulkoffers',b);await loadAll();renderBulk()}
async function delBulk(id){await de('bulkoffers',id);await loadAll();renderBulk()}

// ═══════════ CASH OFFERS ═══════════
function renderCashOffers(){
  document.getElementById('cash-offers-list').innerHTML=S.cashoffers.map(c=>{
    const p=S.products.find(x=>x.id===c.productId);
    const amt=c.discountAmt||c.discount||0;
    return `<tr>
      <td style="color:var(--text)">${p?(p.icon||'📦')+' '+p.name:'Unknown'}</td>
      <td style="color:var(--green);font-weight:600">රු. ${amt.toFixed(2)} / ඒකක</td>
      <td><span class="badge badge-${c.active?'green':'red'}">${c.active?'✓ සක්‍රීය':'✗ නවතා ඇත'}</span></td>
      <td><span class="badge badge-${c.showSavings?'teal':'orange'}">${c.showSavings?'ගනුදෙනුකරුට පෙනේ':'සඟවා ඇත'}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="editCash(${c.id})">සංස්කරණය</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleCash(${c.id})">${c.active?'නවත්වන්න':'සක්‍රීය'}</button>
        <button class="btn btn-danger btn-sm" onclick="delCash(${c.id})">✕</button>
      </td>
    </tr>`;
  }).join('')||`<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3)">Cash දීමනා නැත</td></tr>`;
}
function openCashOfferModal(){
  document.getElementById('com-id').value='';
  document.getElementById('com-amt').value='';
  const sel=document.getElementById('com-prod');
  sel.innerHTML=S.products.map(p=>`<option value="${p.id}">${p.icon||'📦'} ${p.name}</option>`).join('');
  om('cash-modal');
}
function editCash(id){
  const c=S.cashoffers.find(x=>x.id===id);if(!c)return;
  const sel=document.getElementById('com-prod');
  sel.innerHTML=S.products.map(p=>`<option value="${p.id}"${p.id===c.productId?' selected':''}>${p.icon||'📦'} ${p.name}</option>`).join('');
  document.getElementById('com-id').value=id;
  document.getElementById('com-amt').value=c.discountAmt||c.discount||'';
  document.getElementById('com-show').value=c.showSavings?'1':'0';
  om('cash-modal');
}
async function saveCashOffer(){
  const productId=parseInt(document.getElementById('com-prod').value);
  const discountAmt=parseFloat(document.getElementById('com-amt').value);
  const showSavings=document.getElementById('com-show').value==='1';
  if(!productId||isNaN(discountAmt)){toast('සියලු fields fill කරන්න','error');return}
  const eid=document.getElementById('com-id').value;
  if(eid){const c=S.cashoffers.find(x=>x.id===parseInt(eid));if(c){Object.assign(c,{productId,discountAmt,showSavings});await pu('cashoffers',c)}}
  else await pa('cashoffers',{productId,discountAmt,showSavings,active:true});
  await loadAll();renderCashOffers();cm('cash-modal');toast('Cash දීමනාව සුරකින ලදී ✓','success');
}
async function toggleCash(id){const c=S.cashoffers.find(x=>x.id===id);if(!c)return;c.active=!c.active;await pu('cashoffers',c);await loadAll();renderCashOffers()}
async function delCash(id){await de('cashoffers',id);await loadAll();renderCashOffers()}

// ═══════════ LOYALTY ═══════════
function getLoyaltySetting(type){
  const def=type==='retail'?{earnPer100:5,pointValue:0.5,minRedeem:100,maxRedeemPct:20}:{earnPer100:8,pointValue:0.75,minRedeem:200,maxRedeemPct:15};
  const key=type==='retail'?'loyaltyRetail':'loyaltyWholesale';
  return S.settings[key]||def;
}
function renderLoyalty(){
  const lr=getLoyaltySetting('retail');
  const lw=getLoyaltySetting('wholesale');
  document.getElementById('lr-earn').value=lr.earnPer100;
  document.getElementById('lr-val').value=lr.pointValue;
  document.getElementById('lr-min').value=lr.minRedeem;
  document.getElementById('lr-max').value=lr.maxRedeemPct;
  document.getElementById('lw-earn').value=lw.earnPer100;
  document.getElementById('lw-val').value=lw.pointValue;
  document.getElementById('lw-min').value=lw.minRedeem;
  document.getElementById('lw-max').value=lw.maxRedeemPct;

  document.getElementById('tiers-list').innerHTML=S.tiers.map(t=>`<div class="loyalty-tier ${t.style}">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div><div class="lt-name">${t.name}</div><div class="lt-details">Min: ${t.minPoints} pts · +${t.bonusEarn}% bonus pts${t.discountPct?` · <strong style="color:#c084fc">${t.discountPct}% bill discount</strong>`:''} · ${t.target}</div></div>
      <div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editTier(${t.id})">✏ සංස්කරණය</button><button class="btn btn-danger btn-sm" onclick="delTier(${t.id})">✕</button></div>
    </div>
  </div>`).join('');

  const custs=S.customers;
  document.getElementById('loyalty-cust-list').innerHTML=custs.map(c=>{
    const ls=getLoyaltySetting(c.type);
    const pts=c.loyaltyPoints||0;
    const val=(pts*ls.pointValue).toFixed(2);
    const tier=getTier(pts,c.type);
    return `<tr>
      <td style="color:var(--text)">${c.name}</td>
      <td><span class="badge badge-${c.type==='wholesale'?'blue':'yellow'}">${c.type}</span></td>
      <td style="color:var(--accent);font-family:'Syne',sans-serif;font-weight:700">${pts}</td>
      <td>${tier?`<span class="${tier.style}" style="padding:2px 10px;border-radius:20px;font-size:13px;border:1px solid">${tier.name}${tier.discountPct?` · ${tier.discountPct}% off`:''}</span>`:'—'}</td>
      <td style="color:var(--green)">රු. ${val}</td>
      <td style="color:var(--text2)">රු. ${(c.totalLoyaltySaved||0).toFixed(2)}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text3)">No customers yet</td></tr>`;
}

function getTier(pts,type){
  const relevant=S.tiers.filter(t=>t.target==='all'||t.target===type).sort((a,b)=>b.minPoints-a.minPoints);
  return relevant.find(t=>pts>=t.minPoints)||null;
}

async function saveLoyalty(type){
  const key=type==='retail'?'lr':'lw';
  const val={
    earnPer100:parseFloat(document.getElementById(`${key}-earn`).value)||5,
    pointValue:parseFloat(document.getElementById(`${key}-val`).value)||0.5,
    minRedeem:parseInt(document.getElementById(`${key}-min`).value)||100,
    maxRedeemPct:parseInt(document.getElementById(`${key}-max`).value)||20
  };
  await pu('settings',{key:`loyalty${type==='retail'?'Retail':'Wholesale'}`,value:val});
  await loadAll();toast(`${type} loyalty settings saved`,'success');
}

function openTierModal(){document.getElementById('tm-id').value='';['tm-name','tm-min','tm-bonus','tm-disc'].forEach(id=>document.getElementById(id).value='');om('tier-modal')}
function editTier(id){
  const t=S.tiers.find(x=>x.id===id);if(!t)return;
  document.getElementById('tm-id').value=id;
  document.getElementById('tm-name').value=t.name;
  document.getElementById('tm-style').value=t.style;
  document.getElementById('tm-min').value=t.minPoints;
  document.getElementById('tm-bonus').value=t.bonusEarn;
  document.getElementById('tm-disc').value=t.discountPct||0;
  document.getElementById('tm-tg').value=t.target;
  om('tier-modal');
}
async function saveTier(){
  const name=document.getElementById('tm-name').value.trim();
  if(!name){toast('Name required','error');return}
  const obj={name,style:document.getElementById('tm-style').value,minPoints:parseInt(document.getElementById('tm-min').value)||0,bonusEarn:parseInt(document.getElementById('tm-bonus').value)||0,discountPct:parseFloat(document.getElementById('tm-disc').value)||0,target:document.getElementById('tm-tg').value};
  const eid=document.getElementById('tm-id').value;
  if(eid){const t=S.tiers.find(x=>x.id===parseInt(eid));if(t){Object.assign(t,obj);await pu('tiers',t)}}else await pa('tiers',obj);
  await loadAll();renderLoyalty();cm('tier-modal');toast('Tier saved','success');
}
async function delTier(id){await de('tiers',id);await loadAll();renderLoyalty()}

// ═══════════ CUSTOMERS ═══════════
let custSourceFilter='all';
function cTab(type,el){custTabState=type;document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('act'));el.classList.add('act');renderCustomers()}
function cSourceTab(src,el){custSourceFilter=src;document.querySelectorAll('#cs-all,#cs-pos,#cs-app,#cs-admin').forEach(t=>t.classList.remove('act'));el.classList.add('act');renderCustomers()}

function renderCustomers(){
  const searchQ=(document.getElementById('cust-search')?.value||'').toLowerCase();
  let custs=S.customers.filter(c=>c.type===custTabState);
  // Source filter
  if(custSourceFilter==='pos') custs=custs.filter(c=>c.registeredSource==='pos');
  else if(custSourceFilter==='app') custs=custs.filter(c=>!c.registeredSource||c.registeredSource==='customer');
  else if(custSourceFilter==='admin') custs=custs.filter(c=>c.registeredSource==='admin');
  // Search
  if(searchQ) custs=custs.filter(c=>c.name.toLowerCase().includes(searchQ)||(c.phone||'').includes(searchQ)||(c.email||'').toLowerCase().includes(searchQ));
  document.getElementById('cust-count').textContent=`${custs.length} customers`;

  const srcIcon=s=>s==='pos'?'🖥 POS':s==='admin'?'🔧 Admin':s==='customer'?'📱 App':'📱 App';
  const srcColor=s=>s==='pos'?'var(--teal)':s==='admin'?'var(--orange)':'var(--purple)';

  document.getElementById('custs-tbody').innerHTML=custs.map(c=>{
    const ords=S.orders.filter(o=>o.customerId===c.id&&o.status!=='cancelled');
    const cashOrds=ords.filter(o=>o.paymentMethod==='cash'||o.paymentMethod==='card'||o.source==='pos');
    const b2bOrds=ords.filter(o=>o.paymentMethod==='bill_to_bill');
    const cashSpent=cashOrds.reduce((s,o)=>s+o.total,0);
    const b2bSpent=b2bOrds.reduce((s,o)=>s+o.total,0);
    const pts=c.loyaltyPoints||0;
    const ls=getLoyaltySetting(c.type);
    const routeOpts=S.routes.map(r=>`<option value="${r.name}" ${c.route===r.name?'selected':''}>${r.name}${r.days&&r.days.length?' ('+r.days.slice(0,2).join(',')+')':''}</option>`).join('');
    const routeCell=c.type==='wholesale'
      ?`<td style="padding:9px 12px"><select class="pe-inp" id="route-sel-${c.id}" style="min-width:110px;font-size:13px" onchange="updateCustRoute(${c.id})"><option value="">— Route —</option>${routeOpts}</select></td>`
      :`<td style="padding:9px 12px;color:var(--text3);font-size:13px">—</td>`;

    let payCell=`<td style="padding:9px 12px;color:var(--text3);font-size:13px">Retail</td>`;
    if(c.type==='wholesale'){
      const isB2B=c.defaultPayment==='bill_to_bill';
      const fb=c.forwardBalance||0;
      const cashSel=!isB2B?'background:rgba(21,128,61,.15);color:var(--green);border-color:rgba(21,128,61,.4);font-weight:700':'color:var(--text3);background:transparent';
      const b2bSel=isB2B?'background:rgba(29,78,216,.12);color:var(--blue);border-color:rgba(29,78,216,.35);font-weight:700':'color:var(--text3);background:transparent';
      const toggle=`<div style="display:inline-flex;border:1px solid var(--border);border-radius:7px;overflow:hidden;margin-bottom:${isB2B?'6':'0'}px">
        <span onclick="setPayMethod(${c.id},'cash')" style="padding:4px 10px;font-size:13px;cursor:pointer;transition:.15s;${cashSel}">💵 Cash</span>
        <span onclick="setPayMethod(${c.id},'bill_to_bill')" style="padding:4px 10px;font-size:13px;cursor:pointer;transition:.15s;border-left:1px solid var(--border);${b2bSel}">📄 B2B</span>
      </div>`;
      const balance=isB2B?`<div style="display:flex;align-items:center;gap:6px">
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${fb>0?'var(--red)':'var(--green)'}">රු. ${fb.toFixed(0)}</span>
        ${fb>0?`<button class="btn btn-orange btn-sm" onclick="openDeductModal(${c.id})" style="font-size:13px;padding:2px 7px">Reduce</button><button class="btn btn-danger btn-sm" onclick="settleB2B(${c.id})" style="font-size:13px;padding:2px 7px">Settle</button>`:'<span style="font-size:13px;color:var(--green)">Clear ✓</span>'}
      </div>`:'';
      payCell=`<td style="padding:9px 12px;min-width:180px">${toggle}${balance}</td>`;
    }

    // Source badge
    const src=c.registeredSource||'customer';
    const srcBadge=`<span style="font-size:13px;background:transparent;border:1px solid;border-color:${srcColor(src)};color:${srcColor(src)};border-radius:20px;padding:1px 7px">${srcIcon(src)}</span>
      ${c.registeredBranch&&src==='pos'?`<br><span style="font-size:13px;color:var(--text3)">🏪 ${c.registeredBranch}</span>`:''}
      <br><span style="font-size:13px;color:var(--text3)">${c.createdAt?new Date(c.createdAt).toLocaleDateString():''}</span>`;

    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--text)">${c.name}</div>
        ${c.businessName?`<div style="font-size:13px;color:var(--text3)">${c.businessName}</div>`:''}
        ${c.email?`<div style="font-size:13px;color:var(--text3)">${c.email}</div>`:''}
      </td>
      <td style="padding:9px 12px;font-size:13px">${c.phone||'—'}</td>
      <td style="padding:9px 12px;font-size:13px;color:var(--text3)">${c.location||'—'}</td>
      ${routeCell}
      <td style="padding:9px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:700">${ords.length}</td>
      <td style="padding:9px 12px;text-align:right;color:var(--green);font-size:13px">රු. ${cashSpent.toFixed(0)}<br><span style="font-size:13px;color:var(--text3)">${cashOrds.length} orders</span></td>
      <td style="padding:9px 12px;text-align:right;color:var(--blue);font-size:13px">${c.type==='wholesale'?`රු. ${b2bSpent.toFixed(0)}<br><span style="font-size:13px;color:var(--text3)">${b2bOrds.length} orders</span>`:'<span style="color:var(--text3)">—</span>'}</td>
      <td style="padding:9px 12px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--accent)">${pts}</div>
        <div style="font-size:13px;color:var(--text3)">රු. ${(pts*ls.pointValue).toFixed(0)}</div>
      </td>
      <td style="padding:9px 12px">${srcBadge}</td>
      ${payCell}
      <td style="padding:9px 12px">
        <button class="btn btn-ghost btn-sm" onclick="openAdminCustHistory(${c.id})" style="font-size:13px">📋 History</button>
      </td>
    </tr>`;
  }).join('')||`<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3)">No customers found</td></tr>`;
}

function openAdminCustHistory(custId){
  const c=S.customers.find(x=>x.id===custId);if(!c)return;
  const ords=[...S.orders].filter(o=>o.customerId===custId&&o.status!=='cancelled').reverse();
  const totalSpent=ords.reduce((s,o)=>s+o.total,0);
  const src=c.registeredSource||'customer';
  const srcLabel=src==='pos'?`🖥 POS${c.registeredBranch?' · 🏪 '+c.registeredBranch:''}`:src==='admin'?'🔧 Admin':'📱 Customer App';
  document.getElementById('cust-hist-title').textContent=`📋 ${c.name}`;
  document.getElementById('cust-hist-body').innerHTML=`
    <div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">${c.name}</div>
          ${c.businessName?`<div style="font-size:13px;color:var(--text3)">${c.businessName}</div>`:''}
          <div style="font-size:13px;color:var(--text2);margin-top:2px">${c.phone||'—'} ${c.email?'· '+c.email:''}</div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge ${c.type==='wholesale'?'badge-blue':'badge-yellow'}">${c.type}</span>
            <span style="font-size:13px;background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:1px 8px;color:var(--text2)">Registered: ${srcLabel}</span>
            ${c.createdAt?`<span style="font-size:13px;color:var(--text3)">${new Date(c.createdAt).toLocaleDateString()}</span>`:''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${c.loyaltyPoints||0}</div>
          <div style="font-size:13px;color:var(--text3)">Loyalty Points</div>
          <div style="font-size:13px;color:var(--green);margin-top:2px">රු. ${((c.loyaltyPoints||0)*getLoyaltySetting(c.type).pointValue).toFixed(0)} value</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${[
          ['📋 ඇණවුම්',ords.length,'var(--accent)'],
          ['💰 Total Spent',`රු. ${Math.round(totalSpent).toLocaleString()}`,'var(--green)'],
          ['📊 Avg Bill',ords.length?`රු. ${(totalSpent/ords.length).toFixed(0)}`:'—','var(--teal)'],
          ['💳 B2B Balance',c.type==='wholesale'?`රු. ${(c.forwardBalance||0).toFixed(0)}`:'N/A',c.forwardBalance>0?'var(--red)':'var(--green)'],
        ].map(([l,v,col])=>`<div style="background:var(--bg1);border-radius:7px;padding:9px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${l}</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${col}">${v}</div>
        </div>`).join('')}
      </div>
    </div>
    ${!ords.length?`<div style="text-align:center;padding:40px;color:var(--text3)">ඇණවුම් නොමැත</div>`:
    `<div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text)">Order History (${ords.length})</div>`+
    ords.slice(0,50).map(o=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 13px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent)">#${String(o.id).padStart(4,'0')}</span>
        <span style="font-size:13px;color:var(--text3)">${new Date(o.date).toLocaleString()}</span>
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">රු. ${o.total.toFixed(0)}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${o.items.slice(0,4).map(i=>`${i.icon||'📦'} ${i.name} ×${i.qty}`).join(' · ')}${o.items.length>4?` +${o.items.length-4} more`:''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:13px">
        ${sBadge(o.status)}
        <span style="color:var(--text3)">${o.paymentMethod==='cash'?'💵 Cash':o.paymentMethod==='card'?'💳 Card':'📄 B2B'}</span>
        <span style="color:var(--teal)">${o.branchName?'🏪 '+o.branchName:'🏢 Central'}</span>
        <span style="color:var(--text3)">${o.source==='pos'?'POS':'Online'}</span>
        ${o.loyaltyEarned?`<span style="color:var(--accent)">⭐ +${o.loyaltyEarned} pts</span>`:''}
      </div>
    </div>`).join('')}`;
  om('cust-hist-modal');
}

async function setPayMethod(id,method){
  const c=S.customers.find(x=>x.id===id);if(!c)return;
  if(c.defaultPayment===method)return;
  c.defaultPayment=method;
  if(method==='cash'){c.forwardBalance=0;}
  await pu('customers',c);
  await pa('notifications',{type:'pay_method',message:`💳 ගෙවීම් ක්‍රමය ${method==='bill_to_bill'?'Bill-to-Bill':'Cash'} ලෙස සකස් කරන ලදී`,date:new Date().toISOString(),read:false,target:'customer',customerId:c.id});
  await loadAll();renderCustomers();toast(`✓ ${c.name} — ${method==='bill_to_bill'?'Bill-to-Bill':'Cash'} set`,'success');
}

async function settleB2B(id){
  const c=S.customers.find(x=>x.id===id);if(!c)return;
  if(!confirm(`${c.name} ගේ B2B forward balance (රු. ${(c.forwardBalance||0).toFixed(2)}) clear කරන්නද?`))return;
  const b2bOrds=S.orders.filter(o=>o.customerId===id&&o.b2bPending);
  for(const o of b2bOrds){o.b2bPending=false;o.b2bSettledAt=new Date().toISOString();await pu('orders',o);}
  c.forwardBalance=0;
  await pu('customers',c);
  await pa('notifications',{type:'b2b_settled',message:`📋 ${c.name} ගේ B2B balance settled — රු. 0 remaining`,date:new Date().toISOString(),read:false,target:'admin'});
  await loadAll();renderCustomers();toast(`✓ ${c.name} — B2B balance settled!`,'success');
}

async function updateCustRoute(id){
  const c=S.customers.find(x=>x.id===id);if(!c)return;
  const val=document.getElementById('route-sel-'+id)?.value||'';
  const route=S.routes.find(r=>r.name===val);
  c.route=val;c.routeDays=route?route.days:[];
  await pu('customers',c);
  await pa('notifications',{type:'route_update',message:`🗺 Route updated: "${val||'cleared'}" — Delivery: ${route?.days?.join(', ')||'N/A'}`,date:new Date().toISOString(),read:false,target:'customer',customerId:c.id});
  await loadAll();renderCustomers();toast(`✓ Route "${val||'cleared'}" saved`,'success');
}

// ═══════════ ROUTES ═══════════
function renderRoutes(){
  document.getElementById('routes-list').innerHTML=S.routes.length?S.routes.map(r=>{
    const assignedCusts=S.customers.filter(c=>c.type==='wholesale'&&c.route===r.name);
    const daysHtml=(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).map(d=>`<span style="padding:3px 8px;border-radius:20px;font-size:13px;border:1px solid;${r.days&&r.days.includes(d)?'background:rgba(232,255,71,.15);color:var(--accent);border-color:rgba(232,255,71,.3)':'color:var(--text3);border-color:var(--border);opacity:.5'}">${d.slice(0,3)}</span>`).join('');
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:4px">🗺 ${r.name}</div>
          ${r.description?`<div style="font-size:13px;color:var(--text3);margin-bottom:6px">${r.description}</div>`:''}
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">${daysHtml}</div>
          <div style="font-size:13px;color:var(--text2)">👥 ${assignedCusts.length} wholesale customer${assignedCusts.length!==1?'s':''} assigned${assignedCusts.length?': '+assignedCusts.map(c=>c.name).join(', ').slice(0,60):''}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="editRoute2(${r.id})">✏</button>
          <button class="btn btn-danger btn-sm" onclick="delRoute(${r.id})">✕</button>
        </div>
      </div>
    </div>`;
  }).join(''):`<div style="text-align:center;padding:60px;color:var(--text3)">Routes නොමැත — Add Route click කරන්න</div>`;
}

function toggleDayLbl(cb){
  const lbl=cb.closest('label');
  if(cb.checked){lbl.style.background='rgba(232,255,71,.15)';lbl.style.borderColor='rgba(232,255,71,.4)';lbl.style.color='var(--accent)'}
  else{lbl.style.background='';lbl.style.borderColor='var(--border)';lbl.style.color='var(--text2)'}
  const sel=[...document.querySelectorAll('#rtm-days-grid input:checked')].map(x=>x.value);
  document.getElementById('rtm-days-hint').textContent=sel.length?`✓ ${sel.join(', ')} selected`:'දිනයන් select කර නැත';
}

function openRouteModal(){
  document.getElementById('rtm-title').textContent='🗺 Route එකතු කරන්න';
  document.getElementById('rtm-id').value='';
  document.getElementById('rtm-name').value='';
  document.getElementById('rtm-desc').value='';
  document.querySelectorAll('#rtm-days-grid input').forEach(cb=>{cb.checked=false;toggleDayLbl(cb)});
  om('route-modal');
}

function editRoute2(id){
  const r=S.routes.find(x=>x.id===id);if(!r)return;
  document.getElementById('rtm-title').textContent='🗺 Route සංස්කරණය';
  document.getElementById('rtm-id').value=id;
  document.getElementById('rtm-name').value=r.name;
  document.getElementById('rtm-desc').value=r.description||'';
  document.querySelectorAll('#rtm-days-grid input').forEach(cb=>{cb.checked=r.days&&r.days.includes(cb.value);toggleDayLbl(cb)});
  om('route-modal');
}

async function saveRoute2(){
  const name=document.getElementById('rtm-name').value.trim();
  if(!name){toast('Route නම ඇතුල් කරන්න','error');return}
  const days=[...document.querySelectorAll('#rtm-days-grid input:checked')].map(x=>x.value);
  const obj={name,description:document.getElementById('rtm-desc').value.trim(),days};
  const eid=document.getElementById('rtm-id').value;
  if(eid){const r=S.routes.find(x=>x.id===parseInt(eid));if(r){Object.assign(r,obj);await pu('routes',r)}}
  else await pa('routes',obj);
  await loadAll();renderRoutes();cm('route-modal');toast('Route saved ✓','success');
}

async function delRoute(id){
  const r=S.routes.find(x=>x.id===id);if(!r)return;
  const inUse=S.customers.filter(c=>c.route===r.name).length;
  if(inUse&&!confirm(`${inUse} customers assigned to this route. Delete anyway?`))return;
  await de('routes',id);await loadAll();renderRoutes();toast('Route deleted','info');
}

function openDeductModal(id){
  document.getElementById('deduct-cid').value=id;
  const c=S.customers.find(x=>x.id===id);if(!c)return;
  document.getElementById('deduct-name').textContent=c.name;
  document.getElementById('deduct-bal').textContent=`රු. ${(c.forwardBalance||0).toFixed(2)}`;
  document.getElementById('deduct-amt').value='';
  document.getElementById('deduct-note').value='';
  om('deduct-modal');
}

async function applyDeduct(){
  const id=parseInt(document.getElementById('deduct-cid').value);
  const amt=parseFloat(document.getElementById('deduct-amt').value);
  const note=document.getElementById('deduct-note').value.trim();
  if(isNaN(amt)||amt<=0){toast('ඉවත් කළ යුතු රු. ප්‍රමාණය ඇතුල් කරන්න','error');return}
  const c=S.customers.find(x=>x.id===id);if(!c)return;
  const prev=c.forwardBalance||0;
  if(amt>prev){toast(`Balance (රු. ${prev.toFixed(2)}) ට වඩා ඉවත් කළ නොහැක`,'error');return}
  c.forwardBalance=Math.max(0,prev-amt);
  await pu('customers',c);
  await pa('notifications',{type:'b2b_deduct',message:`📋 Bill deduction: රු. ${amt.toFixed(2)} deducted from ${c.name}'s balance${note?`. Note: ${note}`:''}`,date:new Date().toISOString(),read:false,target:'customer',customerId:c.id});
  await loadAll();renderCustomers();cm('deduct-modal');
  toast(`✓ රු. ${amt.toFixed(2)} deducted. Remaining: රු. ${c.forwardBalance.toFixed(2)}`,'success');
}

// ── Branch B2B Balance Functions ──
async function applyBranchDeduct(){
  const id=parseInt(document.getElementById('branch-deduct-id').value);
  const amt=parseFloat(document.getElementById('branch-deduct-amt').value);
  if(!amt||amt<=0){toast('ගෙවූ මුදල ඇතුල් කරන්න','error');return}
  const b=S.branches.find(x=>x.id===id);if(!b)return;
  const prev=b.forwardBalance||0;
  b.forwardBalance=Math.max(0,prev-amt);
  await pu('branches',b);
  await loadAll();
  cm('branch-deduct-modal');
  renderBranches();
  toast(`✓ රු. ${amt.toFixed(2)} B2B ශේෂයෙන් ඉවත් කළා. ශේෂය: රු. ${b.forwardBalance.toFixed(2)}`,'success');
}

// ═══════════ COMPLAINTS ═══════════
function renderComplaints(){
  document.getElementById('comp-list').innerHTML=[...S.complaints].reverse().map(c=>`
    <div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div><div style="font-family:'Syne',sans-serif;font-weight:600">${c.customerName} <span class="badge badge-${c.type==='complaint'?'red':'blue'}" style="margin-left:5px">${c.type}</span>${!c.read?`<span class="badge badge-orange" style="margin-left:4px">New</span>`:''}</div><div style="font-size:13px;color:var(--text3);margin-top:2px">${new Date(c.date).toLocaleString()}</div></div>
        <div style="display:flex;gap:5px">
          ${!c.read?`<button class="btn btn-ghost btn-sm" onclick="markRead(${c.id})">Mark Read</button>`:''}
          <button class="btn btn-blue btn-sm" onclick="openReply(${c.id})">Reply</button>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${c.text}</div>
      ${c.reply?`<div style="background:var(--accent-dim);border:1px solid rgba(232,255,71,.2);border-radius:7px;padding:10px;font-size:13px;color:var(--accent)">📩 Admin: ${c.reply}</div>`:''}
    </div>`).join('')||`<div style="text-align:center;padding:60px;color:var(--text3)">No complaints</div>`;
}
async function markRead(id){const c=S.complaints.find(x=>x.id===id);if(c){c.read=true;await pu('complaints',c);await loadAll();renderComplaints();updateBadges()}}
function openReply(id){document.getElementById('rc-id').value=id;document.getElementById('rc-txt').value='';om('reply-modal')}
async function sendReply(){
  const id=parseInt(document.getElementById('rc-id').value);
  const txt=document.getElementById('rc-txt').value.trim();
  if(!txt){toast('Write reply first','error');return}
  const c=S.complaints.find(x=>x.id===id);
  if(c){c.reply=txt;c.read=true;await pu('complaints',c);await pa('notifications',{type:'reply',message:`📩 Admin replied: "${txt.slice(0,60)}"`,date:new Date().toISOString(),read:false,target:'customer',customerId:c.customerId});await loadAll();renderComplaints();cm('reply-modal');toast('Reply sent','success')}
}

// ═══════════ ZONES ═══════════
function renderZones(){
  document.getElementById('zones-list').innerHTML=S.zones.map(z=>`<div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700">📍 ${z.name}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:3px">ප්‍රදේශ: ${z.areas.join(', ')} · දින: ${z.days.join(', ')} · Lead: ${z.leadDays} day(s)</div>
        <div style="margin-top:5px">
          <span style="font-size:13px;background:${z.deliveryFee>0?'rgba(232,255,71,.1)':'rgba(46,213,115,.1)'};border:1px solid ${z.deliveryFee>0?'rgba(232,255,71,.3)':'rgba(46,213,115,.3)'};border-radius:4px;padding:2px 8px;color:${z.deliveryFee>0?'var(--accent)':'var(--green)'}">
            🚚 ${z.deliveryFee>0?`රු. ${z.deliveryFee.toFixed(2)} ගාස්තු`:'නොමිලේ බෙදාහැරීම'}
          </span>
        </div>
      </div>
      <div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editZone(${z.id})">✏ සංස්කරණය</button><button class="btn btn-danger btn-sm" onclick="delZone(${z.id})">✕</button></div>
    </div>
  </div>`).join('')||`<div style="text-align:center;padding:60px;color:var(--text3)">කලාප නොමැත</div>`;
}
function openZoneModal(){document.getElementById('zm-id').value='';['zm-n','zm-a','zm-d','zm-l','zm-fee'].forEach(id=>document.getElementById(id).value='');document.getElementById('zm-fee').value='0';om('zone-modal')}
function editZone(id){const z=S.zones.find(x=>x.id===id);if(!z)return;document.getElementById('zm-id').value=id;document.getElementById('zm-n').value=z.name;document.getElementById('zm-a').value=z.areas.join(', ');document.getElementById('zm-d').value=z.days.join(', ');document.getElementById('zm-l').value=z.leadDays;document.getElementById('zm-fee').value=z.deliveryFee||0;om('zone-modal')}
async function saveZone(){
  const name=document.getElementById('zm-n').value.trim();if(!name){toast('නම ඇතුල් කරන්න','error');return}
  const obj={name,areas:document.getElementById('zm-a').value.split(',').map(s=>s.trim()).filter(Boolean),days:document.getElementById('zm-d').value.split(',').map(s=>s.trim()).filter(Boolean),leadDays:parseInt(document.getElementById('zm-l').value)||1,deliveryFee:parseFloat(document.getElementById('zm-fee').value)||0};
  const eid=document.getElementById('zm-id').value;
  if(eid){const z=S.zones.find(x=>x.id===parseInt(eid));if(z){Object.assign(z,obj);await pu('zones',z)}}else await pa('zones',obj);
  await loadAll();renderZones();cm('zone-modal');toast('Zone saved ✓','success');
}
async function delZone(id){await de('zones',id);await loadAll();renderZones()}

// ═══════════ REMINDERS ═══════════
function renderRems(){
  document.getElementById('rems-list').innerHTML=S.reminders.map(r=>`<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
    <div style="font-size:24px">${r.target==='retail'?'🛒':'🏭'}</div>
    <div style="flex:1"><div style="font-family:'Syne',sans-serif;font-weight:600;font-size:13px">${r.title}</div><div style="font-size:13px;color:var(--text3)">${r.message.slice(0,70)} · Day ${r.day}</div></div>
    <div style="display:flex;gap:5px"><button class="btn btn-primary btn-sm" onclick="fireRem(${r.id})">Send Now</button><button class="btn btn-danger btn-sm" onclick="delRem(${r.id})">✕</button></div>
  </div>`).join('')||`<div style="text-align:center;padding:60px;color:var(--text3)">No reminders</div>`;
}
function openRemModal(){['rm-t','rm-m','rm-d'].forEach(id=>document.getElementById(id).value='');om('rem-modal')}
async function saveRem(){
  const title=document.getElementById('rm-t').value.trim(),msg=document.getElementById('rm-m').value.trim();
  if(!title||!msg){toast('Fill all','error');return}
  await pa('reminders',{title,message:msg,target:document.getElementById('rm-tg').value,day:parseInt(document.getElementById('rm-d').value)||1,active:true});
  await loadAll();renderRems();cm('rem-modal');toast('Reminder scheduled','success');
}
async function fireRem(id){
  const r=S.reminders.find(x=>x.id===id);if(!r)return;
  const targets=S.customers.filter(c=>c.type===r.target);
  for(const c of targets) await pa('notifications',{type:'reminder',message:`🔔 ${r.title}: ${r.message}`,date:new Date().toISOString(),read:false,target:'customer',customerId:c.id});
  toast(`Sent to ${targets.length} ${r.target} customers`,'success');
}
async function delRem(id){await de('reminders',id);await loadAll();renderRems()}

// ═══════════ POS ═══════════
let posCart=[],posPayMethod='cash',posDiscType='pct',posActiveMember=null,posCustType='walkin_retail',posBillNum=1,posHeldBills=[],posSearchQ='',posCatFilter='all';
let posActiveBillingBranch=null; // null = Central, otherwise branch object

// ══════════════════════════════════════════
// BRANCH ORDER PAGE
// ══════════════════════════════════════════
let boCart=[],boPayMethod='cash',boDiscType='pct',boActiveBranch=null,boActiveWsCust=null,boBillNum=1,boSearchQ='',boCatFilter='all';

function renderBranchOrder(){
  const ct=document.getElementById('page-branch-order');
  ct.innerHTML=`
  <div class="pos-topbar">
    <div class="pos-stat"><div class="pos-stat-val" id="bo-today-rev">රු. 0</div><div class="pos-stat-lbl">Branch Orders Today</div></div>
    <div class="pos-stat"><div class="pos-stat-val" id="bo-today-cnt">0</div><div class="pos-stat-lbl">Bills</div></div>
    <div style="margin-left:auto;display:flex;gap:6px">
      <button class="btn btn-ghost btn-sm" onclick="boNewBill()">🔄 New Bill</button>
    </div>
  </div>
  <div class="pos-wrap">
    <div class="pos-bill-col">
      <div class="pos-bill-head">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <div class="pos-bill-num" id="bo-bill-num">BILL #001</div>
            <span style="font-size:13px;color:var(--text3)" id="bo-bill-time"></span>
          </div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-danger btn-sm" onclick="boVoidBill()">✕ Void</button>
            <button class="btn btn-ghost btn-sm" onclick="boNewBill()">🔄 New</button>
          </div>
        </div>
        <!-- Selected branch display — click to open float panel -->
        <div id="bo-branch-head-display" onclick="boBranchFloatToggle()" style="cursor:pointer;background:rgba(8,145,178,.08);border:1.5px dashed rgba(8,145,178,.4);border-radius:8px;padding:9px 12px;text-align:center;color:var(--teal);font-size:13px;transition:.15s" onmouseover="this.style.background='rgba(8,145,178,.14)'" onmouseout="this.style.background='rgba(8,145,178,.08)'">
          🏪 Branch තෝරන්න — ▲ click
        </div>
      </div>
      <div class="pos-items" id="bo-items">
        <div style="text-align:center;padding:30px 20px;color:var(--text3);font-size:13px"><div style="font-size:36px;margin-bottom:8px;opacity:.2">🏪</div>Branch order නිෂ්පාදන add කරන්න</div>
      </div>
      <div class="pos-foot">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">
          <div>
            <div class="pos-sum-row"><span style="color:var(--text3)">Retail මිල</span><span id="bo-wik-sub">රු. 0.00</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(21,128,61,.12);border:1.5px solid rgba(21,128,61,.4);border-radius:6px;padding:4px 7px;margin:2px 0"><span style="color:var(--green);font-weight:700;font-size:14px">🟢 අත ඉතිරි</span><span id="bo-hand-save" style="color:var(--green);font-weight:800;font-family:'Syne',sans-serif;font-size:14px">රු. 0.00</span></div>
            <div class="pos-sum-row"><span style="color:var(--teal);font-weight:600">⭐ Wholesale මිල</span><span id="bo-sub" style="color:var(--teal);font-weight:600">රු. 0.00</span></div>
          </div>
          <div style="display:flex;flex-direction:column;justify-content:flex-end;gap:4px">
            <div class="pos-disc-row" style="margin:0">
              <div class="pos-disc-type">
                <span id="bo-disc-pct-btn" class="act" onclick="boSetDiscType('pct')">%</span>
                <span id="bo-disc-lkr-btn" onclick="boSetDiscType('lkr')">රු.</span>
              </div>
              <input class="pos-disc-inp" id="bo-disc-val" type="number" min="0" placeholder="Discount" oninput="boUpdateBill()">
            </div>
          </div>
        </div>
        <div class="pos-total-row"><span>සම්පූර්ණ ගෙවිය යුතු</span><span id="bo-total">රු. 0.00</span></div>
        <div class="pos-pay-btns" id="bo-pay-btns" style="margin-bottom:5px">
          <div class="pos-pay-btn sel-cash" id="bo-pay-cash" onclick="boSetPay('cash')">💵 Cash</div>
          <div class="pos-pay-btn" id="bo-pay-card" onclick="boSetPay('card')">💳 Card</div>
          <div class="pos-pay-btn" id="bo-pay-b2b" onclick="boSetPay('bill_to_bill')" style="grid-column:1/-1;font-size:14px;padding:9px">📄 Bill-to-Bill ගිණුමට</div>
        </div>
        <div id="bo-cash-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input class="pos-cash-inp" id="bo-cash-given" type="number" placeholder="ගෙවූ මුදල (රු.)..." oninput="boCalcChange()" min="0" style="flex:1">
          <div class="pos-change-disp" id="bo-change-disp">ඉතිරි: —</div>
        </div>
        <button class="btn-pos-complete" id="bo-complete-btn" onclick="boCompleteSale()" disabled>✓ Branch Order සම්පූර්ණ කරන්න</button>
      </div>
    </div>
    <div class="prod-col" style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div class="pos-topbar" style="padding:6px 10px;gap:6px;flex-shrink:0">
        <input class="pos-search" id="bo-search" placeholder="🔍 Search..." oninput="boSearch(this.value)" autocomplete="off" style="flex:1">
        <input class="pos-search" id="bo-barcode" placeholder="🔲 Barcode" onkeydown="if(event.key==='Enter')boBarcodeScan(this.value)" style="width:120px">
      </div>
      <div id="bo-cats" style="display:flex;gap:5px;padding:5px 10px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid var(--border)"></div>
      <div class="pos-grid" id="bo-grid" style="overflow-y:auto;flex:1"></div>
    </div>
  </div>
  <div class="mo" id="bo-receipt-modal">
    <div class="modal" style="max-width:380px;background:#f9f9f9">
      <div class="mh" style="background:#f9f9f9;border-bottom:1px solid #e0e0e0">
        <div class="mt" style="color:#222">🧾 Branch Order Bill</div>
        <button class="mc" style="color:#666" onclick="cm('bo-receipt-modal')">✕</button>
      </div>
      <div class="mb" style="background:#f9f9f9">
        <div id="bo-receipt-content"></div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-ghost" style="flex:1;justify-content:center;white-space:nowrap" onclick="window.print()">🖨 Print</button>
          <button class="btn" style="flex:1;justify-content:center;background:var(--teal);color:#fff;font-weight:700" onclick="boNewBill();cm('bo-receipt-modal')">✓ New Order</button>
        </div>
      </div>
    </div>
  </div>`;
  boUpdateStats();boRenderCats();boRenderGrid();boUpdateBillNum();
  clearInterval(window._boClock);
  window._boClock=setInterval(()=>{const el=document.getElementById('bo-bill-time');if(el)el.textContent=new Date().toLocaleTimeString();},1000);
  // Show branch float button, init display
  const bfb=document.getElementById('bo-branch-float-btn');if(bfb)bfb.classList.add('bo-visible');
  const bfp=document.getElementById('bo-branch-float-panel');if(bfp)bfp.classList.add('bo-visible');
  boBranchUpdateFloatBtn();boUpdateBranchHeadDisplay();
}
function boUpdateStats(){
  const today=new Date().toDateString();
  const ords=S.orders.filter(o=>o.isBranchOrder&&new Date(o.date).toDateString()===today&&o.status!=='cancelled');
  const r=document.getElementById('bo-today-rev');if(r)r.textContent=`රු. ${Math.round(ords.reduce((s,o)=>s+o.total,0)).toLocaleString()}`;
  const c=document.getElementById('bo-today-cnt');if(c)c.textContent=ords.length;
}
function boUpdateBillNum(){const el=document.getElementById('bo-bill-num');if(el)el.textContent=`BILL #${String(boBillNum).padStart(3,'0')}`;}
// ── Branch Order Floating Branch Selector ──
let boBranchFloatOpen=false;
function boBranchFloatToggle(){
  boBranchFloatOpen=!boBranchFloatOpen;
  const panel=document.getElementById('bo-branch-float-panel');
  const arrow=document.getElementById('bo-branch-float-arrow');
  if(panel){panel.classList.toggle('bo-open',boBranchFloatOpen);}
  if(arrow) arrow.textContent=boBranchFloatOpen?'▼':'▲';
  if(boBranchFloatOpen) boBranchRenderList();
}
function boBranchRenderList(){
  const el=document.getElementById('bo-branch-list-float');if(!el)return;
  if(!S.branches.length){el.innerHTML=`<div style="text-align:center;padding:20px;color:var(--text3)">Branch නොමැත</div>`;return;}
  el.innerHTML=S.branches.map(b=>{
    const bal=b.forwardBalance||0;
    const isSelected=boActiveBranch&&boActiveBranch.id===b.id;
    return `<div onclick="boBranchSelectFloat(${b.id})" style="cursor:pointer;padding:12px 14px;border-radius:10px;margin-bottom:6px;border:2px solid ${isSelected?'var(--teal)':'var(--border)'};background:${isSelected?'rgba(8,145,178,.08)':'var(--bg2)'};transition:.15s" onmouseover="this.style.background='rgba(8,145,178,.1)'" onmouseout="this.style.background='${isSelected?'rgba(8,145,178,.08)':'var(--bg2)'}'">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:${isSelected?'var(--teal)':'var(--text)'}">🏪 ${b.name} ${isSelected?'✓':''}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">📍 ${b.location||'—'} · 👤 ${b.manager||'—'}</div>
      ${bal>0?`<div style="font-size:12px;color:var(--red);margin-top:3px;font-weight:700">📋 B2B ශේෂය: රු. ${bal.toFixed(2)}</div>`:`<div style="font-size:12px;color:var(--green);margin-top:3px">✓ B2B Clear</div>`}
    </div>`;
  }).join('');
}
function boBranchSelectFloat(id){
  boActiveBranch=S.branches.find(b=>b.id===id)||null;
  boBranchFloatOpen=false;
  const panel=document.getElementById('bo-branch-float-panel');
  if(panel) panel.classList.remove('bo-open');
  document.getElementById('bo-branch-float-arrow').textContent='▲';
  boBranchUpdateFloatBtn();
  boUpdateBranchHeadDisplay();
  const btn=document.getElementById('bo-complete-btn');if(btn)btn.disabled=!(boActiveBranch&&boCart.length);
  boCalcB2B();boRenderGrid();
}
function boBranchUpdateFloatBtn(){
  const lbl=document.getElementById('bo-branch-float-label');
  const btn=document.getElementById('bo-branch-float-btn');
  if(!lbl||!btn) return;
  if(boActiveBranch){
    lbl.textContent=boActiveBranch.name;
    btn.style.background='var(--teal)';
    btn.style.boxShadow='0 4px 18px rgba(8,145,178,.5)';
  } else {
    lbl.textContent='Branch තෝරන්න';
    btn.style.background='rgba(8,145,178,.7)';
    btn.style.boxShadow='0 4px 18px rgba(8,145,178,.25)';
  }
}
function boUpdateBranchHeadDisplay(){
  const el=document.getElementById('bo-branch-head-display');if(!el)return;
  if(boActiveBranch){
    const bal=boActiveBranch.forwardBalance||0;
    el.style.borderStyle='solid';
    el.style.borderColor='var(--teal)';
    el.innerHTML=`<div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--teal)">🏪 ${boActiveBranch.name}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">📍 ${boActiveBranch.location||'—'} · 📞 ${boActiveBranch.phone||'—'}</div>
      ${bal>0?`<div style="font-size:12px;color:var(--red);margin-top:2px;font-weight:700">📋 B2B ශේෂය: රු. ${bal.toFixed(2)}</div>`:''}<div style="font-size:11px;color:var(--text3);margin-top:3px">tap to change ▲</div>`;
  } else {
    el.style.borderStyle='dashed';
    el.style.borderColor='rgba(8,145,178,.4)';
    el.innerHTML='🏪 Branch තෝරන්න — ▲ click';
  }
}
function boSelectBranch(val){
  boActiveBranch=val?S.branches.find(b=>b.id===parseInt(val))||null:null;
  boBranchUpdateFloatBtn();boUpdateBranchHeadDisplay();
  const btn=document.getElementById('bo-complete-btn');if(btn)btn.disabled=!(boActiveBranch&&boCart.length);
  boCalcB2B();boRenderGrid();
}
function boLookupCust(q){
  const res=document.getElementById('bo-cust-results');
  if(!q.trim()){res.style.display='none';return}
  const matches=S.customers.filter(c=>c.type==='wholesale'&&(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,8);
  if(!matches.length){res.style.display='none';return}
  res.style.display='block';
  res.innerHTML=matches.map(c=>`<div style="padding:8px 11px;border-bottom:1px solid var(--border);cursor:pointer" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''" onclick="boSelectCust(${c.id})">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px">${c.name}${c.businessName?`<span style="font-size:13px;color:var(--text3);margin-left:4px">${c.businessName}</span>`:''}</div>
    <div style="font-size:13px;color:var(--text3)">${c.phone||'—'} · 🏭${(c.forwardBalance||0)>0?` · <span style="color:var(--red)">📋 රු. ${(c.forwardBalance||0).toFixed(0)}</span>`:''}</div>
  </div>`).join('');
}
function boSelectCust(id){
  boActiveWsCust=S.customers.find(x=>x.id===id);if(!boActiveWsCust)return;
  document.getElementById('bo-cust-results').style.display='none';
  document.getElementById('bo-cust-q').value='';
  const badge=document.getElementById('bo-cust-badge');
  badge.style.display='flex';
  document.getElementById('bo-cust-info').innerHTML=`<div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px">${boActiveWsCust.name}${boActiveWsCust.businessName?`<span style="font-size:13px;color:var(--text3);margin-left:5px">${boActiveWsCust.businessName}</span>`:''}</div><div style="font-size:13px;color:var(--text3)">${boActiveWsCust.phone||'—'} · ⭐ ${boActiveWsCust.loyaltyPoints||0} pts</div>`;
  document.getElementById('bo-cust-clear').style.display='block';
  if(boActiveWsCust.defaultPayment==='bill_to_bill'){const b=document.getElementById('bo-pay-b2b');if(b)b.style.display='block';}
}
function boClearCust(){
  boActiveWsCust=null;
  const ids=['bo-cust-q','bo-cust-results','bo-cust-badge','bo-cust-clear'];
  ids.forEach(id=>{const e=document.getElementById(id);if(e){if(id==='bo-cust-q')e.value='';else e.style.display='none';}});
  const b=document.getElementById('bo-pay-b2b');if(b){b.style.display='none';}
  boSetPay('cash');
}
function boRenderCats(){
  const cats=['all',...new Set(S.products.map(p=>p.category).filter(Boolean))];
  const el=document.getElementById('bo-cats');if(!el)return;
  el.innerHTML=cats.map(c=>`<div onclick="boSetCat('${c}')" style="padding:4px 12px;border-radius:20px;font-size:13px;white-space:nowrap;cursor:pointer;border:1px solid var(--border);background:${boCatFilter===c?'var(--teal)':'var(--bg2)'};color:${boCatFilter===c?'#fff':'var(--text2)'};font-family:'DM Mono',monospace;transition:.15s">${c==='all'?'All':c}</div>`).join('');
}
function boSetCat(c){boCatFilter=c;boRenderCats();boRenderGrid();}
function boSearch(q){boSearchQ=q;boRenderGrid();}
function boBarcodeScan(code){
  const p=S.products.find(x=>x.barcode===code.trim());
  const inp=document.getElementById('bo-barcode');
  if(!p){toast(`Barcode "${code}" — product නොමැත`,'error');if(inp){inp.value='';inp.focus();}return}
  boAddItem(p.id);if(inp){inp.value='';inp.focus();}
}
function boRenderGrid(){
  let prods=S.products;
  if(boCatFilter!=='all') prods=prods.filter(p=>p.category===boCatFilter);
  if(boSearchQ) prods=prods.filter(p=>p.name.toLowerCase().includes(boSearchQ.toLowerCase())||(p.barcode||'').includes(boSearchQ));
  const el=document.getElementById('bo-grid');if(!el)return;
  el.innerHTML=prods.map(p=>{
    const price=p.wholesalePrice||p.retailPrice||0;
    const retail=p.retailPrice||price;
    const oos=p.stock<=0;
    const inCart=boCart.find(i=>i.pid===p.id);
    return `<div class="pos-prod ${oos?'oos':''}" id="bo-btn-${p.id}" onclick="${oos?'':'boAddItem('+p.id+')'}" title="${p.name}">
      ${inCart?`<div style="position:absolute;top:5px;right:5px;background:var(--teal);color:#fff;font-size:13px;font-weight:700;padding:1px 5px;border-radius:10px">${inCart.qty}</div>`:''}
      <div class="pos-prod-img">${p.image?`<img src="${p.image}" alt="">`:(p.icon||'📦')}</div>
      <div class="pos-prod-name">${p.name}</div>
      <div style="margin-top:3px">
        <div style="font-size:13px;color:var(--text3);text-decoration:line-through">රු. ${retail.toFixed(0)}</div>
        <div class="pos-prod-price" style="color:var(--teal)">රු. ${price.toFixed(0)}</div>
      </div>
      <div class="pos-prod-stock">${oos?'Out of stock':`Stk: ${p.stock}`}</div>
    </div>`;
  }).join('')||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">No products</div>`;
}
function boAddItem(pid){
  const p=S.products.find(x=>x.id===pid);if(!p||p.stock<=0)return;
  const price=p.wholesalePrice||p.retailPrice||0;
  const retail=p.retailPrice||price;
  const ex=boCart.find(i=>i.pid===pid);
  if(ex){if(ex.qty<p.stock)ex.qty++;else{toast(`Max stock: ${p.stock}`,'error');return;}}
  else boCart.push({pid,name:p.name,icon:p.icon||'📦',price,wikunumMila:retail,barcode:p.barcode||null,qty:1});
  boRenderItems();boUpdateBill();boRenderGrid();
}
function boRenderItems(){
  const el=document.getElementById('bo-items');if(!el)return;
  if(!boCart.length){el.innerHTML=`<div style="text-align:center;padding:30px 20px;color:var(--text3);font-size:13px"><div style="font-size:36px;margin-bottom:8px;opacity:.2">🏪</div>Branch order නිෂ්පාදන add කරන්න</div>`;return;}
  el.innerHTML=boCart.map((item,idx)=>`<div class="pos-item">
    <div class="pos-item-icon">${item.icon}</div>
    <div class="pos-item-detail">
      <div class="pos-item-name">${item.name}</div>
      <div class="pos-item-price">රු. ${item.price.toFixed(2)} × ${item.qty} = <strong>රු. ${(item.price*item.qty).toFixed(2)}</strong></div>
    </div>
    <div class="pos-item-qty">
      <button onclick="boQtyChange(${idx},-1)">−</button>
      <span>${item.qty}</span>
      <button onclick="boQtyChange(${idx},1)">+</button>
    </div>
    <button onclick="boRemoveItem(${idx})" class="pos-item-del">✕</button>
  </div>`).join('');
}
function boQtyChange(idx,d){
  const p=S.products.find(x=>x.id===boCart[idx]?.pid);
  if(!boCart[idx])return;
  boCart[idx].qty+=d;
  if(boCart[idx].qty<=0)boCart.splice(idx,1);
  else if(p&&boCart[idx].qty>p.stock){boCart[idx].qty=p.stock;toast(`Max: ${p.stock}`,'error');}
  boRenderItems();boUpdateBill();boRenderGrid();
}
function boRemoveItem(idx){boCart.splice(idx,1);boRenderItems();boUpdateBill();boRenderGrid();}
function boUpdateBill(){
  const apeSub=boCart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=boCart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const handSave=wikSub-apeSub;
  const dv=parseFloat(document.getElementById('bo-disc-val')?.value)||0;
  let disc=boDiscType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);if(dv<=0)disc=0;
  const total=Math.max(0,apeSub-disc);
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  s('bo-wik-sub',`රු. ${wikSub.toFixed(2)}`);s('bo-hand-save',`රු. ${handSave.toFixed(2)}`);s('bo-sub',`රු. ${apeSub.toFixed(2)}`);s('bo-total',`රු. ${total.toFixed(2)}`);
  const btn=document.getElementById('bo-complete-btn');if(btn)btn.disabled=!(boActiveBranch&&boCart.length);
  if(boPayMethod==='bill_to_bill') boUpdateB2BPanel();
}
function boSetDiscType(t){boDiscType=t;document.getElementById('bo-disc-pct-btn')?.classList.toggle('act',t==='pct');document.getElementById('bo-disc-lkr-btn')?.classList.toggle('act',t==='lkr');boUpdateBill();}
function boSetPay(m){
  boPayMethod=m;
  ['bo-pay-cash','bo-pay-card','bo-pay-b2b'].forEach(id=>{const e=document.getElementById(id);if(e)e.className='pos-pay-btn';});
  const selMap={'cash':'sel-cash','card':'sel-card','bill_to_bill':'sel-b2b'};
  const idMap={'cash':'bo-pay-cash','card':'bo-pay-card','bill_to_bill':'bo-pay-b2b'};
  if(selMap[m]&&idMap[m]){const e=document.getElementById(idMap[m]);if(e)e.classList.add(selMap[m]);}
  const isB2B=m==='bill_to_bill';
  const cashRow=document.getElementById('bo-cash-row');if(cashRow)cashRow.style.display=isB2B?'none':'flex';
  const b2bPanel=document.getElementById('bo-b2b-panel');if(b2bPanel)b2bPanel.style.display=isB2B&&boActiveBranch?'block':'none';
  const b2bPartial=document.getElementById('bo-b2b-partial-row');if(b2bPartial)b2bPartial.style.display=isB2B&&boActiveBranch?'block':'none';
  if(isB2B){
    boUpdateB2BPanel();
    // Auto-open float panel to show B2B info
    if(!boBranchFloatOpen){boBranchFloatOpen=true;const p=document.getElementById('bo-branch-float-panel');if(p)p.classList.add('bo-open');const a=document.getElementById('bo-branch-float-arrow');if(a)a.textContent='▼';boBranchRenderList();}
  }
}
function boUpdateB2BPanel(){
  if(!boActiveBranch) return;
  const existing=boActiveBranch.forwardBalance||0;
  const total=parseFloat((document.getElementById('bo-total')?.textContent||'').replace('රු. ','').replace(/,/g,''))||0;
  // Hand savings = wikunu - ape
  const wikSub=parseFloat((document.getElementById('bo-wik-sub')?.textContent||'').replace('රු. ','').replace(/,/g,''))||0;
  const apeSub=parseFloat((document.getElementById('bo-sub')?.textContent||'').replace('රු. ','').replace(/,/g,''))||0;
  const handSave=Math.max(0,wikSub-apeSub);
  const grand=existing+total;
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  s('bo-b2b-hand-save',`රු. ${handSave.toFixed(2)}`);
  s('bo-b2b-existing',`රු. ${existing.toFixed(2)}`);
  s('bo-b2b-this',`රු. ${total.toFixed(2)}`);
  s('bo-b2b-total',`රු. ${grand.toFixed(2)}`);
  s('bo-b2b-branch-name',boActiveBranch.name);
  const existEl=document.getElementById('bo-b2b-existing');
  if(existEl) existEl.style.color=existing>0?'var(--red)':'var(--green)';
  boUpdateB2BPartial();
}
function boUpdateB2BPartial(){
  const existing=boActiveBranch?.forwardBalance||0;
  const total=parseFloat((document.getElementById('bo-total')?.textContent||'').replace('රු. ','').replace(/,/g,''))||0;
  const grand=existing+total;
  const partial=parseFloat(document.getElementById('bo-b2b-partial')?.value)||0;
  const remaining=Math.max(0,grand-partial);
  const el=document.getElementById('bo-b2b-remaining');
  if(el){
    if(partial>0) el.textContent=`රු. ${partial.toFixed(2)} ගෙවා ශේෂය රු. ${remaining.toFixed(2)} වේ`;
    else el.textContent='';
  }
  // Also update the total display
  const totEl=document.getElementById('bo-b2b-total');
  if(totEl) totEl.textContent=`රු. ${remaining.toFixed(2)}`;
}
function boCalcChange(){
  const total=parseFloat((document.getElementById('bo-total')?.textContent||'').replace('රු. ',''))||0;
  const given=parseFloat(document.getElementById('bo-cash-given')?.value)||0;
  const el=document.getElementById('bo-change-disp');
  if(el)el.textContent=given>=total?`ඉතිරි: රු. ${(given-total).toFixed(2)}`:'ඉතිරි: —';
}
function boVoidBill(){if(boCart.length&&!confirm('Void this order?'))return;boCart=[];boRenderItems();boUpdateBill();boRenderGrid();}
function boNewBill(){
  boCart=[];boActiveBranch=null;boPayMethod='cash';boDiscType='pct';
  ['bo-disc-val','bo-cash-given','bo-b2b-partial'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['bo-b2b-panel','bo-b2b-partial-row'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
  const cd=document.getElementById('bo-change-disp');if(cd)cd.textContent='ඉතිරි: —';
  const cr=document.getElementById('bo-cash-row');if(cr)cr.style.display='flex';
  ['bo-pay-cash','bo-pay-card','bo-pay-b2b'].forEach(id=>{const e=document.getElementById(id);if(e)e.className='pos-pay-btn';});
  const pc=document.getElementById('bo-pay-cash');if(pc)pc.className='pos-pay-btn sel-cash';
  boBranchUpdateFloatBtn();boUpdateBranchHeadDisplay();
  boBillNum++;boUpdateBillNum();boRenderItems();boUpdateBill();boRenderGrid();boUpdateStats();
}
async function boCompleteSale(){
  if(!boCart.length){toast('Order හිස්ය','error');return}
  if(!boActiveBranch){toast('Branch Supermarket තෝරන්න','error');document.getElementById('bo-branch-sel')?.focus();return}
  const apeSub=boCart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=boCart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const dv=parseFloat(document.getElementById('bo-disc-val')?.value)||0;
  let disc=boDiscType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);if(dv<=0)disc=0;
  const total=Math.max(0,apeSub-disc);
  if(boPayMethod==='cash'){const g=parseFloat(document.getElementById('bo-cash-given')?.value)||0;if(!g){toast('ගෙවූ මුදල ඇතුල් කරන්න','error');return}if(g<total){toast(`ප්‍රමාණවත් නැත. රු. ${total.toFixed(2)} අවශ්‍යයි`,'error');return}}
  else if(boPayMethod==='card'){const g=parseFloat(document.getElementById('bo-cash-given')?.value)||0;if(!g){toast('Card amount ඇතුල් කරන්න','error');return}}
  const cashGiven=parseFloat(document.getElementById('bo-cash-given')?.value)||0;
  const partialPaid=boPayMethod==='bill_to_bill'?parseFloat(document.getElementById('bo-b2b-partial')?.value)||0:0;
  const prevBalance=boActiveBranch.forwardBalance||0;
  // Update branch B2B balance
  if(boPayMethod==='bill_to_bill'){
    const branch=S.branches.find(b=>b.id===boActiveBranch.id);
    if(branch){
      branch.forwardBalance=(prevBalance+total-partialPaid);
      if(branch.forwardBalance<0)branch.forwardBalance=0;
      await pu('branches',branch);
      boActiveBranch=branch;
    }
  }
  if(boActiveWsCust&&boPayMethod==='bill_to_bill'){const c=S.customers.find(x=>x.id===boActiveWsCust.id);if(c){c.forwardBalance=(c.forwardBalance||0)+total;await pu('customers',c);}}
  const order={customerId:null,customerName:boActiveBranch.name,customerType:'branch',branchId:boActiveBranch.id,branchName:boActiveBranch.name,isBranchOrder:true,items:[...boCart],subtotal:apeSub,wikunumSubtotal:wikSub,handSavings:wikSub-apeSub,manualDiscount:disc,total,paymentMethod:boPayMethod,cashGiven:boPayMethod!=='bill_to_bill'?cashGiven:partialPaid,changeGiven:boPayMethod==='cash'?Math.max(0,cashGiven-total):0,b2bPartialPaid:partialPaid,b2bPrevBalance:prevBalance,status:'delivered',source:'pos',note:`Branch Order → ${boActiveBranch.name}`,date:new Date().toISOString()};
  const oid=await pa('orders',order);order.id=oid;
  for(const it of boCart){
    const p=S.products.find(x=>x.id===it.pid);if(p){p.stock=Math.max(0,p.stock-it.qty);await pu('products',p);}
    const ex=S.branchStock.find(b=>b.branchId===boActiveBranch.id&&b.productId===it.pid);
    if(ex){ex.stock+=it.qty;await pu('branchStock',ex);}else await pa('branchStock',{branchId:boActiveBranch.id,productId:it.pid,stock:it.qty});
  }
  await loadAll();boUpdateStats();boPrintReceipt(order);
  toast(`✓ Branch order රු. ${total.toFixed(2)} — ${boActiveBranch.name}`,'success');
  boCart=[];boActiveBranch=null;boActiveWsCust=null;
}
function boPrintReceipt(o){
  const now=new Date(o.date);
  const isB2B=o.paymentMethod==='bill_to_bill';
  const isCard=o.paymentMethod==='card';
  const handSave=o.handSavings||((o.wikunumSubtotal||o.subtotal)-o.subtotal);
  const storeName=S.settings?.storeName||'MART';
  const el=document.getElementById('bo-receipt-content');if(!el){om('bo-receipt-modal');return;}
  el.innerHTML=`<div class="pos-receipt-wrap">
    <div class="rh">
      <div style="font-size:16px;font-weight:900;letter-spacing:2px">${storeName}</div>
      <div style="font-size:10px;font-weight:700">🏪 Branch Supermarket Order</div>
      <div style="font-size:11px;color:#1d4ed8;font-weight:700">${o.branchName}</div>
      <div style="font-size:9px;color:#555;margin-top:2px">${now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} ${now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div style="font-size:10px;font-weight:700;margin-top:2px">බිල් අංක #${String(o.id).padStart(6,'0')}</div>
    </div>
    <div class="rd"></div>
    <div style="display:grid;grid-template-columns:1fr 50px 50px;font-size:9px;color:#333;font-weight:700;margin-bottom:2px;padding-bottom:3px;border-bottom:2px solid #555;gap:2px">
      <span>නිෂ්පාදනය</span>
      <span style="text-align:center;line-height:1.3">වෙළඳපල<br>මිල</span>
      <span style="text-align:center;line-height:1.3">අපේ<br>මිල</span>
    </div>
    ${o.items.map(i=>{
      const wik=(i.wikunumMila||i.price);
      const ape=i.price;
      const saved=(wik-ape)*i.qty;
      return `<div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11px">
          <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:120px">${i.icon||''}${i.name}</span>
          <span style="color:#888;text-decoration:line-through;font-size:9px;min-width:46px;text-align:center">${(wik*i.qty).toFixed(2)}</span>
          <span style="font-weight:700;min-width:46px;text-align:center">${(ape*i.qty).toFixed(2)}</span>
        </div>
        <div style="font-size:9px;color:#666;padding-left:2px">× ${i.qty} · රු. ${ape.toFixed(2)}${saved>0?` [රු. ${saved.toFixed(2)} ඉතිරිවිය]`:''}</div>
      </div>`;
    }).join('')}
    <div style="border-top:2px solid #000;margin:5px 0"></div>
    <div class="rl"><span>වෙළඳපල මිල</span><span>රු. ${(o.wikunumSubtotal||o.subtotal).toFixed(2)}</span></div>
    <div class="rl" style="font-weight:700"><span>අපේ මිල (Wholesale)</span><span>රු. ${o.subtotal.toFixed(2)}</span></div>
    ${o.manualDiscount>0?`<div class="rl" style="color:#c00"><span>💸 වට්ටම</span><span>−රු. ${o.manualDiscount.toFixed(2)}</span></div>`:''}
    <div style="border-top:2px solid #000;margin:5px 0"></div>
    <div class="rl rt" style="font-size:13px"><span>ගෙවිය යුතු මුළු මුදල</span><span>රු. ${o.total.toFixed(2)}</span></div>
    <div class="rd"></div>
    <div style="display:flex;justify-content:space-between;border:2px solid #0a6b3a;border-radius:3px;padding:4px 6px;margin:4px 0;font-weight:800;font-size:11px;color:#0a6b3a">
      <span>🟢 ඔබ ඉතිරි කළ මුදල</span><span>රු. ${handSave.toFixed(2)}</span>
    </div>
    <div class="rd"></div>
    ${isB2B?`
      <div class="rl" style="color:#1d4ed8"><span>📄 ගිණුමට (B2B)</span><span>✓ ගිණුමට එකතු විය</span></div>
      ${(o.b2bPrevBalance||0)>0?`<div class="rl" style="font-size:10px"><span>කලින් ශේෂය</span><span>රු. ${(o.b2bPrevBalance||0).toFixed(2)}</span></div>`:''}
      <div class="rl" style="font-size:10px"><span>මෙම බිල්පත</span><span>රු. ${o.total.toFixed(2)}</span></div>
      ${(o.b2bPartialPaid||0)>0?`<div class="rl" style="font-size:10px;color:#0a6b3a"><span>💵 දැන් ගෙවූ</span><span>−රු. ${(o.b2bPartialPaid||0).toFixed(2)}</span></div>`:''}
      <div class="rd"></div>
      <div class="rl rt" style="color:#c2620a"><span>ගෙවිය යුතු සම්පූර්ණ</span><span>රු. ${((o.b2bPrevBalance||0)+o.total-(o.b2bPartialPaid||0)).toFixed(2)}</span></div>`
    :isCard
      ?`<div class="rl"><span>💳 කාඩ් ගෙවීම</span><span>රු. ${(o.cashGiven||o.total).toFixed(2)}</span></div>`
      :`<div class="rl"><span>💵 ලබා ගත් මුදල</span><span>රු. ${(o.cashGiven||0).toFixed(2)}</span></div>
        <div class="rl rt" style="color:#0a6b3a"><span>ඉතිරි මුදල</span><span>රු. ${(o.changeGiven||0).toFixed(2)}</span></div>`}
    <div class="rd"></div>
    <div style="text-align:center;font-size:10px;color:#555;margin-top:4px">
      Branch Stock Updated ✓<br>
      ස්තූතියි! 🙏 Central → ${o.branchName}
    </div>
  </div>`;
  om('bo-receipt-modal');
}

function renderPOS(){
  posUpdateStats();posRenderCats();posRenderGrid();posUpdateBillNum();
  clearInterval(window._posClock);
  window._posClock=setInterval(()=>{const el=document.getElementById('pos-bill-time');if(el)el.textContent=new Date().toLocaleTimeString();},1000);
  // Populate branch selector
  const sel=document.getElementById('pos-billing-branch');
  if(sel){
    const cur=sel.value;
    sel.innerHTML='<option value="">🏢 Central (deduct central stock)</option>'+
      S.branches.map(b=>`<option value="${b.id}"${posActiveBillingBranch&&posActiveBillingBranch.id===b.id?' selected':''}>🏪 ${b.name} — ${b.location||''}</option>`).join('');
    if(cur) sel.value=cur;
  }
}

function posSetBillingBranch(val){
  if(!val){
    posActiveBillingBranch=null;
    document.getElementById('pos-billing-branch-label').textContent='';
  } else {
    posActiveBillingBranch=S.branches.find(b=>b.id===parseInt(val))||null;
    if(posActiveBillingBranch){
      document.getElementById('pos-billing-branch-label').textContent=`→ ${posActiveBillingBranch.name}`;
    }
  }
  // Re-render grid to show correct stock
  posRenderGrid();
}
function posUpdateStats(){
  const today=new Date().toDateString();
  // Central POS only: no branchId, not a branch order
  const todayOrds=S.orders.filter(o=>
    new Date(o.date).toDateString()===today &&
    o.source==='pos' &&
    o.status!=='cancelled' &&
    !o.branchId &&
    !o.isBranchOrder
  );
  const cash=todayOrds.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const card=todayOrds.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const b2b=todayOrds.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
  document.getElementById('pos-today-rev').textContent=`රු. ${Math.round(cash+card+b2b).toLocaleString()}`;
  document.getElementById('pos-today-cnt').textContent=todayOrds.length;
  document.getElementById('pos-cash-drawer').textContent=`රු. ${Math.round(cash).toLocaleString()}`;
  document.getElementById('pos-card-total').textContent=`රු. ${Math.round(card).toLocaleString()}`;
  const b2bEl=document.getElementById('pos-b2b-total');if(b2bEl)b2bEl.textContent=`රු. ${Math.round(b2b).toLocaleString()}`;
}
function posUpdateBillNum(){document.getElementById('pos-bill-num').textContent=`BILL #${String(posBillNum).padStart(4,'0')}`;document.getElementById('pos-bill-time').textContent=new Date().toLocaleTimeString();}
function posRenderCats(){
  const cats=['all',...new Set(S.products.map(p=>p.category))];
  const icons={'all':'★','Grains & Rice':'🌾','Dairy':'🥛','Beverages':'🥤','Snacks':'🍿','Vegetables':'🍅','Fruits':'🍌','Meat & Fish':'🍗','Bakery':'🍞','Household':'🧴','Personal Care':'🧼'};
  document.getElementById('pos-cats').innerHTML=cats.map(c=>`<div class="pos-cat ${c===posCatFilter?'act':''}" onclick="posSetCat('${c}',this)">${icons[c]||'📦'} ${c==='all'?'All':c}</div>`).join('');
}
function posSetCat(c,el){posCatFilter=c;document.querySelectorAll('.pos-cat').forEach(x=>x.classList.remove('act'));el.classList.add('act');posRenderGrid();}
function posSearch(q){posSearchQ=q.toLowerCase();posRenderGrid();}
function posGetStock(p){
  // When billing to a branch, show central stock (what will be transferred OUT)
  return posActiveBillingBranch?p.stock:(p.stock||0);
}
function posRenderGrid(){
  let prods=S.products;
  if(posCatFilter!=='all') prods=prods.filter(p=>p.category===posCatFilter);
  if(posSearchQ) prods=prods.filter(p=>p.name.toLowerCase().includes(posSearchQ)||(p.category||'').toLowerCase().includes(posSearchQ)||(p.barcode||'').includes(posSearchQ));
  const isWS=posCustType==='walkin_wholesale'||(posActiveMember&&posActiveMember.type==='wholesale');
  const isBranch=!!posActiveBillingBranch;
  document.getElementById('pos-grid').innerHTML=prods.map(p=>{
    const apeMila=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
    const wikunumMila=p.retailPrice||apeMila;
    const stock=posGetStock(p);
    const oos=stock<=0;const inCart=posCart.find(i=>i.pid===p.id);
    return `<div class="pos-prod ${oos?'oos':''}" id="pos-btn-${p.id}" onclick="${oos?'':'posAddItem('+p.id+')'}" title="${p.name}${p.barcode?' · '+p.barcode:''}">
      ${inCart?`<div style="position:absolute;top:5px;right:5px;background:var(--accent);color:var(--bg);font-size:13px;font-weight:700;padding:1px 5px;border-radius:10px">${inCart.qty}</div>`:''}
      <div class="pos-prod-img">${p.image?`<img src="${p.image}" alt="">`:(p.icon||'📦')}</div>
      <div class="pos-prod-name">${p.name}</div>
      <div style="margin-top:3px">
        <div style="font-size:13px;color:var(--text3);text-decoration:line-through">රු. ${wikunumMila.toFixed(0)}</div>
        <div class="pos-prod-price" style="color:${isWS?'var(--teal)':'var(--accent)'}">රු. ${apeMila.toFixed(0)}</div>
        ${p.barcode?`<div style="font-size:8px;color:var(--text3);letter-spacing:.5px;margin-top:1px">🔲 ${p.barcode}</div>`:''}
      </div>
      <div class="pos-prod-stock" style="${isBranch?'color:var(--teal)':''}">${oos?'Out of stock':`${isBranch?'Central:':''} ${stock}`}</div>
    </div>`;
  }).join('')||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">No products</div>`;
}
function posBarcodeScan(code){
  code=(code||'').trim();
  const inp=document.getElementById('pos-barcode-inp');
  if(!code){inp.focus();return}
  const p=S.products.find(x=>x.barcode&&x.barcode===code);
  if(!p){toast(`Barcode "${code}" — product හමු නොවිය`,'error');inp.value='';inp.focus();return}
  if(posGetStock(p)<=0){toast(`${p.name} — ගබඩාවේ නැත`,'error');inp.value='';inp.focus();return}
  posAddItem(p.id);
  inp.value='';inp.focus();
  const btn=document.getElementById('pos-btn-'+p.id);
  if(btn){btn.style.background='rgba(0,210,211,.2)';setTimeout(()=>{btn.style.background=''},600);}
}
let posScaleTarget=null;
function posAddItem(pid){
  const p=S.products.find(x=>x.id===pid);if(!p) return;
  const stock=posGetStock(p);
  if(stock<=0) return;
  if(p.isScale){posOpenScaleModal(pid);return;}
  const isWS=posCustType==='walkin_wholesale'||(posActiveMember&&posActiveMember.type==='wholesale');
  const apeMila=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
  const wikunumMila=p.retailPrice||apeMila;
  const ex=posCart.find(i=>i.pid===pid);
  if(ex){if(ex.qty<stock)ex.qty++;else{toast(`Max stock: ${stock}`,'error');return;}}
  else posCart.push({pid,name:p.name,icon:p.icon||'📦',image:p.image||null,price:apeMila,wikunumMila,barcode:p.barcode||null,qty:1,isScale:false});
  posRenderItems();posUpdateBill();posRenderGrid();
}
function posOpenScaleModal(pid){
  const p=S.products.find(x=>x.id===pid);if(!p)return;
  posScaleTarget=pid;
  const isWS=posCustType==='walkin_wholesale'||(posActiveMember&&posActiveMember.type==='wholesale');
  const unitP=p.unitPrice||0;
  const apeMila=isWS?p.wholesalePrice:(p.costPrice||p.retailPrice);
  const wikunumMila=p.retailPrice||apeMila;
  document.getElementById('pos-scale-name').textContent=p.name;
  document.getElementById('pos-scale-unit-price').textContent=unitP>0?`රු. ${unitP.toFixed(2)} per kg/unit`:'';
  document.getElementById('pos-scale-qty').value='';
  document.getElementById('pos-scale-ape').textContent='—';
  document.getElementById('pos-scale-wik').textContent='';
  document.getElementById('pos-scale-qty').dataset.unitPrice=unitP;
  document.getElementById('pos-scale-qty').dataset.apeMila=apeMila;
  document.getElementById('pos-scale-qty').dataset.wikunumMila=wikunumMila;
  om('pos-scale-modal');
  setTimeout(()=>document.getElementById('pos-scale-qty').focus(),100);
}
function posScaleCalc(){
  const inp=document.getElementById('pos-scale-qty');
  const qty=parseFloat(inp.value)||0;
  const unitP=parseFloat(inp.dataset.unitPrice)||0;
  const apeMila=parseFloat(inp.dataset.apeMila)||0;
  const wikunumMila=parseFloat(inp.dataset.wikunumMila)||0;
  if(unitP>0&&qty>0){
    document.getElementById('pos-scale-ape').textContent=`රු. ${(unitP*qty).toFixed(2)}`;
    document.getElementById('pos-scale-wik').textContent=`(Market: රු. ${(wikunumMila*qty/1).toFixed(2)})`;
  } else {
    document.getElementById('pos-scale-ape').textContent=qty>0?`රු. ${(apeMila*qty).toFixed(2)}`:'—';
    document.getElementById('pos-scale-wik').textContent='';
  }
}
function posScaleConfirm(){
  const pid=posScaleTarget;if(!pid)return;
  const p=S.products.find(x=>x.id===pid);if(!p)return;
  const inp=document.getElementById('pos-scale-qty');
  const qty=parseFloat(inp.value)||0;
  if(qty<=0){toast('Weight/quantity enter කරන්න','error');return;}
  const unitP=parseFloat(inp.dataset.unitPrice)||0;
  const apeMilaBase=parseFloat(inp.dataset.apeMila)||0;
  const wikunumMila=parseFloat(inp.dataset.wikunumMila)||0;
  const effectiveApe=unitP>0?unitP:apeMilaBase;
  const ex=posCart.find(i=>i.pid===pid);
  if(ex){ex.qty=qty;}
  else posCart.push({pid,name:p.name,icon:p.icon||'📦',image:p.image||null,price:effectiveApe,wikunumMila,barcode:p.barcode||null,qty,isScale:true});
  cm('pos-scale-modal');posScaleTarget=null;
  posRenderItems();posUpdateBill();posRenderGrid();
  toast(`${p.name} — ${qty} kg/units added`,'success');
}
let posPriceChangeIdx=null;
function posOpenPriceChange(idx){
  const it=posCart[idx];if(!it)return;
  posPriceChangeIdx=idx;
  document.getElementById('pos-price-item-name').textContent=`${it.name} — දැනට: රු. ${it.price.toFixed(2)}`;
  document.getElementById('pos-price-new').value=it.price.toFixed(2);
  om('pos-price-modal');
  setTimeout(()=>{const i=document.getElementById('pos-price-new');if(i){i.select();}},120);
}
function posConfirmPriceChange(){
  const idx=posPriceChangeIdx;if(idx===null||idx===undefined)return;
  const it=posCart[idx];if(!it)return;
  const newP=parseFloat(document.getElementById('pos-price-new').value)||0;
  if(newP<=0){toast('නිවැරදි මිලක් ඇතුල් කරන්න','error');return}
  it.price=newP;
  cm('pos-price-modal');posPriceChangeIdx=null;
  posRenderItems();posUpdateBill();
  toast(`✓ ${it.name} — රු. ${newP.toFixed(2)} set`,'success');
}
function posRenderItems(){
  const el=document.getElementById('pos-items');
  if(!posCart.length){el.innerHTML='<div style="text-align:center;padding:30px 20px;color:var(--text3);font-size:13px"><div style="font-size:32px;margin-bottom:8px;opacity:.2">&#x1F6D2;</div>Bill empty — click product</div>';return}
  el.innerHTML=posCart.map((it,idx)=>{
    const lineApe=it.price*it.qty;
    const lineWik=(it.wikunumMila||it.price)*it.qty;
    const saving=lineWik-lineApe;
    const scaleBadge=it.isScale?'<span style="font-size:13px;background:rgba(8,145,178,.12);color:var(--teal);border:1px solid rgba(8,145,178,.25);border-radius:4px;padding:1px 5px;margin-left:4px">&#x2696; SCALE</span>':''
    return `<div class="pos-item" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:4px;align-items:center;padding:6px 8px;border-left:${it.isScale?'3px solid var(--teal)':'3px solid transparent'}">
      <div style="min-width:0">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${it.image?'<img src="'+it.image+'" style="width:16px;height:16px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-right:3px" alt="">':(it.icon+' ')}${it.name}${scaleBadge}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:1px">× ${it.qty}${it.isScale?' kg':''} · රු. ${it.price.toFixed(2)}${saving>0?` <span style="color:var(--green);font-weight:600">[රු. ${saving.toFixed(2)} ඉතිරිවිය]</span>`:''}</div>
      </div>
      <div style="text-align:right"><div style="font-size:13px;color:var(--text3);text-decoration:line-through">රු. ${(it.wikunumMila||it.price).toFixed(2)}</div></div>
      <div style="text-align:right">
        <input type="number" step="0.01" value="${it.price.toFixed(2)}" style="width:68px;font-size:13px;font-weight:700;color:var(--accent);background:var(--bg2);border:1px solid rgba(232,255,71,.3);border-radius:4px;padding:2px 4px;text-align:right" title="Click to change price" onchange="posPriceOverride(${idx},this.value)">
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:2px">${it.isScale?
        '<input type="number" step="0.01" value="'+it.qty+'" style="width:50px;font-size:13px;font-weight:700;color:var(--teal);background:var(--bg2);border:1px solid rgba(8,145,178,.4);border-radius:4px;padding:2px 4px;text-align:center" onchange="posScaleQtyChange('+idx+',this.value)" title="Weight/Qty"> <span style="font-size:13px;color:var(--teal)">kg</span>':
        '<button class="pos-qbtn" onclick="posQty('+idx+',-1)" style="width:22px;height:22px">&#x2212;</button><span style="font-size:13px;font-weight:700;min-width:20px;text-align:center;color:var(--text)">'+it.qty+'</span><button class="pos-qbtn" onclick="posQty('+idx+',+1)" style="width:22px;height:22px">+</button>'}</div>
      <div style="text-align:right"><div class="pos-item-price" style="font-weight:800;font-size:13px">රු. ${lineApe.toFixed(2)}</div></div>
      <button class="pos-qbtn" onclick="posRmItem(${idx})" style="color:var(--red);border-color:rgba(220,38,38,.3);width:20px;height:20px;font-size:13px">&#x2715;</button>
    </div>`;
  }).join('');
}
function posPriceOverride(idx,val){const it=posCart[idx];if(!it)return;const v=parseFloat(val);if(!isNaN(v)&&v>=0){it.price=v;}posRenderItems();posUpdateBill();}
function posScaleQtyChange(idx,val){const it=posCart[idx];if(!it)return;const q=parseFloat(val)||0;if(q<=0){posCart.splice(idx,1);}else{it.qty=q;}posRenderItems();posUpdateBill();posRenderGrid();}

function posQty(idx,d){const it=posCart[idx];if(!it)return;const p=S.products.find(x=>x.id===it.pid);it.qty+=d;if(it.qty<=0)posCart.splice(idx,1);else if(p&&it.qty>p.stock)it.qty=p.stock;posRenderItems();posUpdateBill();posRenderGrid();}
function posRmItem(idx){posCart.splice(idx,1);posRenderItems();posUpdateBill();posRenderGrid();}
function posSetDiscType(t){posDiscType=t;document.getElementById('disc-pct-btn').classList.toggle('act',t==='pct');document.getElementById('disc-lkr-btn').classList.toggle('act',t==='lkr');posUpdateBill();}
function posUpdateBill(){
  const apeSub=posCart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=posCart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const handSave=wikSub-apeSub;
  const dv=parseFloat(document.getElementById('pos-disc-val')?.value)||0;
  let discAmt=posDiscType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);
  if(dv<=0)discAmt=0;
  const total=Math.max(0,apeSub-discAmt);
  document.getElementById('pos-wik-sub').textContent=`රු. ${wikSub.toFixed(2)}`;
  document.getElementById('pos-hand-save').textContent=`රු. ${handSave.toFixed(2)}`;
  document.getElementById('pos-sub').textContent=`රු. ${apeSub.toFixed(2)}`;
  const dr=document.getElementById('pos-disc-row-d');
  if(discAmt>0){dr.style.display='flex';document.getElementById('pos-disc-amt').textContent=`−රු. ${discAmt.toFixed(2)}`;}
  else dr.style.display='none';
  document.getElementById('pos-total').textContent=`රු. ${total.toFixed(2)}`;
  document.getElementById('pos-complete-btn').disabled=posCart.length===0;
  posCalcChange();
  posUpdateB2BCreditPanel();
}
function posSetPay(m){
  posPayMethod=m;
  document.getElementById('pos-pay-cash').className='pos-pay-btn'+(m==='cash'?' sel-cash':'');
  document.getElementById('pos-pay-card').className='pos-pay-btn'+(m==='card'?' sel-card':'');
  const b2bBtn=document.getElementById('pos-pay-b2b');
  if(b2bBtn) b2bBtn.className='pos-pay-btn'+(m==='bill_to_bill'?' sel-b2b':'');
  const isB2B=m==='bill_to_bill';
  document.getElementById('pos-cash-row').style.display=isB2B?'none':'flex';
  if(!isB2B){
    if(document.getElementById('pos-cash-summary'))document.getElementById('pos-cash-summary').style.display='none';
    document.getElementById('pos-change-disp').textContent='ඉතිරි: —';
  }
  posUpdateB2BCreditPanel();
  posCalcChange();
}

function posPosPayMethodFromTab(){
  const b2bBtn=document.getElementById('pos-pay-b2b');
  const wrap=document.getElementById('pos-pay-btns-wrap');
  if(!b2bBtn) return;
  if(posActiveTab==='wholesale'){
    b2bBtn.style.display='block';
    if(wrap) wrap.style.gridTemplateColumns='1fr 1fr';
    // Auto-select customer's default payment if member is selected
    if(posActiveMember&&posActiveMember.defaultPayment==='bill_to_bill'){
      posSetPay('bill_to_bill');
    } else if(posPayMethod==='bill_to_bill'&&!posActiveMember){
      posSetPay('cash');
    }
  } else {
    b2bBtn.style.display='none';
    if(wrap) wrap.style.gridTemplateColumns='1fr 1fr';
    if(posPayMethod==='bill_to_bill') posSetPay('cash');
  }
}

function posUpdateB2BCreditPanel(){
  const panel=document.getElementById('pos-b2b-credit-panel');
  if(!panel) return;
  const isB2B=posPayMethod==='bill_to_bill';
  if(isB2B){
    panel.style.display='block';
    const fb=posActiveMember?(posActiveMember.forwardBalance||0):0;
    const total=parseFloat((document.getElementById('pos-total')?.textContent||'').replace('රු. ','').replace(/,/g,''))||0;
    const partial=parseFloat(document.getElementById('pos-partial-pay')?.value)||0;
    const newBal=Math.max(0,fb+total-partial);
    document.getElementById('pos-credit-existing').textContent=fb>0?`රු. ${fb.toFixed(2)}`:'රු. 0.00';
    document.getElementById('pos-credit-existing').style.color=fb>0?'var(--red)':'var(--green)';
    document.getElementById('pos-credit-this').textContent=`රු. ${total.toFixed(2)}`;
    document.getElementById('pos-credit-total').textContent=`රු. ${newBal.toFixed(2)}`;
    document.getElementById('pos-credit-total').style.color=newBal>0?'var(--red)':'var(--green)';
    const pr=document.getElementById('pos-partial-result');
    if(pr){
      if(partial>0) pr.textContent=`රු. ${partial.toFixed(2)} ගෙවා නව ශේෂය රු. ${newBal.toFixed(2)} වේ`;
      else pr.textContent='';
    }
  } else panel.style.display='none';
}

function posUpdateB2BBalanceInfo(){
  const info=document.getElementById('pos-b2b-balance-info');
  if(info){
    if(posActiveMember&&posWsPayMethod==='bill_to_bill'){
      const fb=posActiveMember.forwardBalance||0;
      if(fb>0){info.style.display='block';document.getElementById('pos-b2b-bal-amt').textContent=`රු. ${fb.toFixed(2)}`;}
      else info.style.display='none';
    } else info.style.display='none';
  }
  posUpdateB2BCreditPanel();
}

function posCalcChange(){
  const total=parseFloat((document.getElementById('pos-total')?.textContent||'').replace('රු. ',''))||0;
  const given=parseFloat(document.getElementById('pos-cash-given')?.value)||0;
  const el=document.getElementById('pos-change-disp');
  const sumEl=document.getElementById('pos-cash-summary');
  if(!el)return;
  if((posPayMethod==='cash'||posPayMethod==='card')&&given>0){
    const chg=posPayMethod==='cash'?given-total:0;
    el.textContent=posPayMethod==='cash'?(chg>=0?`ඉතිරි: රු. ${chg.toFixed(2)}`:`අඩු: රු. ${Math.abs(chg).toFixed(2)}`):`ගෙවූ: රු. ${given.toFixed(2)}`;
    el.style.color=(posPayMethod==='card'||chg>=0)?'var(--green)':'var(--red)';
    if(posPayMethod==='cash'&&chg>=0&&sumEl){
      sumEl.style.display='block';
      document.getElementById('pos-gewu').textContent=`රු. ${given.toFixed(2)}`;
      document.getElementById('pos-ithiri').textContent=`රු. ${chg.toFixed(2)}`;
    } else if(sumEl) sumEl.style.display='none';
  } else {
    el.textContent='ඉතිරි: —';el.style.color='var(--green)';
    if(sumEl)sumEl.style.display='none';
  }
}
// ── POS Customer Tab System ──
let posActiveTab='retail'; // 'retail' | 'wholesale'
let posRetailSubTab='walkin'; // 'walkin' | 'member'
let posWsSubTab='walkin'; // 'walkin' | 'member'
let posWsPayMethod='cash'; // 'cash' | 'bill_to_bill'

function posSwitchTab(tab){
  posActiveTab=tab;posActiveMember=null;
  document.getElementById('pos-tab-retail').classList.toggle('active',tab==='retail');
  document.getElementById('pos-tab-wholesale').classList.toggle('active',tab==='wholesale');
  document.getElementById('pos-panel-retail').style.display=tab==='retail'?'block':'none';
  document.getElementById('pos-panel-wholesale').style.display=tab==='wholesale'?'block':'none';
  // Reset sub state
  posRetailSubTab='walkin';posWsSubTab='walkin';posWsPayMethod='cash';
  if(tab==='retail'){document.getElementById('pos-rt-walkin').classList.add('active');document.getElementById('pos-rt-member').classList.remove('active');document.getElementById('pos-rt-member-panel').style.display='none';}
  else{document.getElementById('pos-ws-walkin').classList.add('active');document.getElementById('pos-ws-member').classList.remove('active');document.getElementById('pos-ws-member-panel').style.display='none';document.getElementById('pos-b2b-section').style.display='none';}
  posCustType=tab==='retail'?'walkin_retail':'walkin_wholesale';
  // Show/hide B2B pay button based on tab
  const b2bBtn=document.getElementById('pos-pay-b2b');
  if(b2bBtn) b2bBtn.style.display=tab==='wholesale'?'block':'none';
  if(tab==='retail'&&posPayMethod==='bill_to_bill') posSetPay('cash');
  posPosPayMethodFromTab();posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
}

function posSetSubTab(tab,sub){
  if(tab==='retail'){
    posRetailSubTab=sub;
    document.getElementById('pos-rt-walkin').classList.toggle('active',sub==='walkin');
    document.getElementById('pos-rt-member').classList.toggle('active',sub==='member');
    document.getElementById('pos-rt-member-panel').style.display=sub==='member'?'block':'none';
    if(sub==='walkin'){posActiveMember=null;posCustType='walkin_retail';document.getElementById('pos-retail-results').style.display='none';document.getElementById('pos-retail-badge').style.display='none';}
  } else {
    posWsSubTab=sub;
    document.getElementById('pos-ws-walkin').classList.toggle('active',sub==='walkin');
    document.getElementById('pos-ws-member').classList.toggle('active',sub==='member');
    document.getElementById('pos-ws-member-panel').style.display=sub==='member'?'block':'none';
    document.getElementById('pos-b2b-section').style.display=sub==='member'?'block':'none';
    if(sub==='walkin'){posActiveMember=null;posCustType='walkin_wholesale';document.getElementById('pos-ws-results').style.display='none';document.getElementById('pos-ws-badge').style.display='none';}
    posUpdateB2BBalanceInfo();
  }
  posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
}

function posSetWsPayMethod(method){
  posWsPayMethod=method;
  document.getElementById('pos-b2b-cash-btn').classList.toggle('active',method==='cash');
  document.getElementById('pos-b2b-b2b-btn').classList.toggle('active',method==='bill_to_bill');
  posSetPay(method); // sync the bottom Cash/Card/B2B buttons and panel
  posUpdateB2BBalanceInfo();
}

// ── Admin POS Inline Customer Selector ──
function posInlineCustLookup(q){
  const res=document.getElementById('pos-inline-cust-results');
  if(!q.trim()){res.style.display='none';return}
  const matches=S.customers.filter(c=>(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,10);
  if(!matches.length){res.style.display='none';return}
  res.style.display='block';
  res.innerHTML=matches.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border-bottom:1px solid var(--border);cursor:pointer;gap:6px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''" onclick="posInlineCustSelect(${c.id})">
    <div style="flex:1;min-width:0">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}${c.businessName?`<span style="font-size:13px;color:var(--text3);margin-left:4px">${c.businessName}</span>`:''}</div>
      <div style="font-size:13px;color:var(--text3)">${c.phone||'—'} · ${c.type==='wholesale'?'🏭':'🛍'} · ⭐ ${c.loyaltyPoints||0} pts${c.type==='wholesale'&&(c.forwardBalance||0)>0?` · <span style="color:var(--red)">📋 ${(c.forwardBalance||0).toFixed(0)}</span>`:''}</div>
    </div>
    <button onclick="event.stopPropagation();posOpenCustHist(${c.id})" style="background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.25);color:var(--teal);border-radius:5px;padding:2px 7px;font-size:13px;cursor:pointer;flex-shrink:0">📋</button>
  </div>`).join('');
}
function posInlineCustSelect(id){
  posActiveMember=S.customers.find(x=>x.id===id);if(!posActiveMember)return;
  // Update compact head badge
  const headBadge=document.getElementById('pos-cust-head-badge');
  const headLabel=document.getElementById('pos-cust-head-label');
  const headClear=document.getElementById('pos-cust-head-clear');
  if(headLabel){
    headLabel.innerHTML=`<span style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;margin-right:6px;flex-shrink:0">${posActiveMember.name[0].toUpperCase()}</span><strong>${posActiveMember.name}</strong> · ${posActiveMember.type==='wholesale'?'🏭':'🛍'} · ⭐ ${posActiveMember.loyaltyPoints||0} pts`;
    headLabel.style.color='var(--text)';
  }
  if(headBadge){headBadge.style.borderColor='var(--accent)';headBadge.style.borderStyle='solid';}
  if(headClear) headClear.style.display='block';
  // Close float panel
  posCloseCustPanel();
  // Sync to the correct tab
  const tab=posActiveMember.type==='retail'?'retail':'wholesale';
  if(posActiveTab!==tab) posSwitchTab(tab);
  posSetSubTab(tab,'member');
  posCustType=tab==='retail'?'member_retail':'member_wholesale';
  if(tab==='wholesale'){
    document.getElementById('pos-b2b-section').style.display='block';
    const defPay=posActiveMember.defaultPayment||'cash';
    posWsPayMethod=defPay;
    posSetWsPayMethod(defPay);
    posUpdateB2BBalanceInfo();
    posUpdateB2BCreditPanel();
  }
  posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
  toast(`👤 ${posActiveMember.name} selected`,'success');
}
function posInlineCustClear(){
  posActiveMember=null;
  const headLabel=document.getElementById('pos-cust-head-label');
  const headBadge=document.getElementById('pos-cust-head-badge');
  const headClear=document.getElementById('pos-cust-head-clear');
  if(headLabel){headLabel.textContent='👤 ගනුදෙනුකරු තෝරන්න — ▲ click';headLabel.style.color='var(--text3)';}
  if(headBadge){headBadge.style.borderColor='var(--border)';headBadge.style.borderStyle='dashed';}
  if(headClear) headClear.style.display='none';
  posCustType='walkin_retail';
  posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
}

function posLookupCust(q,type){
  const resId=type==='retail'?'pos-retail-results':'pos-ws-results';
  const res=document.getElementById(resId);
  if(!q.trim()){res.style.display='none';return}
  const matches=S.customers.filter(c=>c.type===type&&(c.name.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q))).slice(0,8);
  if(!matches.length){res.style.display='none';return}
  res.style.display='block';
  res.innerHTML=matches.map(c=>`<div style="padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:6px">
    <div onclick="posSelectCust(${c.id},'${type}')" style="flex:1;cursor:pointer;min-width:0" onmouseover="this.parentElement.style.background='var(--bg3)'" onmouseout="this.parentElement.style.background=''">
      <div style="font-family:'Syne',sans-serif;font-weight:600;color:var(--text);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}${c.businessName?`<span style="font-size:13px;color:var(--text3);margin-left:4px">${c.businessName}</span>`:''}</div>
      <div style="font-size:13px;color:var(--text3)">${c.phone||'—'} · ⭐ ${c.loyaltyPoints||0} pts${c.type==='wholesale'&&(c.forwardBalance||0)>0?` · <span style="color:var(--red)">📋 රු. ${(c.forwardBalance||0).toFixed(0)}</span>`:''}</div>
    </div>
    <button onclick="event.stopPropagation();posOpenCustHist(${c.id})" style="background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.25);color:var(--teal);border-radius:5px;padding:3px 8px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0">📋 History</button>
  </div>`).join('');
}

// ── POS Add Customer ──
function posOpenAddCust(){
  const routeSel=document.getElementById('pac-route');
  if(routeSel){routeSel.innerHTML='<option value="">— Route —</option>';S.routes.forEach(r=>{const o=document.createElement('option');o.value=r.name;o.textContent=r.name+(r.days?.length?' ('+r.days.slice(0,2).join(',')+')':'');routeSel.appendChild(o)});}
  ['pac-name','pac-phone','pac-email','pac-addr','pac-biz','pac-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const rt=document.querySelector('input[name="pac-type"][value="retail"]');if(rt)rt.checked=true;
  pacTypeChange();
  om('pos-add-cust-modal');
}
function pacTypeChange(){
  const type=document.querySelector('input[name="pac-type"]:checked')?.value||'retail';
  const ws=document.getElementById('pac-ws-extra');
  if(ws) ws.style.display=type==='wholesale'?'grid':'none';
}
async function posSaveNewCust(){
  const type=document.querySelector('input[name="pac-type"]:checked')?.value||'retail';
  const name=(document.getElementById('pac-name')?.value||'').trim();
  const phone=(document.getElementById('pac-phone')?.value||'').trim();
  const email=(document.getElementById('pac-email')?.value||'').trim().toLowerCase();
  const addr=(document.getElementById('pac-addr')?.value||'').trim();
  const pass=(document.getElementById('pac-pass')?.value||'').trim();
  if(!name){toast('නම ඇතුල් කරන්න','error');return}
  if(!phone){toast('දුරකථන අංකය ඇතුල් කරන්න','error');return}
  if(email&&S.customers.find(c=>c.email===email)){toast('Email දැනටමත් ලියාපදිංචිය','error');return}
  const cust={
    name,phone,email:email||null,address:addr,location:addr,type,
    loyaltyPoints:0,totalLoyaltySaved:0,forwardBalance:0,
    defaultPayment:'cash',
    registeredSource:'admin',
    createdAt:new Date().toISOString(),
    pwHash:pass?btoa(pass):null
  };
  if(type==='wholesale'){
    cust.businessName=(document.getElementById('pac-biz')?.value||'').trim();
    cust.route=(document.getElementById('pac-route')?.value||'');
  }
  const newId=await pa('customers',cust);cust.id=newId;
  await loadAll();
  cm('pos-add-cust-modal');
  toast(`✓ ${name} ලියාපදිංචි කළා!`,'success');
  // Auto-select using inline selector (works for both retail and wholesale)
  posInlineCustSelect(newId);
}

// ── POS Customer History ──
function posOpenCustHist(custId){
  const c=S.customers.find(x=>x.id===custId);if(!c)return;
  const ords=[...S.orders].filter(o=>o.customerId===custId&&o.status!=='cancelled').reverse();
  const totalSpent=ords.reduce((s,o)=>s+o.total,0);
  const srcLabel=c.registeredSource==='pos'?`🖥 POS${c.registeredBranch?' · 🏪 '+c.registeredBranch:''}`:c.registeredSource==='admin'?'🔧 Admin':'📱 Customer App';
  document.getElementById('pos-hist-title').textContent=`📋 ${c.name}`;
  document.getElementById('pos-hist-body').innerHTML=`
    <div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">${c.name}</div>
          ${c.businessName?`<div style="font-size:13px;color:var(--text3)">${c.businessName}</div>`:''}
          <div style="font-size:13px;color:var(--text2);margin-top:2px">${c.phone||'—'}${c.email?' · '+c.email:''}</div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge ${c.type==='wholesale'?'badge-blue':'badge-yellow'}">${c.type}</span>
            <span style="font-size:13px;background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:1px 8px">Registered: ${srcLabel}</span>
            ${c.createdAt?`<span style="font-size:13px;color:var(--text3)">${new Date(c.createdAt).toLocaleDateString()}</span>`:''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${c.loyaltyPoints||0}</div>
          <div style="font-size:13px;color:var(--text3)">Loyalty Points</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['ඇණවුම්',ords.length,'var(--accent)'],['Total Spent',`රු. ${Math.round(totalSpent).toLocaleString()}`,'var(--green)'],['Avg Bill',ords.length?`රු. ${(totalSpent/ords.length).toFixed(0)}`:'—','var(--teal)']].map(([l,v,c2])=>`
        <div style="background:var(--bg1);border-radius:7px;padding:9px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${l}</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${c2}">${v}</div>
        </div>`).join('')}
      </div>
    </div>
    ${!ords.length?`<div style="text-align:center;padding:40px;color:var(--text3)">ඇණවුම් නොමැත</div>`:
    ords.slice(0,50).map(o=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 13px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent)">#${String(o.id).padStart(4,'0')}</span>
        <span style="font-size:13px;color:var(--text3)">${new Date(o.date).toLocaleString()}</span>
        <span style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">රු. ${o.total.toFixed(0)}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${o.items.slice(0,4).map(i=>`${i.icon||'📦'} ${i.name} ×${i.qty}`).join(' · ')}${o.items.length>4?` +${o.items.length-4} more`:''}</div>
      <div style="display:flex;gap:8px;font-size:13px;flex-wrap:wrap">
        ${sBadge(o.status)}
        <span style="color:var(--text3)">${o.paymentMethod==='cash'?'💵 Cash':o.paymentMethod==='card'?'💳 Card':'📄 B2B'}</span>
        <span style="color:var(--teal)">${o.branchName?'🏪 '+o.branchName:'🏢 Central'}</span>
        <span style="color:var(--text3)">${o.source==='pos'?'POS':'Online'}</span>
        ${o.loyaltyEarned?`<span style="color:var(--accent)">⭐ +${o.loyaltyEarned} pts</span>`:''}
      </div>
    </div>`).join('')}`;
  om('pos-cust-hist-modal');
}

function posSelectCust(id,type){
  posActiveMember=S.customers.find(x=>x.id===id);if(!posActiveMember)return;
  const resId=type==='retail'?'pos-retail-results':'pos-ws-results';
  const qId=type==='retail'?'pos-retail-q':'pos-ws-q';
  const badgeId=type==='retail'?'pos-retail-badge':'pos-ws-badge';
  document.getElementById(resId).style.display='none';
  document.getElementById(qId).value=posActiveMember.name;
  const fb=posActiveMember.forwardBalance||0;
  const badge=document.getElementById(badgeId);
  badge.style.display='flex';
  badge.style.justifyContent='space-between';
  badge.style.alignItems='center';
  badge.innerHTML=`<div style="min-width:0;flex:1">
    <span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--text)">${posActiveMember.name}</span>
    ${posActiveMember.businessName?`<br><span style="font-size:13px;color:var(--text3)">${posActiveMember.businessName}</span>`:''}
    <br><span style="font-size:13px;color:var(--accent)">⭐ ${posActiveMember.loyaltyPoints||0} pts</span>
    ${type==='wholesale'&&fb>0?`<br><span style="font-size:13px;color:var(--red)">📋 Credit: රු. ${fb.toFixed(2)}</span>`:''}
  </div>
  <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
    <button onclick="posOpenCustHist(${posActiveMember.id})" style="background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.25);color:var(--teal);border-radius:5px;padding:3px 8px;font-size:13px;cursor:pointer">📋</button>
    <span onclick="posClearCust('${type}')" style="cursor:pointer;color:var(--text3);font-size:13px;padding:2px 4px">✕</span>
  </div>`;
  posCustType=type==='retail'?'member_retail':'member_wholesale';
  // Auto-set payment method based on customer's default
  if(type==='wholesale'){
    const defPay=posActiveMember.defaultPayment||'cash';
    posWsPayMethod=defPay;
    posSetWsPayMethod(defPay);
    posSetPay(defPay); // also update the bottom pay buttons immediately
    document.getElementById('pos-b2b-section').style.display='block';
    posUpdateB2BBalanceInfo();
    posUpdateB2BCreditPanel();
  }
  posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
  posCloseCustPanel(); // auto-close panel after selecting customer
}

function posClearCust(type){
  posActiveMember=null;posCustType=type==='retail'?'walkin_retail':'walkin_wholesale';
  const qId=type==='retail'?'pos-retail-q':'pos-ws-q';
  const badgeId=type==='retail'?'pos-retail-badge':'pos-ws-badge';
  document.getElementById(qId).value='';document.getElementById(badgeId).style.display='none';
  if(type==='wholesale'){posUpdateB2BBalanceInfo();}
  posRenderGrid();posRenderItems();posUpdateBill();posUpdateCustFloatBtn();
}

// Legacy compat (keep for held bill restore)
function posUpdateCustType(){}
function posLookupMember(q){posLookupCust(q,'retail')}
function posSelectMember(id){posSelectCust(id,'retail')}
function posClearMember(){posClearCust('retail')}
async function posCompleteSale(){
  if(!posCart.length){toast('Bill හිස්ය','error');return}
  const apeSub=posCart.reduce((s,i)=>s+(i.price*i.qty),0);
  const wikSub=posCart.reduce((s,i)=>s+((i.wikunumMila||i.price)*i.qty),0);
  const handSave=wikSub-apeSub;
  const dv=parseFloat(document.getElementById('pos-disc-val').value)||0;
  let discAmt=posDiscType==='pct'?apeSub*(dv/100):Math.min(dv,apeSub);if(dv<=0)discAmt=0;
  const total=Math.max(0,apeSub-discAmt);

  // Determine effective payment method
  const effectivePay=(posActiveTab==='wholesale'&&posWsSubTab==='member')?posWsPayMethod:posPayMethod;

  if(effectivePay==='cash'){
    const cashGiven=parseFloat(document.getElementById('pos-cash-given').value)||0;
    if(cashGiven===0){toast('ගෙවූ මුදල ඇතුල් කරන්න','error');return}
    if(cashGiven<total){toast(`ප්‍රමාණවත් නැත. රු. ${total.toFixed(2)} අවශ්‍යයි`,'error');return}
  } else if(effectivePay==='card'){
    const cashGiven=parseFloat(document.getElementById('pos-cash-given').value)||0;
    if(cashGiven===0){toast('Card amount ඇතුල් කරන්න','error');return}
  }
  const cashGiven=parseFloat(document.getElementById('pos-cash-given').value)||0;
  let earnedPts=0;
  let creditBalanceBefore=0;
  const posPartialPaid=parseFloat(document.getElementById('pos-partial-pay')?.value)||0;
  if(posActiveMember){
    const cust=S.customers.find(x=>x.id===posActiveMember.id);
    if(cust){
      const ls=getLoyaltySetting(cust.type);const tier=getTier(cust.loyaltyPoints||0,cust.type);const bm=1+(tier?.bonusEarn||0)/100;
      earnedPts=Math.floor((total/100)*ls.earnPer100*bm);
      cust.loyaltyPoints=(cust.loyaltyPoints||0)+earnedPts;
      if(effectivePay==='bill_to_bill'){
        creditBalanceBefore=cust.forwardBalance||0;
        cust.forwardBalance=Math.max(0,creditBalanceBefore+total-posPartialPaid);
      }
      await pu('customers',cust);
      posActiveMember=cust;
    }
  }
  const custType=posActiveMember?posActiveMember.type:(posActiveTab==='wholesale'?'wholesale':'retail');
  const custName=posActiveMember?.name||(posActiveTab==='wholesale'?'Walk-in Wholesale':'Walk-in Retail');
  const order={
    customerId:posActiveMember?.id||null,customerName:custName,customerType:custType,
    items:[...posCart],subtotal:apeSub,wikunumSubtotal:wikSub,handSavings:handSave,
    specialDiscount:0,wholesaleDiscount:0,cashDiscount:0,bulkDiscount:0,tierDiscount:0,
    priceSavings:handSave,deliveryFee:0,manualDiscount:discAmt,
    loyaltyRedeemed:0,loyaltyDiscount:0,loyaltyEarned:earnedPts,tax:0,total,
    paymentMethod:effectivePay,
    cashGiven:effectivePay==='cash'?cashGiven:(effectivePay==='card'?cashGiven:0),
    changeGiven:effectivePay==='cash'?Math.max(0,cashGiven-total):0,
    b2bPending:effectivePay==='bill_to_bill',
    creditBalanceBefore,
    deliveryType:'pos',deliveryAddress:'',deliveryDate:'',
    note:posActiveBillingBranch?`Branch Stock: ${posActiveBillingBranch.name}`:'POS Sale',
    branchId:posActiveBillingBranch?posActiveBillingBranch.id:null,
    branchName:posActiveBillingBranch?posActiveBillingBranch.name:'Central',
    isBranchStock:!!posActiveBillingBranch,
    status:'delivered',source:'pos',date:new Date().toISOString()
  };
  const oid=await pa('orders',order);order.id=oid;
  if(posActiveBillingBranch){
    // Billing TO a branch: deduct central stock, increase branch stock
    for(const it of posCart){
      const p=S.products.find(x=>x.id===it.pid);
      if(p){p.stock=Math.max(0,p.stock-it.qty);await pu('products',p);}
      // Add to branch stock
      const existing=S.branchStock.find(b=>b.branchId===posActiveBillingBranch.id&&b.productId===it.pid);
      if(existing){existing.stock+=it.qty;await pu('branchStock',existing);}
      else await pa('branchStock',{branchId:posActiveBillingBranch.id,productId:it.pid,stock:it.qty});
    }
    toast(`✓ ${posActiveBillingBranch.name}-ට bill කළා — branch stock updated`,'success');
  } else {
    // Normal central POS sale — deduct central stock
    for(const it of posCart){const p=S.products.find(x=>x.id===it.pid);if(p){p.stock=Math.max(0,p.stock-it.qty);await pu('products',p)}}
  }
  await loadAll();posUpdateStats();posPrintReceipt(order);
  // Reset bill
  posCart=[];posActiveMember=null;document.getElementById('pos-disc-val').value='';document.getElementById('pos-cash-given').value='';
  posActiveTab='retail';posRetailSubTab='walkin';posWsSubTab='walkin';posWsPayMethod='cash';
  document.getElementById('pos-tab-retail').classList.add('active');document.getElementById('pos-tab-wholesale').classList.remove('active');
  document.getElementById('pos-panel-retail').style.display='block';document.getElementById('pos-panel-wholesale').style.display='none';
  document.getElementById('pos-rt-walkin').classList.add('active');document.getElementById('pos-rt-member').classList.remove('active');
  document.getElementById('pos-rt-member-panel').style.display='none';document.getElementById('pos-retail-results').style.display='none';document.getElementById('pos-retail-badge').style.display='none';
  if(document.getElementById('pos-retail-q'))document.getElementById('pos-retail-q').value='';
  posCustType='walkin_retail';posBillNum++;
  posPayMethod='cash';
  document.getElementById('pos-pay-cash').className='pos-pay-btn sel-cash';
  document.getElementById('pos-pay-card').className='pos-pay-btn';
  document.getElementById('pos-cash-row').style.display='flex';
  posUpdateBillNum();posRenderItems();posUpdateBill();posRenderGrid();posUpdateCustFloatBtn();
  document.getElementById('pos-change-disp').textContent='ඉතිරි: —';
  if(document.getElementById('pos-cash-summary'))document.getElementById('pos-cash-summary').style.display='none';
  toast(`✓ Sale රු. ${total.toFixed(2)} complete!${earnedPts?` +${earnedPts} pts`:''}`,'success');
}
function buildPosReceiptHTML(o){
  const now=new Date(o.date);
  const handSave=o.handSavings||((o.wikunumSubtotal||o.subtotal)-o.subtotal);
  const isB2B=o.paymentMethod==='bill_to_bill';
  const isCard=o.paymentMethod==='card';
  const storeName=S.settings?.storeName||'MART';
  const storePhone=S.settings?.storePhone||'';
  const storeAddr=S.settings?.storeAddress||'';
  return `<div class="pos-receipt-wrap">
    <div class="rh">
      <div style="font-size:13px;font-weight:900;letter-spacing:2px;margin-bottom:2px">${storeName}</div>
      <div style="font-size:13px;font-weight:700">🏢 Central POS</div>
      ${storeAddr?`<div style="font-size:13px;color:#555;margin-top:2px">${storeAddr}</div>`:''}
      ${storePhone?`<div style="font-size:13px;color:#555">📞 ${storePhone}</div>`:''}
      <div style="font-size:13px;margin-top:4px;color:#333">${now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} ${now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div style="font-size:13px;font-weight:700;margin-top:2px">Bill #${String(o.id).padStart(6,'0')}</div>
    </div>
    ${o.customerId?`<div style="font-size:13px;padding:4px 0;margin-bottom:2px">
      ගනුදෙනුකරු: <strong>${o.customerName}</strong>${o.customerType==='wholesale'?' · තොග':''}
      ${o.loyaltyEarned?`<div style="font-size:13px;color:#0a6b3a">⭐ +${o.loyaltyEarned} ලොයල්ටි පොයින්ට් ලැබුණා</div>`:''}
      ${(o.creditBalanceBefore||0)>0?`<div style="font-size:13px;color:#c2620a">📋 පෙර ගිණුම් ශේෂය: රු. ${(o.creditBalanceBefore||0).toFixed(2)}</div>`:''}
    </div><div class="rd"></div>`:''}
    <div style="display:grid;grid-template-columns:1fr 62px 52px;font-size:13px;color:#333;font-weight:700;margin-bottom:2px;padding-bottom:4px;border-bottom:2px solid #555;gap:3px">
      <span>භාණ්ඩය</span><span style="text-align:center;line-height:1.3">වෙළඳපල<br>මිල</span><span style="text-align:center;line-height:1.3">අපේ<br>මිල</span>
    </div>
    ${o.items.map(i=>{
      const wik=(i.wikunumMila||i.price);const ape=i.overridePrice||i.price;
      const saved=(wik-ape)*i.qty;
      return `<div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px">
          <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:130px">${i.icon||''}${i.name}</span>
          <span style="color:#888;text-decoration:line-through;font-size:13px;min-width:58px;text-align:center">${(wik*i.qty).toFixed(2)}</span>
          <span style="font-weight:700;min-width:48px;text-align:center">${(ape*i.qty).toFixed(2)}</span>
        </div>
        <div style="font-size:13px;color:#666;padding-left:2px">× ${i.qty}${i.isScale?' kg':''} @ රු. ${ape.toFixed(2)}${saved>0?` [ඉතිරි ${saved.toFixed(2)}]`:''}</div>
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

function posPrintReceipt(o){
  const html=buildPosReceiptHTML(o);
  document.getElementById('pos-receipt-content').innerHTML=html;
  document.getElementById('admin-print-receipt-area').innerHTML=html;
  om('pos-receipt-modal');
}

function posAdminTriggerPrint(){
  const area=document.getElementById('admin-print-receipt-area');
  area.style.display='block';
  window.print();
  setTimeout(()=>{area.style.display='none';},1000);
}
function posResetBillUI(){
  posCart=[];posActiveMember=null;posCustType='walkin_retail';
  if(document.getElementById('pos-disc-val'))document.getElementById('pos-disc-val').value='';
  if(document.getElementById('pos-cash-given'))document.getElementById('pos-cash-given').value='';
  if(document.getElementById('pos-change-disp'))document.getElementById('pos-change-disp').textContent='ඉතිරි: —';
  if(document.getElementById('pos-cash-summary'))document.getElementById('pos-cash-summary').style.display='none';
  // Reset compact head badge
  const hl=document.getElementById('pos-cust-head-label');if(hl){hl.textContent='👤 ගනුදෙනුකරු තෝරන්න — ▲ click';hl.style.color='var(--text3)';}
  const hb=document.getElementById('pos-cust-head-badge');if(hb){hb.style.borderColor='var(--border)';hb.style.borderStyle='dashed';}
  const hc=document.getElementById('pos-cust-head-clear');if(hc)hc.style.display='none';
  const pp=document.getElementById('pos-partial-pay');if(pp)pp.value='';
}
function posHoldBill(){
  if(!posCart.length){toast('Bill හිස්ය','error');return}
  posHeldBills.push({num:posBillNum,cart:[...posCart],custType:posCustType,member:posActiveMember,disc:document.getElementById('pos-disc-val')?.value||'',discType:posDiscType,activeTab:posActiveTab,wsPayMethod:posWsPayMethod});
  document.getElementById('pos-held-btn').textContent=`🔒 Held (${posHeldBills.length})`;
  posResetBillUI();posBillNum++;posUpdateBillNum();posRenderItems();posUpdateBill();posRenderGrid();posUpdateCustFloatBtn();
  toast(`Bill held ✓`,'info');
}
function posVoidBill(){
  if(posCart.length&&!confirm('Void this bill?'))return;
  posResetBillUI();posBillNum++;posUpdateBillNum();posRenderItems();posUpdateBill();posRenderGrid();posUpdateCustFloatBtn();toast('Bill voided','info');
}
function posNewBill(){
  if(posCart.length&&!confirm('Clear current bill?'))return;
  posResetBillUI();posBillNum++;posUpdateBillNum();posRenderItems();posUpdateBill();posRenderGrid();posUpdateCustFloatBtn();
}
function posRestoreHeld(idx){
  const h=posHeldBills[idx];if(!h)return;
  if(posCart.length&&!confirm('Restore held bill? Current bill will be lost.'))return;
  posCart=[...h.cart];posActiveMember=h.member;posBillNum=h.num;posDiscType=h.discType||'pct';
  posCustType=h.custType||'walkin_retail';
  if(document.getElementById('pos-disc-val'))document.getElementById('pos-disc-val').value=h.disc||'';
  // Restore tab state
  const tab=h.activeTab||'retail';
  posSwitchTab(tab);
  if(h.wsPayMethod&&tab==='wholesale'){posWsPayMethod=h.wsPayMethod;posSetWsPayMethod(h.wsPayMethod);}
  posHeldBills.splice(idx,1);document.getElementById('pos-held-btn').textContent=`🔒 Held (${posHeldBills.length})`;
  posUpdateBillNum();posRenderItems();posUpdateBill();posRenderGrid();cm('pos-held-modal');
}
function renderHeldBills(){
  document.getElementById('pos-held-list').innerHTML=posHeldBills.length?posHeldBills.map((h,i)=>`
    <div class="pos-held-card" onclick="posRestoreHeld(${i})">
      <div><div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">Bill #${String(h.num).padStart(4,'0')}</div>
      <div style="font-size:13px;color:var(--text3)">${h.cart.length} items · ${h.custType.replace('walkin_','Walk-in ')}</div></div>
      <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${h.cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(0)}</div>
      <div style="font-size:13px;color:var(--text3)">click to restore</div></div>
    </div>`).join(''):`<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">No held bills</div>`;
}
function posOpenShift(){
  const today=new Date().toDateString();
  const ords=S.orders.filter(o=>new Date(o.date).toDateString()===today&&o.source==='pos'&&o.status!=='cancelled');
  const cash=ords.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const card=ords.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const disc=ords.reduce((s,o)=>s+(o.manualDiscount||0),0);
  document.getElementById('pos-shift-content').innerHTML=`
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:16px;color:var(--accent)">📊 Daily Shift Report</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Date: ${new Date().toLocaleDateString()} · Generated: ${new Date().toLocaleTimeString()}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--bg2);border:1px solid rgba(232,255,71,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">Total Sales</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">රු. ${(cash+card).toLocaleString()}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid rgba(46,213,115,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">Transactions</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--green)">${ords.length}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid rgba(46,213,115,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">💵 Cash</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--green)">රු. ${cash.toLocaleString()}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid rgba(83,82,237,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">💳 Card</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#7c7bff">රු. ${card.toLocaleString()}</div>
      </div>
    </div>
    ${disc>0?`<div style="background:rgba(255,71,87,.06);border:1px solid rgba(255,71,87,.2);border-radius:7px;padding:10px;margin-bottom:10px;font-size:13px;display:flex;justify-content:space-between"><span>Total Discounts Given</span><span style="color:var(--red)">−රු. ${disc.toLocaleString()}</span></div>`:''}
    ${ords.length?`<div style="font-size:13px;font-family:'Syne',sans-serif;font-weight:700;margin-bottom:7px">Recent Transactions (${ords.length})</div>
    <div style="max-height:200px;overflow-y:auto">${[...ords].reverse().slice(0,25).map(o=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--bg2);border-radius:5px;margin-bottom:3px;font-size:13px"><span>#${String(o.id).padStart(4,'0')} · ${o.customerName}</span><span style="color:${o.paymentMethod==='cash'?'var(--green)':'#7c7bff'}">${o.paymentMethod==='cash'?'💵':'💳'} රු. ${o.total.toFixed(0)}</span></div>`).join('')}</div>`:'<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">No POS transactions today</div>'}`;
  om('pos-shift-modal');
}

// ══════════════════════════════════════════
// POS FLOATING CUSTOMER PANEL
// ══════════════════════════════════════════
let posCustPanelOpen=false;

function posToggleCustPanel(){
  posCustPanelOpen=!posCustPanelOpen;
  document.getElementById('pos-cust-float-panel').classList.toggle('pos-open',posCustPanelOpen);
  document.getElementById('pos-cust-float-arrow').textContent=posCustPanelOpen?'▼':'▲';
}
function posCloseCustPanel(){
  posCustPanelOpen=false;
  document.getElementById('pos-cust-float-panel').classList.remove('pos-open');
  document.getElementById('pos-cust-float-arrow').textContent='▲';
}
function posUpdateCustFloatBtn(){
  const lbl=document.getElementById('pos-cust-float-label');
  const chip=document.getElementById('pos-cust-float-chip');
  const btn=document.getElementById('pos-cust-float-btn');
  if(!lbl)return;
  if(posActiveMember){
    lbl.textContent='';
    chip.style.display='inline-block';
    chip.textContent=posActiveMember.name+(posActiveMember.businessName?' · '+posActiveMember.businessName:'');
    btn.style.background='#1d4ed8';
  } else {
    lbl.textContent=posActiveTab==='wholesale'?'Walk-in Wholesale':'Walk-in Retail';
    chip.style.display='none';
    btn.style.background='var(--accent)';
  }
}
// Show/hide floating button when POS page is active
function posCustFloatVisibility(visible){
  const btn=document.getElementById('pos-cust-float-btn');
  const panel=document.getElementById('pos-cust-float-panel');
  if(btn){btn.classList.toggle('pos-visible',visible);}
  if(panel){panel.classList.toggle('pos-visible',visible);if(!visible){panel.classList.remove('pos-open');posCustPanelOpen=false;}}
}

// ══════════════════════════════════════════
// ═══════════ NOTIF ═══════════
function toggleNP(){const p=document.getElementById('np');p.classList.toggle('open');if(p.classList.contains('open'))renderNP()}
function renderNP(){
  const items=S.notifications.filter(n=>n.target==='admin');
  document.getElementById('npItems').innerHTML=[...items].reverse().map(n=>{
    const dest=n.type==='new_order'?'orders':n.type==='complaint'?'complaints':'';
    return `<div class="npi ${n.read?'':'unread'}" onclick="npClick('${dest}')" style="cursor:pointer">
      <div class="npi-t">${n.message}</div>
      <div class="npi-s">${new Date(n.date).toLocaleString()}${dest?` · <span style="color:var(--accent)">→ ${dest==='orders'?'ඇණවුම් බලන්න':'පැමිණිල්ල බලන්න'}</span>`:''}</div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3)">දැනුම්දීම් නැත</div>`;
}
function npClick(dest){
  if(!dest) return;
  document.getElementById('np').classList.remove('open');
  const el=document.querySelector(`.ni[onclick*="'${dest}'"]`);
  nav(dest,el);
}
async function markAllNR(){const items=S.notifications.filter(n=>n.target==='admin'&&!n.read);for(const n of items){n.read=true;await pu('notifications',n)}await loadAll();renderNP();updateBadges()}

// ═══════════ BRANCHES ═══════════
let brActiveTab='overview';
let brFilterId='all'; // which branch is selected for sub-tab views

// Helper: get stock for a product in a branch
function getBranchStock(branchId,productId){
  const rec=S.branchStock.find(b=>b.branchId===branchId&&b.productId===productId);
  return rec?rec.stock:0;
}
// Helper: get total branch stock for a product (all branches combined)
function getAllBranchStock(productId){
  return S.branchStock.filter(b=>b.productId===productId).reduce((s,b)=>s+b.stock,0);
}

function brTab(tab,el){
  brActiveTab=tab;
  document.querySelectorAll('#branch-tabs .tab').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');
  renderBranches();
}

function renderBranches(){
  const ct=document.getElementById('branch-content');
  if(!ct) return;
  if(brActiveTab==='overview') renderBranchOverview(ct);
  else if(brActiveTab==='stock') renderBranchStock(ct);
  else if(brActiveTab==='sales') renderBranchSales(ct);
  else if(brActiveTab==='orders') renderBranchOrders(ct);
  else if(brActiveTab==='customers') renderBranchCustomers(ct);
  else if(brActiveTab==='b2b') renderBranchB2B(ct);
  else if(brActiveTab==='usage') renderBranchStockUsage(ct);
}

function branchSelector(onchange='renderBranches()'){
  if(!S.branches.length) return '<div style="color:var(--text3);font-size:13px">Branch නොමැත — ＋ Branch button click කරන්න</div>';
  return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <select class="fs" id="br-filter" style="width:220px" onchange="brFilterId=this.value;${onchange}">
      <option value="all">🏪 All Branches</option>
      ${S.branches.map(b=>`<option value="${b.id}" ${brFilterId==b.id?'selected':''}>${b.name} — ${b.location||''}</option>`).join('')}
    </select>
  </div>`;
}

function renderBranchOverview(ct){
  const today=new Date().toDateString();

  // ── Daily Network Sales Summary (all POS) ──
  const allPosToday=S.orders.filter(o=>new Date(o.date).toDateString()===today&&o.source==='pos'&&o.status!=='cancelled');

  // Central today (no branchId, not branch order)
  const centralTodayPos=allPosToday.filter(o=>!o.branchId&&!o.isBranchOrder);
  const cCash=centralTodayPos.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const cCard=centralTodayPos.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const cB2b=centralTodayPos.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);

  // Per branch today (from branch POS terminals)
  const branchRows=S.branches.map(b=>{
    const bOrds=allPosToday.filter(o=>o.branchId===b.id&&!o.isBranchOrder);
    const bCash=bOrds.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
    const bCard=bOrds.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
    const bB2b=bOrds.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
    const bTotal=bCash+bCard+bB2b;
    return {name:b.name,bills:bOrds.length,cash:bCash,card:bCard,b2b:bB2b,total:bTotal};
  });

  // Branch orders today (admin billing to branch)
  const branchOrdersToday=allPosToday.filter(o=>o.isBranchOrder);
  const boCash=branchOrdersToday.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const boCard=branchOrdersToday.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
  const boB2b=branchOrdersToday.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);

  const netCash=cCash+branchRows.reduce((s,b)=>s+b.cash,0)+boCash;
  const netCard=cCard+branchRows.reduce((s,b)=>s+b.card,0)+boCard;
  const netB2b=cB2b+branchRows.reduce((s,b)=>s+b.b2b,0)+boB2b;
  const netTotal=netCash+netCard+netB2b;
  const netBills=centralTodayPos.length+branchRows.reduce((s,b)=>s+b.bills,0)+branchOrdersToday.length;

  const dailySummary=`
  <div class="card" style="margin-bottom:16px;border-left:4px solid var(--accent);background:rgba(26,122,80,.03)">
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      📊 Daily POS Sales — ${new Date().toLocaleDateString('si-LK',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
    </div>
    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px">
      ${[
        ['🌐 Network Total',`රු. ${Math.round(netTotal).toLocaleString()}`,'var(--accent)'],
        ['📋 Total Bills',netBills,'var(--blue)'],
        ['💵 Cash',`රු. ${Math.round(netCash).toLocaleString()}`,'var(--green)'],
        ['💳 Card',`රු. ${Math.round(netCard).toLocaleString()}`,'var(--teal)'],
        ['📄 B2B',`රු. ${Math.round(netB2b).toLocaleString()}`,'var(--purple)'],
      ].map(([l,v,c])=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${l}</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${c}">${v}</div>
      </div>`).join('')}
    </div>
    <!-- Per-location breakdown table -->
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:500px">
        <thead><tr style="background:var(--bg3)">
          ${['Location','Bills','💵 Cash','💳 Card','📄 B2B','∑ Total'].map(h=>`<th style="padding:7px 12px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);text-align:${h==='Location'?'left':'right'}">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border);background:rgba(26,122,80,.03)">
            <td style="padding:9px 12px;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;color:var(--accent)">🏢 Central Supermarket</td>
            <td style="padding:9px 12px;text-align:right;font-weight:700">${centralTodayPos.length}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--green)">රු. ${Math.round(cCash).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--teal)">රු. ${Math.round(cCard).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--purple)">රු. ${Math.round(cB2b).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${Math.round(cCash+cCard+cB2b).toLocaleString()}</td>
          </tr>
          ${branchRows.map(b=>`<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:9px 12px;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;color:var(--teal)">🏪 ${b.name}</td>
            <td style="padding:9px 12px;text-align:right;font-weight:700">${b.bills}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--green)">රු. ${Math.round(b.cash).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--teal)">රු. ${Math.round(b.card).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--purple)">රු. ${Math.round(b.b2b).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${Math.round(b.total).toLocaleString()}</td>
          </tr>`).join('')}
          ${branchOrdersToday.length>0?`<tr style="border-bottom:1px solid var(--border);background:rgba(8,145,178,.03)">
            <td style="padding:9px 12px;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;color:var(--blue)">📦 Branch Orders (Admin)</td>
            <td style="padding:9px 12px;text-align:right;font-weight:700">${branchOrdersToday.length}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--green)">රු. ${Math.round(boCash).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--teal)">රු. ${Math.round(boCard).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--purple)">රු. ${Math.round(boB2b).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--blue)">රු. ${Math.round(boCash+boCard+boB2b).toLocaleString()}</td>
          </tr>`:''}
          <tr style="background:var(--bg2);font-weight:700;border-top:2px solid var(--border)">
            <td style="padding:9px 12px;font-family:'Syne',sans-serif;font-weight:800">🌐 Network Total</td>
            <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800">${netBills}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--green);font-weight:800">රු. ${Math.round(netCash).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--teal);font-weight:800">රු. ${Math.round(netCard).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;color:var(--purple);font-weight:800">රු. ${Math.round(netB2b).toLocaleString()}</td>
            <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-size:13px;font-weight:900;color:var(--accent)">රු. ${Math.round(netTotal).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;

  // Individual location cards
  const centralOrds=S.orders.filter(o=>!o.branchId&&o.source==='pos'&&o.status!=='cancelled');
  const centralCustIds=[...new Set(centralOrds.map(o=>o.customerId).filter(Boolean))];
  const centralStock=S.products.reduce((s,p)=>s+p.stock,0);
  const centralLow=S.products.filter(p=>p.stock<=(p.lowStock||10)&&p.stock>0).length;

  const centralCard_html=`<div class="card" style="margin-bottom:12px;border-left:4px solid var(--accent)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">🏢 Central Supermarket</div>
        <div style="font-size:13px;color:var(--text3)">ප්‍රධාන ශාඛාව · Admin POS</div>
        <div style="margin-top:5px"><span style="font-size:13px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:2px 8px;color:var(--accent)">Central Stock: ${centralStock} items</span></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      ${[
        ['📅 Today Sales',`රු. ${Math.round(cCash+cCard+cB2b).toLocaleString()}`,cCash+cCard+cB2b>0?'var(--accent)':'var(--text3)'],
        ['📋 Today Bills',centralTodayPos.length,'var(--blue)'],
        ['💰 All-time Total',`රු. ${Math.round(centralOrds.reduce((s,o)=>s+o.total,0)).toLocaleString()}`,'var(--green)'],
        ['👥 Customers',centralCustIds.length,'var(--purple)'],
        ['⚠ Low Stock',centralLow,centralLow>0?'var(--orange)':'var(--green)'],
      ].map(([l,v,c])=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${l}</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${c}">${v}</div>
      </div>`).join('')}
    </div>
  </div>`;

  const branchCards=S.branches.map(b=>{
    const bOrds=S.orders.filter(o=>o.branchId===b.id&&o.status!=='cancelled');
    const todayOrds=bOrds.filter(o=>new Date(o.date).toDateString()===today);
    const totalSales=bOrds.reduce((s,o)=>s+o.total,0);
    const todaySales=todayOrds.reduce((s,o)=>s+o.total,0);
    const custIds=[...new Set(bOrds.map(o=>o.customerId).filter(Boolean))];
    const branchTotalStock=S.branchStock.filter(s=>s.branchId===b.id).reduce((t,s)=>t+s.stock,0);
    const lowStock=S.products.filter(p=>{const st=getBranchStock(b.id,p.id);return st>0&&st<=(p.lowStock||10);}).length;
    return `<div class="card" style="margin-bottom:12px;border-left:4px solid var(--teal)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">🏪 ${b.name}</div>
          <div style="font-size:13px;color:var(--text3)">📍 ${b.location||'—'} · 👤 ${b.manager||'—'} · 📞 ${b.phone||'—'}</div>
          <div style="margin-top:5px"><span style="font-size:13px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:2px 8px;color:var(--teal)">Branch Stock: ${branchTotalStock} items</span></div>
        </div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="editBranch(${b.id})">✏</button>
          <button class="btn btn-danger btn-sm" onclick="delBranch(${b.id})">✕</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
        ${[
          ['📅 Today Sales',`රු. ${Math.round(todaySales).toLocaleString()}`,todaySales>0?'var(--teal)':'var(--text3)'],
          ['📋 Today Bills',todayOrds.length,'var(--blue)'],
          ['💰 All-time Total',`රු. ${Math.round(totalSales).toLocaleString()}`,'var(--green)'],
          ['👥 Customers',custIds.length,'var(--purple)'],
          ['⚠ Low Stock',lowStock,lowStock>0?'var(--orange)':'var(--green)'],
        ].map(([l,v,c])=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${l}</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${c}">${v}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  ct.innerHTML=dailySummary+centralCard_html+(branchCards||'<div style="text-align:center;padding:60px;color:var(--text3)">Branch නොමැත — ＋ Branch button click කරන්න</div>');
}

function renderBranchStock(ct){
  const sel=branchSelector('renderBranches()');
  const branches=brFilterId==='all'?S.branches:S.branches.filter(b=>b.id==brFilterId);
  if(!S.branches.length){ct.innerHTML=sel+'<div style="text-align:center;padding:40px;color:var(--text3)">Branch නොමැත</div>';return}

  const cols=branches.map(b=>b.name);
  const lowCount=S.products.filter(p=>{
    const total=p.stock+getAllBranchStock(p.id);
    return total<=(p.lowStock||10);
  }).length;

  const summaryHtml=`<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <div style="background:var(--accent-dim);border:1px solid rgba(26,122,80,.2);border-radius:8px;padding:8px 16px;text-align:center">
      <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">🏢 Central Items</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${S.products.reduce((s,p)=>s+p.stock,0)}</div>
    </div>
    ${branches.map(b=>`<div style="background:rgba(8,145,178,.07);border:1px solid rgba(8,145,178,.2);border-radius:8px;padding:8px 16px;text-align:center">
      <div style="font-size:13px;color:var(--teal);text-transform:uppercase;letter-spacing:1px">🏪 ${b.name}</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--teal)">${S.branchStock.filter(s=>s.branchId===b.id).reduce((t,s)=>t+s.stock,0)}</div>
    </div>`).join('')}
    <div style="background:rgba(21,128,61,.07);border:1px solid rgba(21,128,61,.2);border-radius:8px;padding:8px 16px;text-align:center">
      <div style="font-size:13px;color:var(--green);text-transform:uppercase;letter-spacing:1px">∑ Network Total</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--green)">${S.products.reduce((s,p)=>s+p.stock+getAllBranchStock(p.id),0)}</div>
    </div>
    ${lowCount>0?`<div style="background:rgba(220,38,38,.07);border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:8px 16px;text-align:center">
      <div style="font-size:13px;color:var(--red);text-transform:uppercase;letter-spacing:1px">⚠ Low Stock Items</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--red)">${lowCount}</div>
    </div>`:''}
  </div>
  <div style="margin-bottom:10px">
    <span style="font-size:13px;color:var(--text3)">Stock quantities shown below. Use Branch Order tab to send stock to branches.</span>
  </div>`;

  const header=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:500px">
    <thead><tr style="background:var(--bg2)">
      <th style="padding:9px 12px;text-align:left;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">නිෂ්පාදනය</th>
      <th style="padding:9px 12px;text-align:center;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);border-bottom:1px solid var(--border)">🏢 Central</th>
      ${cols.map(c=>`<th style="padding:9px 12px;text-align:center;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--teal);border-bottom:1px solid var(--border)">🏪 ${c}</th>`).join('')}
      <th style="padding:9px 12px;text-align:center;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--green);border-bottom:1px solid var(--border)">∑ Total</th>
    </tr></thead><tbody>`;

  const rows=S.products.map(p=>{
    const central=p.stock||0;
    const brStocks=branches.map(b=>getBranchStock(b.id,p.id));
    const total=central+brStocks.reduce((s,v)=>s+v,0);
    const isLow=total<=(p.lowStock||10);
    return `<tr style="border-bottom:1px solid var(--border);${isLow?'background:rgba(220,38,38,.03)':''}">
      <td style="padding:9px 12px;font-size:13px">
        <span>${p.icon||'📦'}</span> <strong>${p.name}</strong>
        ${isLow?'<span style="font-size:13px;background:rgba(220,38,38,.1);color:var(--red);border-radius:4px;padding:1px 5px;margin-left:4px">LOW</span>':''}
        <div style="font-size:13px;color:var(--text3)">${p.category}</div>
      </td>
      <td style="padding:9px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--accent)">${central}</td>
      ${brStocks.map(s=>`<td style="padding:9px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--teal)">${s}</td>`).join('')}
      <td style="padding:9px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:${isLow?'var(--red)':'var(--green)'}">${total}</td>
    </tr>`;
  }).join('');

  ct.innerHTML=sel+summaryHtml+header+rows+`</tbody></table></div>`;
}

function renderBranchSales(ct){
  const sel=branchSelector('renderBranches()');
  const branches=brFilterId==='all'?S.branches:S.branches.filter(b=>b.id==brFilterId);

  // Date filter
  const dateHtml=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <input type="date" id="br-date-from" class="fi" style="width:150px" onchange="renderBranches()">
    <span style="color:var(--text3);font-size:13px">→</span>
    <input type="date" id="br-date-to" class="fi" style="width:150px" onchange="renderBranches()">
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('br-date-from').value='';document.getElementById('br-date-to').value='';renderBranches()">Clear</button>
  </div>`;

  const from=document.getElementById('br-date-from')?.value;
  const to=document.getElementById('br-date-to')?.value;

  function filterByDate(ords){
    return ords.filter(o=>{
      const d=new Date(o.date);
      if(from&&d<new Date(from)) return false;
      if(to&&d>new Date(to+'T23:59:59')) return false;
      return true;
    });
  }

  // Central sales
  const centralOrds=filterByDate(S.orders.filter(o=>!o.branchId&&o.source==='pos'&&o.status!=='cancelled'));
  const centralCash=centralOrds.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
  const centralCard=centralOrds.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);

  const centralRow=`<tr style="background:rgba(26,122,80,.05);border-bottom:2px solid var(--border)">
    <td style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--accent)">🏢 Central Supermarket</td>
    <td style="padding:10px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:700;color:var(--green)">${centralOrds.length}</td>
    <td style="padding:10px 12px;text-align:right;color:var(--green)">රු. ${centralCash.toLocaleString()}</td>
    <td style="padding:10px 12px;text-align:right;color:var(--blue)">රු. ${centralCard.toLocaleString()}</td>
    <td style="padding:10px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${(centralCash+centralCard).toLocaleString()}</td>
  </tr>`;

  const branchRows=branches.map(b=>{
    const ords=filterByDate(S.orders.filter(o=>o.branchId===b.id&&o.status!=='cancelled'));
    const cash=ords.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
    const card=ords.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
    const b2b=ords.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--teal)">🏪 ${b.name}<br><span style="font-weight:400;font-size:13px;color:var(--text3)">${b.location||''}</span></td>
      <td style="padding:10px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:700">${ords.length}</td>
      <td style="padding:10px 12px;text-align:right;color:var(--green)">රු. ${cash.toLocaleString()}</td>
      <td style="padding:10px 12px;text-align:right;color:var(--blue)">රු. ${card.toLocaleString()}</td>
      <td style="padding:10px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${(cash+card+b2b).toLocaleString()}</td>
    </tr>`;
  }).join('');

  // Grand total row
  const allOrds=filterByDate(S.orders.filter(o=>o.status!=='cancelled'));
  const gtotal=allOrds.reduce((s,o)=>s+o.total,0);
  const totalRow=`<tr style="background:var(--bg2);font-weight:700">
    <td style="padding:10px 12px;font-size:13px;font-family:'Syne',sans-serif">🌐 Network Total</td>
    <td style="padding:10px 12px;text-align:center;font-family:'Syne',sans-serif;font-weight:800">${allOrds.length}</td>
    <td colspan="2" style="padding:10px 12px"></td>
    <td style="padding:10px 12px;text-align:right;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">රු. ${Math.round(gtotal).toLocaleString()}</td>
  </tr>`;

  ct.innerHTML=sel+dateHtml+`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--bg2)">
      <th style="padding:9px 12px;text-align:left;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">Branch</th>
      <th style="padding:9px 12px;text-align:center;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">Bills</th>
      <th style="padding:9px 12px;text-align:right;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">💵 Cash</th>
      <th style="padding:9px 12px;text-align:right;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">💳 Card</th>
      <th style="padding:9px 12px;text-align:right;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">∑ Total</th>
    </tr></thead>
    <tbody>${centralRow}${branchRows}${totalRow}</tbody>
  </table></div>`;
}

function renderBranchOrders(ct){
  const sel=branchSelector('renderBranches()');
  let ords;
  if(brFilterId==='all'){
    // All orders — both central POS and branch POS
    ords=[...S.orders].filter(o=>o.source==='pos').reverse().slice(0,80);
  } else if(brFilterId==='central'){
    ords=[...S.orders].filter(o=>!o.branchId&&o.source==='pos').reverse().slice(0,60);
  } else {
    ords=[...S.orders].filter(o=>o.branchId==brFilterId).reverse().slice(0,60);
  }
  const rows=ords.map(o=>{
    const br=o.branchId?S.branches.find(b=>b.id===o.branchId):null;
    const brLabel=br?`<span style="color:var(--teal)">🏪 ${br.name}</span>`:`<span style="color:var(--accent)">🏢 Central</span>`;
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px;font-size:13px;color:var(--accent);font-family:'Syne',sans-serif">#${String(o.id).padStart(4,'0')}</td>
      <td style="padding:9px 12px;font-size:13px">${brLabel}</td>
      <td style="padding:9px 12px;font-size:13px">${o.customerName||'Walk-in'}</td>
      <td style="padding:9px 12px;font-size:13px;color:var(--text3)">${new Date(o.date).toLocaleString()}</td>
      <td style="padding:9px 12px;font-size:13px">${o.paymentMethod==='cash'?'💵 Cash':o.paymentMethod==='card'?'💳 Card':'📄 B2B'}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:700;color:var(--accent)">රු. ${o.total.toFixed(0)}</td>
    </tr>`;
  }).join('');
  // Branch filter buttons for orders
  const filterBtns=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    <button class="tab ${brFilterId==='all'?'act':''}" onclick="brFilterId='all';renderBranches()">🌐 All POS</button>
    <button class="tab ${brFilterId==='central'?'act':''}" onclick="brFilterId='central';renderBranches()">🏢 Central</button>
    ${S.branches.map(b=>`<button class="tab ${brFilterId==b.id?'act':''}" onclick="brFilterId=${b.id};renderBranches()">🏪 ${b.name}</button>`).join('')}
  </div>`;
  ct.innerHTML=filterBtns+`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--bg2)">
      ${['#','Branch/Central','Customer','Date','Payment','Total'].map(h=>`<th style="padding:9px 12px;text-align:left;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">${h}</th>`).join('')}
    </tr></thead>
    <tbody>${rows||`<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">Orders නොමැත</td></tr>`}</tbody>
  </table></div>`;
}

function renderBranchCustomers(ct){
  const sel=branchSelector('renderBranches()');

  // Build list — group customers by which branch/central they transacted at
  const allTargets=[
    {id:'central', name:'🏢 Central Supermarket', isCentral:true},
    ...S.branches.map(b=>({id:b.id, name:`🏪 ${b.name}`, isCentral:false, branch:b}))
  ];

  // Filter if specific branch selected
  const targets=brFilterId==='all'?allTargets:allTargets.filter(t=>brFilterId==='central'?t.isCentral:t.id==brFilterId);

  const sections=targets.map(target=>{
    const ords=S.orders.filter(o=>target.isCentral?(!o.branchId&&o.source==='pos'):o.branchId===target.id);
    const custIds=[...new Set(ords.map(o=>o.customerId).filter(Boolean))];
    const custs=S.customers.filter(c=>custIdset(custIds,c.id));

    if(!custs.length&&!ords.filter(o=>!o.customerId).length) return `<div style="background:var(--bg2);border-radius:8px;padding:12px;margin-bottom:14px">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:4px">${target.name}</div>
      <div style="font-size:13px;color:var(--text3)">ගනුදෙනුකරුවන් නොමැත</div></div>`;

    const walkInOrds=ords.filter(o=>!o.customerId);
    const walkCash=walkInOrds.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
    const walkCard=walkInOrds.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);

    const custRows=custs.map(c=>{
      const cOrds=ords.filter(o=>o.customerId===c.id);
      const cash=cOrds.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0);
      const card=cOrds.filter(o=>o.paymentMethod==='card').reduce((s,o)=>s+o.total,0);
      const credit=cOrds.filter(o=>o.paymentMethod==='bill_to_bill').reduce((s,o)=>s+o.total,0);
      return `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px 12px;font-size:13px;font-family:'Syne',sans-serif;font-weight:700">${c.name}
          ${c.businessName?`<div style="font-size:13px;color:var(--text3)">${c.businessName}</div>`:''}
        </td>
        <td style="padding:8px 12px;font-size:13px;color:var(--text3)">${c.phone||'—'}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700">${cOrds.length}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--green);font-size:13px">${cash>0?`රු. ${cash.toFixed(0)}`:'—'}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--blue);font-size:13px">${card>0?`රු. ${card.toFixed(0)}`:'—'}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--purple);font-size:13px">${credit>0?`රු. ${credit.toFixed(0)}`:'—'}</td>
        <td style="padding:8px 12px;text-align:right;font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">රු. ${(cash+card+credit).toFixed(0)}</td>
        <td style="padding:8px 12px">
          <button class="btn btn-ghost btn-sm" onclick="openAdminCustHistory(${c.id})" style="font-size:13px">📋</button>
        </td>
      </tr>`;
    }).join('');

    return `<div style="background:var(--bg1);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:13px;margin-bottom:10px;color:${target.isCentral?'var(--accent)':'var(--teal)'}">${target.name}</div>
      ${custs.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:600px">
        <thead><tr style="background:var(--bg2)">
          ${['ගනුදෙනුකරු','Phone','Bills','💵 Cash','💳 Card','📄 Credit','∑ Total',''].map(h=>`<th style="padding:7px 12px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);text-align:${h==='ගනුදෙනුකරු'||h==='Phone'?'left':'right'}">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${custRows}</tbody>
      </table></div>`:''}
      ${walkInOrds.length?`<div style="margin-top:8px;padding:8px 12px;background:var(--bg2);border-radius:7px;display:flex;gap:16px;font-size:13px">
        <span style="color:var(--text3)">Walk-in (${walkInOrds.length} bills):</span>
        ${walkCash>0?`<span style="color:var(--green)">💵 රු. ${walkCash.toFixed(0)}</span>`:''}
        ${walkCard>0?`<span style="color:var(--blue)">💳 රු. ${walkCard.toFixed(0)}</span>`:''}
      </div>`:''}
    </div>`;
  }).join('');

  ct.innerHTML=sel+`<div style="margin-bottom:10px;display:flex;gap:8px">
    <button class="tab ${brFilterId==='all'?'act':''}" onclick="brFilterId='all';renderBranches()">All</button>
    <button class="tab ${brFilterId==='central'?'act':''}" onclick="brFilterId='central';renderBranches()">🏢 Central</button>
    ${S.branches.map(b=>`<button class="tab ${brFilterId==b.id?'act':''}" onclick="brFilterId=${b.id};renderBranches()">🏪 ${b.name}</button>`).join('')}
  </div>`+sections;
}

function custIdset(ids,id){return ids.includes(id);}

// ══ Branch B2B Balance Tab ══
// ══════════════════════════════════════════
// DAILY STOCK USAGE — item-by-item per branch, central, all
// ══════════════════════════════════════════
function renderBranchStockUsage(ct){
  if(!ct) ct=document.getElementById('br-content');
  const today=new Date().toISOString().split('T')[0];
  const saved=window._usageDate||today;
  window._usageCt=ct;

  ct.innerHTML=`
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
    <label style="font-size:14px;color:var(--text3);font-weight:600">📅 දිනය:</label>
    <input type="date" id="usage-date-sel" class="fi" value="${saved}" style="width:170px;font-size:14px" onchange="window._usageDate=this.value;buildStockUsage(this.value)">
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('usage-date-sel').value='${today}';window._usageDate='${today}';buildStockUsage('${today}')" style="font-size:13px">Today</button>
    <span style="font-size:13px;color:var(--text3)" id="usage-date-label"></span>
  </div>
  <div id="usage-content"></div>`;

  buildStockUsage(saved);
}

function buildStockUsage(dateStr){
  const dateParts = dateStr.split('-');
  const selDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2]));
  const selDateStr = selDate.toDateString();

  const lbl = document.getElementById('usage-date-label');
  if(lbl) lbl.textContent = selDate.toLocaleDateString('si-LK',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const ct = document.getElementById('usage-content');
  if(!ct) return;

  // Filter all orders for the selected date
  const dayOrds = S.orders.filter(o => new Date(o.date).toDateString() === selDateStr && o.status !== 'cancelled');

  // Build a map: productId -> {name, icon, central_pos, central_online_retail, central_online_wholesale, branches: {branchId: qty}, branchOrder: {branchId: qty}}
  const usageMap = {};

  S.products.forEach(p => {
    usageMap[p.id] = {
      id: p.id, name: p.name, icon: p.icon||'📦', category: p.category||'—',
      central_pos: 0,
      online_retail: 0,
      online_wholesale: 0,
      branches: {},   // branchId -> qty sold FROM branch POS
      branchOrders: {} // branchId -> qty sent TO branch via Branch Order
    };
    S.branches.forEach(b => {
      usageMap[p.id].branches[b.id] = 0;
      usageMap[p.id].branchOrders[b.id] = 0;
    });
  });

  dayOrds.forEach(o => {
    (o.items||[]).forEach(it => {
      if(!usageMap[it.pid]) return;
      const u = usageMap[it.pid];
      if(o.isBranchOrder){
        // Admin billing items to a branch — central stock reduced, branch stock increased
        if(o.branchId) u.branchOrders[o.branchId] = (u.branchOrders[o.branchId]||0) + it.qty;
      } else if(o.source === 'pos'){
        if(!o.branchId){
          // Central POS sale
          u.central_pos += it.qty;
        } else {
          // Branch POS sale
          u.branches[o.branchId] = (u.branches[o.branchId]||0) + it.qty;
        }
      } else {
        // Online order
        if(o.customerType === 'wholesale') u.online_wholesale += it.qty;
        else u.online_retail += it.qty;
      }
    });
  });

  // Filter to only products with any usage
  const usedProducts = Object.values(usageMap).filter(u =>
    u.central_pos + u.online_retail + u.online_wholesale +
    Object.values(u.branches).reduce((s,v)=>s+v,0) +
    Object.values(u.branchOrders).reduce((s,v)=>s+v,0) > 0
  );

  if(!usedProducts.length){
    ct.innerHTML=`<div style="text-align:center;padding:60px;color:var(--text3);font-size:15px">
      <div style="font-size:40px;margin-bottom:12px;opacity:.3">📦</div>
      මෙම දිනයේ stock usage නොමැත
    </div>`;
    return;
  }

  // Sort by total usage descending
  usedProducts.sort((a,b) => {
    const ta = a.central_pos+a.online_retail+a.online_wholesale+Object.values(a.branches).reduce((s,v)=>s+v,0)+Object.values(a.branchOrders).reduce((s,v)=>s+v,0);
    const tb = b.central_pos+b.online_retail+b.online_wholesale+Object.values(b.branches).reduce((s,v)=>s+v,0)+Object.values(b.branchOrders).reduce((s,v)=>s+v,0);
    return tb - ta;
  });

  // ── Section 1: All locations summary ──
  const grandTotal = usedProducts.reduce((s,u) =>
    s + u.central_pos + u.online_retail + u.online_wholesale +
    Object.values(u.branches).reduce((t,v)=>t+v,0) +
    Object.values(u.branchOrders).reduce((t,v)=>t+v,0), 0);

  const summaryCards = `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px">
    ${[
      ['📦 Products Used', usedProducts.length, 'var(--accent)'],
      ['🔢 Total Items Out', grandTotal, 'var(--blue)'],
      ['🏢 Central POS', usedProducts.reduce((s,u)=>s+u.central_pos,0), 'var(--teal)'],
      ['🛍 Online Retail', usedProducts.reduce((s,u)=>s+u.online_retail,0), 'var(--green)'],
      ['🏭 Online Wholesale', usedProducts.reduce((s,u)=>s+u.online_wholesale,0), 'var(--purple)'],
      ['🏪 Branch Orders', usedProducts.reduce((s,u)=>Object.values(u.branchOrders).reduce((t,v)=>t+v,0)+s,0), 'var(--orange)'],
    ].map(([l,v,c])=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:11px;color:var(--text3);margin-bottom:3px">${l}</div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${c}">${v}</div>
    </div>`).join('')}
  </div>`;

  // ── Section 2: Full table — item by item all locations ──
  const allColHeaders = [
    'නිෂ්පාදනය','📂 Category',
    '🏢 Central POS','🛍 Online Retail','🏭 Online Wholesale',
    ...S.branches.map(b=>`🏪 ${b.name}`),
    ...S.branches.map(b=>`📦 → ${b.name}`),
    '∑ Total'
  ];

  const allTable = `
  <div class="card" style="margin-bottom:18px">
    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:10px">🌐 සියලු ස්ථාන — Item by Item</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:800px;font-size:13px">
        <thead><tr style="background:var(--bg2)">
          ${allColHeaders.map((h,i)=>`<th style="padding:8px 10px;text-align:${i<2?'left':'center'};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1.5px solid var(--border);white-space:nowrap">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${usedProducts.map(u=>{
            const branchSales = S.branches.map(b=>u.branches[b.id]||0);
            const branchOrderQtys = S.branches.map(b=>u.branchOrders[b.id]||0);
            const total = u.central_pos + u.online_retail + u.online_wholesale +
              branchSales.reduce((s,v)=>s+v,0) + branchOrderQtys.reduce((s,v)=>s+v,0);
            const cell=(v,col='var(--text)')=>v>0
              ?`<td style="padding:7px 10px;text-align:center;font-weight:700;color:${col};font-family:'Syne',sans-serif">${v}</td>`
              :`<td style="padding:7px 10px;text-align:center;color:var(--text3)">—</td>`;
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:7px 10px;font-size:13px"><span style="margin-right:5px">${u.icon}</span><strong>${u.name}</strong></td>
              <td style="padding:7px 10px;font-size:12px;color:var(--text3)">${u.category}</td>
              ${cell(u.central_pos,'var(--teal)')}
              ${cell(u.online_retail,'var(--green)')}
              ${cell(u.online_wholesale,'var(--purple)')}
              ${branchSales.map(v=>cell(v,'var(--blue)')).join('')}
              ${branchOrderQtys.map(v=>cell(v,'var(--orange)')).join('')}
              <td style="padding:7px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:var(--accent)">${total}</td>
            </tr>`;
          }).join('')}
          <tr style="background:var(--bg2);font-weight:800;border-top:2px solid var(--border)">
            <td style="padding:8px 10px;font-family:'Syne',sans-serif" colspan="2">∑ Daily Total</td>
            ${[
              usedProducts.reduce((s,u)=>s+u.central_pos,0),
              usedProducts.reduce((s,u)=>s+u.online_retail,0),
              usedProducts.reduce((s,u)=>s+u.online_wholesale,0),
              ...S.branches.map(b=>usedProducts.reduce((s,u)=>s+(u.branches[b.id]||0),0)),
              ...S.branches.map(b=>usedProducts.reduce((s,u)=>s+(u.branchOrders[b.id]||0),0)),
            ].map(v=>`<td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:14px;font-weight:900;color:var(--accent)">${v||'—'}</td>`).join('')}
            <td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:var(--accent)">${grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;

  // ── Section 3: Central Supermarket breakdown ──
  const centralUsed = usedProducts.filter(u => u.central_pos+u.online_retail+u.online_wholesale > 0);
  const centralTable = centralUsed.length ? `
  <div class="card" style="margin-bottom:18px;border-left:4px solid var(--accent)">
    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:10px;color:var(--accent)">🏢 Central Supermarket — Item by Item</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--bg2)">
          ${['නිෂ්පාදනය','📂 Category','🏢 POS','🛍 Online Retail','🏭 Online Wholesale','∑ Total'].map((h,i)=>`<th style="padding:8px 10px;text-align:${i<2?'left':'center'};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1.5px solid var(--border)">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${centralUsed.map(u=>{
            const tot=u.central_pos+u.online_retail+u.online_wholesale;
            const c=(v,col)=>v>0?`<td style="padding:7px 10px;text-align:center;font-weight:700;color:${col};font-family:'Syne',sans-serif">${v}</td>`:`<td style="padding:7px 10px;text-align:center;color:var(--text3)">—</td>`;
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:7px 10px"><span style="margin-right:5px">${u.icon}</span><strong>${u.name}</strong></td>
              <td style="padding:7px 10px;font-size:12px;color:var(--text3)">${u.category}</td>
              ${c(u.central_pos,'var(--teal)')}
              ${c(u.online_retail,'var(--green)')}
              ${c(u.online_wholesale,'var(--purple)')}
              <td style="padding:7px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:var(--accent)">${tot}</td>
            </tr>`;
          }).join('')}
          <tr style="background:var(--bg2);border-top:2px solid var(--border)">
            <td style="padding:8px 10px;font-family:'Syne',sans-serif;font-weight:800" colspan="2">∑ Total</td>
            ${[
              centralUsed.reduce((s,u)=>s+u.central_pos,0),
              centralUsed.reduce((s,u)=>s+u.online_retail,0),
              centralUsed.reduce((s,u)=>s+u.online_wholesale,0),
            ].map(v=>`<td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-weight:900;color:var(--accent)">${v||'—'}</td>`).join('')}
            <td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:var(--accent)">${centralUsed.reduce((s,u)=>s+u.central_pos+u.online_retail+u.online_wholesale,0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>` : '';

  // ── Section 4: Per-branch breakdown ──
  const branchTables = S.branches.map(b=>{
    const brUsed = usedProducts.filter(u=>(u.branches[b.id]||0)+(u.branchOrders[b.id]||0)>0);
    if(!brUsed.length) return `<div class="card" style="margin-bottom:14px;border-left:4px solid var(--teal);opacity:.5">
      <div style="font-size:14px;font-weight:700;color:var(--teal)">🏪 ${b.name}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:4px">මෙම දිනයේ usage නොමැත</div>
    </div>`;
    return `
    <div class="card" style="margin-bottom:18px;border-left:4px solid var(--teal)">
      <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:10px;color:var(--teal)">🏪 ${b.name} — Item by Item</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--bg2)">
            ${['නිෂ්පාදනය','📂 Category','🖥 Branch POS විකිණීම','📦 Branch Order ලැබුණු','∑ Total'].map((h,i)=>`<th style="padding:8px 10px;text-align:${i<2?'left':'center'};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1.5px solid var(--border)">${h}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${brUsed.map(u=>{
              const sold=u.branches[b.id]||0;
              const recv=u.branchOrders[b.id]||0;
              const tot=sold+recv;
              const c=(v,col)=>v>0?`<td style="padding:7px 10px;text-align:center;font-weight:700;color:${col};font-family:'Syne',sans-serif">${v}</td>`:`<td style="padding:7px 10px;text-align:center;color:var(--text3)">—</td>`;
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:7px 10px"><span style="margin-right:5px">${u.icon}</span><strong>${u.name}</strong></td>
                <td style="padding:7px 10px;font-size:12px;color:var(--text3)">${u.category}</td>
                ${c(sold,'var(--blue)')}
                ${c(recv,'var(--orange)')}
                <td style="padding:7px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:var(--teal)">${tot}</td>
              </tr>`;
            }).join('')}
            <tr style="background:var(--bg2);border-top:2px solid var(--border)">
              <td style="padding:8px 10px;font-family:'Syne',sans-serif;font-weight:800" colspan="2">∑ Total</td>
              ${[
                brUsed.reduce((s,u)=>s+(u.branches[b.id]||0),0),
                brUsed.reduce((s,u)=>s+(u.branchOrders[b.id]||0),0),
              ].map(v=>`<td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-weight:900;color:var(--teal)">${v||'—'}</td>`).join('')}
              <td style="padding:8px 10px;text-align:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:var(--teal)">${brUsed.reduce((s,u)=>s+(u.branches[b.id]||0)+(u.branchOrders[b.id]||0),0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  ct.innerHTML = summaryCards + allTable + centralTable + branchTables;
}

function renderBranchB2B(ct){
  const totalB2B=S.branches.reduce((s,b)=>s+(b.forwardBalance||0),0);
  const rows=S.branches.map(b=>{
    const fb=b.forwardBalance||0;
    const b2bOrds=S.orders.filter(o=>o.branchId===b.id&&o.paymentMethod==='bill_to_bill'&&o.status!=='cancelled');
    const totalOrdered=b2bOrds.reduce((s,o)=>s+o.total,0);
    const totalPaid=b2bOrds.reduce((s,o)=>s+(o.b2bPartialPaid||0),0);
    return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${fb>0?'var(--red)':'var(--green)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800">🏪 ${b.name}</div>
          <div style="font-size:13px;color:var(--text3)">${b.location||'—'} · ${b.manager||'—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:900;color:${fb>0?'var(--red)':'var(--green)'}">රු. ${fb.toFixed(2)}</div>
          <div style="font-size:13px;color:var(--text3)">B2B Balance</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div style="background:var(--bg2);border-radius:7px;padding:9px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">B2B Orders</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent)">${b2bOrds.length}</div>
        </div>
        <div style="background:var(--bg2);border-radius:7px;padding:9px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">Total Ordered</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--orange)">රු. ${totalOrdered.toFixed(0)}</div>
        </div>
        <div style="background:var(--bg2);border-radius:7px;padding:9px;text-align:center">
          <div style="font-size:13px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">Paid So Far</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--green)">රු. ${totalPaid.toFixed(0)}</div>
        </div>
      </div>
      ${fb>0?`
      <div style="background:rgba(220,38,38,.05);border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:10px 12px">
        <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:8px">💳 ගෙවීම කරන්න</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="number" id="br-b2b-pay-${b.id}" placeholder="ගෙවන මුදල රු...." min="0" max="${fb}" class="fi" style="flex:1;min-width:150px;font-size:13px">
          <button class="btn btn-ghost btn-sm" onclick="brB2BDeduct(${b.id})" style="white-space:nowrap">💵 Reduce Balance</button>
          <button class="btn btn-danger btn-sm" onclick="brB2BSettle(${b.id})" style="white-space:nowrap">✓ Settle All (රු. ${fb.toFixed(2)})</button>
        </div>
      </div>`:'<div style="background:rgba(21,128,61,.06);border:1px solid rgba(21,128,61,.2);border-radius:7px;padding:10px;text-align:center;color:var(--green);font-weight:700">✓ Balance Clear — ගෙවීම් නොමැත</div>'}
    </div>`;
  }).join('');

  ct.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px">
      <div class="sc"><div class="sc-lbl">📄 Total B2B Outstanding</div><div class="sc-val" style="color:${totalB2B>0?'var(--red)':'var(--green)'};font-size:13px">රු. ${Math.round(totalB2B).toLocaleString()}</div></div>
      <div class="sc"><div class="sc-lbl">🏪 Branches with Balance</div><div class="sc-val" style="color:var(--orange);font-size:13px">${S.branches.filter(b=>(b.forwardBalance||0)>0).length}</div></div>
    </div>
    ${rows||'<div style="text-align:center;padding:40px;color:var(--text3)">Branch නොමැත</div>'}`;
}

async function brB2BDeduct(branchId){
  const b=S.branches.find(x=>x.id===branchId);if(!b)return;
  const inp=document.getElementById(`br-b2b-pay-${branchId}`);
  const amt=parseFloat(inp?.value)||0;
  if(amt<=0){toast('ගෙවන මුදල ඇතුල් කරන්න','error');return}
  const prev=b.forwardBalance||0;
  if(amt>prev){toast(`රු. ${prev.toFixed(2)} ට වඩා ගෙවිය නොහැක`,'error');return}
  b.forwardBalance=Math.max(0,prev-amt);
  await pu('branches',b);
  await loadAll();renderBranches();
  toast(`✓ ${b.name} — රු. ${amt.toFixed(2)} ගෙවා balance රු. ${b.forwardBalance.toFixed(2)} ක් ඉතිරිවිය`,'success');
}

async function brB2BSettle(branchId){
  const b=S.branches.find(x=>x.id===branchId);if(!b)return;
  const fb=b.forwardBalance||0;
  if(!confirm(`${b.name} ගේ සම්පූර්ණ B2B balance (රු. ${fb.toFixed(2)}) settle කරන්නද?`))return;
  b.forwardBalance=0;
  await pu('branches',b);
  await loadAll();renderBranches();
  toast(`✓ ${b.name} — B2B balance settle කළා!`,'success');
}

// Branch CRUD
function openBranchModal(){
  document.getElementById('bm-title').textContent='Branch එකතු කරන්න';
  document.getElementById('bm-id').value='';
  ['bm-name','bm-location','bm-pin','bm-manager','bm-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  om('branch-modal');
}
// ── Branch B2B Balance Management ──
let bb2bTargetId=null;
function openBranchDeductModal(branchId){
  bb2bTargetId=branchId;
  const b=S.branches.find(x=>x.id===branchId);if(!b)return;
  document.getElementById('bb2b-branch-name').textContent=`🏪 ${b.name}`;
  document.getElementById('bb2b-current').textContent=`රු. ${(b.forwardBalance||0).toFixed(2)}`;
  document.getElementById('bb2b-amount').value='';
  document.getElementById('bb2b-preview').style.display='none';
  om('branch-b2b-modal');
}
function bb2bCalc(){
  const b=S.branches.find(x=>x.id===bb2bTargetId);if(!b)return;
  const bal=b.forwardBalance||0;
  const amt=parseFloat(document.getElementById('bb2b-amount').value)||0;
  const newBal=Math.max(0,bal-amt);
  const prev=document.getElementById('bb2b-preview');
  prev.style.display=amt>0?'block':'none';
  document.getElementById('bb2b-prev-val').textContent=`රු. ${bal.toFixed(2)}`;
  document.getElementById('bb2b-pay-val').textContent=`රු. ${amt.toFixed(2)}`;
  document.getElementById('bb2b-new-val').textContent=`රු. ${newBal.toFixed(2)}`;
}
async function saveBranchB2BDeduct(){
  const b=S.branches.find(x=>x.id===bb2bTargetId);if(!b)return;
  const amt=parseFloat(document.getElementById('bb2b-amount').value)||0;
  if(!amt||amt<=0){toast('ගෙවූ මුදල ඇතුල් කරන්න','error');return}
  const prev=b.forwardBalance||0;
  b.forwardBalance=Math.max(0,prev-amt);
  await pu('branches',b);
  await loadAll();
  cm('branch-b2b-modal');
  renderBranches();
  toast(`✓ රු. ${amt.toFixed(2)} branch B2B ශේෂයෙන් අඩු කළා — ශේෂය: රු. ${b.forwardBalance.toFixed(2)}`,'success');
}
async function settleBranchB2B(branchId){
  const b=S.branches.find(x=>x.id===branchId);if(!b)return;
  const bal=b.forwardBalance||0;
  if(!bal){toast('B2B ශේෂය නොමැත','info');return}
  if(!confirm(`🏪 ${b.name} — B2B ශේෂය රු. ${bal.toFixed(2)} සම්පූර්ණයෙන් ගෙවා ඇතැ?`))return;
  b.forwardBalance=0;
  await pu('branches',b);
  await loadAll();
  renderBranches();
  toast(`✓ ${b.name} B2B ශේෂය සම්පූර්ණයෙන් settle කළා!`,'success');
}

function editBranch(id){
  const b=S.branches.find(x=>x.id===id);if(!b)return;
  document.getElementById('bm-title').textContent='Branch සංස්කරණය';
  document.getElementById('bm-id').value=id;
  document.getElementById('bm-name').value=b.name;
  document.getElementById('bm-location').value=b.location||'';
  document.getElementById('bm-pin').value=b.pin||'';
  document.getElementById('bm-manager').value=b.manager||'';
  document.getElementById('bm-phone').value=b.phone||'';
  om('branch-modal');
}
async function saveBranch(){
  const name=document.getElementById('bm-name').value.trim();
  const pin=document.getElementById('bm-pin').value.trim();
  if(!name){toast('Branch නාමය ඇතුල් කරන්න','error');return}
  if(!pin){toast('POS PIN ඇතුල් කරන්න','error');return}
  const eid=document.getElementById('bm-id').value;
  // Check PIN uniqueness
  const dupPin=S.branches.find(b=>b.pin===pin&&b.id!=(parseInt(eid)||0));
  if(dupPin){toast('PIN දැනටමත් භාවිතා වෙයි','error');return}
  const obj={name,location:document.getElementById('bm-location').value.trim(),pin,manager:document.getElementById('bm-manager').value.trim(),phone:document.getElementById('bm-phone').value.trim(),active:true,createdAt:new Date().toISOString()};
  if(eid){const b=S.branches.find(x=>x.id===parseInt(eid));if(b){Object.assign(b,obj);await pu('branches',b);}}
  else await pa('branches',obj);
  await loadAll();cm('branch-modal');renderBranches();toast(`✓ ${name} saved`,'success');
}
async function delBranch(id){
  if(!confirm('Branch delete කරන්නද? Branch stock data ද delete වේ.'))return;
  await de('branches',id);
  // delete all branchStock for this branch
  const toDelete=S.branchStock.filter(b=>b.branchId===id);
  for(const r of toDelete) await de('branchStock',r.id);
  await loadAll();renderBranches();toast('Branch deleted','info');
}

// Branch Stock adjust
function openBrStockModal(branchId,productId,prodName,currentQty){
  document.getElementById('brs-bid').value=branchId;
  document.getElementById('brs-pid').value=productId;
  document.getElementById('brs-title').textContent=`📦 Stock Adjust — ${prodName}`;
  const br=S.branches.find(b=>b.id===branchId);
  document.getElementById('brs-info').textContent=`🏪 ${br?br.name:'Branch'} · Current: ${currentQty}`;
  document.getElementById('brs-qty').value='';
  document.getElementById('brs-action').value='set';
  om('br-stock-modal');
}
async function saveBranchStock(){
  const bid=parseInt(document.getElementById('brs-bid').value);
  const pid=parseInt(document.getElementById('brs-pid').value);
  const qty=parseInt(document.getElementById('brs-qty').value)||0;
  const action=document.getElementById('brs-action').value;
  const existing=S.branchStock.find(b=>b.branchId===bid&&b.productId===pid);
  let newQty=qty;
  if(action==='add') newQty=(existing?existing.stock:0)+qty;
  else if(action==='subtract') newQty=Math.max(0,(existing?existing.stock:0)-qty);
  if(existing){existing.stock=newQty;await pu('branchStock',existing);}
  else await pa('branchStock',{branchId:bid,productId:pid,stock:newQty});
  await loadAll();cm('br-stock-modal');renderBranches();
  toast(`✓ Stock updated to ${newQty}`,'success');
}

// Transfer modal
function openTransferModal(){
  const bSel=document.getElementById('brt-branch');
  bSel.innerHTML=S.branches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  const pSel=document.getElementById('brt-prod');
  pSel.innerHTML=S.products.map(p=>`<option value="${p.id}">${p.icon||'📦'} ${p.name} (Central: ${p.stock})</option>`).join('');
  document.getElementById('brt-qty').value='';
  om('br-transfer-modal');
}
async function doTransfer(){
  const bid=parseInt(document.getElementById('brt-branch').value);
  const pid=parseInt(document.getElementById('brt-prod').value);
  const qty=parseInt(document.getElementById('brt-qty').value)||0;
  if(qty<=0){toast('ප්‍රමාණය ඇතුල් කරන්න','error');return}
  const prod=S.products.find(x=>x.id===pid);if(!prod){toast('Product not found','error');return}
  if(prod.stock<qty){toast(`Central stock insufficient (${prod.stock} available)`,'error');return}
  // Deduct from central
  prod.stock=prod.stock-qty;
  await pu('products',prod);
  // Add to branch
  const existing=S.branchStock.find(b=>b.branchId===bid&&b.productId===pid);
  if(existing){existing.stock+=qty;await pu('branchStock',existing);}
  else await pa('branchStock',{branchId:bid,productId:pid,stock:qty});
  await loadAll();cm('br-transfer-modal');renderBranches();
  const br=S.branches.find(b=>b.id===bid);
  toast(`✓ ${qty} × ${prod.name} → ${br?br.name:'Branch'}. Central: ${prod.stock}`,'success');
}

// Poll new orders & branch updates
setInterval(async()=>{if(!db)return;const prev=S.orders.length;await loadAll();if(S.orders.length>prev){toast(`🛒 New order received!`,'warn')}},5000);

// ═══════════ UTILS ═══════════
function om(id){document.getElementById(id).classList.add('open')}
function cm(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
function toast(msg,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;document.getElementById('tc').appendChild(el);setTimeout(()=>el.remove(),4000)}

// ═══════════ INIT ═══════════
async function initApp(){await idb();await seed();await loadAll();renderDash()}

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
  // Don't intercept Enter in textareas or contenteditable
  if(tag === 'TEXTAREA') return;
  // Don't intercept Enter inside select dropdowns
  if(tag === 'SELECT') return;

  // 1. Check if any modal is open — click its primary button
  const openModal = document.querySelector('.mo.open .modal, .mo.open > div');
  if(openModal){
    // Try btn-primary first, then btn-pos-complete, then btn-orange
    const primary = openModal.querySelector('.btn-primary:not([disabled]),.btn-pos-complete:not([disabled]),.btn-orange:not([disabled])');
    if(primary){
      e.preventDefault();
      primary.click();
      return;
    }
  }

  // 2. No modal — page-specific actions
  // Admin login screen
  const loginScreen = document.getElementById('login-screen');
  if(loginScreen && loginScreen.style.display !== 'none'){
    e.preventDefault();
    aLogin();
    return;
  }

  // POS tab — complete sale (only if active tab is pos and input not focused)
  const posPage = document.getElementById('page-pos');
  if(posPage?.classList.contains('act') && tag !== 'INPUT'){
    const btn = document.getElementById('pos-complete-btn');
    if(btn && !btn.disabled){ e.preventDefault(); btn.click(); return; }
  }

  // Branch order tab — complete order
  const boPage = document.getElementById('page-branch-order');
  if(boPage?.classList.contains('act') && tag !== 'INPUT'){
    const btn = document.getElementById('bo-complete-btn');
    if(btn && !btn.disabled){ e.preventDefault(); btn.click(); return; }
  }
});
