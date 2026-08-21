import { parseTableData } from './parser.js';
import { charts } from './charts.js';

class ApplicationController {
  constructor() {
    this.rawInput = document.getElementById('rawInput');
    this.expensesInput = document.getElementById('expensesInput');
    this.btnParse = document.getElementById('btnParse');
    
    this.currentRecords = [];
    this.manualExpenses = parseFloat(localStorage.getItem('hms_manual_expenses')) || 0;

    this.init();
  }

  init() {
    if (this.expensesInput) {
      this.expensesInput.value = this.manualExpenses > 0 ? this.manualExpenses : '';
      this.expensesInput.addEventListener('input', (e) => this.onExpensesChange(e));
    }

    if (this.btnParse) {
      this.btnParse.addEventListener('click', () => this.processData());
    }

    const savedRaw = localStorage.getItem('hms_raw_data');
    if (savedRaw && this.rawInput) {
      this.rawInput.value = savedRaw;
      this.processData();
    }
  }

  onExpensesChange(e) {
    const val = parseFloat(e.target.value);
    this.manualExpenses = isNaN(val) ? 0 : val;
    localStorage.setItem('hms_manual_expenses', this.manualExpenses.toString());
    this.updateKPIsOnly();
  }

  processData() {
    const text = this.rawInput.value;
    if (!text.trim()) return;

    localStorage.setItem('hms_raw_data', text);

    this.currentRecords = parseTableData(text);

    this.updateKPIsOnly();

    charts.destroyCharts();
    charts.renderHeatmap('heatmapContainer', this.currentRecords);
    charts.renderHourlyChart('hourlyChart', this.currentRecords);
    charts.renderCategoryChart('categoryChart', this.currentRecords);
  }

  updateKPIsOnly() {
    let grossRevenue = 0; 
    let totalCashPaid = 0; 
    let totalDebt = 0;     

    this.currentRecords.forEach(r => {
      grossRevenue += (r.totalPrice || 0);
      totalCashPaid += (r.eurPaid || 0);
      totalDebt += (r.debtNew || 0);
    });

    // Чиста Каса = Фактична готівка з угод - Ручні витрати
    const netCashInHand = totalCashPaid - this.manualExpenses;

    document.getElementById('kpiGrossRevenue').innerText = `${grossRevenue.toFixed(2)} €`;
    document.getElementById('kpiRevenue').innerText = `${netCashInHand.toFixed(2)} €`;
    document.getElementById('kpiDebt').innerText = `${totalDebt.toFixed(2)} €`;
    document.getElementById('kpiDeals').innerText = this.currentRecords.length;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ApplicationController();
});
