const STORAGE_KEY = 'ledgerly-workspace-v1';
const CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Health', 'Fun', 'Shopping', 'Savings', 'Other'];
const CATEGORY_ICONS = { Housing: '⌂', Food: '●', Transport: '↗', Utilities: 'ϟ', Health: '+', Fun: '✦', Shopping: '□', Savings: '◎', Other: '•' };
const MONTH = '2026-09';
const DRAFTS_KEY = 'ledgerly-drafts-v1';
const cloneDefaults = () => JSON.parse(JSON.stringify(defaultState));
const createId = () => globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultState = {
  transactions: [],
  bills: [],
  activityLog: [],
  budgets: { Housing: 1600, Food: 500, Transport: 250, Utilities: 220, Health: 180, Fun: 250, Shopping: 250 }
};
let state = loadState();
let pendingImport = [];

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
      activityLog: saved.activityLog || [],
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
function renderInputLog() {
  const rows = [...state.activityLog].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 12);
  $('#input-log-count').textContent = `${state.activityLog.length} entr${state.activityLog.length === 1 ? 'y' : 'ies'}`;
  $('#input-log-list').innerHTML = rows.length ? rows.map((row) => `<div class="input-log-row"><span class="input-log-kind">${row.kind === 'transaction' ? '↔' : '↻'}</span><div><strong>${escapeHtml(row.label)}</strong><span>${row.kind === 'transaction' ? `${row.type === 'income' ? 'Income' : 'Expense'} · ${money(row.amount)}` : `${money(row.amount)} monthly · due day ${row.dueDay}`}</span></div><time>${new Date(row.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>`).join('') : '<div class="list-empty">Your saved inputs will appear here.</div>';
}
function renderAlert() {
  const summary = totals();
  const over = Object.entries(state.budgets).find(([category, limit]) => (summary.categories[category] || 0) > limit);
  const alert = $('#alert-strip');
  if (over) { alert.hidden = false; $('#alert-title').textContent = `${over[0]} is over budget`; $('#alert-message').textContent = ` You have spent ${money(summary.categories[over[0]] - over[1])} beyond your monthly limit.`; } else if (summary.income && summary.expense / summary.income > .8) { alert.hidden = false; $('#alert-title').textContent = 'Spending is picking up'; $('#alert-message').textContent = ' More than 80% of this month’s income is already allocated.'; } else alert.hidden = true;
}
function renderAll() { renderSummary(); renderChart(); renderBudgets(); renderTransactions(); renderBills(); renderInputLog(); renderAlert(); saveState(); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(value.trim()); value = ''; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}
function normalizeDate(value, fallbackYear = new Date().getFullYear()) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parts = text.split(/[\/-]/).map(Number);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (first > 1900) return `${first}-${String(second).padStart(2, '0')}-${String(third).padStart(2, '0')}`;
    if (third > 1900) return `${third}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`;
  }
  if (parts.length === 2 && parts[0] >= 1 && parts[0] <= 12 && parts[1] >= 1 && parts[1] <= 31) return `${fallbackYear}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}
function numberValue(value) {
  const cleaned = String(value || '').replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}
function parseStatement(text, extension) {
  if (extension === 'ofx' || extension === 'qfx' || /<STMTTRN>/i.test(text)) {
    const rows = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
    return rows.map((match) => {
      const block = match[1];
      const get = (name) => block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, 'i'))?.[1]?.trim() || '';
      const amount = numberValue(get('TRNAMT'));
      return { date: normalizeDate(get('DTPOSTED').slice(0, 8).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')), description: get('NAME') || get('MEMO') || 'Imported transaction', type: amount >= 0 ? 'income' : 'expense', amount: Math.abs(amount), category: categoryFor(get('NAME') || get('MEMO')) };
    }).filter((row) => row.date && row.amount > 0);
  }
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z]/g, ''));
  const find = (names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const dateIndex = find(['date', 'transactiondate', 'posteddate', 'postdate']);
  const descriptionIndex = find(['description', 'name', 'memo', 'payee', 'merchant', 'details']);
  const amountIndex = find(['amount', 'transactionamount', 'value']);
  const debitIndex = find(['debit', 'withdrawal', 'withdrawals']);
  const creditIndex = find(['credit', 'deposit', 'deposits']);
  const typeIndex = find(['type', 'transactiontype']);
  const categoryIndex = find(['category', 'categories']);
  if (dateIndex === undefined || descriptionIndex === undefined || (amountIndex === undefined && debitIndex === undefined && creditIndex === undefined)) return [];
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const description = values[descriptionIndex] || 'Imported transaction';
    const amountValue = amountIndex === undefined ? numberValue(values[creditIndex]) || -numberValue(values[debitIndex]) : numberValue(values[amountIndex]);
    const explicitType = String(values[typeIndex] || '').toLowerCase();
    const income = explicitType.includes('credit') || explicitType.includes('income') || amountValue > 0;
    return { date: normalizeDate(values[dateIndex]), description, type: income ? 'income' : 'expense', amount: Math.abs(amountValue), category: income ? 'Income' : (values[categoryIndex] || categoryFor(description)) };
  }).filter((row) => row.date && row.amount > 0);
}
function transactionKey(row) { return `${row.date}|${row.description.toLowerCase()}|${row.type}|${row.amount.toFixed(2)}`; }
function renderImportPreview() {
  const duplicates = pendingImport.filter((row) => state.transactions.some((saved) => transactionKey(saved) === transactionKey(row))).length;
  $('#import-summary').textContent = `${pendingImport.length} transactions found. ${duplicates} duplicate${duplicates === 1 ? '' : 's'} will be skipped. Review the categories before saving.`;
  $('#import-rows').innerHTML = pendingImport.slice(0, 250).map((row) => `<tr><td>${formatDate(row.date)}</td><td>${escapeHtml(row.description)}</td><td>${row.type === 'income' ? 'Income' : 'Expense'}</td><td>${escapeHtml(row.category)}</td><td>${row.type === 'income' ? '+' : '-'}${money(row.amount)}</td></tr>`).join('');
  $('#statement-preview').hidden = false;
}
async function parsePdfStatement(file) {
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: buffer }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => item.str.trim()).sort((a, b) => a.transform[5] === b.transform[5] ? a.transform[4] - b.transform[4] : b.transform[5] - a.transform[5]);
    let currentY = null;
    let line = '';
    items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (currentY !== null && Math.abs(y - currentY) > 3) { if (line.trim()) lines.push(line.trim()); line = ''; }
      line += `${line ? ' ' : ''}${item.str.trim()}`;
      currentY = y;
    });
    if (line.trim()) lines.push(line.trim());
  }
  const statementYear = Number(lines.join(' ').match(/Statement Period:[\s\S]{0,80}?(\d{4})/i)?.[1]) || new Date().getFullYear();
  const datePattern = /^\s*(\d{1,2}[\/-]\d{1,2}(?:[\/-](?:\d{2}|\d{4}))?|\d{4}[\/-]\d{1,2}[\/-]\d{1,2})\b/;
  const amountPattern = /(?:\(?\$?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?|\(?\$?\s*-?\d+\.\d{2}\)?)(?!\d)/g;
  let sectionType = 'expense';
  const activityStart = lines.findIndex((line) => /daily account activity/i.test(line));
  const blocks = [];
  let current = null;
  lines.slice(Math.max(activityStart, 0)).forEach((line) => {
    if (/electronic deposits|other credits/i.test(line)) sectionType = 'income';
    if (/electronic payments|other withdrawals|fees and charges/i.test(line)) sectionType = 'expense';
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      if (current) blocks.push(current);
      current = { date: dateMatch[1], type: sectionType, text: line.replace(dateMatch[0], '').trim(), amounts: [] };
      return;
    }
    if (!current || /statement of account|page:|call 1-|bank deposits fdic|account summary|ending balance|statement period/i.test(line)) return;
    const amounts = line.match(amountPattern) || [];
    current.amounts.push(...amounts);
    current.text += `${current.text ? ' ' : ''}${line.replace(amountPattern, ' ').trim()}`;
  });
  if (current) blocks.push(current);
  return blocks.map((block) => {
    const amountText = block.amounts[block.amounts.length - 1];
    const amount = numberValue(amountText);
    const description = block.text.replace(/\s{2,}/g, ' ').replace(/^(continued|amount)$/i, '').trim();
    if (!description || !amount) return null;
    const income = block.type === 'income' || (amount > 0 && !/[(-]\s*\$?\d/.test(amountText));
    return { date: normalizeDate(block.date, statementYear), description, type: income ? 'income' : 'expense', amount: Math.abs(amount), category: income ? 'Income' : categoryFor(description) };
  }).filter((row) => row && row.date && row.amount > 0 && row.description.length > 3);
}
async function readStatement(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'pdf') {
    try {
      pendingImport = await parsePdfStatement(file);
      if (!pendingImport.length) { $('#statement-status').textContent = 'The PDF opened, but no transaction rows were detected. This usually means it is a scanned image PDF or uses a layout that needs manual mapping.'; $('#statement-preview').hidden = true; return; }
      $('#statement-status').textContent = '';
      renderImportPreview();
    } catch (error) {
      $('#statement-status').textContent = `Could not read this PDF in the browser: ${error.message}`;
      $('#statement-preview').hidden = true;
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingImport = parseStatement(String(reader.result), extension);
    if (!pendingImport.length) { $('#statement-status').textContent = 'No readable transactions found. Use a CSV with date, description, and amount columns, or an OFX/QFX export.'; $('#statement-preview').hidden = true; return; }
    $('#statement-status').textContent = '';
    renderImportPreview();
  };
  reader.readAsText(file);
}
function fillCategorySelects() {
  ['transaction-category', 'bill-category'].forEach((id) => { $(`#${id}`).innerHTML = CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join(''); });
  $('#budget-fields').innerHTML = CATEGORIES.filter((category) => category !== 'Other').map((category) => `<label>${category}<input name="${category}" type="number" min="0" step="1" value="${state.budgets[category] || 0}" /></label>`).join('');
}
function getDrafts() { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || {}; } catch { return {}; } }
function saveDraft(formName, form) { const drafts = getDrafts(); drafts[formName] = Object.fromEntries(new FormData(form).entries()); localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); }
function restoreDraft(formName, form) { const draft = getDrafts()[formName]; if (!draft) return; Object.entries(draft).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value; }); }
function clearDraft(formName) { const drafts = getDrafts(); delete drafts[formName]; localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); }
function openModal(id) { $(`#${id}`).hidden = false; const form = $(`#${id} form`); if (id === 'transaction-modal') { form.reset(); form.elements.date.value = today(); form.elements.category.value = 'Other'; restoreDraft('transaction', form); } if (id === 'bill-modal') { form.reset(); form.elements.category.value = 'Other'; restoreDraft('bill', form); } if (id === 'budget-modal') fillCategorySelects(); }
function closeModal(modal) { modal.hidden = true; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
document.addEventListener('click', (event) => { const opener = event.target.closest('[data-open-modal]'); if (opener) openModal(opener.dataset.openModal); const closer = event.target.closest('[data-close-modal]'); if (closer) closeModal(closer.closest('.modal-backdrop')); if (event.target.classList.contains('modal-backdrop')) closeModal(event.target); });
$('#transaction-form').addEventListener('input', (event) => saveDraft('transaction', event.currentTarget));
$('#bill-form').addEventListener('input', (event) => saveDraft('bill', event.currentTarget));
$('#transaction-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const description = form.get('description').trim(); const transaction = { id: createId(), description, amount: Number(form.get('amount')), type: form.get('type'), category: form.get('type') === 'income' ? 'Income' : (form.get('category') === 'Other' ? categoryFor(description) : form.get('category')), date: form.get('date') }; state.transactions.push(transaction); state.activityLog.push({ kind: 'transaction', label: description, amount: transaction.amount, type: transaction.type, savedAt: new Date().toISOString() }); clearDraft('transaction'); closeModal($('#transaction-modal')); renderAll(); showToast('Transaction saved'); });
$('#bill-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const bill = { id: createId(), name: form.get('name').trim(), amount: Number(form.get('amount')), dueDay: Number(form.get('dueDay')), category: form.get('category') }; state.bills.push(bill); state.activityLog.push({ kind: 'bill', label: bill.name, amount: bill.amount, dueDay: bill.dueDay, savedAt: new Date().toISOString() }); clearDraft('bill'); closeModal($('#bill-modal')); renderAll(); showToast('Recurring bill added'); });
$('#budget-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); CATEGORIES.filter((category) => category !== 'Other').forEach((category) => { state.budgets[category] = Number(form.get(category)) || 0; }); closeModal($('#budget-modal')); renderAll(); showToast('Budgets updated'); });
$('#dismiss-alert').addEventListener('click', () => { $('#alert-strip').hidden = true; });
$('#clear-data').addEventListener('click', () => { if (confirm('Reset your workspace and remove all saved data?')) { localStorage.removeItem(STORAGE_KEY); state = cloneDefaults(); renderAll(); showToast('Workspace reset'); } });
function csvEscape(value) { return `"${String(value).replace(/"/g, '""')}"`; }
$('#export-button').addEventListener('click', () => { const rows = [['Date', 'Description', 'Type', 'Category', 'Amount'], ...state.transactions.map((item) => [item.date, item.description, item.type, item.category, item.amount.toFixed(2)])]; const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ledgerly-transactions.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV exported'); });
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; readStatement(file); event.target.value = ''; });
$('#statement-file-button').addEventListener('click', () => $('#statement-file').click());
$('#statement-file').addEventListener('change', (event) => { const file = event.target.files[0]; if (file) readStatement(file); event.target.value = ''; });
$('#statement-dropzone').addEventListener('dragover', (event) => { event.preventDefault(); event.currentTarget.classList.add('dragging'); });
$('#statement-dropzone').addEventListener('dragleave', (event) => event.currentTarget.classList.remove('dragging'));
$('#statement-dropzone').addEventListener('drop', (event) => { event.preventDefault(); event.currentTarget.classList.remove('dragging'); const file = event.dataTransfer.files[0]; if (file) readStatement(file); });
$('#cancel-import').addEventListener('click', () => { pendingImport = []; $('#statement-preview').hidden = true; });
$('#save-import').addEventListener('click', () => { const existing = new Set(state.transactions.map(transactionKey)); const imported = pendingImport.filter((row) => !existing.has(transactionKey(row))).map((row) => ({ ...row, id: createId() })); imported.forEach((transaction) => { state.transactions.push(transaction); state.activityLog.push({ kind: 'transaction', label: transaction.description, amount: transaction.amount, type: transaction.type, savedAt: new Date().toISOString() }); }); pendingImport = []; $('#statement-preview').hidden = true; renderAll(); showToast(`${imported.length} transaction${imported.length === 1 ? '' : 's'} imported`); });
fillCategorySelects(); renderAll();
