export class Store {
  constructor() {
    this.currentUser = 'default';
    this.currentVariety = 'UNKNOWN';
    this.varietyExpenses = {};
    // Кожен сорт має суму закупки (€) та закуплену вагу (г)
    this.varieties = {
      'BANNAN': { cost: 600, grams: 100 },
      'SKITTLES': { cost: 660, grams: 100 }
    };
    this.rawText = '';
  }

  initUser(user) {
    this.currentUser = user;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(`h2_data_${this.currentUser}`);
      if (raw) {
        const data = JSON.parse(raw);
        this.currentVariety = data.currentVariety || 'UNKNOWN';
        this.varietyExpenses = data.varietyExpenses || {};
        this.varieties = data.varieties || {
          'BANNAN': { cost: 600, grams: 100 },
          'SKITTLES': { cost: 660, grams: 100 }
        };
      }
      this.rawText = localStorage.getItem(`h2_raw_${this.currentUser}`) || '';
    } catch (e) {
      console.error("Store Load Error:", e);
    }
  }

  save() {
    const data = {
      currentVariety: this.currentVariety,
      varietyExpenses: this.varietyExpenses,
      varieties: this.varieties
    };
    localStorage.setItem(`h2_data_${this.currentUser}`, JSON.stringify(data));
    localStorage.setItem(`h2_raw_${this.currentUser}`, this.rawText);
  }

  // Розрахунок себевартості 1 грама для конкретного сорту
  getPricePerGram(varietyName) {
    const v = this.varieties[varietyName];
    if (!v || !v.grams || v.grams <= 0) return 6; // Значення за замовчуванням (6€/г)
    return v.cost / v.grams;
  }
}

export const store = new Store();
