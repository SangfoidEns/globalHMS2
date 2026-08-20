export class Store {
  constructor() {
    this.currentUser = 'default';
    this.currentVariety = 'UNKNOWN';
    this.varietyExpenses = {};
    this.varietyCosts = { 'BANNAN': 600, 'SKITTLES': 660 };
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
        this.varietyCosts = data.varietyCosts || { 'BANNAN': 600, 'SKITTLES': 660 };
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
      varietyCosts: this.varietyCosts
    };
    localStorage.setItem(`h2_data_${this.currentUser}`, JSON.stringify(data));
    localStorage.setItem(`h2_raw_${this.currentUser}`, this.rawText);
  }
}

export const store = new Store();