import { parseTableData } from './parser.js';
import { CalculationEngine } from './calculator.js';
import { charts } from './charts.js';
import { Store } from './store.js';

class ApplicationController {
  constructor() {
    this.rawInput = document.getElementById('rawInput');
    this.btnParse = document.getElementById('btnParse');
    this.pricingMap = Store.getPricing();
    this.myTransactions = Store.getMyTransactions();

    this.init();
  }

  init() {
    if (this.btnParse) {
      this.btnParse.addEventListener('click', () => this.processData());
    }

    const savedRaw = Store.getRawData();
    if (savedRaw && this.rawInput) {
      this.rawInput.value = savedRaw;
      this.processData();
    }
  }

  addMyTransaction(description, amount, isIncome) {
    const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
    this.myTransactions.push({ description, amount: finalAmount, date: new Date() });
    Store.setMyTransactions(this.myTransactions);
    this.processData();
  }

  addCustomCategory(categoryName, costPer100g = 500) {
    this.pricingMap[categoryName.toUpperCase()] = costPer100g;
    Store.setPricing(this.pricingMap);
    this.processData();
  }

  processData() {
    const text = this.rawInput.value;
    if (!text.trim()) return;

    Store.setRawData(text);

    const parsedRecords = parseTableData(text);
    const kpis = CalculationEngine.calculateKPIs(parsedRecords, this.pricingMap, this.myTransactions);

    this.renderKPIs(kpis);

    charts.destroyCharts();
    charts.renderHeatmap('heatmapContainer', kpis.deals);
    charts.renderHourlyChart('hourlyChart', kpis.deals);
    charts.renderCategoryChart('categoryChart', kpis.deals);
  }

  renderKPIs(kpis) {
    document.getElementById('kpiGrossRevenue').innerText = `${kpis.kpiExpectedRevenue.toFixed(2)} €`;
    document.getElementById('kpiRevenue').innerText = `${kpis.kpiRevenue.toFixed(2)} €`;
    document.getElementById('kpiDebt').innerText = `${kpis.kpiActiveDebt.toFixed(2)} €`;
    document.getElementById('kpiDeals').innerText = kpis.totalDeals;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ApplicationController();
});
