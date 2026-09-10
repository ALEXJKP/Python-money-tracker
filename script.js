const STORAGE_KEY = 'ledgerly-workspace-v1';
const CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Health', 'Fun', 'Shopping', 'Savings', 'Other'];
const CATEGORY_ICONS = { Housing: '⌂', Food: '●', Transport: '↗', Utilities: 'ϟ', Health: '+', Fun: '✦', Shopping: '□', Savings: '◎', Other: '•' };
const MONTH = '2026-09';
const cloneDefaults = () => JSON.parse(JSON.stringify(defaultState));
const createId = () => globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultState = {
  transactions: [],
  bills: [],
  budgets: { Housing: 1600, Food: 500, Transport: 250, Utilities: 220, Health: 180, Fun: 250, Shopping: 250 }
};
let state = loadState();

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const categoryFor = (description) => {
  const text = description.toLowerCase();
  const rules = [['Housing', ['rent', 'mortgage', 'lease']], ['Food', ['grocery', 'restaurant', 'cafe', 'coffee', 'food', 'market']], ['Transport', ['uber', 'lyft', 'train', 'gas', 'transit', 'parking']], ['Utilities', ['internet', 'electric', 'water', 'phone', 'utility']], ['Health', ['gym', 'pharmacy', 'doctor', 'health']], ['Shopping', ['amazon', 'shop', 'store', 'clothing']], ['Fun', ['movie', 'game', 'concert', 'stream']]];
  return rules.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || 'Other';
};
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return cloneDefaults();
    return {
      ...defaultState,
      ...saved,
      transactions: (saved.transactions || []).filter((transaction) => !String(transaction.id).startsWith('demo-')),
      bills: (saved.bills || []).filter((bill) => !['bill-1', 'bill-2', 'bill-3'].includes(bill.id)),
      budgets: { ...defaultState.budgets, ...saved.budgets }
    };
  } catch { return cloneDefaults(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function monthTransactions() { return state.transactions.filter((transaction) => transaction.date.startsWith(MONTH)); }
function totals() {
  return monthTransactions().reduce((result, transaction) => {
    result[transaction.type] += transaction.amount;
    result.count[transaction.type] += 1;
    if (transaction.type === 'expense') result.categories[transaction.category] = (result.categories[transaction.category] || 0) + transaction.amount;
    return result;
  }, { income: 0, expense: 0, count: { income: 0, expense: 0 }, categories: {} });
}
function renderSummary() {
  const summary = totals();
  const available = summary.income - summary.expense;
  $('#available-total').textContent = money(available);
  $('#available-caption').textContent = available >= 0 ? 'Income minus spending' : 'More out than in';
  $('#income-total').textContent = money(summary.income);
  $('#income-caption').textContent = `${summary.count.income} deposit${summary.count.income === 1 ? '' : 's'} this month`;
  $('#spending-total').textContent = money(summary.expense);
  $('#spending-caption').textContent = `${summary.count.expense} transaction${summary.count.expense === 1 ? '' : 's'} this month`;
  $('#savings-rate').textContent = `${summary.income ? Math.max(0, Math.round(available / summary.income * 100)) : 0}%`;
}
function renderChart() {
  const days = Array.from({ length: 7 }, (_, index) => index + 4);
  const values = days.map((day) => {
    const date = `${MONTH}-${String(day).padStart(2, '0')}`;
    return monthTransactions().filter((transaction) => transaction.date === date).reduce((sum, item) => ({ income: sum.income + (item.type === 'income' ? item.amount : 0), expense: sum.expense + (item.type === 'expense' ? item.amount : 0) }), { income: 0, expense: 0 });
  });
  const max = Math.max(...values.flatMap((item) => [item.income, item.expense]), 1);
  $('#cashflow-chart').innerHTML = values.some((item) => item.income || item.expense) ? values.map((item, index) => `<div class="chart-day"><div class="bar-pair"><div class="bar income" data-value="${money(item.income)}" style="height:${item.income ? Math.max(item.income / max * 100, 5) : 0}%"></div><div class="bar spending" data-value="${money(item.expense)}" style="height:${item.expense ? Math.max(item.expense / max * 100, 5) : 0}%"></div></div><small>SEP ${days[index]}</small></div>`).join('') : '<div class="empty-chart">Add transactions to see your cash flow.</div>';
}
function renderBudgets() {
  const summary = totals();
  const entries = Object.entries(state.budgets);
  $('#budget-list').innerHTML = entries.length ? entries.map(([category, limit]) => {
    const spent = summary.categories[category] || 0;
    const percent = Math.min(spent / limit * 100, 100);
    return `<div class="budget-item"><div class="budget-label"><span>${category}</span><span>${money(spent)} / ${money(limit)}</span></div><div class="progress"><i class="${spent > limit ? 'over' : ''}" style="width:${percent}%"></i></div></div>`;
  }).join('') : '<div class="budget-empty">Set a few category limits to stay on track.</div>';
}
function renderTransactions() {
  const rows = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  $('#transaction-list').innerHTML = rows.length ? rows.map((transaction) => `<div class="transaction-row"><div class="transaction-icon ${transaction.type}">${transaction.type === 'income' ? '↗' : (CATEGORY_ICONS[transaction.category] || '•')}</div><div class="transaction-detail"><strong>${escapeHtml(transaction.description)}</strong><span>${transaction.category} · ${formatDate(transaction.date)}</span></div><strong class="transaction-amount ${transaction.type}">${transaction.type === 'income' ? '+' : '-'}${money(transaction.amount)}</strong></div>`).join('') : '<div class="list-empty">No transactions yet. Add your first one above.</div>';
}
function renderBills() {
  const rows = [...state.bills].sort((a, b) => a.dueDay - b.dueDay);
  $('#bill-list').innerHTML = rows.length ? rows.map((bill) => `<div class="bill-row"><div class="bill-date">${bill.dueDay}<small>SEP</small></div><div class="bill-detail"><strong>${escapeHtml(bill.name)}</strong><span>${bill.category}</span></div><strong class="bill-amount">${money(bill.amount)}</strong></div>`).join('') : '<div class="list-empty">No recurring bills. You are all clear.</div>';
}
function renderAlert() {
  const summary = totals();
  const over = Object.entries(state.budgets).find(([category, limit]) => (summary.categories[category] || 0) > limit);
  const alert = $('#alert-strip');
  if (over) { alert.hidden = false; $('#alert-title').textContent = `${over[0]} is over budget`; $('#alert-message').textContent = ` You have spent ${money(summary.categories[over[0]] - over[1])} beyond your monthly limit.`; } else if (summary.income && summary.expense / summary.income > .8) { alert.hidden = false; $('#alert-title').textContent = 'Spending is picking up'; $('#alert-message').textContent = ' More than 80% of this month’s income is already allocated.'; } else alert.hidden = true;
}
function renderAll() { renderSummary(); renderChart(); renderBudgets(); renderTransactions(); renderBills(); renderAlert(); saveState(); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function fillCategorySelects() {
  ['transaction-category', 'bill-category'].forEach((id) => { $(`#${id}`).innerHTML = CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join(''); });
  $('#budget-fields').innerHTML = CATEGORIES.filter((category) => category !== 'Other').map((category) => `<label>${category}<input name="${category}" type="number" min="0" step="1" value="${state.budgets[category] || 0}" /></label>`).join('');
}
function openModal(id) { $(`#${id}`).hidden = false; const form = $(`#${id} form`); if (id === 'transaction-modal') { form.reset(); form.elements.date.value = today(); form.elements.category.value = 'Other'; } if (id === 'budget-modal') fillCategorySelects(); }
function closeModal(modal) { modal.hidden = true; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
document.addEventListener('click', (event) => { const opener = event.target.closest('[data-open-modal]'); if (opener) openModal(opener.dataset.openModal); const closer = event.target.closest('[data-close-modal]'); if (closer) closeModal(closer.closest('.modal-backdrop')); if (event.target.classList.contains('modal-backdrop')) closeModal(event.target); });
$('#transaction-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const description = form.get('description').trim(); state.transactions.push({ id: createId(), description, amount: Number(form.get('amount')), type: form.get('type'), category: form.get('type') === 'income' ? 'Income' : (form.get('category') === 'Other' ? categoryFor(description) : form.get('category')), date: form.get('date') }); closeModal($('#transaction-modal')); renderAll(); showToast('Transaction saved'); });
$('#bill-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); state.bills.push({ id: createId(), name: form.get('name').trim(), amount: Number(form.get('amount')), dueDay: Number(form.get('dueDay')), category: form.get('category') }); closeModal($('#bill-modal')); renderAll(); showToast('Recurring bill added'); });
$('#budget-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); CATEGORIES.filter((category) => category !== 'Other').forEach((category) => { state.budgets[category] = Number(form.get(category)) || 0; }); closeModal($('#budget-modal')); renderAll(); showToast('Budgets updated'); });
$('#dismiss-alert').addEventListener('click', () => { $('#alert-strip').hidden = true; });
$('#clear-data').addEventListener('click', () => { if (confirm('Reset your workspace and remove all saved data?')) { localStorage.removeItem(STORAGE_KEY); state = cloneDefaults(); renderAll(); showToast('Workspace reset'); } });
function csvEscape(value) { return `"${String(value).replace(/"/g, '""')}"`; }
$('#export-button').addEventListener('click', () => { const rows = [['Date', 'Description', 'Type', 'Category', 'Amount'], ...state.transactions.map((item) => [item.date, item.description, item.type, item.category, item.amount.toFixed(2)])]; const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ledgerly-transactions.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV exported'); });
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const lines = String(reader.result).split(/\r?\n/).filter(Boolean).slice(1); const imported = lines.map((line) => line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"'))).filter((row) => row?.length >= 5 && Number(row[4]) > 0).map((row) => ({ id: createId(), date: row[0], description: row[1], type: row[2] === 'income' ? 'income' : 'expense', category: row[3] || categoryFor(row[1]), amount: Number(row[4]) })); state.transactions.push(...imported); renderAll(); showToast(`${imported.length} transaction${imported.length === 1 ? '' : 's'} imported`); event.target.value = ''; }; reader.readAsText(file); });
fillCategorySelects(); renderAll();
