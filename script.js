// --- SUPABASE CONNECTION ---
const SUPABASE_URL = "https://jrkjnzoedcbnzuijqidr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qvIcrV-955Ki3i-OHB59AQ_-9pArVLQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// M's General Dealers - Lusaka West, Zamastone - 0779494486
const LOC = 'Lusaka West, Zamastone';
const PHONE = '0779494486';

const USERS = {
  customer: { pass: '1234', role: 'customer', name: 'Customer' },
  bursar: { pass: '1234', role: 'bursar', name: 'Bursar' },
  manager: { pass: '1234', role: 'manager', name: 'Manager' }
};
let currentUser = null;
let products = [
  { id: 1, name: 'HP Laptop - 8GB RAM, 256GB SSD', price: 8500, stock: 10, img: 'laptop.jpg' },
  { id: 2, name: 'Desktop Computer - Full Set', price: 7500, stock: 8, img: 'computer.jpg' },
  { id: 3, name: 'Printer - Print, Scan, Copy', price: 4500, stock: 12, img: 'printer.jpg' },
  { id: 4, name: 'Power Pack - 20000mAh Fast Charge', price: 650, stock: 25, img: 'powerpack.jpg' },
  { id: 5, name: 'Phone Accessories Kit - Case + Earphones + Charger', price: 350, stock: 40, img: 'accessories.jpg' },
  { id: 6, name: 'Wireless Mouse', price: 150, stock: 30, img: 'mouse.jpg' },
  { id: 7, name: 'Keyboard', price: 250, stock: 20, img: 'keyboard.jpg' },
  { id: 8, name: 'Laptop Charger', price: 400, stock: 15, img: 'laptopcharger.png' },
  { id: 9, name: 'Flash Drive - 32GB USB', price: 150, stock: 50, img: 'flashdrive.jpg' },
  { id: 10, name: 'Headset - Headphones with Mic', price: 250, stock: 20, img: 'headset.jpg' },
  { id: 11, name: 'Memory Card - 64GB Micro SD', price: 200, stock: 35, img: 'memorycard.jpg' },
  { id: 12, name: 'Phone Charger - Fast Charge', price: 180, stock: 40, img: 'phonecharger.jpg' },
  { id: 13, name: 'Hard Drive - 500GB External', price: 850, stock: 10, img: 'harddrive.jpg' }
];
let quotations = [];
let invoices = [];
let quoteCart = [];

// --- LOAD FROM SUPABASE ---
async function loadFromSupabase() {
  try {
    const { data: prods } = await supabaseClient.from('products').select('*');
    if (prods && prods.length > 0) {
      products = prods.map(p => ({ id: p.id, name: p.name, price: Number(p.price), stock: Number(p.stock || 0), img: p.image_url || p.img || 'laptop.jpg' }));
    }
    const { data: quotes } = await supabaseClient.from('quotations').select('*').order('created_at', { ascending: false });
    if (quotes) quotations = quotes.map(q => ({ id: q.quote_number || q.id, customer: q.customer_name || 'Walk-in', phone: q.customer_phone || PHONE, items: q.items || [], total: Number(q.total_amount || q.total || 0), status: q.status || 'Pending', date: q.created_at ? new Date(q.created_at).toLocaleString() : '' }));
    renderProducts(); renderQuotations(); renderInvoices(); updateReport();
  } catch(e) { console.log('Supabase load - using local data', e); }
}
async function saveQuotationToSupabase(q) {
  try { await supabaseClient.from('quotations').insert([{ customer_name: q.customer, customer_phone: q.phone, total_amount: q.total, status: q.status, items: q.items }]); } catch(e) { console.log(e); }
}
async function saveInvoiceToSupabase(inv) {
  try { await supabaseClient.from('payments').insert([{ amount: inv.total, status: inv.status, customer_name: inv.customer }]); } catch(e) { console.log(e); }
}

// LOGIN
function login() {
  const u = document.getElementById('username').value.trim().toLowerCase();
  const p = document.getElementById('password').value.trim();
  if (USERS[u] && USERS[u].pass === p) {
    currentUser = USERS[u];
    currentUser.username = u;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    document.getElementById('welcomeMsg').innerHTML = 'Welcome, <b>' + currentUser.name + '</b> (' + currentUser.role + ') | ' + LOC + ' | ' + PHONE;
    if (currentUser.role !== 'bursar') document.getElementById('addProductBox').style.display = 'none';
    loadFromSupabase();
    renderProducts(); renderQuotations(); renderInvoices(); updateReport();
  } else { alert('Wrong login! Try: customer / 1234  OR  bursar / 1234  OR  manager / 1234'); }
}
function logout() { location.reload(); }
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(d => d.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}
function renderProducts() {
  const div = document.getElementById('productList');
  if(!div) return; div.innerHTML = '';
  products.forEach(prod => {
    div.innerHTML += `<div class="product-card"><img src="${prod.img}" style="width:100%; height:160px; object-fit:cover; border-radius:8px;" onerror="this.style.display='none'"><h3>${prod.name}</h3><div class="price">K ${prod.price}</div><div class="stock">Stock: ${prod.stock} | ${LOC}</div><br><button onclick="addToQuote(${prod.id})">+ Add to Quotation</button></div>`;
  });
  renderQuoteCart();
}
async function addProduct() {
  const n = document.getElementById('pName').value;
  const pr = Number(document.getElementById('pPrice').value);
  const s = Number(document.getElementById('pStock').value);
  if (!n || !pr) return alert('Enter name and price');
  const newProd = { id: Date.now(), name: n, price: pr, stock: s || 0 };
  products.push(newProd);
  try { await supabaseClient.from('products').insert([{ name: n, price: pr, stock: s || 0 }]); } catch(e) {}
  renderProducts(); alert('Product Added & Saved to Supabase!');
}
function addToQuote(id) {
  const prod = products.find(p => p.id === id);
  let item = quoteCart.find(i => i.id === id);
  if (item) item.qty++; else quoteCart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  renderQuoteCart();
}
function renderQuoteCart() {
  const div = document.getElementById('quoteItems'); if (!div) return;
  if (quoteCart.length === 0) { div.innerHTML = '<p>No items yet. Click + Add to Quotation</p>'; }
  else { div.innerHTML = quoteCart.map((it, idx) => `<p>${it.name} - K ${it.price} x <input type="number" value="${it.qty}" min="1" style="width:60px" onchange="updateQty(${idx}, this.value)"> = K ${(it.price * it.qty).toFixed(2)} <button onclick="removeItem(${idx})">Remove</button></p>`).join(''); }
  calcTotals();
}
function updateQty(idx, v) { quoteCart[idx].qty = Number(v); renderQuoteCart(); }
function removeItem(idx) { quoteCart.splice(idx, 1); renderQuoteCart(); }
function clearQuote() { quoteCart = []; renderQuoteCart(); document.getElementById('custName').value = ''; }
function calcTotals() {
  let sub = quoteCart.reduce((s, i) => s + i.price * i.qty, 0);
  let discPct = Number(document.getElementById('discount')?.value || 0);
  let disc = sub * discPct / 100; let afterDisc = sub - disc; let tax = afterDisc * 0.16; let total = afterDisc + tax;
  if (document.getElementById('subtotal')) { document.getElementById('subtotal').innerText = sub.toFixed(2); document.getElementById('taxAmt').innerText = tax.toFixed(2); document.getElementById('grandTotal').innerText = total.toFixed(2); }
  return { sub, tax, total };
}
document.addEventListener('input', e => { if (e.target.id === 'discount') calcTotals(); });
function createQuotation() {
  if (quoteCart.length === 0) return alert('Add products first!');
  const name = document.getElementById('custName').value || 'Walk-in Customer';
  const phone = document.getElementById('custPhone').value || PHONE;
  const calc = calcTotals();
  const q = { id: 'MS-Q-' + Math.floor(1000 + Math.random() * 9000), customer: name, phone: phone, items: [...quoteCart], total: calc.total, status: 'Pending', date: new Date().toLocaleString() };
  quotations.push(q); saveQuotationToSupabase(q); clearQuote(); renderQuotations();
  alert('Quotation ' + q.id + ' Created & Saved to Supabase! Total K ' + calc.total.toFixed(2)); showTab('quotationsTab');
}
function renderQuotations() {
  const div = document.getElementById('quotationList'); if (!div) return;
  if (quotations.length === 0) { div.innerHTML = '<p>No quotations yet.</p>'; return; }
  div.innerHTML = quotations.map((q, idx) => `<div class="card"><h3>${q.id} - ${q.customer} - ${q.status}</h3><p>📞 ${q.phone} | 📅 ${q.date}</p><p>${(q.items||[]).map(i => i.name + ' x' + i.qty + ' = K ' + (i.price * i.qty)).join('<br>')}</p><h3>Total: K ${Number(q.total).toFixed(2)}</h3>${q.status === 'Pending' && currentUser?.role === 'manager' ? `<button onclick="approveQuote(${idx})">✅ Approve</button> <button onclick="rejectQuote(${idx})">❌ Reject</button>` : ''}${q.status === 'Approved' && currentUser?.role === 'bursar' ? `<button onclick="finalizeQuote(${idx})">📄 Finalize & Create Invoice</button>` : ''}</div>`).join('');
}
function approveQuote(i) { quotations[i].status = 'Approved'; renderQuotations(); alert('Approved! Bursar can now create Invoice.'); }
function rejectQuote(i) { quotations[i].status = 'Rejected'; renderQuotations(); }
function finalizeQuote(i) {
  const q = quotations[i]; q.status = 'Finalized';
  const inv = { id: 'MS-INV-' + Math.floor(10000 + Math.random() * 90000), quoteId: q.id, customer: q.customer, phone: q.phone, items: q.items, total: q.total, status: 'Unpaid', date: new Date().toLocaleString() };
  invoices.push(inv); saveInvoiceToSupabase(inv); renderQuotations(); renderInvoices(); updateReport(); alert('Invoice ' + inv.id + ' Created! Go to Invoices tab.');
}
function renderInvoices() {
  const div = document.getElementById('invoiceList'); if (!div) return;
  if (invoices.length === 0) { div.innerHTML = '<p>No invoices yet.</p>'; return; }
  div.innerHTML = invoices.map((inv, idx) => `<div class="card"><h3>🧾 INVOICE - ${inv.id}</h3><p><b>M's General Dealers</b> | Buy • Sell • Grow Together</p><p>📞 ${PHONE} | 📍 ${LOC}</p><p>Customer: ${inv.customer} | 📞 ${inv.phone} | 📅 ${inv.date}</p><p>${inv.items.map(i => i.name + ' x' + i.qty + ' = K ' + (i.price * i.qty)).join('<br>')}</p><h3>AMOUNT DUE: K ${Number(inv.total).toFixed(2)}</h3><p>Payment: Cash / Airtel Money / MTN MoMo to ${PHONE}</p><p>Status: <b>${inv.status}</b></p><button onclick="printInvoice(${idx})">🖨️ PDF Invoice</button>${inv.status === 'Unpaid' ? `<button onclick="markPaid(${idx})">✅ Mark Paid - Reduce Stock</button>` : ''}</div>`).join('');
}
function printInvoice(idx) {
  const inv = invoices[idx]; const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Invoice ${inv.id}</title></head><body style="font-family:Arial;padding:20px"><h1>M's General Dealers</h1><p>Buy • Sell • Grow Together</p><p>📞 ${PHONE} | 📍 ${LOC}</p><hr><h2>INVOICE - ${inv.id}</h2><p>Customer: ${inv.customer} | Phone: ${inv.phone}<br>Date: ${inv.date}</p><p>${inv.items.map(i => i.name + ' x' + i.qty + ' = K ' + (i.price * i.qty).toFixed(2)).join('<br>')}</p><h2>TOTAL DUE: K ${Number(inv.total).toFixed(2)}</h2><p>Payment: Cash / Airtel Money / MTN MoMo to ${PHONE}</p><p>Thank you!</p><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
}
function markPaid(idx) {
  const inv = invoices[idx]; inv.items.forEach(it => { let p = products.find(x => x.id === it.id); if (p) p.stock -= it.qty; });
  inv.status = 'Paid'; renderProducts(); renderInvoices(); updateReport(); alert('Paid! Stock reduced!');
}
function updateReport() {
  const paid = invoices.filter(i => i.status === 'Paid'); const totalPaid = paid.reduce((s, i) => s + Number(i.total), 0); const totalOwed = invoices.filter(i => i.status === 'Unpaid').reduce((s, i) => s + Number(i.total), 0);
  if (document.getElementById('todaySales')) { document.getElementById('todaySales').innerText = 'K ' + totalPaid.toFixed(2); document.getElementById('totalPaid').innerText = 'K ' + totalPaid.toFixed(2); document.getElementById('totalOwed').innerText = 'K ' + totalOwed.toFixed(2); document.getElementById('reportDetails').innerHTML = invoices.map(i => `<div class="card">${i.id} - ${i.customer} - K ${Number(i.total).toFixed(2)} - ${i.status}</div>`).join(''); }
}
function exportData() {
  const data = JSON.stringify({ products, quotations, invoices }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ms-backup.json'; a.click();
}
