import { escapeHtml, parseRecordDateTime } from './utils/helpers.js';
import { ParserEngine } from './services/parser.js';

class AnalyticsApp {
  constructor() {
    this.currentUser = 'default';
    this.activePage = 0;
    this.currentVariety = 'UNKNOWN';
    this.currentRecords = [];
    this.varietyExpenses = {};
    this.persistentDebts = {};
    this.globalArchive = [];
    this.varietyCosts = { 'BANNAN': 600, 'SKITTLES': 660 };

    // Charts references
    this.charts = {
      page1: null,
      financePie: null,
      topClients: null,
      globalDoughnut: null,
      globalExpensesBar: null
    };
  }

  init() {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    this.initAuth();
    this.bindEvents();
    this.initSwipeGesture();

    setInterval(() => this.updateClock(), 1000);
    this.updateClock();
  }

  haptic(type = 'light') {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (['success', 'error', 'warning'].includes(type)) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    }
  }

  initAuth() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      this.currentUser = `tg_${u.id}`;
      document.getElementById('tgUserName').innerText = `@${u.username || u.id}`;
    } else {
      const savedUser = localStorage.getItem('h2_last_active_user') || 'Operator_1';
      this.currentUser = savedUser;
      document.getElementById('tgUserName').innerText = savedUser;
    }

    this.loadStateForUser();
    this.processData();
  }

  bindEvents() {
    document.getElementById('btnProcess').addEventListener('click', () => {
      this.processData();
      this.haptic('success');
    });

    document.getElementById('btnClear').addEventListener('click', () => this.clearInput());
    document.getElementById('btnPage0').addEventListener('click', () => this.goToPage(0));
    document.getElementById('btnPage1').addEventListener('click', () => this.goToPage(1));
    document.getElementById('btnSwitchUser').addEventListener('click', () => this.switchUserPrompt());
    document.getElementById('btnPresetBannan').addEventListener('click', () => this.selectVarietyPreset('BANNAN', 600));
    document.getElementById('btnPresetSkittles').addEventListener('click', () => this.selectVarietyPreset('SKITTLES', 660));

    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addExpenseFromForm();
    });

    document.getElementById('tableSearch').addEventListener('keyup', () => this.filterTable());

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.getAttribute('data-preset');
        this.setCategoryPreset(preset);
      });
    });
  }

  switchUserPrompt() {
    this.haptic('medium');
    const username = prompt('Введіть ім\'я оператора:', this.currentUser);
    if (username && username.trim() !== '') {
      const cleanUser = username.trim().replace(/\s+/g, '_');
      this.currentUser = cleanUser;
      localStorage.setItem('h2_last_active_user', cleanUser);
      document.getElementById('tgUserName').innerText = cleanUser;

      this.loadStateForUser();
      this.processData();
    }
  }

  loadStateForUser() {
    this.currentVariety = 'UNKNOWN';
    this.currentRecords = [];
    this.varietyExpenses = {};
    this.persistentDebts = {};
    this.globalArchive = [];
    this.varietyCosts = { 'BANNAN': 600, 'SKITTLES': 660 };

    try {
      const raw = localStorage.getItem(`h2_data_${this.currentUser}`);
      if (raw) {
        const data = JSON.parse(raw);
        this.currentVariety = data.currentVariety || 'UNKNOWN';
        this.varietyExpenses = data.varietyExpenses || {};
        this.persistentDebts = data.persistentDebts || {};
        this.globalArchive = data.globalArchive || [];
        this.varietyCosts = data.varietyCosts || { 'BANNAN': 600, 'SKITTLES': 660 };
      }
      document.getElementById('rawInput').value = localStorage.getItem(`h2_raw_${this.currentUser}`) || '';
    } catch(e) {
      console.error("Помилка профілю:", e);
    }
  }

  saveState() {
    const data = {
      currentVariety: this.currentVariety,
      varietyExpenses: this.varietyExpenses,
      persistentDebts: this.persistentDebts,
      globalArchive: this.globalArchive,
      varietyCosts: this.varietyCosts
    };
    localStorage.setItem(`h2_data_${this.currentUser}`, JSON.stringify(data));
    localStorage.setItem(`h2_raw_${this.currentUser}`, document.getElementById('rawInput').value);
  }

  goToPage(pageIdx) {
    this.haptic('light');
    this.activePage = pageIdx;
    document.getElementById('swipeContainer').style.transform = `translateX(-${pageIdx * 100}vw)`;

    document.getElementById('btnPage0').className = pageIdx === 0 ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-iosPeach text-slate-950 shadow-lg' : 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-transparent text-slate-400 hover:text-white';
    document.getElementById('btnPage1').className = pageIdx === 1 ? 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-iosPeach text-slate-950 shadow-lg' : 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-transparent text-slate-400 hover:text-white';

    if (pageIdx === 1) this.renderPage2GlobalArchive();
  }

  initSwipeGesture() {
    let startX = 0, startY = 0;
    document.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
      startY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      const diffX = startX - e.changedTouches[0].screenX;
      const diffY = startY - e.changedTouches[0].screenY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 70) {
        if (diffX > 0 && this.activePage === 0) this.goToPage(1);
        else if (diffX < 0 && this.activePage === 1) this.goToPage(0);
      }
    }, { passive: true });
  }

  selectVarietyPreset(varietyName, defaultCost) {
    this.haptic('light');
    this.currentVariety = varietyName;
    this.varietyCosts[varietyName] = defaultCost;
    this.saveState();
    this.processData();
  }

  renderVarietyCostInputs(varietyNames) {
    const container = document.getElementById('varietyCostsContainer');
    container.innerHTML = '';

    varietyNames.forEach(varName => {
      if (!this.varietyCosts[varName]) {
        this.varietyCosts[varName] = 600;
      }
      const costVal = this.varietyCosts[varName];

      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-xl border border-white/10';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.value = costVal;
      input.className = 'w-14 glass-input rounded-lg px-1.5 py-0.5 text-white font-mono text-xs font-bold text-center';
      input.addEventListener('change', (e) => this.updateSingleVarietyCost(varName, e.target.value));

      wrapper.innerHTML = `<span class="text-[11px] font-bold text-iosPeach uppercase">${escapeHtml(varName)}:</span>`;
      wrapper.appendChild(input);
      wrapper.insertAdjacentHTML('beforeend', `<span class="text-[10px] text-slate-400 font-mono">€/100г</span>`);

      container.appendChild(wrapper);
    });
  }

  updateSingleVarietyCost(varName, val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      this.varietyCosts[varName] = num;
      this.saveState();
      this.processData();
    }
  }

  setCategoryPreset(categoryName) {
    this.haptic('light');
    document.getElementById('newExpenseCategoryInput').value = categoryName;
    document.getElementById('newExpenseAmountInput').focus();
  }

  getCurrentExpenses() {
    if (!this.varietyExpenses[this.currentVariety]) {
      this.varietyExpenses[this.currentVariety] = {};
    }
    return this.varietyExpenses[this.currentVariety];
  }

  addExpenseFromForm() {
    const catInput = document.getElementById('newExpenseCategoryInput');
    const amountInput = document.getElementById('newExpenseAmountInput');

    const cat = catInput.value.trim();
    const val = parseFloat(amountInput.value);

    if (!cat || isNaN(val) || val < 0) return;

    this.haptic('success');
    const expenses = this.getCurrentExpenses();
    expenses[cat] = (expenses[cat] || 0) + val;

    catInput.value = '';
    amountInput.value = '';

    this.saveState();
    this.renderExpenses();
    this.processData();
  }

  renderExpenses() {
    const container = document.getElementById('expenseCategoriesContainer');
    const expenses = this.getCurrentExpenses();
    const keys = Object.keys(expenses);

    if (keys.length === 0) {
      container.innerHTML = '<p class="text-slate-500 text-xs">Немає витрат для цієї сесії</p>';
      return;
    }

    container.innerHTML = '';
    keys.forEach(cat => {
      const isInfo = cat === 'KARTE' || cat.includes('БОНУСИ');
      const isBonus = cat.includes('БОНУСИ');

      const item = document.createElement('div');
      item.className = `flex items-center justify-between gap-2 p-2 rounded-xl border ${isBonus ? 'bg-iosAmber/10 border-iosAmber/30' : 'bg-black/30 border-white/5'}`;
      item.innerHTML = `
        <span class="text-xs font-medium ${isBonus ? 'text-iosAmber font-bold' : isInfo ? 'text-iosPeach font-bold' : 'text-slate-300'} truncate">
          ${isBonus ? '🎁 ' : ''}${escapeHtml(cat)}
        </span>
        <div class="flex items-center gap-1">
          <input type="number" 
                 value="${expenses[cat]}" 
                 ${isInfo ? 'readonly' : ''}
                 class="inp-exp w-16 glass-input rounded-lg px-2 py-0.5 text-xs font-mono ${isInfo ? 'opacity-80' : ''} ${isBonus ? 'text-iosAmber font-bold' : 'text-iosRose'}" />
          <span class="text-[10px] ${isBonus ? 'text-iosAmber font-bold' : 'text-slate-400'}">${isBonus ? 'г' : '€'}</span>
          ${!isInfo ? `<button class="btn-del-exp text-slate-500 hover:text-iosRose font-bold px-1.5 text-sm">×</button>` : ''}
        </div>
      `;

      const inp = item.querySelector('.inp-exp');
      if (!isInfo) {
        inp.addEventListener('change', (e) => {
          const v = parseFloat(e.target.value);
          expenses[cat] = !isNaN(v) && v >= 0 ? v : 0;
          this.saveState();
          this.processData();
        });

        item.querySelector('.btn-del-exp').addEventListener('click', () => {
          this.haptic('warning');
          delete expenses[cat];
          this.saveState();
          this.renderExpenses();
          this.processData();
        });
      }

      container.appendChild(item);
    });
  }

  processData() {
    const rawText = document.getElementById('rawInput').value;
    const { detectedVariety, records } = ParserEngine.parseLogs(rawText);

    if (detectedVariety !== 'UNKNOWN') {
      this.currentVariety = detectedVariety;
    }

    document.getElementById('activeVarietyBadge').innerText = this.currentVariety;
    document.getElementById('tableVarietyLabel').innerText = this.currentVariety;
    document.getElementById('expenseTableTitle').innerText = this.currentVariety;

    const activeVarieties = this.currentVariety.split('&').map(v => v.trim()).filter(v => v !== '' && v !== 'UNKNOWN');
    if (activeVarieties.length === 0) activeVarieties.push('DEFAULT');

    this.renderVarietyCostInputs(activeVarieties);

    this.currentRecords = records.map(r => ({
      ...r,
      parsedDateObj: parseRecordDateTime(r.timeStr)
    }));

    this.currentRecords.forEach(rec => {
      if (!this.globalArchive.some(g => g.id === rec.id)) {
        this.globalArchive.push(rec);
      }
    });

    let totalGrossRevenue = 0, totalBaseWeight = 0, totalExactWeight = 0, totalCostOfGoods = 0, totalDealsProfit = 0, totalCardAmount = 0, totalBonusGrams = 0;
    const newDebtsInTable = {}, repaidInTable = {}, clientVolumes = {};
    const hourDistribution = Array(24).fill(0);
    const hourWeightDistribution = Array(24).fill(0);

    this.currentRecords.forEach(r => {
      r.exactGramm = r.baseGramm * 1.1;

      const catCost = this.varietyCosts[r.category] || this.varietyCosts[activeVarieties[0]] || 600;
      r.pricePerGram = catCost / 100;
      r.dealCost = r.exactGramm * r.pricePerGram;
      r.dealRevenue = r.baseGramm * 10;
      r.dealProfit = r.dealRevenue - r.dealCost;

      r.bonusCostEur = (r.bonusGrams || 0) * r.pricePerGram;

      totalGrossRevenue += r.dealRevenue;
      totalBaseWeight += r.baseGramm;
      totalExactWeight += r.exactGramm;
      totalCostOfGoods += r.dealCost;
      totalDealsProfit += r.dealProfit;

      if (r.cardAmount > 0) totalCardAmount += r.cardAmount;
      if (r.bonusGrams > 0) totalBonusGrams += r.bonusGrams;

      clientVolumes[r.clientName] = (clientVolumes[r.clientName] || 0) + r.dealRevenue;

      if (r.debtNew > 0) newDebtsInTable[r.clientName] = (newDebtsInTable[r.clientName] || 0) + r.debtNew;
      if (r.debtRepaid > 0) repaidInTable[r.clientName] = (repaidInTable[r.clientName] || 0) + r.debtRepaid;

      if (r.parsedDateObj) {
        const h = r.parsedDateObj.getHours();
        hourDistribution[h] += 1;
        hourWeightDistribution[h] += r.baseGramm;
      }
    });

    const expenses = this.getCurrentExpenses();

    delete expenses['KARTE'];
    if (totalCardAmount > 0) expenses['KARTE'] = parseFloat(totalCardAmount.toFixed(2));

    delete expenses['БОНУСИ (ІНФО)'];
    if (totalBonusGrams > 0) expenses['БОНУСИ (ІНФО)'] = parseFloat(totalBonusGrams.toFixed(2));

    this.renderExpenses();

    const totalExpensesSum = Object.keys(expenses)
      .filter(k => !k.includes('БОНУСИ'))
      .reduce((a, b) => a + (parseFloat(expenses[b]) || 0), 0);

    document.getElementById('totalExpensesSumLabel').innerText = `${totalExpensesSum.toFixed(2)} €`;

    const updatedPersistentDebts = { ...this.persistentDebts };
    Object.keys(newDebtsInTable).forEach(c => {
      updatedPersistentDebts[c] = (updatedPersistentDebts[c] || 0) + newDebtsInTable[c];
    });
    Object.keys(repaidInTable).forEach(c => {
      updatedPersistentDebts[c] = Math.max(0, (updatedPersistentDebts[c] || 0) - repaidInTable[c]);
    });

    let totalActiveDebtSum = 0;
    const activeDebtsDisplay = {};
    Object.keys(updatedPersistentDebts).forEach(c => {
      if (updatedPersistentDebts[c] > 0) {
        activeDebtsDisplay[c] = updatedPersistentDebts[c];
        totalActiveDebtSum += updatedPersistentDebts[c];
      }
    });

    const netProfitFinal = totalDealsProfit - totalExpensesSum;
    const actualRevenue = totalGrossRevenue - totalActiveDebtSum - totalExpensesSum;

    document.getElementById('kpiGrossRevenue').innerText = `${totalGrossRevenue.toFixed(2)} €`;
    document.getElementById('kpiRevenue').innerText = `${actualRevenue.toFixed(2)} €`;
    document.getElementById('kpiNetProfitFinal').innerText = `${netProfitFinal.toFixed(2)} €`;
    document.getElementById('kpiExactWeight').innerText = `${totalExactWeight.toFixed(1)} г`;
    document.getElementById('kpiBaseWeight').innerText = `${totalBaseWeight.toFixed(1)}г`;
    document.getElementById('kpiCostOfGoods').innerText = `${totalCostOfGoods.toFixed(2)} €`;
    document.getElementById('kpiActiveDebt').innerText = `${totalActiveDebtSum.toFixed(2)} €`;

    this.renderDebtsList('activeDebtsList', activeDebtsDisplay, 'text-iosAmber', '-');
    this.renderDebtsList('repaidDebtsList', repaidInTable, 'text-iosEmerald', '+');

    this.renderFinancePieChart(netProfitFinal, totalCostOfGoods, totalExpensesSum, totalActiveDebtSum);
    this.renderPage1HourlyChart(hourDistribution, hourWeightDistribution);
    this.renderPage1Heatmap(hourDistribution, hourWeightDistribution);
    this.renderTopClientsChart(clientVolumes);
    this.renderTable(this.currentRecords);

    this.saveState();

    if (this.activePage === 1) this.renderPage2GlobalArchive();
  }

  renderDebtsList(elementId, debtObj, colorClass, prefix) {
    const container = document.getElementById(elementId);
    const keys = Object.keys(debtObj);
    if (keys.length === 0) {
      container.innerHTML = '<p class="text-slate-500 text-[10px]">Порожньо</p>';
      return;
    }
    container.innerHTML = keys.map(client => `
      <div class="flex justify-between items-center text-[11px]">
        <span class="text-slate-300 truncate">${escapeHtml(client)}</span>
        <span class="font-mono font-bold ${colorClass}">${prefix}${debtObj[client].toFixed(0)}€</span>
      </div>
    `).join('');
  }

  renderFinancePieChart(netProfit, costOfGoods, expenses, activeDebt) {
    if (this.charts.financePie) this.charts.financePie.destroy();

    const ctx = document.getElementById('financePieChartCanvas').getContext('2d');
    this.charts.financePie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Чистий Прибуток', 'Собівартість Товару', 'Операційні Витрати', 'Борги Покупців'],
        datasets: [{
          data: [Math.max(0, netProfit), costOfGoods, expenses, activeDebt],
          backgroundColor: ['#BF5AF2', '#FF453A', '#FF9F0A', '#FFD60A'],
          borderWidth: 2,
          borderColor: '#090A0F'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw || 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val.toFixed(2)} € (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  renderPage1HourlyChart(hourDistribution, hourWeightDistribution) {
    if (this.charts.page1) this.charts.page1.destroy();

    const labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`);
    const ctx = document.getElementById('page1ChartCanvas').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(100, 210, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 210, 255, 0.0)');

    this.charts.page1 = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Кількість угод',
            data: hourDistribution,
            backgroundColor: gradient,
            borderColor: '#64D2FF',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Продано ваги (г)',
            data: hourWeightDistribution,
            borderColor: '#FF9F0A',
            borderWidth: 2,
            borderDash: [3, 3],
            fill: false,
            tension: 0.2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8e8e93', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              afterBody: (context) => {
                const idx = context[0].dataIndex;
                const deals = hourDistribution[idx];
                const weight = hourWeightDistribution[idx];
                const rev = weight * 10;
                return `-------------------\n💰 Виторг за годину: ${rev.toFixed(0)} €\n⚖️ Вага: ${weight.toFixed(1)} г\n📊 Угод: ${deals}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#8e8e93', font: { size: 9 } }, grid: { display: false } },
          y: { type: 'linear', position: 'left', ticks: { color: '#64D2FF', font: { size: 9 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y1: { type: 'linear', position: 'right', ticks: { color: '#FF9F0A', font: { size: 9 } }, grid: { display: false } }
        }
      }
    });
  }

  renderPage1Heatmap(hourDistribution, hourWeightDistribution) {
    const row = document.getElementById('page1HeatmapRow');
    row.innerHTML = '<div class="text-[9px] font-mono text-slate-400 font-bold">Сесія</div>';

    const maxDeals = Math.max(...hourDistribution, 1);

    hourDistribution.forEach((val, hour) => {
      const weight = hourWeightDistribution[hour];
      const rev = weight * 10;
      const alpha = val > 0 ? Math.min(1, 0.2 + (val / maxDeals) * 0.8) : 0;

      const cell = document.createElement('div');
      cell.className = 'hm-cell h-7 rounded-md flex items-center justify-center text-[9px] font-mono font-bold';
      cell.title = `Година: ${hour}:00\nУгод: ${val}\nВага: ${weight.toFixed(1)}г\nВиторг: ${rev.toFixed(0)}€`;

      if (val > 0) {
        cell.style = `background: rgba(255, 159, 10, ${alpha}); color: #ffffff; border: 1px solid rgba(255, 159, 10, 0.6);`;
        cell.innerText = val;
      } else {
        cell.style = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); color: #48484a;';
        cell.innerText = '-';
      }
      row.appendChild(cell);
    });
  }

  renderTopClientsChart(clientVolumes) {
    if (this.charts.topClients) this.charts.topClients.destroy();

    const sorted = Object.keys(clientVolumes)
      .map(k => ({ name: k, amount: clientVolumes[k] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const ctx = document.getElementById('topClientsChartCanvas').getContext('2d');
    this.charts.topClients = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s.name),
        datasets: [{
          label: 'Обсяг покупок (€)',
          data: sorted.map(s => s.amount),
          backgroundColor: '#30D158',
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` 💰 Сума: ${c.raw.toFixed(2)} € (Еквівалент: ${(c.raw / 10).toFixed(1)}г)`
            }
          }
        },
        scales: {
          x: { ticks: { color: '#8e8e93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#ffffff', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
        }
      }
    });
  }

  renderTable(records) {
    const tbody = document.getElementById('recordsTableBody');
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-slate-500">Записи відсутні</td></tr>';
      return;
    }

    const maxRevenue = Math.max(...records.map(r => r.dealRevenue), 1);

    tbody.innerHTML = records.map(r => {
      const ratio = r.dealRevenue / maxRevenue;
      const bgAlpha = (0.05 + ratio * 0.3).toFixed(2);
      const borderAlpha = (0.1 + ratio * 0.5).toFixed(2);
      const rowStyle = `background: rgba(255, 159, 10, ${bgAlpha}); border: 1px solid rgba(255, 159, 10, ${borderAlpha}); backdrop-filter: blur(8px);`;

      return `
        <tr style="${rowStyle}" class="hover:scale-[1.005] transition-all duration-200 rounded-xl">
          <td class="p-3 font-bold font-mono text-iosPeach text-[11px] rounded-l-xl">${escapeHtml(r.category)}</td>
          <td class="p-3 font-bold text-slate-200">${escapeHtml(r.clientName)}</td>
          <td class="p-3 font-mono font-bold text-iosEmerald">${r.baseGramm.toFixed(1)} г</td>
          <td class="p-3 font-mono font-bold text-iosPeach">${r.exactGramm.toFixed(1)} г</td>
          <td class="p-3 font-mono text-iosRose">${r.dealCost.toFixed(1)} €</td>
          <td class="p-3 font-mono font-black text-white text-sm">${r.dealRevenue.toFixed(1)} €</td>
          <td class="p-3 font-mono font-bold text-iosViolet">${r.dealProfit.toFixed(1)} €</td>
          <td class="p-3 font-mono text-iosAmber font-bold">
            ${r.bonusGrams > 0 ? `🎁 ${r.bonusGrams}г <span class="text-[10px] text-slate-400 font-normal">(${r.bonusCostEur.toFixed(1)}€)</span>` : '-'}
          </td>
          <td class="p-3 font-mono text-[11px] text-slate-400">${escapeHtml(r.rawDebtText) || '-'}</td>
          <td class="p-3 font-mono text-slate-400 text-[10px] rounded-r-xl">${escapeHtml(r.timeStr)}</td>
        </tr>
      `;
    }).join('');
  }

  filterTable() {
    const val = document.getElementById('tableSearch').value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
    });
  }

  clearInput() {
    this.haptic('warning');
    document.getElementById('rawInput').value = '';
    this.currentRecords = [];
    localStorage.removeItem(`h2_raw_${this.currentUser}`);
    this.processData();
  }

  renderPage2GlobalArchive() {
    const totalDeals = this.globalArchive.length;
    let globalRevenue = 0, globalWeight = 0, globalBonuses = 0;
    const varietyStats = {};

    this.globalArchive.forEach(r => {
      const rev = r.baseGramm * 10;
      const exact = r.baseGramm * 1.1;

      globalRevenue += rev;
      globalWeight += exact;
      globalBonuses += (r.bonusGrams || 0);

      if (!varietyStats[r.category]) {
        varietyStats[r.category] = { deals: 0, revenue: 0, weight: 0 };
      }
      varietyStats[r.category].deals += 1;
      varietyStats[r.category].revenue += rev;
      varietyStats[r.category].weight += exact;
    });

    document.getElementById('gStatDeals').innerText = totalDeals;
    document.getElementById('gStatRevenue').innerText = `${globalRevenue.toFixed(2)} €`;
    document.getElementById('gStatWeight').innerText = `${globalWeight.toFixed(1)} г`;
    document.getElementById('gStatBonuses').innerText = `${globalBonuses.toFixed(1)} г`;

    if (this.charts.globalDoughnut) this.charts.globalDoughnut.destroy();
    const vCtx = document.getElementById('globalVarietyDoughnutCanvas').getContext('2d');
    const vKeys = Object.keys(varietyStats);

    this.charts.globalDoughnut = new Chart(vCtx, {
      type: 'doughnut',
      data: {
        labels: vKeys,
        datasets: [{
          data: vKeys.map(k => varietyStats[k].revenue),
          backgroundColor: ['#FF9F0A', '#BF5AF2', '#30D158', '#64D2FF', '#FF453A']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#ffffff', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const item = varietyStats[c.label];
                return ` 🌿 ${c.label}: ${item.revenue.toFixed(0)}€ | ${item.weight.toFixed(1)}г (${item.deals} угод)`;
              }
            }
          }
        }
      }
    });

    const globalExpAgg = {};
    Object.values(this.varietyExpenses).forEach(sessionExp => {
      Object.keys(sessionExp).forEach(k => {
        if (!k.includes('БОНУСИ')) {
          globalExpAgg[k] = (globalExpAgg[k] || 0) + (parseFloat(sessionExp[k]) || 0);
        }
      });
    });

    if (this.charts.globalExpensesBar) this.charts.globalExpensesBar.destroy();
    const eCtx = document.getElementById('globalExpensesBarCanvas').getContext('2d');
    const eKeys = Object.keys(globalExpAgg);

    this.charts.globalExpensesBar = new Chart(eCtx, {
      type: 'bar',
      data: {
        labels: eKeys,
        datasets: [{
          label: 'Витрати (€)',
          data: eKeys.map(k => globalExpAgg[k]),
          backgroundColor: '#FF453A',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8e8e93', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: '#FF453A', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    const varContainer = document.getElementById('globalVarietiesList');
    if (vKeys.length === 0) {
      varContainer.innerHTML = '<p class="text-slate-500 text-xs">Немає накопичених даних</p>';
    } else {
      varContainer.innerHTML = vKeys.map(v => {
        const item = varietyStats[v];
        const pct = globalRevenue > 0 ? ((item.revenue / globalRevenue) * 100).toFixed(1) : 0;
        return `
          <div class="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold font-mono text-iosPeach">${escapeHtml(v)}</span>
              <span class="text-slate-300 font-mono">${item.revenue.toFixed(0)}€ | ${item.weight.toFixed(1)}г (${item.deals} угод)</span>
            </div>
            <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-iosPeach to-orange-500 rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  updateClock() {
    document.getElementById('liveClock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AnalyticsApp();
  app.init();
});