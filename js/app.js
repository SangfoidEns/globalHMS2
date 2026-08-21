import { Utils } from './utils.js';
import { ParserEngine } from './parser.js';
import { store } from './store.js';
import { charts } from './charts.js';

class ApplicationController {
  constructor() {
    this.activePage = 0;
    this.currentRecords = [];
  }

  init() {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    this.initUser();
    this.bindEvents();
    this.startClock();
    this.processData();
  }

  initUser() {
    let username = 'Operator_1';
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      username = `tg_${u.id}`;
      document.getElementById('tgUserName').innerText = `@${u.username || u.id}`;
    } else {
      username = localStorage.getItem('h2_last_active_user') || 'Operator_1';
      document.getElementById('tgUserName').innerText = username;
    }
    store.initUser(username);
    document.getElementById('rawInput').value = store.rawText;
  }

  bindEvents() {
    document.getElementById('btnProcess').addEventListener('click', () => {
      Utils.triggerHaptic('success');
      this.processData();
    });

    document.getElementById('btnClear').addEventListener('click', () => {
      Utils.triggerHaptic('warning');
      document.getElementById('rawInput').value = '';
      store.rawText = '';
      this.processData();
    });

    document.getElementById('btnPage0').addEventListener('click', () => this.goToPage(0));
    document.getElementById('btnPage1').addEventListener('click', () => this.goToPage(1));

    // Подія додавання/оновлення закупки сорту
    document.getElementById('purchaseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addOrUpdatePurchase();
    });

    document.getElementById('btnSwitchUser').addEventListener('click', () => {
      const newUser = prompt('Введіть ім\'я оператора:', store.currentUser);
      if (newUser && newUser.trim()) {
        const clean = newUser.trim().replace(/\s+/g, '_');
        localStorage.setItem('h2_last_active_user', clean);
        this.initUser();
        this.processData();
      }
    });

    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addExpense();
    });

    document.getElementById('expensePresetsContainer').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        document.getElementById('newExpenseCategoryInput').value = e.target.dataset.cat;
        document.getElementById('newExpenseAmountInput').focus();
      }
    });

    document.getElementById('tableSearch').addEventListener('keyup', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('#recordsTableBody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
      });
    });
  }

  addOrUpdatePurchase() {
    const variety = document.getElementById('purchVarietyInput').value.trim().toUpperCase();
    const cost = parseFloat(document.getElementById('purchCostInput').value);
    const grams = parseFloat(document.getElementById('purchGramsInput').value);

    if (!variety || isNaN(cost) || isNaN(grams) || grams <= 0) return;

    store.varieties[variety] = { cost, grams };
    store.currentVariety = variety;

    document.getElementById('purchVarietyInput').value = '';
    document.getElementById('purchCostInput').value = '';
    document.getElementById('purchGramsInput').value = '';

    Utils.triggerHaptic('success');
    this.processData();
  }

  setPresetVariety(name) {
    store.currentVariety = name;
    Utils.triggerHaptic('light');
    this.processData();
  }

  goToPage(idx) {
    Utils.triggerHaptic('light');
    this.activePage = idx;
    document.getElementById('swipeContainer').style.transform = `translateX(-${idx * 100}vw)`;
  }

  processData() {
    store.rawText = document.getElementById('rawInput').value;
    const { detectedVariety, records } = ParserEngine.parseLogs(store.rawText);

    if (detectedVariety !== 'UNKNOWN') store.currentVariety = detectedVariety;

    document.getElementById('activeVarietyBadge').innerText = store.currentVariety;
    document.getElementById('tableVarietyLabel').innerText = store.currentVariety;
    document.getElementById('expenseTableTitle').innerText = store.currentVariety;

    this.currentRecords = records.map(r => ({
      ...r,
      parsedDateObj: Utils.parseRecordDateTime(r.timeStr)
    }));

    let totalGrossRevenue = 0, totalBaseWeight = 0, totalExactWeight = 0, totalCostOfGoods = 0, totalActiveDebt = 0, totalCashPaid = 0;
    const hourDistribution = Array(24).fill(0);
    const hourWeightDistribution = Array(24).fill(0);
    const clientVolumes = {};

    this.currentRecords.forEach(r => {
      r.exactGramm = r.baseGramm * 1.1;
      // Дістаємо точну собівартість 1г для сорту угоди
      r.pricePerGram = store.getPricePerGram(r.category);
      r.dealCost = r.exactGramm * r.pricePerGram;
      r.dealRevenue = r.baseGramm * 10;
      r.dealProfit = r.dealRevenue - r.dealCost;

      totalGrossRevenue += r.dealRevenue;
      totalCashPaid += r.eurPaid;
      totalActiveDebt += r.debtNew;
      totalBaseWeight += r.baseGramm;
      totalExactWeight += r.exactGramm;
      totalCostOfGoods += r.dealCost;

      clientVolumes[r.clientName] = (clientVolumes[r.clientName] || 0) + r.dealRevenue;

      if (r.parsedDateObj) {
        const h = r.parsedDateObj.getHours();
        hourDistribution[h] += 1;
        hourWeightDistribution[h] += r.baseGramm;
      }
    });

    // Sub-expenses sum
    const currentVarExpenses = store.varietyExpenses[store.currentVariety] || {};
    const totalExpenses = Object.values(currentVarExpenses).reduce((a, b) => a + b, 0);
    const netProfitFinal = totalGrossRevenue - totalCostOfGoods - totalExpenses - totalActiveDebt;

    // Render KPIs
    document.getElementById('kpiGrossRevenue').innerText = `${totalGrossRevenue.toFixed(2)} €`;
    document.getElementById('kpiRevenue').innerText = `${totalCashPaid.toFixed(2)} €`;
    document.getElementById('kpiNetProfitFinal').innerText = `${netProfitFinal.toFixed(2)} €`;
    document.getElementById('kpiExactWeight').innerText = `${totalExactWeight.toFixed(1)} г`;
    document.getElementById('kpiBaseWeight').innerText = `${totalBaseWeight.toFixed(1)}г`;
    document.getElementById('kpiCostOfGoods').innerText = `${totalCostOfGoods.toFixed(2)} €`;
    document.getElementById('kpiActiveDebt').innerText = `${totalActiveDebt.toFixed(2)} €`;
    document.getElementById('totalExpensesSumLabel').innerText = `${totalExpenses.toFixed(2)} €`;

    // Dynamic UI Updates
    this.renderVarietyPresets();
    this.renderExpensesList(currentVarExpenses);
    this.renderTable(this.currentRecords);

    // Render Charts
    charts.renderPieChart('financePieChartCanvas', netProfitFinal, totalCostOfGoods, totalExpenses, totalActiveDebt);
    charts.renderHourlyChart('page1ChartCanvas', hourDistribution, hourWeightDistribution);
    charts.renderTopClientsChart('topClientsChartCanvas', clientVolumes);

    store.save();
  }

  renderVarietyPresets() {
    const container = document.getElementById('varietyPresetsContainer');
    const keys = Object.keys(store.varieties);
    
    if (!keys.length) {
      container.innerHTML = '<span class="text-[10px] text-slate-500">Сорти відсутні</span>';
      return;
    }

    container.innerHTML = keys.map(v => {
      const isSelected = store.currentVariety === v;
      const data = store.varieties[v];
      const ppg = (data.cost / data.grams).toFixed(2);

      return `
        <button type="button" data-vname="${v}" class="variety-btn px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition flex flex-col items-start ${
          isSelected 
            ? 'bg-iosPeach text-slate-950 border-iosPeach shadow-md' 
            : 'bg-white/5 text-slate-300 border-white/10 hover:border-iosPeach/50'
        }">
          <span>${Utils.escapeHtml(v)}</span>
          <span class="text-[8px] opacity-80 font-mono">${data.cost}€ / ${data.grams}г (${ppg}€/г)</span>
        </button>
      `;
    }).join('');

    // Прив'язка кліків до згенерованих кнопок сортів
    container.querySelectorAll('.variety-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vname = e.currentTarget.dataset.vname;
        this.setPresetVariety(vname);
      });
    });
  }

  addExpense() {
    const cat = document.getElementById('newExpenseCategoryInput').value.trim();
    const val = parseFloat(document.getElementById('newExpenseAmountInput').value);
    if (!cat || isNaN(val)) return;

    if (!store.varietyExpenses[store.currentVariety]) {
      store.varietyExpenses[store.currentVariety] = {};
    }
    store.varietyExpenses[store.currentVariety][cat] = val;

    document.getElementById('newExpenseCategoryInput').value = '';
    document.getElementById('newExpenseAmountInput').value = '';
    this.processData();
  }

  renderExpensesList(expenses) {
    const container = document.getElementById('expenseCategoriesContainer');
    const keys = Object.keys(expenses);
    if (!keys.length) {
      container.innerHTML = '<p class="text-[10px] text-slate-500">Витрати відсутні</p>';
      return;
    }
    container.innerHTML = keys.map(k => `
      <div class="flex justify-between items-center text-xs bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
        <span class="text-slate-300 font-bold">${Utils.escapeHtml(k)}</span>
        <span class="font-mono text-iosRose font-bold">${expenses[k].toFixed(2)} €</span>
      </div>
    `).join('');
  }

  renderTable(records) {
    const tbody = document.getElementById('recordsTableBody');
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-slate-500">Записи відсутні</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr class="hover:bg-white/5 transition rounded-xl">
        <td class="p-3 font-bold font-mono text-iosPeach text-[11px]">${Utils.escapeHtml(r.category)}</td>
        <td class="p-3 font-bold text-slate-200">${Utils.escapeHtml(r.clientName)}</td>
        <td class="p-3 font-mono text-iosEmerald">${r.baseGramm.toFixed(1)} г</td>
        <td class="p-3 font-mono text-iosPeach">${r.exactGramm.toFixed(1)} г</td>
        <td class="p-3 font-mono text-iosRose">${r.dealCost.toFixed(1)} €</td>
        <td class="p-3 font-mono font-black text-white">${r.dealRevenue.toFixed(1)} €</td>
        <td class="p-3 font-mono text-iosViolet">${r.dealProfit.toFixed(1)} €</td>
        <td class="p-3 font-mono text-iosAmber">${r.bonusGrams ? `🎁 ${r.bonusGrams}г` : '-'}</td>
        <td class="p-3 font-mono text-slate-400">${Utils.escapeHtml(r.rawDebtText) || '-'}</td>
        <td class="p-3 font-mono text-slate-400 text-[10px]">${Utils.escapeHtml(r.timeStr)}</td>
      </tr>
    `).join('');
  }

  startClock() {
    setInterval(() => {
      document.getElementById('liveClock').innerText = new Date().toLocaleTimeString();
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ApplicationController();
  app.init();
});
