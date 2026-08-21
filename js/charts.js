import { CONFIG } from './config.js';

export class ChartEngine {
  constructor() {
    this.hourlyChartInstance = null;
    this.categoryChartInstance = null;
  }

  destroyCharts() {
    if (this.hourlyChartInstance) {
      this.hourlyChartInstance.destroy();
      this.hourlyChartInstance = null;
    }
    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
      this.categoryChartInstance = null;
    }
  }

  // 1. Heatmap Matrix (7 днів x 24 години)
  renderHeatmap(containerId, records) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxDeals = 0;

    records.forEach(r => {
      if (r.parsedDateObj && !isNaN(r.parsedDateObj.getTime())) {
        const day = r.parsedDateObj.getDay(); 
        const hour = r.parsedDateObj.getHours(); 
        matrix[day][hour] += 1;

        if (matrix[day][hour] > maxDeals) {
          maxDeals = matrix[day][hour];
        }
      }
    });

    let html = `<div class="min-w-[680px] space-y-1">`;
    html += `<div class="grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-[9px] font-mono text-slate-500 text-center pb-1"><div></div>`;
    for (let h = 0; h < 24; h++) {
      html += `<div>${String(h).padStart(2, '0')}</div>`;
    }
    html += `</div>`;

    [1, 2, 3, 4, 5, 6, 0].forEach(dayIdx => {
      html += `<div class="grid grid-cols-[40px_repeat(24,1fr)] gap-1 items-center">`;
      html += `<div class="text-[10px] font-bold text-slate-400 font-mono">${CONFIG.DAYS_MAP[dayIdx]}</div>`;

      for (let h = 0; h < 24; h++) {
        const count = matrix[dayIdx][h];
        const intensity = maxDeals > 0 ? count / maxDeals : 0;
        
        let bgStyle = 'background: rgba(255, 255, 255, 0.03);';
        if (count > 0) {
          bgStyle = `background: rgba(255, 159, 10, ${Math.max(0.2, intensity)}); box-shadow: 0 0 8px rgba(255, 159, 10, ${intensity * 0.4});`;
        }

        html += `
          <div title="${CONFIG.DAYS_MAP[dayIdx]} ${h}:00 — Угод: ${count}" 
               style="${bgStyle}" 
               class="h-6 rounded border border-white/5 flex items-center justify-center text-[9px] font-mono transition-transform hover:scale-110 cursor-pointer ${count > 0 ? 'text-slate-950 font-bold' : 'text-transparent'}">
            ${count > 0 ? count : ''}
          </div>
        `;
      }
      html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // 2. Hourly Line Chart
  renderHourlyChart(canvasId, records) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const hourlyCounts = Array(24).fill(0);
    records.forEach(r => {
      if (r.parsedDateObj && !isNaN(r.parsedDateObj.getTime())) {
        hourlyCounts[r.parsedDateObj.getHours()]++;
      }
    });

    this.hourlyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
        datasets: [{
          label: 'Угод',
          data: hourlyCounts,
          borderColor: '#0A84FF',
          backgroundColor: 'rgba(10, 132, 255, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8E8E93', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#8E8E93', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  // 3. Category Doughnut Chart
  renderCategoryChart(canvasId, records) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const categories = {};
    records.forEach(r => {
      const cat = r.category || 'Інше';
      categories[cat] = (categories[cat] || 0) + (r.eurPaid || 1);
    });

    this.categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A', '#64D2FF'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#FFFFFF', font: { size: 11 } } }
        }
      }
    });
  }
}

export const charts = new ChartEngine();
