export class ChartEngine {
  constructor() {
    this.instances = {};
  }

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  }

  renderPieChart(canvasId, netProfit, costOfGoods, expenses, activeDebt) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
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
        plugins: { legend: { display: false } },
        cutout: '68%'
      }
    });
  }

  renderHourlyChart(canvasId, hourDistribution, hourWeightDistribution) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(100, 210, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 210, 255, 0.0)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Угоди',
            data: hourDistribution,
            backgroundColor: gradient,
            borderColor: '#64D2FF',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Вага (г)',
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
        plugins: { legend: { labels: { color: '#8e8e93', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#8e8e93', font: { size: 9 } }, grid: { display: false } },
          y: { type: 'linear', position: 'left', ticks: { color: '#64D2FF', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y1: { type: 'linear', position: 'right', ticks: { color: '#FF9F0A', font: { size: 9 } }, grid: { display: false } }
        }
      }
    });
  }

  renderTopClientsChart(canvasId, clientVolumes) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const sorted = Object.keys(clientVolumes)
      .map(k => ({ name: k, amount: clientVolumes[k] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s.name),
        datasets: [{
          label: 'Обсяг (€)',
          data: sorted.map(s => s.amount),
          backgroundColor: '#30D158',
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8e8e93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#ffffff', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
        }
      }
    });
  }
}

export const charts = new ChartEngine();