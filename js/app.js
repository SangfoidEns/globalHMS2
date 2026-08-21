import { parseTableData } from './parser.js';
import { CalculationEngine } from './calculator.js';
import { charts } from './charts.js';
import { Store } from './store.js';

class ApplicationController {
  constructor() {
    this.rawInput = document.getElementById('rawInput');
    this.btnParse = document.getElementById('btnParse');
    
    this.pricingMap = Store.getPricing();
    this.manualTransactions = Store.getManualTransactions();

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

  processData() {
    const text = this.rawInput.value;
    if (!text.trim()) return;

    Store.setRawData(text);

    const parsedData = parseTableData(text);
    const kpis = CalculationEngine.calculateKPIs(parsedData, this.pricingMap, this.manualTransactions);

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
